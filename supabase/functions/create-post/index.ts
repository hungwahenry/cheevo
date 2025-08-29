import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Types
interface CreatePostRequest {
  content: string;
  giphyUrl?: string;
  userId: string;
  universityId: number;
}

interface CreatePostResponse {
  success: boolean;
  status: 'published' | 'pending_review' | 'rejected';
  message: string;
  postId?: number;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { content, giphyUrl, userId, universityId }: CreatePostRequest = await req.json();

    if (!content?.trim() || !userId || !universityId) {
      return new Response(JSON.stringify({
        success: false,
        status: 'rejected',
        message: 'Missing required fields'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    console.log(`Creating post for user ${userId} at university ${universityId}`);

    // Note: User ban checking moved to manual reporting system

    // Get post content limits from config
    const { data: maxLengthConfig } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'max_post_length')
      .single();

    const maxLength = maxLengthConfig?.value ? parseInt(maxLengthConfig.value) : 280;

    if (content.trim().length > maxLength) {
      return new Response(JSON.stringify({
        success: false,
        status: 'rejected',
        message: `Post exceeds maximum length of ${maxLength} characters`
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Validate Giphy URL if provided
    if (giphyUrl && (!giphyUrl.includes('giphy.com') || !giphyUrl.startsWith('https://'))) {
      return new Response(JSON.stringify({
        success: false,
        status: 'rejected',
        message: 'Invalid GIF URL format'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Create post first (with flagged status pending moderation)
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        content: content.trim(),
        giphy_url: giphyUrl || null,
        user_id: userId,
        university_id: universityId,
        is_flagged: true, // Start as flagged until moderation completes
      })
      .select('id')
      .single();

    if (postError) {
      console.error('Error creating post:', postError);
      return new Response(JSON.stringify({
        success: false,
        status: 'rejected',
        message: 'Failed to create post'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const postId = post.id;

    // Call moderation Edge Function
    const moderationResponse = await fetch(`${supabaseUrl}/functions/v1/moderate-content`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: content.trim(),
        contentType: 'post',
        contentId: postId,
        userId
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
      await supabase
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
      await supabase
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
      await supabase
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
      postId: postStatus !== 'rejected' ? postId : undefined
    };

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Post creation function error:', error);
    return new Response(JSON.stringify({
      success: false,
      status: 'rejected',
      message: 'Internal server error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});