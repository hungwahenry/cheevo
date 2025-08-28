/**
 * Standard API response wrapper
 */
export type ApiResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

/**
 * Authentication error types
 */
export type AuthError = 
  | 'INVALID_EMAIL'
  | 'OTP_EXPIRED' 
  | 'INVALID_OTP'
  | 'USER_NOT_FOUND'
  | 'EMAIL_NOT_CONFIRMED'
  | 'TOO_MANY_REQUESTS'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * API loading states
 */
export type LoadingState = {
  isLoading: boolean;
  error: string | null;
};

/**
 * Paginated response
 */
export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
};

/**
 * Generic error response from Supabase
 */
export type SupabaseError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};