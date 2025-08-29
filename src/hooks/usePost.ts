import { CreatePostRequest, CreatePostResponse, postService } from '@/src/services/post.service';
import { useState } from 'react';
import { useAuth } from './useAuth';

export const usePost = () => {
  const { isAuthenticated } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createPost = async (content: string, giphyUrl?: string): Promise<CreatePostResponse> => {
    // Check authentication status
    if (!isAuthenticated) {
      return {
        success: false,
        status: 'rejected',
        message: 'You must be logged in to create a post',
        timestamp: new Date().toISOString()
      };
    }

    setIsSubmitting(true);

    try {
      const request: CreatePostRequest = {
        content: content.trim(),
        giphyUrl,
      };

      const result = await postService.createPost(request);
      return result;
    } catch (error) {
      return {
        success: false,
        status: 'rejected',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    createPost,
    isSubmitting,
  };
};