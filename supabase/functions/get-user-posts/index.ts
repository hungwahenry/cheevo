import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GetUserPostsRequest {
  userId: string;
  limit?: number;
  offset?: number;
}

interface UserPost {
  id: number;
  content: string;
  giphy_url: string | null;
  user_id: string;
  university_id: number;
  reactions_count: number;
  comments_count: number;
  views_count: number;
  is_trending: boolean;
  trending_score: number;
  is_flagged: boolean;
  created_at: string;
  updated_at: string;
  can_react: boolean;
  can_comment: boolean;
  user_profiles: {
    username: string;
    avatar_url: string | null;
    trending_score: number | null;
    university_id: number;
    who_can_react: string;
    who_can_comment: string;
  } | null;
  universities: {
    name: string;
    short_name: string | null;
    state: string;
  } | null;
  reactions: Array<{
    id: number;
    user_id: string;
    created_at: string;
  }>;
  user_reaction?: {
    id: number;
    user_id: string;
    created_at: string;
  } | null;
}

interface GetUserPostsResponse {
  success: boolean;
  data?: UserPost[];
  error?: string;
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

    // Parse request body
    const requestBody: GetUserPostsRequest = await req.json();
    const { userId, limit = 20, offset = 0 } = requestBody;

    // Validate userId
    if (!userId?.trim()) {
      throw new Error('User ID is required');
    }

    // Check if viewer can access this user's posts
    if (userId !== user.id) {
      const { data: canView, error: privacyError } = await supabaseClient
        .rpc('can_view_posts', {
          viewer_id: user.id,
          target_id: userId
        });

      if (privacyError) {
        console.error('Privacy check error:', privacyError);
        throw new Error('Failed to check post permissions');
      }

      if (!canView) {
        throw new Error('User posts are private or not accessible');
      }
    }

    // Validate pagination parameters
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    if (offset < 0) {
      throw new Error('Offset must be non-negative');
    }

    // Get user posts with full FeedPost data
    const { data: posts, error } = await supabaseClient
      .from('posts')
      .select(`
        id,
        content,
        giphy_url,
        user_id,
        university_id,
        reactions_count,
        comments_count,
        views_count,
        is_trending,
        trending_score,
        is_flagged,
        created_at,
        updated_at,
        user_profiles!posts_user_id_user_profiles_fkey (
          username,
          avatar_url,
          trending_score,
          university_id,
          who_can_react,
          who_can_comment
        ),
        universities!posts_university_id_fkey (
          name,
          short_name,
          state
        ),
        reactions!reactions_post_id_fkey (
          id,
          user_id,
          created_at
        )
      `)
      .eq('user_id', userId.trim())
      .eq('is_flagged', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(error.message);
    }

    // Process posts to add user reactions, privacy states, and filter blocked users
    const processedPosts: UserPost[] = await Promise.all((posts || []).map(async (post: any) => {
      // Get privacy-filtered reactions
      const { data: filteredReactions } = await supabaseClient
        .rpc('get_visible_reactions', {
          viewer_id: user.id,
          post_id_param: post.id
        });
      
      const reactions = filteredReactions || [];
      const userReaction = reactions.find((r: any) => r.reaction_user_id === user.id) || null;
      
      // Precompute privacy-based disabled states using database functions
      const { data: canReact } = await supabaseClient
        .rpc('can_react_to_posts', {
          viewer_id: user.id,
          target_id: post.user_id
        });
        
      const { data: canComment } = await supabaseClient
        .rpc('can_comment_on_posts', {
          viewer_id: user.id,
          target_id: post.user_id
        });
      
      return {
        ...post,
        user_reaction: userReaction ? {
          id: userReaction.reaction_id,
          user_id: userReaction.reaction_user_id,
          created_at: userReaction.reaction_created_at
        } : null,
        reactions: reactions.map((r: any) => ({
          id: r.reaction_id,
          user_id: r.reaction_user_id,
          created_at: r.reaction_created_at
        })),
        reactions_count: post.reactions_count || 0,
        comments_count: post.comments_count || 0,
        views_count: post.views_count || 0,
        is_trending: post.is_trending || false,
        trending_score: post.trending_score || 0,
        is_flagged: post.is_flagged || false,
        // Add privacy-based interaction permissions
        can_react: canReact === true,
        can_comment: canComment === true,
      };
    }));

    const response: GetUserPostsResponse = {
      success: true,
      data: processedPosts,
      timestamp: new Date().toISOString()
    };

    return Response.json(response, { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get user posts function error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Determine appropriate status code based on error type
    let statusCode = 500;
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    if (errorMessage.includes('Only POST method is allowed') ||
        errorMessage.includes('User ID is required') ||
        errorMessage.includes('Limit must be between') ||
        errorMessage.includes('Offset must be non-negative')) {
      statusCode = 400;
    } else if (errorMessage.includes('Invalid or expired token') || 
               errorMessage.includes('Missing authorization header')) {
      statusCode = 401;
    } else if (errorMessage.includes('User posts are private or not accessible')) {
      statusCode = 403;
    }

    const errorResponse: GetUserPostsResponse = {
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    };

    return Response.json(errorResponse, { 
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});