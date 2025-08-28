import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Giphy API key
    const giphyApiKey = Deno.env.get('GIPHY_API_KEY');
    if (!giphyApiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Giphy API key not configured'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Parse request
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { query, limit = 20, offset = 0, type, gifId }: GiphySearchRequest = await req.json();

    // Check if GIF feature is enabled
    const { data: featureFlag } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'enable_gifs')
      .single();

    if (!featureFlag?.value) {
      return new Response(JSON.stringify({
        success: false,
        error: 'GIF integration is currently disabled'
      }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const baseUrl = 'https://api.giphy.com/v1/gifs';
    let url: string;
    let params: URLSearchParams;

    // Build URL based on request type
    switch (type) {
      case 'search':
        if (!query?.trim()) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Search query cannot be empty'
          }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
        
        params = new URLSearchParams({
          api_key: giphyApiKey,
          q: query.trim(),
          limit: Math.min(limit, 50).toString(),
          offset: offset.toString(),
          rating: 'pg-13',
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
          return new Response(JSON.stringify({
            success: false,
            error: 'GIF ID cannot be empty'
          }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
        
        params = new URLSearchParams({
          api_key: giphyApiKey
        });
        url = `${baseUrl}/${gifId}?${params}`;
        break;

      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid request type'
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    // Call Giphy API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`Giphy API error: ${response.status} ${response.statusText}`);
      return new Response(JSON.stringify({
        success: false,
        error: `Giphy API error: ${response.status} ${response.statusText}`
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const result = await response.json();
    
    // Format response consistently
    const data = type === 'getById' ? [result.data] : result.data;

    const serviceResponse: GiphyServiceResponse = {
      success: true,
      data: data
    };

    return new Response(JSON.stringify(serviceResponse), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Giphy function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});