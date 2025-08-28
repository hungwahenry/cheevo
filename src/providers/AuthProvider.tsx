import React, { createContext, useReducer, useEffect, ReactNode } from 'react';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { AuthService } from '@/src/services/auth.service';
import { AuthState, UserProfile, OnboardingData } from '@/src/types/user';
import { ApiResponse } from '@/src/types/api';

// Action types
type AuthAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_USER'; payload: UserProfile | null }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_STATE' };

// Context type
type AuthContextType = {
  state: AuthState;
  sendOTP: (email: string) => Promise<boolean>;
  verifyOTP: (email: string, code: string) => Promise<{ success: boolean; isNewUser?: boolean }>;
  completeOnboarding: (data: OnboardingData) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
  checkUsernameAvailability: (username: string) => Promise<ApiResponse<boolean>>;
};

// Initial state
const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
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
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        hasCompletedOnboarding: action.payload ? AuthService.hasCompletedOnboarding(action.payload) : false,
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

    const initializeAuth = async () => {
      try {
        const sessionResult = await AuthService.getSession();
        
        if (!mounted) return;

        if (sessionResult.success && sessionResult.data?.user) {
          const userProfile = AuthService.getUserProfile(sessionResult.data.user);
          dispatch({ type: 'SET_USER', payload: userProfile });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        if (!mounted) return;
        dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize authentication' });
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return;

        if (session?.user) {
          const userProfile = AuthService.getUserProfile(session.user);
          dispatch({ type: 'SET_USER', payload: userProfile });
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
  const verifyOTP = async (email: string, code: string): Promise<{ success: boolean; isNewUser?: boolean }> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    const result = await AuthService.verifyOTP(email, code);
    
    if (result.success) {
      const userProfile = AuthService.getUserProfile(result.data.user);
      dispatch({ type: 'SET_USER', payload: userProfile });
      return { success: true, isNewUser: result.data.isNewUser };
    } else {
      dispatch({ type: 'SET_ERROR', payload: result.error });
      return { success: false };
    }
  };

  // Complete onboarding
  const completeOnboarding = async (data: OnboardingData): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    const result = await AuthService.completeOnboarding(data.username, data.universityId);
    
    if (result.success) {
      const userProfile = AuthService.getUserProfile(result.data);
      dispatch({ type: 'SET_USER', payload: userProfile });
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
    return await AuthService.checkUsernameAvailability(username);
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