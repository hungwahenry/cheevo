import { supabase } from '@/lib/supabase';
import { ApiResponse } from '@/src/types/api';
import { FeedPost } from './feed.service';

export interface CreatePostRequest {
  content: string;
  giphyUrl?: string;
}

export interface CreatePostData {
  status: 'published' | 'pending_review' | 'rejected';
  message: string;
  postId?: number;
}

export interface ToggleReactionData {
  action: 'added' | 'removed';
}

export interface DeletePostData {
  message: string;
  postId: number;
}

export interface GetPostData {
  post: FeedPost;
}

class PostService {
  async createPost(request: CreatePostRequest): Promise<ApiResponse<CreatePostData>> {
    try {
      // Validate request
      if (!request.content?.trim()) {
        return {
          success: false,
          error: 'Post content cannot be empty'
        };
      }

      if (request.content.trim().length > 280) {
        return {
          success: false,
          error: 'Post content exceeds maximum length of 280 characters'
        };
      }

      if (request.giphyUrl && (!request.giphyUrl.includes('giphy.com') || !request.giphyUrl.startsWith('https://'))) {
        return {
          success: false,
          error: 'Invalid GIF URL format. Must be a valid HTTPS Giphy URL'
        };
      }

      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        return {
          success: false,
          error: 'You must be logged in to create a post'
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
          error: errorMessage
        };
      }

      return {
        success: true,
        data: {
          status: data.status,
          message: data.message,
          postId: data.postId
        }
      };

    } catch (error) {
      console.error('Unexpected error creating post:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
      };
    }
  }

  async toggleReaction(postId: number): Promise<ApiResponse<ToggleReactionData>> {
    try {
      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        return {
          success: false,
          error: 'You must be logged in to react to posts'
        };
      }

      // Call Edge Function for secure reaction toggle
      const { data, error } = await supabase.functions.invoke('toggle-reaction', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: {
          postId
        }
      });

      if (error) {
        console.error('Reaction toggle Edge Function error:', error);
        
        let errorMessage = 'Failed to update reaction. Please try again.';
        if (error.message?.includes('Missing authorization')) {
          errorMessage = 'Authentication expired. Please sign in again.';
        } else if (error.message?.includes('Post not found')) {
          errorMessage = 'Post not found.';
        } else if (error.message?.includes('Cannot react to flagged post')) {
          errorMessage = 'Cannot react to this post.';
        }

        return {
          success: false,
          error: errorMessage
        };
      }

      return {
        success: true,
        data: {
          action: data.action
        }
      };

    } catch (error) {
      console.error('Unexpected error toggling reaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
      };
    }
  }

  async deletePost(postId: number): Promise<ApiResponse<DeletePostData>> {
    try {
      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        return {
          success: false,
          error: 'You must be logged in to delete posts'
        };
      }

      // Call Edge Function for secure post deletion
      const { data, error } = await supabase.functions.invoke('delete-post', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: {
          postId
        }
      });

      if (error) {
        console.error('Delete post Edge Function error:', error);
        
        let errorMessage = 'Failed to delete post. Please try again.';
        if (error.message?.includes('Missing authorization')) {
          errorMessage = 'Authentication expired. Please sign in again.';
        } else if (error.message?.includes('Post not found')) {
          errorMessage = 'Post not found.';
        } else if (error.message?.includes('Unauthorized: You can only delete')) {
          errorMessage = 'You can only delete your own posts.';
        }

        return {
          success: false,
          error: errorMessage
        };
      }

      return {
        success: true,
        data: {
          message: data.message,
          postId
        }
      };

    } catch (error) {
      console.error('Unexpected error deleting post:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
      };
    }
  }

  async getPost(postId: number): Promise<ApiResponse<GetPostData>> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        return {
          success: false,
          error: 'You must be logged in to view posts'
        };
      }

      const { data, error } = await supabase.functions.invoke('get-post', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: {
          postId
        }
      });

      if (error) {
        console.error('Get post Edge Function error:', error);
        
        let errorMessage = 'Failed to load post. Please try again.';
        if (error.message?.includes('Post not found')) {
          errorMessage = 'Post not found.';
        } else if (error.message?.includes('Missing authorization')) {
          errorMessage = 'Authentication expired. Please sign in again.';
        }

        return {
          success: false,
          error: errorMessage
        };
      }

      return {
        success: true,
        data: {
          post: data.post
        }
      };

    } catch (error) {
      console.error('Unexpected error getting post:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
      };
    }
  }
}

export const postService = new PostService();