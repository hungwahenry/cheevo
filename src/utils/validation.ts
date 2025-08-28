/**
 * Validation utilities
 * Pure functions with no side effects
 */

export const validation = {
  /**
   * Validate email format
   */
  email: (email: string): { isValid: boolean; error?: string } => {
    const trimmedEmail = email.trim();
    
    if (!trimmedEmail) {
      return { isValid: false, error: 'Email is required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }

    return { isValid: true };
  },

  /**
   * Validate OTP code format
   */
  otpCode: (code: string): { isValid: boolean; error?: string } => {
    const trimmedCode = code.trim();
    
    if (!trimmedCode) {
      return { isValid: false, error: 'Verification code is required' };
    }

    if (!/^\d{6}$/.test(trimmedCode)) {
      return { isValid: false, error: 'Please enter a valid 6-digit code' };
    }

    return { isValid: true };
  },

  /**
   * Validate username format
   */
  username: (username: string): { isValid: boolean; error?: string } => {
    const trimmedUsername = username.trim();
    
    if (!trimmedUsername) {
      return { isValid: false, error: 'Username is required' };
    }

    if (trimmedUsername.length < 3) {
      return { isValid: false, error: 'Username must be at least 3 characters long' };
    }

    if (trimmedUsername.length > 20) {
      return { isValid: false, error: 'Username cannot exceed 20 characters' };
    }

    // Allow letters, numbers, and underscores only
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      return { isValid: false, error: 'Username can only contain letters, numbers, and underscores' };
    }

    // Must start with a letter
    if (!/^[a-zA-Z]/.test(trimmedUsername)) {
      return { isValid: false, error: 'Username must start with a letter' };
    }

    return { isValid: true };
  },

  /**
   * Validate university selection
   */
  university: (universityId: number | null): { isValid: boolean; error?: string } => {
    if (!universityId || universityId <= 0) {
      return { isValid: false, error: 'Please select your university' };
    }

    return { isValid: true };
  },
};