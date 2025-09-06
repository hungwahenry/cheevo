import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GetUserProfileRequest {
  userId?: string; // Optional - defaults to current user
}

interface UserProfile {
  id: string;
  email: string;
  username: string;
  universityId: number;
  bio: string | null;
  avatarUrl: string | null;
  postsCount: number;
  reactionsReceived: number;
  commentsCount: number;
  totalViews: number;
  trendingScore: number;
  university?: {
    id: number;
    name: string;
    shortName: string | null;
    state: string;
  };
  createdAt: string;
  updatedAt: string;
  isBlocked?: boolean;
}

interface GetUserProfileResponse {
  success: boolean;
  data?: UserProfile;
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
    const requestBody: GetUserProfileRequest = await req.json();
    const targetUserId = requestBody.userId || user.id;

    // Check if viewer can access this profile
    if (targetUserId !== user.id) {
      const { data: canView, error: privacyError } = await supabaseClient
        .rpc('can_view_profile', {
          viewer_id: user.id,
          target_id: targetUserId
        });

      if (privacyError) {
        console.error('Privacy check error:', privacyError);
        throw new Error('Failed to check profile permissions');
      }

      if (!canView) {
        throw new Error('Profile is private or not accessible');
      }
    }

    // Get user profile
    const { data: profile, error } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('id', targetUserId)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (!profile) {
      throw new Error('User profile not found');
    }

    // Get university info separately to avoid complex join issues
    const { data: university, error: uniError } = await supabaseClient
      .from('universities')
      .select('id, name, short_name, state')
      .eq('id', profile.university_id)
      .single();

    // University fetch error is not critical - we can proceed without it
    if (uniError) {
      console.warn('University lookup failed:', uniError.message);
    }

    // Check if current user has blocked the target user (only when viewing other profiles)
    let isBlocked = false;
    if (targetUserId !== user.id) {
      const { data: blockCheck } = await supabaseClient
        .from('blocked_users')
        .select('id')
        .eq('blocker_user_id', user.id)
        .eq('blocked_user_id', targetUserId)
        .single();
      
      isBlocked = !!blockCheck;
    }
    
    // Transform database format to UserProfile type
    const userProfile: UserProfile = {
      id: profile.id,
      email: profile.email,
      username: profile.username,
      universityId: profile.university_id,
      bio: profile.bio,
      avatarUrl: profile.avatar_url,
      postsCount: profile.posts_count || 0,
      reactionsReceived: profile.reactions_received || 0,
      commentsCount: profile.comments_count || 0,
      totalViews: profile.total_views || 0,
      trendingScore: Number(profile.trending_score) || 0,
      university: university ? {
        id: university.id,
        name: university.name,
        shortName: university.short_name,
        state: university.state,
      } : undefined,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      isBlocked: targetUserId !== user.id ? isBlocked : undefined,
    };

    const response: GetUserProfileResponse = {
      success: true,
      data: userProfile,
      timestamp: new Date().toISOString()
    };

    return Response.json(response, { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get user profile function error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Determine appropriate status code based on error type
    let statusCode = 500;
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    if (errorMessage.includes('Only POST method is allowed')) {
      statusCode = 400;
    } else if (errorMessage.includes('Invalid or expired token') || 
               errorMessage.includes('Missing authorization header')) {
      statusCode = 401;
    } else if (errorMessage.includes('Profile is private or not accessible')) {
      statusCode = 403;
    } else if (errorMessage.includes('User profile not found')) {
      statusCode = 404;
    }

    const errorResponse: GetUserProfileResponse = {
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