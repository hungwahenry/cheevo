import { useState } from 'react';
import { PrivacyService } from '@/src/services/privacy.service';

interface UseBlockUserReturn {
  isBlocked: boolean;
  isLoading: boolean;
  error: string | null;
  toggleBlock: (userId: string, username: string, currentBlockStatus: boolean) => Promise<boolean>;
}

export function useBlockUser(): UseBlockUserReturn {
  const [isBlocked, setIsBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleBlock = async (userId: string, username: string, currentBlockStatus: boolean): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = currentBlockStatus 
        ? await PrivacyService.unblockUser(userId)
        : await PrivacyService.blockUser(userId);
      
      if (response.success) {
        setIsBlocked(!currentBlockStatus);
        return true;
      } else {
        // Handle "already blocked" error gracefully
        if (!response.success && response.error.includes('already blocked')) {
          setIsBlocked(true);
          return true;
        }
        setError(response.error);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${currentBlockStatus ? 'unblock' : 'block'} user`;
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isBlocked,
    isLoading,
    error,
    toggleBlock
  };
}