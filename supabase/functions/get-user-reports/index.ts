import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportWithContent {
  id: number;
  reporter_user_id: string;
  reported_content_type: 'post' | 'comment' | 'user';
  reported_content_id: number;
  reason: string;
  status: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  reported_content?: {
    content: string;
    author_username?: string;
    created_at?: string;
    is_deleted?: boolean;
  };
}

interface GetUserReportsResponse {
  success: boolean;
  reports?: ReportWithContent[];
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

    console.log('Fetching reports for user:', user.id);

    // Get user's reports
    const { data: reports, error: reportsError } = await supabaseClient
      .from('reports')
      .select('*')
      .eq('reporter_user_id', user.id)
      .order('created_at', { ascending: false });

    if (reportsError) {
      console.error('Error fetching reports:', reportsError);
      throw new Error('Failed to fetch reports');
    }

    // Fetch content details for each report
    const reportsWithContent: ReportWithContent[] = [];
    
    for (const report of reports || []) {
      const reportWithContent: ReportWithContent = { ...report };
      
      try {
        if (report.reported_content_type === 'post') {
          // Fetch post content with separate user profile query
          const { data: post, error: postError } = await supabaseClient
            .from('posts')
            .select('content, created_at, user_id')
            .eq('id', report.reported_content_id)
            .single();

          if (!postError && post) {
            // Get user profile separately
            const { data: userProfile } = await supabaseClient
              .from('user_profiles')
              .select('username')
              .eq('id', post.user_id)
              .single();

            reportWithContent.reported_content = {
              content: post.content,
              author_username: userProfile?.username,
              created_at: post.created_at,
              is_deleted: false
            };
          } else {
            console.warn(`Post ${report.reported_content_id} not found:`, postError);
            reportWithContent.reported_content = {
              content: '[Post no longer available]',
              is_deleted: true
            };
          }
        } else if (report.reported_content_type === 'comment') {
          // Fetch comment content with separate user profile query
          const { data: comment, error: commentError } = await supabaseClient
            .from('comments')
            .select('content, created_at, user_id')
            .eq('id', report.reported_content_id)
            .single();

          if (!commentError && comment) {
            // Get user profile separately
            const { data: userProfile } = await supabaseClient
              .from('user_profiles')
              .select('username')
              .eq('id', comment.user_id)
              .single();

            reportWithContent.reported_content = {
              content: comment.content,
              author_username: userProfile?.username,
              created_at: comment.created_at,
              is_deleted: false
            };
          } else {
            console.warn(`Comment ${report.reported_content_id} not found:`, commentError);
            reportWithContent.reported_content = {
              content: '[Comment no longer available]',
              is_deleted: true
            };
          }
        } else if (report.reported_content_type === 'user') {
          // Fetch user profile info
          const { data: userProfile, error: userError } = await supabaseClient
            .from('user_profiles')
            .select('username, created_at')
            .eq('id', report.reported_content_id)
            .single();

          if (!userError && userProfile) {
            reportWithContent.reported_content = {
              content: `User profile: @${userProfile.username}`,
              author_username: userProfile.username,
              created_at: userProfile.created_at,
              is_deleted: false
            };
          } else {
            reportWithContent.reported_content = {
              content: '[User profile no longer available]',
              is_deleted: true
            };
          }
        }
      } catch (contentError) {
        console.warn(`Failed to fetch content for report ${report.id}:`, contentError);
        reportWithContent.reported_content = {
          content: '[Content no longer available]',
          is_deleted: true
        };
      }
      
      reportsWithContent.push(reportWithContent);
    }

    const response: GetUserReportsResponse = {
      success: true,
      reports: reportsWithContent,
      timestamp: new Date().toISOString()
    };

    console.log(`Successfully fetched ${reportsWithContent.length} reports with content for user ${user.id}`);

    return Response.json(response, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get user reports function error:', {
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

    const errorResponse: GetUserReportsResponse = {
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