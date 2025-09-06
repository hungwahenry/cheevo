import { useState, useEffect } from 'react';
import { PrivacyService, type BlockedUser } from '@/src/services/privacy.service';

interface UseBlockedUsersReturn {
  blockedUsers: BlockedUser[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  unblockUser: (userId: string) => Promise<boolean>;
}

export function useBlockedUsers(): UseBlockedUsersReturn {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBlockedUsers = async () => {
    try {
      setError(null);
      const response = await PrivacyService.getBlockedUsers();
      
      if (response.success) {
        setBlockedUsers(response.data);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load blocked users');
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setLoading(true);
    await loadBlockedUsers();
  };

  const unblockUser = async (userId: string): Promise<boolean> => {
    try {
      const response = await PrivacyService.unblockUser(userId);
      
      if (response.success) {
        // Remove user from local state
        setBlockedUsers(prev => prev.filter(user => user.blocked_user_id !== userId));
        return true;
      } else {
        setError(response.error);
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unblock user');
      return false;
    }
  };

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  return {
    blockedUsers,
    loading,
    error,
    refresh,
    unblockUser
  };
}