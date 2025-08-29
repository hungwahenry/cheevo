import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatePostRequest {
  content: string;
  giphyUrl?: string;
  userId?: string; // Made optional since we'll get from JWT
  universityId?: number; // Made optional since we'll get from user profile
}

interface CreatePostResponse {
  success: boolean;
  status: 'published' | 'pending_review' | 'rejected';
  message: string;
  postId?: number;
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

    // Get user profile for university_id
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('university_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      throw new Error('User profile not found');
    }

    // Parse request body
    const requestBody: CreatePostRequest = await req.json();
    const { content, giphyUrl } = requestBody;

    // Validate required parameters
    if (!content?.trim()) {
      throw new Error('Post content cannot be empty');
    }

    console.log(`Creating post for user ${user.id} at university ${userProfile.university_id}`);

    // Get post content limits from config
    const { data: maxLengthConfig } = await supabaseClient
      .from('app_config')
      .select('value')
      .eq('key', 'max_post_length')
      .single();

    const maxLength = maxLengthConfig?.value ? parseInt(maxLengthConfig.value) : 280;

    // Additional validations with proper error throwing
    if (content.trim().length > maxLength) {
      throw new Error(`Post exceeds maximum length of ${maxLength} characters`);
    }

    if (content.trim().length < 1) {
      throw new Error('Post content cannot be empty');
    }

    // Validate Giphy URL if provided
    if (giphyUrl && (!giphyUrl.includes('giphy.com') || !giphyUrl.startsWith('https://'))) {
      throw new Error('Invalid GIF URL format. Must be a valid HTTPS Giphy URL');
    }

    // Create post first (with flagged status pending moderation)
    const { data: post, error: postError } = await supabaseClient
      .from('posts')
      .insert({
        content: content.trim(),
        giphy_url: giphyUrl || null,
        user_id: user.id,
        university_id: userProfile.university_id,
        is_flagged: true, // Start as flagged until moderation completes
      })
      .select('id')
      .single();

    if (postError) {
      console.error('Error creating post:', postError);
      throw new Error('Failed to create post in database');
    }

    const postId = post.id;

    // Call moderation Edge Function
    const moderationResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/moderate-content`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: content.trim(),
        contentType: 'post',
        contentId: postId,
        userId: user.id
      })
    });

    if (!moderationResponse.ok) {
      console.error('Moderation service error:', await moderationResponse.text());
      // Keep post flagged for manual review
      return new Response(JSON.stringify({
        success: true,
        status: 'pending_review',
        message: 'Post created but requires manual review',
        postId
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const moderationResult = await moderationResponse.json();

    // Update post based on moderation result
    let postStatus: 'published' | 'pending_review' | 'rejected';
    let responseMessage: string;

    if (moderationResult.action === 'approved') {
      // Publish the post with moderation score
      await supabaseClient
        .from('posts')
        .update({ 
          is_flagged: false,
          moderation_score: moderationResult.openaiResponse
        })
        .eq('id', postId);
      
      postStatus = 'published';
      responseMessage = 'Post published successfully';
    } else if (moderationResult.action === 'manual_review') {
      // Keep flagged for manual review with moderation score
      await supabaseClient
        .from('posts')
        .update({ 
          is_flagged: true,
          moderation_score: moderationResult.openaiResponse
        })
        .eq('id', postId);
        
      postStatus = 'pending_review';
      responseMessage = 'Post created but requires review before publishing';
    } else {
      // Remove/reject the post
      await supabaseClient
        .from('posts')
        .delete()
        .eq('id', postId);
      
      postStatus = 'rejected';
      responseMessage = 'Post violates community guidelines and was rejected';
    }

    const response: CreatePostResponse = {
      success: postStatus !== 'rejected',
      status: postStatus,
      message: responseMessage,
      postId: postStatus !== 'rejected' ? postId : undefined,
      timestamp: new Date().toISOString()
    };

    return Response.json(response, { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Post creation function error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Determine appropriate status code based on error type
    let statusCode = 500;
    let status: 'rejected' | 'pending_review' = 'rejected';
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    if (errorMessage.includes('Missing required parameters') || 
        errorMessage.includes('Post content cannot be empty') ||
        errorMessage.includes('Post exceeds maximum length') ||
        errorMessage.includes('Invalid GIF URL format')) {
      statusCode = 400;
    } else if (errorMessage.includes('Invalid or expired token') || 
               errorMessage.includes('Missing authorization header')) {
      statusCode = 401;
    } else if (errorMessage.includes('User profile not found')) {
      statusCode = 404;
    }

    const errorResponse: CreatePostResponse = {
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