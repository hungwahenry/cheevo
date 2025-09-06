import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GetNotificationSettingsResponse {
  success: boolean;
  settings?: {
    social_notifications: boolean;
    content_notifications: boolean;
    trending_notifications: boolean;
    community_notifications: boolean;
  };
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

    console.log('Getting notification settings for user:', user.id);

    // Get user's notification settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('user_profiles')
      .select('social_notifications, content_notifications, trending_notifications, community_notifications')
      .eq('id', user.id)
      .single();

    if (settingsError) {
      console.error('Error fetching notification settings:', settingsError);
      throw new Error('Failed to fetch notification settings');
    }

    const response: GetNotificationSettingsResponse = {
      success: true,
      settings: settings,
      timestamp: new Date().toISOString()
    };

    console.log('Notification settings fetched successfully:', {
      userId: user.id,
      settings: settings,
      timestamp: new Date().toISOString()
    });

    return Response.json(response, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get notification settings function error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Determine appropriate status code
    let statusCode = 500;
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    if (errorMessage.includes('Only POST method is allowed')) {
      statusCode = 400;
    } else if (errorMessage.includes('Invalid or expired token') ||
               errorMessage.includes('Missing authorization header')) {
      statusCode = 401;
    }

    const errorResponse: GetNotificationSettingsResponse = {
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