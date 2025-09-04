import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Comment {
  id: number;
  content: string;
  giphy_url: string | null;
  post_id: number;
  parent_comment_id: number | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  user_profiles: {
    username: string;
    avatar_url: string | null;
    university_id: number;
  };
}

interface GetCommentsResponse {
  success: boolean;
  comments: Comment[];
  hasMore: boolean;
  totalCount: number;
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

    // Parse request body
    const { postId, limit = 50, offset = 0 } = await req.json();

    if (!postId || typeof postId !== 'number') {
      throw new Error('Invalid postId: must be a number');
    }

    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    if (offset < 0) {
      throw new Error('Offset must be non-negative');
    }

    // Verify post exists and user can see it
    const { data: post, error: postError } = await supabaseClient
      .from('posts')
      .select('id, is_flagged, user_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      throw new Error('Post not found');
    }

    if (post.is_flagged && post.user_id !== user.id) {
      throw new Error('Post not found');
    }

    // Get all comments for the post (2-level structure)
    const { data: comments, error: commentsError } = await supabaseClient
      .from('comments')
      .select(`
        id,
        content,
        giphy_url,
        post_id,
        parent_comment_id,
        user_id,
        created_at,
        updated_at,
        user_profiles!comments_user_id_user_profiles_fkey (
          username,
          avatar_url,
          university_id
        )
      `)
      .eq('post_id', postId)
      .eq('is_flagged', false)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      throw new Error('Failed to fetch comments');
    }

    // Get total count for pagination
    const { count: totalCount } = await supabaseClient
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
      .eq('is_flagged', false);

    const response: GetCommentsResponse = {
      success: true,
      comments: comments || [],
      hasMore: (offset + limit) < (totalCount || 0),
      totalCount: totalCount || 0
    };

    return Response.json(response, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get comments error:', error);
    
    let statusCode = 500;
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    if (errorMessage.includes('Invalid postId') ||
        errorMessage.includes('Limit must be between') ||
        errorMessage.includes('Offset must be non-negative') ||
        errorMessage.includes('Only POST method is allowed')) {
      statusCode = 400;
    } else if (errorMessage.includes('Invalid or expired token') ||
               errorMessage.includes('Missing authorization header')) {
      statusCode = 401;
    } else if (errorMessage.includes('Post not found')) {
      statusCode = 404;
    }

    return Response.json({
      success: false,
      comments: [],
      hasMore: false,
      totalCount: 0,
      error: errorMessage
    }, {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});