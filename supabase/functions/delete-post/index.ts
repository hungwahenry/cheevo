import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeletePostRequest {
  postId: number;
}

interface DeletePostResponse {
  success: boolean;
  message: string;
  postId: number;
  timestamp: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate HTTP method
    if (req.method !== 'DELETE') {
      throw new Error('Only DELETE method is allowed');
    }

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid or expired token');
    }

    // Parse request
    const requestBody: DeletePostRequest = await req.json();
    const { postId } = requestBody;

    if (!postId || typeof postId !== 'number') {
      throw new Error('Invalid postId: must be a number');
    }

    // Get post and verify ownership
    const { data: post, error: postError } = await supabaseClient
      .from('posts')
      .select('id, user_id, content')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      throw new Error('Post not found');
    }

    // Check if user owns the post
    if (post.user_id !== user.id) {
      throw new Error('Unauthorized: You can only delete your own posts');
    }

    // Delete the post (CASCADE will handle related records)
    const { error: deleteError } = await supabaseClient
      .from('posts')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      console.error('Error deleting post:', deleteError);
      throw new Error('Failed to delete post');
    }

    const response: DeletePostResponse = {
      success: true,
      message: 'Post deleted successfully',
      postId,
      timestamp: new Date().toISOString()
    };

    console.log('Post deleted successfully:', {
      postId,
      userId: user.id,
      content: post.content.substring(0, 50) + '...',
      timestamp: new Date().toISOString()
    });

    return Response.json(response, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete post function error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Determine appropriate status code based on error type
    let statusCode = 500;
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    if (errorMessage.includes('Invalid postId') ||
        errorMessage.includes('Only DELETE method is allowed')) {
      statusCode = 400;
    } else if (errorMessage.includes('Invalid or expired token') ||
               errorMessage.includes('Missing authorization header')) {
      statusCode = 401;
    } else if (errorMessage.includes('Unauthorized: You can only delete')) {
      statusCode = 403;
    } else if (errorMessage.includes('Post not found')) {
      statusCode = 404;
    }

    return Response.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      },
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});