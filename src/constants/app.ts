/**
 * App-wide constants
 * Configuration values that don't change during runtime
 */

export const APP_CONFIG = {
  // App Information
  NAME: 'Cheevo',
  VERSION: '1.0.0',
  
  // Authentication
  OTP_LENGTH: 6,
  OTP_RESEND_COOLDOWN: 60, // seconds
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,
  
  // UI
  ANIMATION_DURATION: 300,
  HAPTIC_FEEDBACK: true,
  
  // API
  REQUEST_TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
} as const;

export const ROUTES = {
  // Onboarding & Auth
  SPLASH: '/',
  WELCOME: '/welcome',
  AUTH: '/auth',
  VERIFY_OTP: '/verify-otp',
  ONBOARDING: '/onboarding',
  
  // Main App
  FEED: '/(tabs)',
  CAMPUS_FEED: '/(tabs)/campus',
  TRENDING: '/(tabs)/trending',
  PROFILE: '/(tabs)/profile',
} as const;

export const STORAGE_KEYS = {
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme',
  ONBOARDING_COMPLETED: 'onboarding_completed',
} as const;

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Please check your internet connection and try again',
  UNKNOWN_ERROR: 'Something went wrong. Please try again',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again',
  INVALID_OTP: 'Invalid verification code. Please try again',
  OTP_EXPIRED: 'Verification code has expired. Please request a new one',
  EMAIL_REQUIRED: 'Email address is required',
  INVALID_EMAIL: 'Please enter a valid email address',
} as const;