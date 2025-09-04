import { useState, useEffect, useCallback } from 'react';
import { commentService, Comment } from '@/src/services/comment.service';

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
  
  // Optimistic updates
  addOptimisticComment: (comment: Comment) => void;
  removeOptimisticComment: (commentId: number) => void;
  
  // Utility functions
  getRepliesForComment: (commentId: number) => Comment[];
  getReplyCount: (commentId: number) => number;
}

export function useComments(postId: number): UseCommentsResult {
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

  // Optimistic updates
  const addOptimisticComment = useCallback((comment: Comment) => {
    setComments(prev => {
      // Check if comment already exists (avoid duplicates)
      if (prev.some(c => c.id === comment.id)) {
        return prev;
      }
      return [...prev, comment];
    });
    setTotalCount(prev => prev + 1);
  }, []);

  const removeOptimisticComment = useCallback((commentId: number) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
    setTotalCount(prev => Math.max(0, prev - 1));
  }, []);

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
    addOptimisticComment,
    removeOptimisticComment,
    getRepliesForComment,
    getReplyCount
  };
}