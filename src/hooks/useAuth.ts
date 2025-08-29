import { useContext } from 'react';
import { AuthContext } from '@/src/providers/AuthProvider';

/**
 * Custom hook for authentication state and actions
 * Provides clean interface to auth functionality without exposing implementation details
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const {
    state,
    sendOTP,
    verifyOTP,
    completeOnboarding,
    signOut,
    clearError,
    checkUsernameAvailability,
  } = context;

  return {
    // State
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    authUser: state.authUser,
    userProfile: state.userProfile,
    hasCompletedOnboarding: state.hasCompletedOnboarding,
    error: state.error,

    // Actions
    sendOTP,
    verifyOTP,
    completeOnboarding,
    signOut,
    clearError,
    checkUsernameAvailability,

    // Computed values  
    isNewUser: state.isAuthenticated && !state.hasCompletedOnboarding,
    userEmail: state.authUser?.email || null,
    username: state.userProfile?.username || null,
    universityId: state.userProfile?.universityId || null,
  };
};