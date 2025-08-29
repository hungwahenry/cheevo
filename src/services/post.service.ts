import { supabase } from '@/lib/supabase';

export interface CreatePostRequest {
  content: string;
  giphyUrl?: string;
}

export interface CreatePostResponse {
  success: boolean;
  status: 'published' | 'pending_review' | 'rejected';
  error?: string;
  message?: string;
  postId?: number;
  timestamp: string;
}

class PostService {
  async createPost(request: CreatePostRequest): Promise<CreatePostResponse> {
    try {
      // Validate request
      if (!request.content?.trim()) {
        return {
          success: false,
          status: 'rejected',
          error: 'Post content cannot be empty',
          timestamp: new Date().toISOString()
        };
      }

      if (request.content.trim().length > 280) {
        return {
          success: false,
          status: 'rejected',
          error: 'Post content exceeds maximum length of 280 characters',
          timestamp: new Date().toISOString()
        };
      }

      if (request.giphyUrl && (!request.giphyUrl.includes('giphy.com') || !request.giphyUrl.startsWith('https://'))) {
        return {
          success: false,
          status: 'rejected',
          error: 'Invalid GIF URL format. Must be a valid HTTPS Giphy URL',
          timestamp: new Date().toISOString()
        };
      }

      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        return {
          success: false,
          status: 'rejected',
          error: 'You must be logged in to create a post',
          timestamp: new Date().toISOString()
        };
      }

      // Call Edge Function for secure post creation
      const { data, error } = await supabase.functions.invoke('create-post', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: {
          content: request.content.trim(),
          giphyUrl: request.giphyUrl
        }
      });

      if (error) {
        console.error('Post creation Edge Function error:', error);
        
        // Return more specific error messages based on error content
        let errorMessage = 'Failed to create post. Please try again.';
        if (error.message?.includes('Missing authorization')) {
          errorMessage = 'Authentication expired. Please sign in again.';
        } else if (error.message?.includes('User profile not found')) {
          errorMessage = 'User profile not found. Please complete your profile setup.';
        } else if (error.message?.includes('exceeds maximum length')) {
          errorMessage = error.message;
        } else if (error.message?.includes('Invalid GIF URL')) {
          errorMessage = error.message;
        }

        return {
          success: false,
          status: 'rejected',
          error: errorMessage,
          timestamp: new Date().toISOString()
        };
      }

      return data;

    } catch (error) {
      console.error('Unexpected error creating post:', error);
      return {
        success: false,
        status: 'rejected',
        error: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
        timestamp: new Date().toISOString()
      };
    }
  }
}

export const postService = new PostService();