import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdatePrivacySettingsRequest {
  profileVisibility?: 'everyone' | 'university' | 'nobody';
  whoCanReact?: 'everyone' | 'university';
  whoCanComment?: 'everyone' | 'university';
}

interface UpdatePrivacySettingsResponse {
  success: boolean;
  message: string;
  settings?: {
    profile_visibility: string;
    who_can_react: string;
    who_can_comment: string;
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
    const requestBody: UpdatePrivacySettingsRequest = await req.json();
    const { profileVisibility, whoCanReact, whoCanComment } = requestBody;

    // Build update object with only provided fields
    const updates: any = {};
    if (profileVisibility !== undefined) {
      updates.profile_visibility = profileVisibility;
    }
    if (whoCanReact !== undefined) {
      updates.who_can_react = whoCanReact;
    }
    if (whoCanComment !== undefined) {
      updates.who_can_comment = whoCanComment;
    }

    // Validate at least one field is provided
    if (Object.keys(updates).length === 0) {
      throw new Error('At least one privacy setting must be provided');
    }

    console.log('Updating privacy settings for user:', {
      userId: user.id,
      updates,
      timestamp: new Date().toISOString()
    });

    // Update user profile with new privacy settings
    const { data: updatedProfile, error: updateError } = await supabaseClient
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
      .select('profile_visibility, who_can_react, who_can_comment')
      .single();

    if (updateError) {
      console.error('Error updating privacy settings:', updateError);
      throw new Error('Failed to update privacy settings');
    }

    const response: UpdatePrivacySettingsResponse = {
      success: true,
      message: 'Privacy settings updated successfully',
      settings: updatedProfile,
      timestamp: new Date().toISOString()
    };

    console.log('Privacy settings updated successfully:', {
      userId: user.id,
      newSettings: updatedProfile,
      timestamp: new Date().toISOString()
    });

    return Response.json(response, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Update privacy settings function error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Determine appropriate status code based on error type
    let statusCode = 500;
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    if (errorMessage.includes('At least one privacy setting must be provided') ||
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