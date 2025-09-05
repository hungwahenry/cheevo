import { useState, useEffect, useCallback } from 'react';
import { commentService, Comment } from '@/src/services/comment.service';
import { useAuth } from './useAuth';

export interface UseCommentsResult {
  // Data
  comments: Comment[]; // Simple flat array
  mainComments: Comment[]; // Top-level comments
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  totalCount: number;
  
  // Actions
  loadComments: () => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  
  // Optimistic comment operations
  createComment: (content: string, parentCommentId?: number) => Promise<{ success: boolean; message?: string }>;
  deleteComment: (commentId: number) => Promise<{ success: boolean; message?: string }>;
  
  // Utility functions
  getRepliesForComment: (commentId: number) => Comment[];
  getReplyCount: (commentId: number) => number;
}

export function useComments(postId: number): UseCommentsResult {
  const { userProfile, authUser } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);

  // Get main comments (top-level, no parent)
  const mainComments = comments.filter(comment => comment.parent_comment_id === null);

  // Simple utility functions
  const getRepliesForComment = useCallback((commentId: number): Comment[] => {
    return comments.filter(comment => comment.parent_comment_id === commentId);
  }, [comments]);

  const getReplyCount = useCallback((commentId: number): number => {
    return comments.filter(comment => comment.parent_comment_id === commentId).length;
  }, [comments]);

  const loadComments = useCallback(async (reset = false) => {
    if (!postId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const currentOffset = reset ? 0 : offset;
      const response = await commentService.getComments(postId, {
        limit: 50,
        offset: currentOffset
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      if (reset) {
        setComments(response.comments);
        setOffset(response.comments.length);
      } else {
        setComments(prev => [...prev, ...response.comments]);
        setOffset(prev => prev + response.comments.length);
      }

      setHasMore(response.hasMore);
      setTotalCount(response.totalCount);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load comments';
      setError(message);
      console.error('Comments loading error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [postId, offset]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      await loadComments(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [loadComments, isLoadingMore, hasMore]);

  const refresh = useCallback(async () => {
    setOffset(0);
    setHasMore(true);
    await loadComments(true);
  }, [loadComments]);

  // Load initial comments when postId changes
  useEffect(() => {
    if (postId) {
      setComments([]);
      setOffset(0);
      setHasMore(true);
      loadComments(true);
    }
  }, [postId]);

  // Optimistic comment creation
  const createComment = useCallback(async (content: string, parentCommentId?: number) => {
    if (!content.trim() || !userProfile || !authUser) {
      return { success: false, message: 'Invalid comment or user not authenticated' };
    }

    // Create optimistic comment with temporary negative ID
    const optimisticId = -Date.now(); // Negative ID to avoid conflicts with real IDs
    const optimisticComment: Comment = {
      id: optimisticId,
      content: content.trim(),
      giphy_url: null,
      post_id: postId,
      parent_comment_id: parentCommentId || null,
      user_id: authUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_profiles: {
        username: userProfile.username,
        avatar_url: userProfile.avatarUrl || null,
        university_id: userProfile.universityId
      }
    };

    // 1. IMMEDIATE optimistic update
    setComments(prev => [...prev, optimisticComment]);
    setTotalCount(prev => prev + 1);

    try {
      // 2. Call API
      const response = await commentService.createComment({
        content: content.trim(),
        postId,
        parentCommentId
      });

      if (response.success && response.commentId) {
        // 3. Replace optimistic comment with real one
        setComments(prev => prev.map(comment => 
          comment.id === optimisticId 
            ? { ...comment, id: response.commentId! }
            : comment
        ));
        return { success: true };
      } else {
        // 4. REVERT on failure
        setComments(prev => prev.filter(comment => comment.id !== optimisticId));
        setTotalCount(prev => Math.max(0, prev - 1));
        return { success: false, message: response.message };
      }
    } catch (error) {
      // 4. REVERT on error
      setComments(prev => prev.filter(comment => comment.id !== optimisticId));
      setTotalCount(prev => Math.max(0, prev - 1));
      console.error('Error creating comment:', error);
      return { success: false, message: 'Failed to create comment' };
    }
  }, [postId, userProfile, authUser]);

  // Optimistic comment deletion
  const deleteComment = useCallback(async (commentId: number) => {
    // Find the comment to delete
    const targetComment = comments.find(c => c.id === commentId);
    if (!targetComment) {
      return { success: false, message: 'Comment not found' };
    }

    // Also find any replies to this comment
    const repliesToDelete = comments.filter(c => c.parent_comment_id === commentId);
    const allCommentsToDelete = [targetComment, ...repliesToDelete];

    // 1. IMMEDIATE optimistic update
    setComments(prev => prev.filter(comment => 
      comment.id !== commentId && comment.parent_comment_id !== commentId
    ));
    setTotalCount(prev => Math.max(0, prev - allCommentsToDelete.length));

    try {
      // 2. Call API
      const response = await commentService.deleteComment(commentId);

      if (response.success) {
        return { success: true };
      } else {
        // 3. REVERT on failure
        setComments(prev => {
          // Re-add all deleted comments in their original positions
          const restored = [...prev, ...allCommentsToDelete];
          // Sort by created_at to maintain order
          return restored.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        });
        setTotalCount(prev => prev + allCommentsToDelete.length);
        return { success: false, message: response.message };
      }
    } catch (error) {
      // 3. REVERT on error
      setComments(prev => {
        const restored = [...prev, ...allCommentsToDelete];
        return restored.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });
      setTotalCount(prev => prev + allCommentsToDelete.length);
      console.error('Error deleting comment:', error);
      return { success: false, message: 'Failed to delete comment' };
    }
  }, [comments]);

  return {
    comments,
    mainComments,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    totalCount,
    loadComments: () => loadComments(true),
    loadMore,
    refresh,
    createComment,
    deleteComment,
    getRepliesForComment,
    getReplyCount
  };
}