import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateCommentRequest {
  content: string;
  postId: number;
  parentCommentId?: number;
  giphyUrl?: string;
}

interface CreateCommentResponse {
  success: boolean;
  status: 'published' | 'pending_review' | 'rejected';
  message: string;
  commentId?: number;
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
    if (req.method !== 'POST') {
      throw new Error('Only POST method is allowed');
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

    // Get user profile to ensure user exists and is not banned
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('id, university_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      throw new Error('User profile not found');
    }

    // Parse request body
    const requestBody: CreateCommentRequest = await req.json();
    const { content, postId, parentCommentId, giphyUrl } = requestBody;

    // Validate required parameters
    if (!content?.trim()) {
      throw new Error('Comment content cannot be empty');
    }

    if (!postId || typeof postId !== 'number') {
      throw new Error('Invalid postId: must be a number');
    }

    console.log(`Creating comment for user ${user.id} on post ${postId}`);

    // Get comment content limits from config
    const { data: maxLengthConfig } = await supabaseClient
      .from('app_config')
      .select('value')
      .eq('key', 'max_comment_length')
      .single();

    const maxLength = maxLengthConfig?.value ? parseInt(maxLengthConfig.value) : 280;

    // Additional validations
    if (content.trim().length > maxLength) {
      throw new Error(`Comment exceeds maximum length of ${maxLength} characters`);
    }

    if (content.trim().length < 1) {
      throw new Error('Comment content cannot be empty');
    }

    // Validate Giphy URL if provided
    if (giphyUrl && (!giphyUrl.includes('giphy.com') || !giphyUrl.startsWith('https://'))) {
      throw new Error('Invalid GIF URL format. Must be a valid HTTPS Giphy URL');
    }

    // Verify the post exists and is not flagged
    const { data: post, error: postError } = await supabaseClient
      .from('posts')
      .select('id, is_flagged')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      throw new Error('Post not found');
    }

    if (post.is_flagged) {
      throw new Error('Cannot comment on flagged posts');
    }

    // Simple 2-level validation: if replying to a comment, ensure parent exists and is valid
    if (parentCommentId) {
      const { data: parentComment, error: parentError } = await supabaseClient
        .from('comments')
        .select('id, post_id, parent_comment_id')
        .eq('id', parentCommentId)
        .single();

      if (parentError || !parentComment) {
        throw new Error('Parent comment not found');
      }

      if (parentComment.post_id !== postId) {
        throw new Error('Parent comment does not belong to this post');
      }

    }

    // Create comment (simple 2-level structure)
    const { data: comment, error: commentError } = await supabaseClient
      .from('comments')
      .insert({
        content: content.trim(),
        post_id: postId,
        parent_comment_id: parentCommentId || null,
        giphy_url: giphyUrl || null,
        user_id: user.id,
        is_flagged: true, // Start as flagged until moderation completes
      })
      .select('id')
      .single();

    if (commentError) {
      console.error('Error creating comment:', commentError);
      throw new Error('Failed to create comment in database');
    }

    const commentId = comment.id;

    // Call moderation Edge Function
    const moderationResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/moderate-content`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: content.trim(),
        contentType: 'comment',
        contentId: commentId,
        userId: user.id
      })
    });

    if (!moderationResponse.ok) {
      console.error('Moderation service error:', await moderationResponse.text());
      // Keep comment flagged for manual review
      return new Response(JSON.stringify({
        success: true,
        status: 'pending_review',
        message: 'Comment created but requires manual review',
        commentId
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const moderationResult = await moderationResponse.json();

    // Update comment based on moderation result
    let commentStatus: 'published' | 'pending_review' | 'rejected';
    let responseMessage: string;

    if (moderationResult.action === 'approved') {
      // Publish the comment with moderation score
      await supabaseClient
        .from('comments')
        .update({ 
          is_flagged: false,
          moderation_score: moderationResult.openaiResponse
        })
        .eq('id', commentId);
      
      commentStatus = 'published';
      responseMessage = 'Comment published successfully';
    } else if (moderationResult.action === 'manual_review') {
      // Keep flagged for manual review with moderation score
      await supabaseClient
        .from('comments')
        .update({ 
          is_flagged: true,
          moderation_score: moderationResult.openaiResponse
        })
        .eq('id', commentId);
        
      commentStatus = 'pending_review';
      responseMessage = 'Comment created but requires review before publishing';
    } else {
      // Remove/reject the comment
      await supabaseClient
        .from('comments')
        .delete()
        .eq('id', commentId);
      
      commentStatus = 'rejected';
      responseMessage = 'Comment violates community guidelines and was rejected';
    }

    const response: CreateCommentResponse = {
      success: commentStatus !== 'rejected',
      status: commentStatus,
      message: responseMessage,
      commentId: commentStatus !== 'rejected' ? commentId : undefined,
      timestamp: new Date().toISOString()
    };

    return Response.json(response, { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Comment creation function error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Determine appropriate status code based on error type
    let statusCode = 500;
    let status: 'rejected' | 'pending_review' = 'rejected';
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    if (errorMessage.includes('Comment content cannot be empty') ||
        errorMessage.includes('Comment exceeds maximum length') ||
        errorMessage.includes('Invalid postId') ||
        errorMessage.includes('Invalid GIF URL format') ||
        errorMessage.includes('Can only reply to top-level comments')) {
      statusCode = 400;
    } else if (errorMessage.includes('Invalid or expired token') || 
               errorMessage.includes('Missing authorization header')) {
      statusCode = 401;
    } else if (errorMessage.includes('User profile not found') ||
               errorMessage.includes('Post not found') ||
               errorMessage.includes('Parent comment not found')) {
      statusCode = 404;
    } else if (errorMessage.includes('Cannot comment on flagged posts')) {
      statusCode = 403;
    }

    const errorResponse: CreateCommentResponse = {
      success: false,
      status,
      message: errorMessage,
      timestamp: new Date().toISOString()
    };

    return Response.json(errorResponse, { 
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});