/**
 * User profile data structure
 */
export type UserProfile = {
  id: string;
  email: string;
  username: string;
  universityId: number | null;
  onboardingCompleted: boolean;
  createdAt: string;
};

/**
 * Authentication state
 */
export type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
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