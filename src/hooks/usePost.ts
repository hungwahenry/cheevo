import { useState } from 'react';
import { postService, CreatePostRequest, CreatePostResponse } from '@/src/services/post.service';
import { useAuth } from './useAuth';

export const usePost = () => {
  const { user, universityId } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createPost = async (content: string, giphyUrl?: string): Promise<CreatePostResponse> => {
    if (!user || !universityId) {
      return {
        success: false,
        status: 'rejected',
        message: 'You must be logged in to create a post'
      };
    }

    setIsSubmitting(true);

    try {
      const request: CreatePostRequest = {
        content: content.trim(),
        giphyUrl,
        userId: user.id,
        universityId: universityId,
      };

      const result = await postService.createPost(request);
      return result;
    } catch (error) {
      return {
        success: false,
        status: 'rejected',
        message: 'An unexpected error occurred'
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