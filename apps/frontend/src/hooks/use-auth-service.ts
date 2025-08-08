/**
 * Authentication Service Hooks
 * 
 * React hooks that integrate authentication services with React state management.
 * Provides clean separation between UI and business logic.
 */

import { useState, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthService } from '@/services';
import type { SignInCredentials, SignUpData } from '@/services';
import type { Result, User } from '@repo/shared';
import { toast } from 'sonner';

export interface UseAuthReturn {
  // State
  user: User | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  signIn: (credentials: SignInCredentials) => Promise<Result<void>>;
  signUp: (userData: SignUpData) => Promise<Result<void>>;
  signOut: () => Promise<Result<void>>;
  resetPassword: (email: string) => Promise<Result<void>>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<Result<void>>;
  refreshSession: () => Promise<Result<void>>;
  
  // Utilities
  clearError: () => void;
  getPasswordStrength: (password: string) => { score: number; feedback: string[]; isStrong: boolean };
  validateEmail: (email: string) => boolean;
}

export function useAuth(): UseAuthReturn {
  const authService = useAuthService();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const [state, setState] = useState<{
    user: User | null;
    isLoading: boolean;
    error: string | null;
  }>({
    user: null,
    isLoading: false,
    error: null,
  });

  const setLoading = (loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading, error: null }));
  };

  const setError = (error: string | null) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  };

  const setUser = (user: User | null) => {
    setState(prev => ({ ...prev, user, isLoading: false, error: null }));
  };

  const signIn = useCallback(async (credentials: SignInCredentials): Promise<Result<void>> => {
    setLoading(true);
    
    const result = await authService.signIn(credentials);
    
    if (result.success) {
      setUser(result.value.user);
      toast.success('Welcome back!');
      
      // Navigate to dashboard after successful login
      startTransition(() => {
        router.push('/dashboard');
      });
      
      return { success: true, value: undefined };
    } else {
      setError(result.error.message);
      toast.error(result.error.message);
      return result;
    }
  }, [authService, router]);

  const signUp = useCallback(async (userData: SignUpData): Promise<Result<void>> => {
    setLoading(true);
    
    const result = await authService.signUp(userData);
    
    if (result.success) {
      // For email confirmation flow, user might not be immediately available
      if (result.value.user) {
        setUser(result.value.user);
      }
      
      toast.success('Account created! Please check your email to verify your account.');
      return { success: true, value: undefined };
    } else {
      setError(result.error.message);
      toast.error(result.error.message);
      return result;
    }
  }, [authService]);

  const signOut = useCallback(async (): Promise<Result<void>> => {
    setLoading(true);
    
    const result = await authService.signOut();
    
    if (result.success) {
      setUser(null);
      toast.success('Signed out successfully');
      
      // Navigate to login after successful logout
      startTransition(() => {
        router.push('/login');
      });
      
      return { success: true, value: undefined };
    } else {
      setError(result.error.message);
      toast.error(result.error.message);
      return result;
    }
  }, [authService, router]);

  const resetPassword = useCallback(async (email: string): Promise<Result<void>> => {
    setLoading(true);
    
    const result = await authService.resetPassword(email);
    
    if (result.success) {
      toast.success('Password reset email sent! Check your inbox for instructions.');
      setState(prev => ({ ...prev, isLoading: false, error: null }));
      return { success: true, value: undefined };
    } else {
      setError(result.error.message);
      toast.error(result.error.message);
      return result;
    }
  }, [authService]);

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<Result<void>> => {
    setLoading(true);
    
    const result = await authService.updatePassword(currentPassword, newPassword);
    
    if (result.success) {
      toast.success('Password updated successfully!');
      setState(prev => ({ ...prev, isLoading: false, error: null }));
      return { success: true, value: undefined };
    } else {
      setError(result.error.message);
      toast.error(result.error.message);
      return result;
    }
  }, [authService]);

  const refreshSession = useCallback(async (): Promise<Result<void>> => {
    const result = await authService.refreshSession();
    
    if (result.success) {
      setUser(result.value.user);
      return { success: true, value: undefined };
    } else {
      setError(result.error.message);
      return result;
    }
  }, [authService]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getPasswordStrength = useCallback((password: string) => {
    return authService.getPasswordStrength(password);
  }, [authService]);

  const validateEmail = useCallback((email: string) => {
    return authService.isEmailValid(email);
  }, [authService]);

  return {
    user: state.user,
    isLoading: state.isLoading || isPending,
    error: state.error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshSession,
    clearError,
    getPasswordStrength,
    validateEmail,
  };
}

/**
 * Hook for checking authentication status
 */
export function useAuthStatus() {
  const authService = useAuthService();
  const [state, setState] = useState<{
    isAuthenticated: boolean | null;
    user: User | null;
    isLoading: boolean;
  }>({
    isAuthenticated: null,
    user: null,
    isLoading: true,
  });

  const checkAuthStatus = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    const userResult = await authService.getCurrentUser();
    
    if (userResult.success) {
      setState({
        isAuthenticated: userResult.value !== null,
        user: userResult.value,
        isLoading: false,
      });
    } else {
      setState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
    }
  }, [authService]);

  return {
    ...state,
    checkAuthStatus,
  };
}

/**
 * Hook for session validation
 */
export function useSessionValidation() {
  const authService = useAuthService();
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validateSession = useCallback(async () => {
    setIsValidating(true);
    
    const result = await authService.validateSession();
    
    if (result.success) {
      setIsValid(result.value);
    } else {
      setIsValid(false);
    }
    
    setIsValidating(false);
  }, [authService]);

  return {
    isValid,
    isValidating,
    validateSession,
  };
}

/**
 * Hook for password strength validation
 */
export function usePasswordValidation() {
  const authService = useAuthService();

  const validatePassword = useCallback((password: string) => {
    return authService.getPasswordStrength(password);
  }, [authService]);

  const isValidPassword = useCallback((password: string) => {
    const strength = authService.getPasswordStrength(password);
    return strength.isStrong;
  }, [authService]);

  return {
    validatePassword,
    isValidPassword,
  };
}