import { supabase } from '@/lib/supabase';

export interface CreatePostRequest {
  content: string;
  giphyUrl?: string;
  userId: string;
  universityId: number;
}

export interface CreatePostResponse {
  success: boolean;
  status: 'published' | 'pending_review' | 'rejected';
  message: string;
  postId?: number;
  banInfo?: {
    shouldBanUser: boolean;
    banDuration?: number;
  };
}

class PostService {
  async createPost(request: CreatePostRequest): Promise<CreatePostResponse> {
    try {
      // Call Edge Function for secure post creation
      const { data, error } = await supabase.functions.invoke('create-post', {
        body: {
          content: request.content,
          giphyUrl: request.giphyUrl,
          userId: request.userId,
          universityId: request.universityId
        }
      });

      if (error) {
        console.error('Post creation Edge Function error:', error);
        return {
          success: false,
          status: 'rejected',
          message: 'Failed to create post. Please try again.'
        };
      }

      return data;

    } catch (error) {
      console.error('Unexpected error creating post:', error);
      return {
        success: false,
        status: 'rejected',
        message: 'An unexpected error occurred. Please try again.'
      };
    }
  }


}

export const postService = new PostService();