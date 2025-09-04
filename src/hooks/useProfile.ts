import { useState, useEffect, useCallback } from 'react';
import { userProfileService } from '@/src/services/user-profile.service';
import { UserProfile } from '@/src/types/user';
import { useAuth } from './useAuth';

export interface UseProfileReturn {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useProfile = (userId: string): UseProfileReturn => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await userProfileService.getUserProfile(userId);
      setProfile(response.success ? response.data : null);
      if (!response.success) setError(response.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const refresh = useCallback(() => loadProfile(), [loadProfile]);

  useEffect(() => {
    if (userId) loadProfile();
  }, [userId, loadProfile]);

  return {
    profile,
    isLoading,
    error,
    refresh
  };
};

export const useCurrentUserProfile = () => {
  const { userProfile } = useAuth();
  return useProfile(userProfile?.id || '');
};