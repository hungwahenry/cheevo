import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrackViewRequest {
  postId: number;
  context?: {
    source?: string; // 'feed' | 'profile' | 'detail' | 'search' | etc
    algorithm?: string; // For analytics
    scope?: string; // For analytics
  };
}

interface TrackViewResponse {
  success: boolean;
  message: string;
  tracked: boolean; // Whether this was a new unique view
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return Response.json(
      { success: false, message: 'Only POST method is allowed', tracked: false },
      { status: 405, headers: corsHeaders }
    );
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

    // Parse request
    const { postId, context = {} }: TrackViewRequest = await req.json();

    if (!postId || typeof postId !== 'number') {
      throw new Error('Invalid postId provided');
    }

    // Get current view count before insert (for comparison)
    const { data: preBefore, error: preError } = await supabaseClient
      .from('posts')
      .select('views_count')
      .eq('id', postId)
      .single();

    if (preError) {
      throw new Error(`Post ${postId} not found: ${preError.message}`);
    }

    const viewsCountBefore = preBefore.views_count || 0;

    // Insert view - the database trigger handles all deduplication logic
    const { error: insertError } = await supabaseClient
      .from('post_views')
      .insert({
        post_id: postId,
        user_id: user.id
      });

    if (insertError) {
      throw new Error(`Failed to insert view: ${insertError.message}`);
    }

    // Get view count after insert to see if it actually incremented
    const { data: postAfter, error: afterError } = await supabaseClient
      .from('posts')
      .select('views_count')
      .eq('id', postId)
      .single();

    if (afterError) {
      throw afterError;
    }

    const viewsCountAfter = postAfter.views_count || 0;
    const wasNewView = viewsCountAfter > viewsCountBefore;

    const response: TrackViewResponse = {
      success: true,
      message: wasNewView ? 'View tracked successfully' : 'Duplicate view ignored',
      tracked: wasNewView
    };

    return Response.json(response, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Track view error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    const statusCode = error instanceof Error && error.message.includes('Invalid or expired token') ? 401 :
                      error instanceof Error && error.message.includes('not found') ? 404 : 500;

    return Response.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to track view',
        tracked: false
      },
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});