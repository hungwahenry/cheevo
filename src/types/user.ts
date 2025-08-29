/**
 * Basic auth user info (always available when authenticated)
 */
export type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
};

/**
 * User profile data structure (from user_profiles table when onboarding complete)
 */
export type UserProfile = {
  id: string;
  email: string;
  username: string;
  universityId: number;
  bio?: string | null;
  avatarUrl?: string | null;
  
  // Cached stats
  postsCount: number;
  reactionsReceived: number;
  commentsCount: number;
  totalViews: number;
  trendingScore: number;
  
  // University info (joined)
  university?: {
    id: number;
    name: string;
    shortName: string | null;
    state: string;
  };
  
  createdAt: string;
  updatedAt: string;
};

/**
 * Authentication state
 */
export type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  authUser: AuthUser | null;  // Basic user info (always available when authenticated)
  userProfile: UserProfile | null;  // Full profile (only when onboarding complete)
  hasCompletedOnboarding: boolean;
  error: string | null;
};

/**
 * Onboarding form data
 */
export type OnboardingData = {
  username: string;
  universityId: number;
};

/**
 * OTP verification data
 */
export type OTPVerification = {
  email: string;
  code: string;
};