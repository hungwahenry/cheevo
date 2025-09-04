import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GetUserLikesRequest {
  userId: string;
  limit?: number;
  offset?: number;
}

interface LikedPost {
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

interface GetUserLikesResponse {
  success: boolean;
  data?: LikedPost[];
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
    const requestBody: GetUserLikesRequest = await req.json();
    const { userId, limit = 20, offset = 0 } = requestBody;

    // Validate userId
    if (!userId?.trim()) {
      throw new Error('User ID is required');
    }

    // Validate pagination parameters
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    if (offset < 0) {
      throw new Error('Offset must be non-negative');
    }

    // Get user likes (posts they've reacted to) with full FeedPost data
    const { data: likes, error } = await supabaseClient
      .from('reactions')
      .select(`
        id,
        created_at,
        posts(
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
        )
      `)
      .eq('user_id', userId.trim())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(error.message);
    }

    // Transform likes to show the posts they liked with proper FeedPost format
    const likedPosts: LikedPost[] = (likes || [])
      .map(like => like.posts)
      .filter(post => post && post.id)
      .map(post => {
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
      }) as LikedPost[];

    const response: GetUserLikesResponse = {
      success: true,
      data: likedPosts,
      timestamp: new Date().toISOString()
    };

    return Response.json(response, { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get user likes function error:', {
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
    }

    const errorResponse: GetUserLikesResponse = {
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