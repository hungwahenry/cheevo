import React, { createContext, useReducer, useEffect, ReactNode } from 'react';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { AuthService } from '@/src/services/auth.service';
import { userProfileService } from '@/src/services/user-profile.service';
import { AuthState, UserProfile, OnboardingData, AuthUser } from '@/src/types/user';
import { ApiResponse } from '@/src/types/api';

// Action types
type AuthAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_AUTH_USER'; payload: AuthUser | null }
  | { type: 'SET_USER_PROFILE'; payload: UserProfile | null }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_STATE' };

// Context type
type AuthContextType = {
  state: AuthState;
  sendOTP: (email: string) => Promise<boolean>;
  verifyOTP: (email: string, code: string) => Promise<{ success: boolean;}>;
  completeOnboarding: (data: OnboardingData) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
  checkUsernameAvailability: (username: string) => Promise<ApiResponse<boolean>>;
};

// Initial state
const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  authUser: null,
  userProfile: null,
  hasCompletedOnboarding: false,
  error: null,
};

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_AUTH_USER':
      return {
        ...state,
        authUser: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false,
        error: null,
      };
    case 'SET_USER_PROFILE':
      return {
        ...state,
        userProfile: action.payload,
        hasCompletedOnboarding: !!action.payload,
        isLoading: false,
        error: null,
      };
    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'RESET_STATE':
      return { ...initialState, isLoading: false };
    default:
      return state;
  }
};

// Create context
export const AuthContext = createContext<AuthContextType | null>(null);

// Provider component
type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state on mount
  useEffect(() => {
    let mounted = true;
    let isInitializing = true;

    const initializeAuth = async () => {
      try {
        const sessionResult = await AuthService.getSession();
        
        if (!mounted) return;

        if (sessionResult.success && sessionResult.data?.user) {
          // Try to load user profile from database
          const profileResult = await userProfileService.getUserProfile(sessionResult.data.user.id);
          
          if (profileResult.success && profileResult.data) {
            dispatch({ type: 'SET_AUTH_USER', payload: { id: sessionResult.data.user.id, email: sessionResult.data.user.email!, createdAt: sessionResult.data.user.created_at } });
            dispatch({ type: 'SET_USER_PROFILE', payload: profileResult.data });
          } else {
            // Check if the auth user actually exists by trying to get user again
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !user) {
              await AuthService.signOut();
              dispatch({ type: 'RESET_STATE' });
            } else {
              dispatch({ type: 'SET_AUTH_USER', payload: { id: user.id, email: user.email!, createdAt: user.created_at } });
              dispatch({ type: 'SET_USER_PROFILE', payload: null });
              dispatch({ type: 'SET_LOADING', payload: false });
            }
          }
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (!mounted) return;
        dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize authentication' });
      }
    };

    initializeAuth().finally(() => {
      isInitializing = false;
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return;

        // Skip handling INITIAL_SESSION and SIGNED_IN during initialization to prevent race conditions
        if (isInitializing && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
          return;
        }

        if (session?.user) {
          // Try to load user profile from database
          const profileResult = await userProfileService.getUserProfile(session.user.id);
          
          if (profileResult.success && profileResult.data) {
            dispatch({ type: 'SET_AUTH_USER', payload: { id: session.user.id, email: session.user.email!, createdAt: session.user.created_at } });
            dispatch({ type: 'SET_USER_PROFILE', payload: profileResult.data });
          } else {
            // User exists but no profile = onboarding not completed
            dispatch({ type: 'SET_AUTH_USER', payload: { id: session.user.id, email: session.user.email!, createdAt: session.user.created_at } });
            dispatch({ type: 'SET_USER_PROFILE', payload: null });
          }
        } else {
          dispatch({ type: 'RESET_STATE' });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Send OTP
  const sendOTP = async (email: string): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    const result = await AuthService.sendOTP(email);
    
    if (result.success) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return true;
    } else {
      dispatch({ type: 'SET_ERROR', payload: result.error });
      return false;
    }
  };

  // Verify OTP
  const verifyOTP = async (email: string, code: string): Promise<{ success: boolean }> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    const result = await AuthService.verifyOTP(email, code);
    
    if (result.success) {
      // Try to load user profile from database
      const profileResult = await userProfileService.getUserProfile(result.data.user.id);
      
      if (profileResult.success && profileResult.data) {
        dispatch({ type: 'SET_AUTH_USER', payload: { id: result.data.user.id, email: result.data.user.email!, createdAt: result.data.user.created_at } });
        dispatch({ type: 'SET_USER_PROFILE', payload: profileResult.data });
      } else {
        // User exists but no profile = onboarding not completed
        dispatch({ type: 'SET_AUTH_USER', payload: { id: result.data.user.id, email: result.data.user.email!, createdAt: result.data.user.created_at } });
        dispatch({ type: 'SET_USER_PROFILE', payload: null });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
      
      return { success: true };
    } else {
      dispatch({ type: 'SET_ERROR', payload: result.error });
      return { success: false };
    }
  };

  // Complete onboarding
  const completeOnboarding = async (data: OnboardingData): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    const result = await userProfileService.createUserProfile(data.username, data.universityId);
    
    if (result.success) {
      dispatch({ type: 'SET_USER_PROFILE', payload: result.data });
      return true;
    } else {
      dispatch({ type: 'SET_ERROR', payload: result.error });
      return false;
    }
  };

  // Sign out
  const signOut = async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    await AuthService.signOut();
    dispatch({ type: 'RESET_STATE' });
  };

  // Clear error
  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Check username availability
  const checkUsernameAvailability = async (username: string): Promise<ApiResponse<boolean>> => {
    return await userProfileService.checkUsernameAvailability(username);
  };

  const contextValue: AuthContextType = {
    state,
    sendOTP,
    verifyOTP,
    completeOnboarding,
    signOut,
    clearError,
    checkUsernameAvailability,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};