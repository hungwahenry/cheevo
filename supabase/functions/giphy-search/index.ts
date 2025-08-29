import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
interface GiphySearchRequest {
  query?: string;
  limit?: number;
  offset?: number;
  type: 'search' | 'trending' | 'getById';
  gifId?: string;
}

interface GiphyGif {
  id: string;
  title: string;
  url: string;
  images: {
    fixed_height: {
      url: string;
      width: string;
      height: string;
    };
    fixed_width: {
      url: string;
      width: string;
      height: string;
    };
    downsized: {
      url: string;
      width: string;
      height: string;
    };
  };
}

interface GiphyServiceResponse {
  success: boolean;
  data?: GiphyGif[];
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

    // Get user from JWT for authentication (optional for this service)
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

    // Get Giphy API key
    const giphyApiKey = Deno.env.get('GIPHY_API_KEY');
    if (!giphyApiKey) {
      throw new Error('Giphy API key not configured');
    }

    // Parse request body
    const requestBody: GiphySearchRequest = await req.json();
    const { query, limit = 20, offset = 0, type, gifId } = requestBody;

    // Validate required parameters
    if (!type) {
      throw new Error('Request type is required (search, trending, or getById)');
    }

    // Validate limit and offset
    if (limit < 1 || limit > 50) {
      throw new Error('Limit must be between 1 and 50');
    }
    if (offset < 0) {
      throw new Error('Offset must be non-negative');
    }

    // Check if GIF feature is enabled
    const { data: featureFlag } = await supabaseClient
      .from('app_config')
      .select('value')
      .eq('key', 'enable_gifs')
      .single();

    if (!featureFlag?.value) {
      throw new Error('GIF integration is currently disabled');
    }

    const baseUrl = 'https://api.giphy.com/v1/gifs';
    let url: string;
    let params: URLSearchParams;

    // Validate request type
    const validTypes = ['search', 'trending', 'getById'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid request type: ${type}. Valid options: ${validTypes.join(', ')}`);
    }

    // Build URL based on request type
    switch (type) {
      case 'search':
        if (!query?.trim()) {
          throw new Error('Search query cannot be empty for search requests');
        }
        
        params = new URLSearchParams({
          api_key: giphyApiKey,
          q: query.trim(),
          limit: Math.min(limit, 50).toString(),
          offset: offset.toString(),
          rating: 'r',
          lang: 'en'
        });
        url = `${baseUrl}/search?${params}`;
        break;

      case 'trending':
        params = new URLSearchParams({
          api_key: giphyApiKey,
          limit: Math.min(limit, 50).toString(),
          offset: offset.toString(),
          rating: 'pg-13'
        });
        url = `${baseUrl}/trending?${params}`;
        break;

      case 'getById':
        if (!gifId?.trim()) {
          throw new Error('GIF ID cannot be empty for getById requests');
        }
        
        params = new URLSearchParams({
          api_key: giphyApiKey
        });
        url = `${baseUrl}/${gifId}?${params}`;
        break;

      default:
        throw new Error(`Invalid request type: ${type}`);
    }

    // Call Giphy API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Giphy API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Giphy API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    // Format response consistently
    const data = type === 'getById' ? [result.data] : result.data;

    const serviceResponse: GiphyServiceResponse = {
      success: true,
      data: data,
      timestamp: new Date().toISOString()
    };

    return Response.json(serviceResponse, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Giphy function error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Determine appropriate status code based on error type
    let statusCode = 500;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (errorMessage.includes('Request type is required') || 
        errorMessage.includes('Search query cannot be empty') ||
        errorMessage.includes('GIF ID cannot be empty') ||
        errorMessage.includes('Invalid request type') ||
        errorMessage.includes('Limit must be') ||
        errorMessage.includes('Offset must be')) {
      statusCode = 400;
    } else if (errorMessage.includes('Invalid or expired token') || 
               errorMessage.includes('Missing authorization header')) {
      statusCode = 401;
    } else if (errorMessage.includes('GIF integration is currently disabled')) {
      statusCode = 403;
    }

    const errorResponse: GiphyServiceResponse = {
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