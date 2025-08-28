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
}

class GiphyService {

  async searchGifs(
    query: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<GiphyServiceResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('giphy-search', {
        body: {
          query,
          limit,
          offset,
          type: 'search'
        }
      });

      if (error) {
        console.error('Giphy Edge Function error:', error);
        return {
          success: false,
          error: error.message || 'Failed to search GIFs'
        };
      }

      return data;

    } catch (error) {
      console.error('Giphy search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async getTrendingGifs(limit: number = 20, offset: number = 0): Promise<GiphyServiceResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('giphy-search', {
        body: {
          limit,
          offset,
          type: 'trending'
        }
      });

      if (error) {
        console.error('Giphy Edge Function error:', error);
        return {
          success: false,
          error: error.message || 'Failed to get trending GIFs'
        };
      }

      return data;

    } catch (error) {
      console.error('Giphy trending error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async getGifById(gifId: string): Promise<GiphyServiceResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('giphy-search', {
        body: {
          gifId,
          type: 'getById'
        }
      });

      if (error) {
        console.error('Giphy Edge Function error:', error);
        return {
          success: false,
          error: error.message || 'Failed to get GIF'
        };
      }

      return data;

    } catch (error) {
      console.error('Giphy get GIF error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
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