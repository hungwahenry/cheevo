import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GetFeedRequest {
  algorithm: 'chronological' | 'trending' | 'engagement' | 'balanced' | 'discovery';
  scope: 'campus' | 'global';
  limit?: number;
  offset?: number;
}

interface FeedPost {
  id: number;
  content: string;
  giphy_url: string | null;
  user_id: string;
  university_id: number;
  reactions_count: number | null;
  comments_count: number | null;
  views_count: number | null;
  is_trending: boolean | null;
  trending_score: number | null;
  is_flagged: boolean | null;
  created_at: string;
  updated_at: string;
  
  user_profiles: {
    username: string;
    avatar_url: string | null;
    trending_score: number | null;
    university_id: number;
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

interface FeedResponse {
  posts: FeedPost[];
  hasMore: boolean;
  nextOffset: number;
  algorithm: string;
  config: {
    showReactionCounts: boolean;
    showCommentCounts: boolean;
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

    // Get user profile for university_id
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('university_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      throw new Error('User profile not found');
    }

    // Parse request
    const requestBody: GetFeedRequest = await req.json();
    const { 
      algorithm, 
      scope, 
      limit: requestLimit = 20, 
      offset = 0 
    } = requestBody;

    // Validate required parameters
    if (!algorithm || !scope) {
      throw new Error('Missing required parameters: algorithm and scope are required');
    }

    // Validate algorithm
    const validAlgorithms = ['chronological', 'trending', 'engagement', 'balanced', 'discovery'];
    if (!validAlgorithms.includes(algorithm)) {
      throw new Error(`Invalid algorithm: ${algorithm}. Valid options: ${validAlgorithms.join(', ')}`);
    }

    // Validate scope
    const validScopes = ['campus', 'global'];
    if (!validScopes.includes(scope)) {
      throw new Error(`Invalid scope: ${scope}. Valid options: ${validScopes.join(', ')}`);
    }

    // Validate limit and offset
    if (requestLimit < 1 || requestLimit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }
    if (offset < 0) {
      throw new Error('Offset must be non-negative');
    }

    const limit = Math.min(requestLimit, 50); // Max 50 posts per request

    console.log('Feed function request:', {
      algorithm,
      scope,
      limit,
      offset,
      universityId: userProfile.university_id,
      userId: user.id,
      timestamp: new Date().toISOString()
    });

    // Build base query with joins
    let query = supabaseClient
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
          university_id
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
      .eq('is_flagged', false);

    // Apply scope filtering
    if (scope === 'campus') {
      query = query.eq('university_id', userProfile.university_id);
    }

    // Apply algorithm-specific filters and ordering
    switch (algorithm) {
      case 'chronological':
        query = query.order('created_at', { ascending: false });
        break;
        
      case 'trending':
        // Simplified trending: just show trending posts (for testing)
        query = query
          .eq('is_trending', true)
          .order('trending_score', { ascending: false })
          .order('created_at', { ascending: false });
        break;
        
      case 'engagement':
        // Show posts with at least 1 reaction, ordered by engagement
        query = query
          .gte('reactions_count', 1)
          .order('reactions_count', { ascending: false })
          .order('comments_count', { ascending: false })
          .order('created_at', { ascending: false });
        break;
        
      case 'balanced':
        // Show mix of recent and trending - just use recent for simplicity
        query = query.order('created_at', { ascending: false });
        break;
        
      case 'discovery':
        // Show diverse content from last 7 days
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query
          .gte('created_at', weekAgo.toISOString())
          .order('created_at', { ascending: false });
        break;
        
      default:
        throw new Error(`Unknown algorithm: ${algorithm}`);
    }

    // Execute query with pagination
    const { data: posts, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Database query error:', error);
      throw error;
    }

    console.log('Feed query result:', {
      algorithm,
      postsCount: posts?.length || 0,
      scope,
      universityId: userProfile.university_id,
      userId: user.id,
      timestamp: new Date().toISOString()
    });

    // Process posts to add user reactions
    const processedPosts: FeedPost[] = (posts || []).map(post => {
      const reactions = post.reactions || [];
      const userReaction = reactions.find((r: any) => r.user_id === user.id) || null;
      
      return {
        ...post,
        user_reaction: userReaction,
        reactions: reactions,
        reactions_count: post.reactions_count || 0,
        comments_count: post.comments_count || 0,
        views_count: post.views_count || 0,
        is_trending: post.is_trending || false,
        trending_score: post.trending_score || 0,
        is_flagged: post.is_flagged || false,
      };
    });

    const feedResponse: FeedResponse = {
      posts: processedPosts,
      hasMore: posts ? posts.length === limit : false,
      nextOffset: offset + limit,
      algorithm,
      config: {
        showReactionCounts: true,
        showCommentCounts: true,
      }
    };

    console.log('Feed function response:', {
      algorithm: feedResponse.algorithm,
      postsCount: feedResponse.posts.length,
      hasMore: feedResponse.hasMore,
      nextOffset: feedResponse.nextOffset,
      timestamp: new Date().toISOString()
    });

    return Response.json(feedResponse, { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Feed function error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Determine appropriate status code based on error type
    let statusCode = 500;
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    if (errorMessage.includes('Missing required parameters') || 
        errorMessage.includes('Invalid algorithm') ||
        errorMessage.includes('Invalid scope') ||
        errorMessage.includes('Limit must be') ||
        errorMessage.includes('Offset must be')) {
      statusCode = 400;
    } else if (errorMessage.includes('Invalid or expired token') || 
               errorMessage.includes('Missing authorization header')) {
      statusCode = 401;
    } else if (errorMessage.includes('User profile not found')) {
      statusCode = 404;
    }

    return Response.json(
      { 
        error: errorMessage,
        posts: [],
        hasMore: false,
        nextOffset: 0,
        algorithm: 'chronological',
        timestamp: new Date().toISOString()
      },
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});