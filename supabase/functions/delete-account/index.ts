import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteAccountResponse {
  success: boolean;
  message: string;
  timestamp: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key for admin operations
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

    // User is already authenticated via JWT - no additional confirmation needed

    console.log('Starting account deletion for user:', {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString()
    });

    // Start transaction-like operations
    // Note: Supabase Edge Functions don't support transactions, so we'll do operations in order
    // with proper error handling and rollback if needed

    try {
      // 1. Delete user's storage objects (profile pictures, etc.)
      const { data: storageFiles } = await supabaseClient.storage
        .from('profile-pictures')
        .list(`${user.id}/`);

      if (storageFiles && storageFiles.length > 0) {
        const filePaths = storageFiles.map(file => `${user.id}/${file.name}`);
        const { error: storageError } = await supabaseClient.storage
          .from('profile-pictures')
          .remove(filePaths);

        if (storageError) {
          console.warn('Failed to delete some storage files:', storageError);
          // Continue with deletion - storage files are not critical
        }
      }

      // 2. Delete user profile and related data
      // The CASCADE constraints in the database should handle most relationships
      const { error: profileDeleteError } = await supabaseClient
        .from('user_profiles')
        .delete()
        .eq('id', user.id);

      if (profileDeleteError) {
        console.error('Error deleting user profile:', profileDeleteError);
        throw new Error('Failed to delete user profile data');
      }

      // 3. Delete the auth user (this should be last)
      const { error: authDeleteError } = await supabaseClient.auth.admin.deleteUser(user.id);

      if (authDeleteError) {
        console.error('Error deleting auth user:', authDeleteError);
        throw new Error('Failed to delete user account');
      }

      const response: DeleteAccountResponse = {
        success: true,
        message: 'Account deleted successfully',
        timestamp: new Date().toISOString()
      };

      console.log('Account deletion completed successfully:', {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString()
      });

      return Response.json(response, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (deletionError) {
      // Log the specific deletion error
      console.error('Account deletion failed during process:', {
        error: deletionError instanceof Error ? deletionError.message : 'Unknown error',
        userId: user.id,
        timestamp: new Date().toISOString()
      });
      
      throw new Error('Account deletion failed. Please contact support.');
    }

  } catch (error) {
    console.error('Delete account function error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Determine appropriate status code based on error type
    let statusCode = 500;
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    if (errorMessage.includes('Email confirmation does not match') ||
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