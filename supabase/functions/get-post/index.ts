import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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

    const { postId } = await req.json();

    if (!postId || typeof postId !== 'number') {
      throw new Error('Invalid postId: must be a number');
    }

    // Get user profile (for potential future use)
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('university_id')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      throw new Error('User profile not found');
    }

    // First check if user can view this specific post
    const { data: visiblePostIds } = await supabaseClient
      .rpc('get_visible_post_ids', {
        viewer_id: user.id,
        scope_filter: 'all'
      });

    const canViewPost = visiblePostIds?.some(p => p.post_id === postId);
    if (!canViewPost) {
      throw new Error('Post not found');
    }

    // Fetch the post with all required relations
    const { data: post, error: postError } = await supabaseClient
      .from('posts')
      .select(`
        *,
        user_profiles!inner (
          username,
          avatar_url,
          university_id,
          trending_score
        ),
        universities (
          name,
          short_name,
          state
        ),
        reactions!left (
          id,
          user_id,
          created_at
        ),
        user_reaction:reactions!left (
          id,
          user_id,
          created_at
        )
      `)
      .eq('id', postId)
      .eq('user_reaction.user_id', user.id)
      .single()

    if (postError || !post) {
      throw new Error('Post not found');
    }

    // Get privacy-filtered reactions for this post
    const { data: filteredReactions } = await supabaseClient
      .rpc('get_visible_reactions', {
        viewer_id: user.id,
        post_id_param: postId
      });

    const reactions = filteredReactions || [];
    const userReaction = reactions.find((r: any) => r.reaction_user_id === user.id) || null;

    // Track the post view
    try {
      await supabaseClient.rpc('track_post_view', {
        p_post_id: postId,
        p_user_id: user.id,
        p_context: JSON.stringify({
          source: 'post_detail',
          timestamp: new Date().toISOString()
        })
      })
    } catch (viewError) {
      // Don't fail the request if view tracking fails
      console.warn('View tracking failed:', viewError)
    }

    return Response.json({
      success: true,
      post: {
        ...post,
        // Replace reactions with privacy-filtered ones
        reactions: reactions.map((r: any) => ({
          id: r.reaction_id,
          user_id: r.reaction_user_id,
          created_at: r.reaction_created_at
        })),
        user_reaction: userReaction ? {
          id: userReaction.reaction_id,
          user_id: userReaction.reaction_user_id,
          created_at: userReaction.reaction_created_at
        } : null
      }
    }, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get post error:', error);
    
    let statusCode = 500;
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    if (errorMessage.includes('Invalid postId') ||
        errorMessage.includes('Only POST method is allowed')) {
      statusCode = 400;
    } else if (errorMessage.includes('Invalid or expired token') ||
               errorMessage.includes('Missing authorization header')) {
      statusCode = 401;
    } else if (errorMessage.includes('Post not found') ||
               errorMessage.includes('User profile not found')) {
      statusCode = 404;
    }

    return Response.json({
      success: false,
      error: errorMessage
    }, {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});