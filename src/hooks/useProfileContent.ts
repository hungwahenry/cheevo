import { useState, useEffect, useCallback } from 'react';
import { userProfileService } from '@/src/services/user-profile.service';
import { postService } from '@/src/services/post.service';
import { feedService } from '@/src/services/feed.service';
import { FeedPost } from '@/src/services/feed.service';
import { useAuth } from './useAuth';

export type ProfileContentType = 'posts' | 'likes' | 'comments';

export interface UseProfileContentReturn {
  data: FeedPost[] | any[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  toggleReaction: (postId: number) => Promise<void>;
  trackView: (postId: number) => Promise<void>;
}

export const useProfileContent = (
  userId: string,
  contentType: ProfileContentType
): UseProfileContentReturn => {
  const { authUser } = useAuth();
  const [data, setData] = useState<FeedPost[] | any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let response;
      
      switch (contentType) {
        case 'posts':
          response = await userProfileService.getUserPosts(userId);
          break;
        case 'likes':
          response = await userProfileService.getUserLikes(userId);
          break;
        case 'comments':
          response = await userProfileService.getUserComments(userId);
          break;
      }
      
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ${contentType}`);
    } finally {
      setIsLoading(false);
    }
  }, [userId, contentType]);

  const toggleReaction = useCallback(async (postId: number) => {
    // Only works for posts and likes (FeedPost[])
    if (contentType === 'comments') return;
    
    const targetPost = (data as FeedPost[]).find(post => post.id === postId);
    if (!targetPost) return;

    const wasLiked = targetPost.user_reaction !== null;
    const reactionsCount = targetPost.reactions_count || 0;
    
    // Optimistic update
    setData(prev => (prev as FeedPost[]).map(post => {
      if (post.id === postId) {
        if (wasLiked) {
          return {
            ...post,
            user_reaction: null,
            reactions_count: Math.max(0, reactionsCount - 1)
          };
        } else {
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
        // Revert on failure
        setData(prev => (prev as FeedPost[]).map(post => {
          if (post.id === postId) {
            return {
              ...post,
              user_reaction: wasLiked ? targetPost.user_reaction : null,
              reactions_count: reactionsCount
            };
          }
          return post;
        }));
      }
    } catch (error) {
      // Revert on error
      setData(prev => (prev as FeedPost[]).map(post => {
        if (post.id === postId) {
          return {
            ...post,
            user_reaction: wasLiked ? targetPost.user_reaction : null,
            reactions_count: reactionsCount
          };
        }
        return post;
      }));
    }
  }, [data, contentType, authUser?.id]);

  const trackView = useCallback(async (postId: number) => {
    try {
      await feedService.trackPostView(postId, {
        source: 'profile',
        algorithm: contentType
      });
    } catch (error) {
      console.warn('View tracking failed:', error);
    }
  }, [contentType]);

  const refresh = useCallback(() => loadData(), [loadData]);

  useEffect(() => {
    if (userId) loadData();
  }, [userId, loadData]);

  return {
    data,
    isLoading,
    error,
    refresh,
    toggleReaction,
    trackView
  };
};