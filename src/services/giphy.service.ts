import { supabase } from '@/lib/supabase';

export interface GiphyGif {
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

export interface GiphySearchResponse {
  data: GiphyGif[];
  pagination: {
    total_count: number;
    count: number;
    offset: number;
  };
}

export interface GiphyServiceResponse {
  success: boolean;
  data?: GiphyGif[];
  error?: string;
  timestamp: string;
}

class GiphyService {

  async searchGifs(
    query: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<GiphyServiceResponse> {
    try {
      // Validate request
      if (!query?.trim()) {
        return {
          success: false,
          error: 'Search query cannot be empty',
          timestamp: new Date().toISOString()
        };
      }

      if (limit < 1 || limit > 50) {
        return {
          success: false,
          error: 'Limit must be between 1 and 50',
          timestamp: new Date().toISOString()
        };
      }

      if (offset < 0) {
        return {
          success: false,
          error: 'Offset must be non-negative',
          timestamp: new Date().toISOString()
        };
      }

      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        return {
          success: false,
          error: 'You must be logged in to search GIFs',
          timestamp: new Date().toISOString()
        };
      }

      const { data, error } = await supabase.functions.invoke('giphy-search', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: {
          query: query.trim(),
          limit,
          offset,
          type: 'search'
        }
      });

      if (error) {
        console.error('Giphy Edge Function error:', error);
        
        // Return more specific error messages
        let message = 'Failed to search GIFs';
        if (error.message?.includes('Missing authorization')) {
          message = 'Authentication expired. Please sign in again.';
        } else if (error.message?.includes('GIF integration is currently disabled')) {
          message = 'GIF search is currently unavailable.';
        } else if (error.message?.includes('Giphy API error')) {
          message = 'GIF service temporarily unavailable. Please try again later.';
        } else if (error.message) {
          message = error.message;
        }

        return {
          success: false,
          error: message,
          timestamp: new Date().toISOString()
        };
      }

      return data;

    } catch (error) {
      console.error('Giphy search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      };
    }
  }

  async getTrendingGifs(limit: number = 20, offset: number = 0): Promise<GiphyServiceResponse> {
    try {
      // Validate request
      if (limit < 1 || limit > 50) {
        return {
          success: false,
          error: 'Limit must be between 1 and 50',
          timestamp: new Date().toISOString()
        };
      }

      if (offset < 0) {
        return {
          success: false,
          error: 'Offset must be non-negative',
          timestamp: new Date().toISOString()
        };
      }

      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        return {
          success: false,
          error: 'You must be logged in to get trending GIFs',
          timestamp: new Date().toISOString()
        };
      }

      const { data, error } = await supabase.functions.invoke('giphy-search', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: {
          limit,
          offset,
          type: 'trending'
        }
      });

      if (error) {
        console.error('Giphy Edge Function error:', error);
        
        // Return more specific error messages
        let message = 'Failed to get trending GIFs';
        if (error.message?.includes('Missing authorization')) {
          message = 'Authentication expired. Please sign in again.';
        } else if (error.message?.includes('GIF integration is currently disabled')) {
          message = 'GIF search is currently unavailable.';
        } else if (error.message?.includes('Giphy API error')) {
          message = 'GIF service temporarily unavailable. Please try again later.';
        } else if (error.message) {
          message = error.message;
        }

        return {
          success: false,
          error: message,
          timestamp: new Date().toISOString()
        };
      }

      return data;

    } catch (error) {
      console.error('Giphy trending error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      };
    }
  }

  async getGifById(gifId: string): Promise<GiphyServiceResponse> {
    try {
      // Validate request
      if (!gifId?.trim()) {
        return {
          success: false,
          error: 'GIF ID cannot be empty',
          timestamp: new Date().toISOString()
        };
      }

      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        return {
          success: false,
          error: 'You must be logged in to get GIF details',
          timestamp: new Date().toISOString()
        };
      }

      const { data, error } = await supabase.functions.invoke('giphy-search', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: {
          gifId: gifId.trim(),
          type: 'getById'
        }
      });

      if (error) {
        console.error('Giphy Edge Function error:', error);
        
        // Return more specific error messages
        let message = 'Failed to get GIF';
        if (error.message?.includes('Missing authorization')) {
          message = 'Authentication expired. Please sign in again.';
        } else if (error.message?.includes('GIF integration is currently disabled')) {
          message = 'GIF search is currently unavailable.';
        } else if (error.message?.includes('Giphy API error')) {
          message = 'GIF service temporarily unavailable. Please try again later.';
        } else if (error.message?.includes('GIF ID cannot be empty')) {
          message = 'Invalid GIF ID provided.';
        } else if (error.message) {
          message = error.message;
        }

        return {
          success: false,
          error: message,
          timestamp: new Date().toISOString()
        };
      }

      return data;

    } catch (error) {
      console.error('Giphy get GIF error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Helper method to get optimized GIF URL for posts
  getOptimizedGifUrl(gif: GiphyGif, size: 'fixed_height' | 'fixed_width' | 'downsized' = 'fixed_height'): string {
    return gif.images[size]?.url || gif.url;
  }

  // Helper method to validate GIF URL format
  isValidGiphyUrl(url: string): boolean {
    return url.includes('giphy.com') && url.startsWith('https://');
  }
}

export const giphyService = new GiphyService();