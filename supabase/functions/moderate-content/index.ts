import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
interface ModerationRequest {
  content: string;
  contentType: 'post' | 'comment';
  contentId?: number;
  userId: string;
}

interface ModerationResult {
  approved: boolean;
  flagged: boolean;
  action: 'approved' | 'removed' | 'manual_review';
  violations: string[];
  openaiResponse: any;
  timestamp: string;
}

interface ModerationConfig {
  category: string;
  threshold: number;
  auto_action: 'approved' | 'removed' | 'manual_review';
  applies_to: string;
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

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Parse request body
    const requestBody: ModerationRequest = await req.json();
    const { content, contentType, contentId, userId } = requestBody;

    // Validate required parameters
    if (!content?.trim()) {
      throw new Error('Content cannot be empty');
    }
    if (!contentType) {
      throw new Error('Content type is required');
    }
    if (!userId?.trim()) {
      throw new Error('User ID is required');
    }

    // Validate content type
    const validContentTypes = ['post', 'comment'];
    if (!validContentTypes.includes(contentType)) {
      throw new Error(`Invalid content type: ${contentType}. Valid options: ${validContentTypes.join(', ')}`);
    }

    console.log(`Moderating ${contentType} from user ${userId}`);

    // Load moderation configs
    const { data: moderationConfigs, error: configError } = await supabaseClient
      .from('moderation_config')
      .select('*');

    if (configError) {
      console.error('Failed to load moderation config:', configError);
      throw new Error('Failed to load moderation configuration');
    }

    // Call OpenAI Moderation API
    const moderationResponse = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'omni-moderation-latest',
        input: content,
      }),
    });

    if (!moderationResponse.ok) {
      const errorText = await moderationResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI moderation API error: ${moderationResponse.status} ${moderationResponse.statusText}`);
    }

    const moderationData = await moderationResponse.json();
    const result = moderationData.results[0];

    // Analyze violations and determine action
    const violations: string[] = [];
    let highestAction: 'approved' | 'manual_review' | 'removed' = 'approved';
    let flagged = result.flagged;

    // Check each category against thresholds
    for (const [category, score] of Object.entries(result.category_scores)) {
      const config = moderationConfigs?.find(c => c.category === category);
      
      if (config && score >= config.threshold) {
        violations.push(category);
        
        // Determine the most severe action needed
        if (config.auto_action === 'removed') {
          highestAction = 'removed';
        } else if (config.auto_action === 'manual_review' && highestAction !== 'removed') {
          highestAction = 'manual_review';
        }
        
        // Override flagged if we exceed our custom thresholds
        flagged = true;
      }
    }

    const moderationResult: ModerationResult = {
      approved: highestAction === 'approved',
      flagged,
      action: highestAction,
      violations,
      openaiResponse: moderationData,
      timestamp: new Date().toISOString()
    };

    // Log moderation result
    const { error: logError } = await supabaseClient
      .from('moderation_logs')
      .insert({
        content_type: contentType,
        content_id: contentId || 0,
        content_text: content,
        openai_response: moderationData,
        flagged,
        action_taken: highestAction,
      });

    if (logError) {
      console.error('Failed to log moderation:', logError);
      // Don't fail the request for logging errors
    }

    return Response.json(moderationResult, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Moderation function error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Determine appropriate status code based on error type
    let statusCode = 500;
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    if (errorMessage.includes('Content cannot be empty') || 
        errorMessage.includes('Content type is required') ||
        errorMessage.includes('User ID is required') ||
        errorMessage.includes('Invalid content type')) {
      statusCode = 400;
    } else if (errorMessage.includes('OPENAI_API_KEY not configured')) {
      statusCode = 503; // Service unavailable
    }

    const errorResponse: ModerationResult = {
      approved: false,
      flagged: true,
      action: 'manual_review',
      violations: ['moderation_error'],
      openaiResponse: null,
      timestamp: new Date().toISOString()
    };

    return Response.json(errorResponse, { 
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

