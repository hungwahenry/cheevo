import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateNotificationSettingsRequest {
  socialNotifications?: boolean;
  contentNotifications?: boolean;
  trendingNotifications?: boolean;
  communityNotifications?: boolean;
}

interface UpdateNotificationSettingsResponse {
  success: boolean;
  message: string;
  settings?: {
    social_notifications: boolean;
    content_notifications: boolean;
    trending_notifications: boolean;
    community_notifications: boolean;
  };
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
    const requestBody: UpdateNotificationSettingsRequest = await req.json();
    const { socialNotifications, contentNotifications, trendingNotifications, communityNotifications } = requestBody;

    // Build update object with only provided fields
    const updates: any = {};
    if (socialNotifications !== undefined) {
      updates.social_notifications = socialNotifications;
    }
    if (contentNotifications !== undefined) {
      updates.content_notifications = contentNotifications;
    }
    if (trendingNotifications !== undefined) {
      updates.trending_notifications = trendingNotifications;
    }
    if (communityNotifications !== undefined) {
      updates.community_notifications = communityNotifications;
    }

    // Validate at least one field is provided
    if (Object.keys(updates).length === 0) {
      throw new Error('At least one notification setting must be provided');
    }

    console.log('Updating notification settings for user:', {
      userId: user.id,
      updates,
      timestamp: new Date().toISOString()
    });

    // Update user profile with new notification settings
    const { data: updatedProfile, error: updateError } = await supabaseClient
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
      .select('social_notifications, content_notifications, trending_notifications, community_notifications')
      .single();

    if (updateError) {
      console.error('Error updating notification settings:', updateError);
      throw new Error('Failed to update notification settings');
    }

    const response: UpdateNotificationSettingsResponse = {
      success: true,
      message: 'Notification settings updated successfully',
      settings: updatedProfile,
      timestamp: new Date().toISOString()
    };

    console.log('Notification settings updated successfully:', {
      userId: user.id,
      newSettings: updatedProfile,
      timestamp: new Date().toISOString()
    });

    return Response.json(response, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Update notification settings function error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Determine appropriate status code based on error type
    let statusCode = 500;
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    if (errorMessage.includes('At least one notification setting must be provided') ||
        errorMessage.includes('Only POST method is allowed')) {
      statusCode = 400;
    } else if (errorMessage.includes('Invalid or expired token') ||
               errorMessage.includes('Missing authorization header')) {
      statusCode = 401;
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