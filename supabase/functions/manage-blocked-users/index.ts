import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BlockUserRequest {
  action: 'block' | 'unblock' | 'list';
  targetUserId?: string;
}

interface BlockedUser {
  id: number;
  blocked_user_id: string;
  created_at: string;
  blocked_user_info?: {
    username: string;
    university_name?: string;
  };
}

interface ManageBlockedUsersResponse {
  success: boolean;
  message: string;
  data?: BlockedUser[] | null;
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

    // Parse request
    const requestBody: BlockUserRequest = await req.json();
    const { action, targetUserId } = requestBody;

    if (!action || !['block', 'unblock', 'list'].includes(action)) {
      throw new Error('Invalid action. Must be "block", "unblock", or "list"');
    }

    console.log('Managing blocked users:', {
      userId: user.id,
      action,
      targetUserId,
      timestamp: new Date().toISOString()
    });

    if (action === 'list') {
      // Get list of blocked users with their info using explicit join
      const { data: blockedUsers, error: listError } = await supabaseClient
        .from('blocked_users')
        .select(`
          id,
          blocked_user_id,
          created_at
        `)
        .eq('blocker_user_id', user.id)
        .order('created_at', { ascending: false });

      if (listError) {
        console.error('Error fetching blocked users:', listError);
        throw new Error('Failed to fetch blocked users');
      }

      // Get user profile info for each blocked user
      const blockedUsersWithInfo = [];
      for (const blockedUser of blockedUsers || []) {
        const { data: userProfile, error: profileError } = await supabaseClient
          .from('user_profiles')
          .select(`
            username,
            university:universities (name)
          `)
          .eq('id', blockedUser.blocked_user_id)
          .single();

        blockedUsersWithInfo.push({
          id: blockedUser.id,
          blocked_user_id: blockedUser.blocked_user_id,
          created_at: blockedUser.created_at,
          blocked_user_info: userProfile ? {
            username: userProfile.username,
            university_name: userProfile.university?.name || undefined
          } : {
            username: 'Unknown User',
            university_name: undefined
          }
        });
      }

      const response: ManageBlockedUsersResponse = {
        success: true,
        message: `Found ${blockedUsersWithInfo.length} blocked users`,
        data: blockedUsersWithInfo,
        timestamp: new Date().toISOString()
      };

      return Response.json(response, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // For block/unblock actions, targetUserId is required
    if (!targetUserId) {
      throw new Error('targetUserId is required for block/unblock actions');
    }

    // Prevent users from blocking themselves
    if (targetUserId === user.id) {
      throw new Error('You cannot block yourself');
    }

    // Verify target user exists
    const { data: targetUser, error: targetError } = await supabaseClient
      .from('user_profiles')
      .select('id, username')
      .eq('id', targetUserId)
      .single();

    if (targetError || !targetUser) {
      throw new Error('Target user not found');
    }

    if (action === 'block') {
      // Block the user
      const { error: blockError } = await supabaseClient
        .from('blocked_users')
        .insert({
          blocker_user_id: user.id,
          blocked_user_id: targetUserId
        });

      if (blockError) {
        if (blockError.code === '23505') { // Unique constraint violation
          throw new Error('User is already blocked');
        }
        console.error('Error blocking user:', blockError);
        throw new Error('Failed to block user');
      }

      const response: ManageBlockedUsersResponse = {
        success: true,
        message: `Successfully blocked user ${targetUser.username}`,
        timestamp: new Date().toISOString()
      };

      console.log('User blocked successfully:', {
        blocker: user.id,
        blocked: targetUserId,
        timestamp: new Date().toISOString()
      });

      return Response.json(response, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'unblock') {
      // Unblock the user
      const { error: unblockError } = await supabaseClient
        .from('blocked_users')
        .delete()
        .eq('blocker_user_id', user.id)
        .eq('blocked_user_id', targetUserId);

      if (unblockError) {
        console.error('Error unblocking user:', unblockError);
        throw new Error('Failed to unblock user');
      }

      const response: ManageBlockedUsersResponse = {
        success: true,
        message: `Successfully unblocked user ${targetUser.username}`,
        timestamp: new Date().toISOString()
      };

      console.log('User unblocked successfully:', {
        blocker: user.id,
        unblocked: targetUserId,
        timestamp: new Date().toISOString()
      });

      return Response.json(response, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Manage blocked users function error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Determine appropriate status code based on error type
    let statusCode = 500;
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    if (errorMessage.includes('Invalid action') ||
        errorMessage.includes('targetUserId is required') ||
        errorMessage.includes('You cannot block yourself') ||
        errorMessage.includes('Only POST method is allowed')) {
      statusCode = 400;
    } else if (errorMessage.includes('Invalid or expired token') ||
               errorMessage.includes('Missing authorization header')) {
      statusCode = 401;
    } else if (errorMessage.includes('Target user not found')) {
      statusCode = 404;
    } else if (errorMessage.includes('User is already blocked')) {
      statusCode = 409;
    }

    return Response.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      },
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});