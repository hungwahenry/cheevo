import { supabase } from '@/lib/supabase';

export interface Comment {
  id: number;
  content: string;
  giphy_url: string | null;
  post_id: number;
  parent_comment_id: number | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  user_profiles: {
    username: string;
    avatar_url: string | null;
    university_id: number;
  };
}

export interface CreateCommentRequest {
  content: string;
  postId: number;
  parentCommentId?: number;
  giphyUrl?: string;
}

export interface CommentsResponse {
  success: boolean;
  comments: Comment[];
  hasMore: boolean;
  totalCount: number;
  error?: string;
}

export interface CreateCommentResponse {
  success: boolean;
  status?: 'published' | 'pending_review' | 'rejected';
  message: string;
  commentId?: number;
  error?: string;
}

class CommentService {
  /**
   * Get comments for a post (flat array - client handles 2-level grouping)
   */
  async getComments(
    postId: number,
    options: {
      parentId?: number | null; // null = root comments, number = replies, undefined = all
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<CommentsResponse> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        return {
          success: false,
          comments: [],
          hasMore: false,
          totalCount: 0,
          error: 'You must be logged in to view comments'
        };
      }

      const { data, error } = await supabase.functions.invoke('get-post-comments', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: {
          postId,
          parentId: options.parentId,
          limit: options.limit || 25,
          offset: options.offset || 0
        }
      });

      if (error) {
        console.error('Get comments error:', error);
        return {
          success: false,
          comments: [],
          hasMore: false,
          totalCount: 0,
          error: error.message || 'Failed to load comments'
        };
      }

      return {
        success: true,
        comments: data.comments || [],
        hasMore: data.hasMore || false,
        totalCount: data.totalCount || 0
      };

    } catch (error) {
      console.error('Unexpected error getting comments:', error);
      return {
        success: false,
        comments: [],
        hasMore: false,
        totalCount: 0,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  }

  /**
   * Create a new comment
   */
  async createComment(request: CreateCommentRequest): Promise<CreateCommentResponse> {
    try {
      // Validate request
      if (!request.content?.trim()) {
        return {
          success: false,
          message: 'Comment content cannot be empty'
        };
      }

      if (request.content.trim().length > 280) {
        return {
          success: false,
          message: 'Comment content exceeds maximum length of 280 characters'
        };
      }

      if (request.giphyUrl && (!request.giphyUrl.includes('giphy.com') || !request.giphyUrl.startsWith('https://'))) {
        return {
          success: false,
          message: 'Invalid GIF URL format. Must be a valid HTTPS Giphy URL'
        };
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        return {
          success: false,
          message: 'You must be logged in to create a comment'
        };
      }

      const { data, error } = await supabase.functions.invoke('create-comment', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: {
          content: request.content.trim(),
          postId: request.postId,
          parentCommentId: request.parentCommentId,
          giphyUrl: request.giphyUrl
        }
      });

      if (error) {
        console.error('Create comment error:', error);
        return {
          success: false,
          message: error.message || 'Failed to create comment'
        };
      }

      return {
        success: data.success,
        status: data.status,
        message: data.message,
        commentId: data.commentId
      };

    } catch (error) {
      console.error('Unexpected error creating comment:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: number): Promise<{ success: boolean; message: string }> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        return {
          success: false,
          message: 'You must be logged in to delete comments'
        };
      }

      const { data, error } = await supabase.functions.invoke('delete-comment', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: {
          commentId
        },
        method: 'DELETE'
      });

      if (error) {
        console.error('Delete comment error:', error);
        return {
          success: false,
          message: error.message || 'Failed to delete comment'
        };
      }

      return {
        success: true,
        message: data.message || 'Comment deleted successfully'
      };

    } catch (error) {
      console.error('Unexpected error deleting comment:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  }
}

export const commentService = new CommentService();