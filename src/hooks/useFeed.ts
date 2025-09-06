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
  reactionDisabled: Record<number, boolean>; // postId -> disabled state
  
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
  const [reactionDisabled, setReactionDisabled] = useState<Record<number, boolean>>({});

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
        // Update disabled states from precomputed values
        const newReactionDisabled: Record<number, boolean> = {};
        response.posts.forEach(post => {
          newReactionDisabled[post.id] = !post.can_react;
        });
        setReactionDisabled(newReactionDisabled);
      } else {
        setPosts(prev => [...prev, ...response.posts]);
        setOffset(response.nextOffset);
        // Update disabled states for new posts
        setReactionDisabled(prev => {
          const updated = { ...prev };
          response.posts.forEach(post => {
            updated[post.id] = !post.can_react;
          });
          return updated;
        });
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
    // Find the post and determine current state
    const targetPost = posts.find(post => post.id === postId);
    if (!targetPost) return;

    const wasLiked = targetPost.user_reaction !== null;
    const reactionsCount = targetPost.reactions_count || 0;
    
    // Immediate optimistic update
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        if (wasLiked) {
          // Remove reaction
          return {
            ...post,
            user_reaction: null,
            reactions_count: Math.max(0, reactionsCount - 1)
          };
        } else {
          // Add reaction
          return {
            ...post,
            user_reaction: { 
              id: Date.now(), 
              user_id: authUser?.id || '', 
              created_at: new Date().toISOString() 
            },
            reactions_count: reactionsCount + 1
          };
        }
      }
      return post;
    }));

    try {
      const response = await postService.toggleReaction(postId);
      
      if (!response.success) {
        // Revert optimistic update on failure
        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              user_reaction: wasLiked ? targetPost.user_reaction : null,
              reactions_count: reactionsCount
            };
          }
          return post;
        }));
        console.error('Reaction toggle failed:', response.error);
      }
    } catch (error: any) {
      // Check if it's a privacy violation (403)
      if (error.status === 403) {
        setReactionDisabled(prev => ({ ...prev, [postId]: true }));
      }
      
      // Revert optimistic update on error
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            user_reaction: wasLiked ? targetPost.user_reaction : null,
            reactions_count: reactionsCount
          };
        }
        return post;
      }));
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
    reactionDisabled,
    loadMore,
    refresh,
    toggleReaction,
    trackView
  };
};