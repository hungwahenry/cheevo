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
  id: string;
  content: string;
  giphy_url: string | null;
  reactions_count: number;
  comments_count: number;
  views_count: number;
  trending_score: number;
  is_trending: boolean;
  created_at: string;
  user_id: string;
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

    // Get user likes (posts they've reacted to)
    const { data: likes, error } = await supabaseClient
      .from('reactions')
      .select(`
        id,
        created_at,
        posts(
          id,
          content,
          giphy_url,
          reactions_count,
          comments_count,
          views_count,
          trending_score,
          is_trending,
          created_at,
          user_id
        )
      `)
      .eq('user_id', userId.trim())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(error.message);
    }

    // Transform likes to show the posts they liked
    const likedPosts: LikedPost[] = (likes || [])
      .map(like => like.posts)
      .filter(post => post && post.id) as LikedPost[];

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