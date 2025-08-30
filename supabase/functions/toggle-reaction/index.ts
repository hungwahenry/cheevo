import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ToggleReactionRequest {
  postId: number;
}

interface ToggleReactionResponse {
  success: boolean;
  action: 'added' | 'removed';
  reaction?: {
    id: number;
    post_id: number;
    user_id: string;
    created_at: string;
  };
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
    const requestBody: ToggleReactionRequest = await req.json();
    const { postId } = requestBody;

    if (!postId || typeof postId !== 'number') {
      throw new Error('Invalid postId: must be a number');
    }

    // Verify post exists and is not flagged
    const { data: post, error: postError } = await supabaseClient
      .from('posts')
      .select('id, is_flagged, user_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      throw new Error('Post not found');
    }

    if (post.is_flagged) {
      throw new Error('Cannot react to flagged post');
    }

    // Check if user already has a reaction on this post
    const { data: existingReaction, error: checkError } = await supabaseClient
      .from('reactions')
      .select('id, created_at')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing reaction:', checkError);
      throw new Error('Failed to check existing reaction');
    }

    let response: ToggleReactionResponse;

    if (existingReaction) {
      // Remove existing reaction
      const { error: deleteError } = await supabaseClient
        .from('reactions')
        .delete()
        .eq('id', existingReaction.id);

      if (deleteError) {
        console.error('Error removing reaction:', deleteError);
        throw new Error('Failed to remove reaction');
      }

      response = {
        success: true,
        action: 'removed'
      };

      console.log('Reaction removed:', {
        postId,
        userId: user.id,
        reactionId: existingReaction.id,
        timestamp: new Date().toISOString()
      });
    } else {
      // Add new reaction
      const { data: newReaction, error: insertError } = await supabaseClient
        .from('reactions')
        .insert({
          post_id: postId,
          user_id: user.id
        })
        .select('id, post_id, user_id, created_at')
        .single();

      if (insertError || !newReaction) {
        console.error('Error adding reaction:', insertError);
        throw new Error('Failed to add reaction');
      }

      response = {
        success: true,
        action: 'added',
        reaction: newReaction
      };

      console.log('Reaction added:', {
        postId,
        userId: user.id,
        reactionId: newReaction.id,
        timestamp: new Date().toISOString()
      });
    }

    return Response.json(response, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Toggle reaction function error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Determine appropriate status code based on error type
    let statusCode = 500;
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    if (errorMessage.includes('Invalid postId') ||
        errorMessage.includes('Cannot react to flagged post')) {
      statusCode = 400;
    } else if (errorMessage.includes('Invalid or expired token') ||
               errorMessage.includes('Missing authorization header')) {
      statusCode = 401;
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