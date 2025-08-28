import { useContext } from 'react';
import { AuthContext } from '@/src/providers/AuthProvider';
import { AuthState, UserProfile, OnboardingData } from '@/src/types/user';

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
    user: state.user,
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
    isNewUser: state.user && !state.hasCompletedOnboarding,
    userEmail: state.user?.email || null,
    username: state.user?.username || null,
    universityId: state.user?.universityId || null,
  };
};