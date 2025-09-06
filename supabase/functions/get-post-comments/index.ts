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

    // Get privacy-filtered comments
    const { data: filteredComments, error: commentsError } = await supabaseClient
      .rpc('get_visible_comments', {
        viewer_id: user.id,
        post_id_param: postId
      });

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      throw new Error('Failed to fetch comments');
    }

    // Apply pagination to filtered results
    const paginatedComments = (filteredComments || []).slice(offset, offset + limit);
    
    // Get user profiles for the paginated comments
    const commentsWithProfiles = await Promise.all(
      paginatedComments.map(async (comment: any) => {
        const { data: profile } = await supabaseClient
          .from('user_profiles')
          .select('username, avatar_url, university_id')
          .eq('id', comment.comment_user_id)
          .single();

        return {
          id: comment.comment_id,
          content: comment.comment_content,
          giphy_url: null, // Not included in privacy function yet
          post_id: postId,
          parent_comment_id: null, // Not included in privacy function yet  
          user_id: comment.comment_user_id,
          created_at: comment.comment_created_at,
          updated_at: comment.comment_updated_at,
          user_profiles: profile || null
        };
      })
    );

    const totalCount = (filteredComments || []).length;

    const response: GetCommentsResponse = {
      success: true,
      comments: commentsWithProfiles,
      hasMore: (offset + limit) < totalCount,
      totalCount: totalCount
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