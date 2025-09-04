import { useState } from 'react';
import { commentService } from '@/src/services/comment.service';

export interface UseDeleteCommentResult {
  deleteComment: (commentId: number) => Promise<{ success: boolean; message: string }>;
  isDeleting: boolean;
}

export function useDeleteComment(): UseDeleteCommentResult {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteComment = async (commentId: number) => {
    setIsDeleting(true);

    try {
      const result = await commentService.deleteComment(commentId);

      return {
        success: result.success,
        message: result.message
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    deleteComment,
    isDeleting
  };
}