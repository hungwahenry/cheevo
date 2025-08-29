import { useState, useEffect, useCallback } from 'react';
import { feedService, FeedAlgorithm, FeedScope, FeedPost, FeedResponse } from '@/src/services/feed.service';
import { useAuth } from './useAuth';

export interface UseFeedOptions {
  algorithm: FeedAlgorithm;
  scope: FeedScope;
  autoLoad?: boolean;
}

export interface UseFeedReturn {
  posts: FeedPost[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  algorithm: FeedAlgorithm;
  scope: FeedScope;
  
  // Actions
  loadFeed: () => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  setAlgorithm: (algorithm: FeedAlgorithm) => void;
  setScope: (scope: FeedScope) => void;
  trackPostView: (postId: number) => Promise<void>;
}

export const useFeed = (options: UseFeedOptions): UseFeedReturn => {
  const { authUser } = useAuth();
  const { algorithm: initialAlgorithm, scope: initialScope, autoLoad = true } = options;

  // State
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [algorithm, setAlgorithmState] = useState<FeedAlgorithm>(initialAlgorithm);
  const [scope, setScopeState] = useState<FeedScope>(initialScope);
  const [offset, setOffset] = useState(0);

  // Load initial feed
  const loadFeed = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await feedService.getFeed({
        algorithm,
        scope,
        limit: 20,
        offset: 0,
      });

      setPosts(response.posts);
      setHasMore(response.hasMore);
      setOffset(response.nextOffset);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load feed';
      setError(message);
      console.error('Feed loading error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [algorithm, scope, authUser?.id]);

  // Load more posts (pagination)
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    setError(null);

    try {
      const response = await feedService.getFeed({
        algorithm,
        scope,
        limit: 20,
        offset,
      });

      setPosts(prev => [...prev, ...response.posts]);
      setHasMore(response.hasMore);
      setOffset(response.nextOffset);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load more posts';
      setError(message);
      console.error('Feed pagination error:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [algorithm, scope, offset, hasMore, authUser?.id, isLoadingMore]);

  // Refresh feed (reset and reload)
  const refresh = useCallback(async () => {
    setOffset(0);
    setHasMore(true);
    setPosts([]);
    await loadFeed();
  }, [loadFeed]);

  // Change algorithm and reload
  const setAlgorithm = useCallback((newAlgorithm: FeedAlgorithm) => {
    if (newAlgorithm === algorithm) return;
    
    setAlgorithmState(newAlgorithm);
    setOffset(0);
    setHasMore(true);
    setPosts([]);
    
    // The useEffect will trigger loadFeed automatically when algorithm changes
  }, [algorithm]);

  // Change scope and reload
  const setScope = useCallback((newScope: FeedScope) => {
    if (newScope === scope) return;
    
    setScopeState(newScope);
    setOffset(0);
    setHasMore(true);
    setPosts([]);
    
    // The useEffect will trigger loadFeed automatically when scope changes
  }, [scope]);

  // Track post view
  const trackPostView = useCallback(async (postId: number) => {
    try {
      await feedService.trackPostView(postId, authUser?.id);
    } catch (err) {
      console.error('Error tracking post view:', err);
      // Don't throw - view tracking shouldn't break the UI
    }
  }, [authUser?.id]);

  // Auto-load feed when algorithm/scope changes
  useEffect(() => {
    if (autoLoad) {
      loadFeed();
    }
  }, [algorithm, scope, autoLoad, loadFeed]);

  // Auto-load on auth change
  useEffect(() => {
    if (authUser && autoLoad && posts.length === 0) {
      loadFeed();
    }
  }, [authUser, autoLoad, posts.length, loadFeed]);

  return {
    posts,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    algorithm,
    scope,
    
    loadFeed,
    loadMore,
    refresh,
    setAlgorithm,
    setScope,
    trackPostView
  };
};

// Hook for multiple algorithm feeds (tabs)
export const useMultiFeed = (algorithms: FeedAlgorithm[], scope: FeedScope) => {
  const feeds = algorithms.reduce((acc, algorithm) => {
    acc[algorithm] = useFeed({ algorithm, scope, autoLoad: false });
    return acc;
  }, {} as Record<FeedAlgorithm, UseFeedReturn>);

  const activeFeed = useState<FeedAlgorithm>(algorithms[0]);
  
  return {
    feeds,
    activeFeed,
    currentFeed: feeds[activeFeed[0]]
  };
};