import { CreatePostRequest, CreatePostData, DeletePostData, postService } from '@/src/services/post.service';
import { ApiResponse } from '@/src/types/api';
import { useState } from 'react';
import { useAuth } from './useAuth';

export const usePost = () => {
  const { isAuthenticated } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const createPost = async (content: string, giphyUrl?: string): Promise<ApiResponse<CreatePostData>> => {
    // Check authentication status
    if (!isAuthenticated) {
      return {
        success: false,
        error: 'You must be logged in to create a post'
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
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  const deletePost = async (postId: number): Promise<ApiResponse<DeletePostData>> => {
    // Check authentication status
    if (!isAuthenticated) {
      return {
        success: false,
        error: 'You must be logged in to delete posts'
      };
    }

    setIsDeleting(true);

    try {
      const result = await postService.deletePost(postId);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    createPost,
    deletePost,
    isSubmitting,
    isDeleting,
  };
};