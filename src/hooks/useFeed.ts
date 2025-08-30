import { useState, useEffect } from 'react';
import { feedService, FeedAlgorithm, FeedScope, FeedPost } from '@/src/services/feed.service';
import { postService } from '@/src/services/post.service';
import { useAuth } from './useAuth';

export interface UseFeedOptions {
  algorithm: FeedAlgorithm;
  scope: FeedScope;
}

export interface UseFeedReturn {
  posts: FeedPost[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  toggleReaction: (postId: number) => Promise<void>;
  trackView: (postId: number) => Promise<void>;
}

export const useFeed = ({ algorithm, scope }: UseFeedOptions): UseFeedReturn => {
  const { authUser } = useAuth();
  
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  // Load feed
  const loadFeed = async (reset = false) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const currentOffset = reset ? 0 : offset;
      
      const response = await feedService.getFeed({
        algorithm,
        scope,
        limit: 20,
        offset: currentOffset,
      });

      if (reset) {
        setPosts(response.posts);
        setOffset(response.nextOffset);
      } else {
        setPosts(prev => [...prev, ...response.posts]);
        setOffset(response.nextOffset);
      }
      
      setHasMore(response.hasMore);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load feed';
      setError(message);
      console.error('Feed loading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load more posts
  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      await loadFeed(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Refresh feed
  const refresh = async () => {
    setOffset(0);
    setHasMore(true);
    await loadFeed(true);
  };

  // Toggle post reaction
  const toggleReaction = async (postId: number) => {
    try {
      const response = await postService.toggleReaction(postId);
      
      if (response.success && response.action) {
        // Optimistically update the UI
        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            const wasLiked = post.user_reaction !== null;
            const reactionsCount = post.reactions_count || 0;
            
            if (response.action === 'added' && !wasLiked) {
              return {
                ...post,
                user_reaction: { id: Date.now(), user_id: authUser?.id || '', created_at: new Date().toISOString() },
                reactions_count: reactionsCount + 1
              };
            } else if (response.action === 'removed' && wasLiked) {
              return {
                ...post,
                user_reaction: null,
                reactions_count: Math.max(0, reactionsCount - 1)
              };
            }
          }
          return post;
        }));
      } else {
        console.error('Reaction toggle failed:', response.error);
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  // Track post view
  const trackView = async (postId: number) => {
    try {
      await feedService.trackPostView(postId, {
        source: 'feed',
        algorithm,
        scope
      });
    } catch (error) {
      console.warn('View tracking failed:', error);
    }
  };

  // Load when algorithm or scope changes
  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    setPosts([]);
    loadFeed(true);
  }, [algorithm, scope, authUser?.id]);

  return {
    posts,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    toggleReaction,
    trackView
  };
};