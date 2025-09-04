import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteCommentRequest {
  commentId: number;
}

interface DeleteCommentResponse {
  success: boolean;
  message: string;
  commentId: number;
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
    const requestBody: DeleteCommentRequest = await req.json();
    const { commentId } = requestBody;

    if (!commentId || typeof commentId !== 'number') {
      throw new Error('Invalid commentId: must be a number');
    }

    console.log(`Deleting comment ${commentId} for user ${user.id}`);

    // Get comment and verify ownership
    const { data: comment, error: commentError } = await supabaseClient
      .from('comments')
      .select('id, user_id, content, post_id, parent_comment_id')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      throw new Error('Comment not found');
    }

    // Check if user owns the comment
    if (comment.user_id !== user.id) {
      throw new Error('Unauthorized: You can only delete your own comments');
    }

    // Delete the comment
    const { error: deleteError } = await supabaseClient
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      console.error('Error deleting comment:', deleteError);
      throw new Error('Failed to delete comment');
    }

    const response: DeleteCommentResponse = {
      success: true,
      message: 'Comment deleted successfully',
      commentId,
      timestamp: new Date().toISOString()
    };

    console.log('Comment deleted successfully:', {
      commentId,
      userId: user.id,
      postId: comment.post_id,
      content: comment.content.substring(0, 50) + '...',
      timestamp: new Date().toISOString()
    });

    return Response.json(response, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete comment function error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Determine appropriate status code based on error type
    let statusCode = 500;
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    if (errorMessage.includes('Invalid commentId') ||
        errorMessage.includes('Only DELETE method is allowed')) {
      statusCode = 400;
    } else if (errorMessage.includes('Invalid or expired token') ||
               errorMessage.includes('Missing authorization header')) {
      statusCode = 401;
    } else if (errorMessage.includes('Unauthorized: You can only delete')) {
      statusCode = 403;
    } else if (errorMessage.includes('Comment not found')) {
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