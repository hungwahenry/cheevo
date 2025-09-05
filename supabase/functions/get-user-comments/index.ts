import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GetUserCommentsRequest {
  userId: string;
  limit?: number;
  offset?: number;
}

interface UserComment {
  id: string;
  content: string;
  created_at: string;
  giphy_url: string | null;
  reactions_count: number;
  comments_count: number;
  views_count: number;
  trending_score: number;
  is_trending: boolean;
  user_id: string;
  username: string;
  originalPost?: {
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
    user_profiles?: {
      username: string;
    };
  };
}

interface GetUserCommentsResponse {
  success: boolean;
  data?: UserComment[];
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
    const requestBody: GetUserCommentsRequest = await req.json();
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

    // Get user comments
    const { data: comments, error } = await supabaseClient
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        giphy_url,
        post_id,
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
          user_id,
          user_profiles(username)
        )
      `)
      .eq('user_id', userId.trim())
      .eq('is_flagged', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(error.message);
    }

    // Transform comments to look like posts for display
    const transformedComments: UserComment[] = (comments || []).map(comment => ({
      id: comment.id,
      content: comment.content,
      created_at: comment.created_at,
      giphy_url: comment.giphy_url,
      reactions_count: 0,
      comments_count: 0,
      views_count: 0,
      trending_score: 0,
      is_trending: false,
      user_id: userId.trim(),
      username: 'You',
      // Include original post context
      originalPost: comment.posts
    }));

    const response: GetUserCommentsResponse = {
      success: true,
      data: transformedComments,
      timestamp: new Date().toISOString()
    };

    return Response.json(response, { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get user comments function error:', {
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

    const errorResponse: GetUserCommentsResponse = {
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