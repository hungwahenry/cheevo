import { useState } from 'react';
import { commentService, CreateCommentRequest } from '@/src/services/comment.service';

export interface UseCreateCommentResult {
  createComment: (content: string, parentCommentId?: number, giphyUrl?: string) => Promise<{ success: boolean; commentId?: number; message: string }>;
  isCreating: boolean;
}

export function useCreateComment(postId: number): UseCreateCommentResult {
  const [isCreating, setIsCreating] = useState(false);

  const createComment = async (
    content: string, 
    parentCommentId?: number, 
    giphyUrl?: string
  ) => {
    setIsCreating(true);

    try {
      const request: CreateCommentRequest = {
        content: content.trim(),
        postId,
        parentCommentId,
        giphyUrl
      };

      const result = await commentService.createComment(request);

      return {
        success: result.success,
        commentId: result.commentId,
        message: result.message
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createComment,
    isCreating
  };
}