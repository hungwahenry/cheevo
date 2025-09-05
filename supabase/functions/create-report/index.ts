import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ContentType = 'post' | 'comment' | 'user';

interface CreateReportRequest {
  contentType: ContentType;
  contentId: number;
  reason: string;
}

interface CreateReportResponse {
  success: boolean;
  message: string;
  reportId?: number;
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
    const requestBody: CreateReportRequest = await req.json();
    const { contentType, contentId, reason } = requestBody;

    // Validate required parameters
    if (!contentType || !['post', 'comment', 'user'].includes(contentType)) {
      throw new Error('Invalid content type. Must be post, comment, or user');
    }

    if (!contentId || typeof contentId !== 'number' || contentId <= 0) {
      throw new Error('Invalid content ID. Must be a positive number');
    }

    if (!reason?.trim()) {
      throw new Error('Report reason cannot be empty');
    }

    if (reason.trim().length > 500) {
      throw new Error('Report reason cannot exceed 500 characters');
    }

    console.log(`Creating report for ${contentType} ${contentId} by user ${user.id}`);

    // Verify the reported content exists and is accessible
    let contentExists = false;
    let contentOwner = null;

    switch (contentType) {
      case 'post':
        const { data: post, error: postError } = await supabaseClient
          .from('posts')
          .select('id, user_id, is_flagged')
          .eq('id', contentId)
          .single();

        if (postError || !post) {
          throw new Error('Post not found or inaccessible');
        }

        if (post.user_id === user.id) {
          throw new Error('You cannot report your own content');
        }

        contentExists = true;
        contentOwner = post.user_id;
        break;

      case 'comment':
        const { data: comment, error: commentError } = await supabaseClient
          .from('comments')
          .select('id, user_id, is_flagged')
          .eq('id', contentId)
          .single();

        if (commentError || !comment) {
          throw new Error('Comment not found or inaccessible');
        }

        if (comment.user_id === user.id) {
          throw new Error('You cannot report your own content');
        }

        contentExists = true;
        contentOwner = comment.user_id;
        break;

      case 'user':
        const { data: reportedUser, error: userProfileError } = await supabaseClient
          .from('user_profiles')
          .select('id')
          .eq('id', contentId)
          .single();

        if (userProfileError || !reportedUser) {
          throw new Error('User not found');
        }

        if (reportedUser.id === user.id) {
          throw new Error('You cannot report yourself');
        }

        contentExists = true;
        contentOwner = reportedUser.id;
        break;

      default:
        throw new Error('Invalid content type');
    }

    if (!contentExists) {
      throw new Error('Content not found');
    }

    // Create the report
    const { data: report, error: reportError } = await supabaseClient
      .from('reports')
      .insert({
        reporter_user_id: user.id,
        reported_content_type: contentType,
        reported_content_id: contentId,
        reason: reason.trim()
      })
      .select('id')
      .single();

    if (reportError) {
      console.error('Error creating report:', reportError);
      
      // Check if this is a duplicate report (unique constraint violation)
      if (reportError.code === '23505' && reportError.message?.includes('reports_unique_per_user_content')) {
        throw new Error('You have already reported this content');
      }
      
      throw new Error('Failed to create report in database');
    }

    const reportId = report.id;

    // Log the report creation for monitoring
    console.log('Report created successfully:', {
      reportId,
      contentType,
      contentId,
      reporterUserId: user.id,
      contentOwner,
      reason: reason.substring(0, 100) + (reason.length > 100 ? '...' : ''),
      timestamp: new Date().toISOString()
    });

    const response: CreateReportResponse = {
      success: true,
      message: 'Report submitted successfully. Thank you for helping keep our community safe.',
      reportId,
      timestamp: new Date().toISOString()
    };

    return Response.json(response, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Create report function error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Determine appropriate status code based on error type
    let statusCode = 500;
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    if (errorMessage.includes('Invalid content type') ||
        errorMessage.includes('Invalid content ID') ||
        errorMessage.includes('Report reason cannot be empty') ||
        errorMessage.includes('Report reason cannot exceed') ||
        errorMessage.includes('Only POST method is allowed')) {
      statusCode = 400;
    } else if (errorMessage.includes('Invalid or expired token') ||
               errorMessage.includes('Missing authorization header')) {
      statusCode = 401;
    } else if (errorMessage.includes('You cannot report')) {
      statusCode = 403;
    } else if (errorMessage.includes('You have already reported')) {
      statusCode = 409;
    } else if (errorMessage.includes('not found') ||
               errorMessage.includes('inaccessible')) {
      statusCode = 404;
    }

    const errorResponse: CreateReportResponse = {
      success: false,
      message: errorMessage,
      timestamp: new Date().toISOString()
    };

    return Response.json(errorResponse, {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});