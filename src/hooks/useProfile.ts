import { useState, useEffect, useCallback } from 'react';
import { userProfileService } from '@/src/services/user-profile.service';
import { UserProfile } from '@/src/types/user';
import { FeedPost } from '@/src/services/feed.service';
import { useAuth } from './useAuth';

export interface UseProfileOptions {
  autoLoad?: boolean;
}

export interface UseProfileReturn {
  // Profile data
  profile: UserProfile | null;
  posts: FeedPost[];
  comments: any[];
  likes: FeedPost[];
  
  // Loading states
  isLoading: boolean;
  isLoadingPosts: boolean;
  isLoadingComments: boolean;
  isLoadingLikes: boolean;
  
  // Error states
  error: string | null;
  postsError: string | null;
  commentsError: string | null;
  likesError: string | null;
  
  // Stats (computed from actual data)
  stats: {
    postsCount: number;
    commentsCount: number;
    likesCount: number;
    trending_score: number;
  };
  
  // Actions
  loadProfile: () => Promise<void>;
  loadPosts: () => Promise<void>;
  loadComments: () => Promise<void>;
  loadLikes: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useProfile = (
  userId: string,
  options: UseProfileOptions = {}
): UseProfileReturn => {
  const { autoLoad = true } = options;
  
  // State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [likes, setLikes] = useState<FeedPost[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isLoadingLikes, setIsLoadingLikes] = useState(false);
  
  // Error states
  const [error, setError] = useState<string | null>(null);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [likesError, setLikesError] = useState<string | null>(null);

  // Load profile data
  const loadProfile = useCallback(async () => {
    if (!userId || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await userProfileService.getUserProfile(userId);
      
      if (response.success) {
        setProfile(response.data);
      } else {
        setError(response.error);
        setProfile(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load profile';
      setError(message);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, isLoading]);

  // Load user posts
  const loadPosts = useCallback(async () => {
    if (!userId || isLoadingPosts) return;
    
    setIsLoadingPosts(true);
    setPostsError(null);
    
    try {
      const response = await userProfileService.getUserPosts(userId);
      
      if (response.success) {
        setPosts(response.data);
      } else {
        setPostsError(response.error);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load posts';
      setPostsError(message);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [userId, isLoadingPosts]);

  // Load user comments
  const loadComments = useCallback(async () => {
    if (!userId || isLoadingComments) return;
    
    setIsLoadingComments(true);
    setCommentsError(null);
    
    try {
      const response = await userProfileService.getUserComments(userId);
      
      if (response.success) {
        setComments(response.data);
      } else {
        setCommentsError(response.error);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load comments';
      setCommentsError(message);
    } finally {
      setIsLoadingComments(false);
    }
  }, [userId, isLoadingComments]);

  // Load user likes
  const loadLikes = useCallback(async () => {
    if (!userId || isLoadingLikes) return;
    
    setIsLoadingLikes(true);
    setLikesError(null);
    
    try {
      const response = await userProfileService.getUserLikes(userId);
      
      if (response.success) {
        setLikes(response.data);
      } else {
        setLikesError(response.error);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load likes';
      setLikesError(message);
    } finally {
      setIsLoadingLikes(false);
    }
  }, [userId, isLoadingLikes]);

  // Refresh all data
  const refresh = useCallback(async () => {
    await Promise.all([
      loadProfile(),
      loadPosts(),
      loadComments(),
      loadLikes()
    ]);
  }, [loadProfile, loadPosts, loadComments, loadLikes]);

  // Auto-load profile on mount
  useEffect(() => {
    if (userId && autoLoad) {
      loadProfile();
    }
  }, [userId, autoLoad, loadProfile]);

  // Computed stats from actual data
  const stats = {
    postsCount: posts.length,
    commentsCount: comments.length,
    likesCount: likes.length,
    trending_score: profile?.trendingScore || 0
  };

  return {
    // Data
    profile,
    posts,
    comments,
    likes,
    
    // Loading states
    isLoading,
    isLoadingPosts,
    isLoadingComments,
    isLoadingLikes,
    
    // Error states
    error,
    postsError,
    commentsError,
    likesError,
    
    // Stats
    stats,
    
    // Actions
    loadProfile,
    loadPosts,
    loadComments,
    loadLikes,
    refresh
  };
};

// Helper hook for current user's profile
export const useCurrentUserProfile = () => {
  const { userProfile } = useAuth();
  return useProfile(userProfile?.id || '', {
    autoLoad: !!userProfile?.id
  });
};