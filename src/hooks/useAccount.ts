import { useState } from 'react';
import { AccountService } from '@/src/services/account.service';

export const useAccount = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteAccount = async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await AccountService.deleteAccount();
      
      if (result.success) {
        setIsLoading(false);
        return true;
      } else {
        setError(result.error);
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete account';
      setError(errorMessage);
      setIsLoading(false);
      return false;
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    isLoading,
    error,
    deleteAccount,
    clearError,
  };
};