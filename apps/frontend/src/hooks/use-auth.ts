/**
 * Authentication hook
 * Provides auth state and actions using Jotai
 */
import { useCallback, useEffect } from 'react';
import { logger } from '@/lib/logger'
import { useAtom } from 'jotai';
import { logger } from '@/lib/logger'
import { toast } from 'sonner';
import { logger } from '@/lib/logger'
import { onAuthStateChange } from '../lib/supabase';
import { logger } from '@/lib/logger'
import { AuthApi } from '../lib/auth-api';
import { logger } from '@/lib/logger'
import { userAtom, authLoadingAtom, authErrorAtom } from '../atoms/core/user';
import { logger } from '@/lib/logger'
import type { LoginCredentials, SignupCredentials, AuthError } from '../types/auth';
import { logger } from '@/lib/logger'

export function useAuth() {
  const [user, setUser] = useAtom(userAtom);
  const [loading, setLoading] = useAtom(authLoadingAtom);
  const [error, setError] = useAtom(authErrorAtom);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        setLoading(true);
        const session = await AuthApi.getCurrentSession();
        
        if (mounted) {
          setUser(session?.user || null);
        }
      } catch (error) {
        logger.error('Auth initialization failed:', error instanceof Error ? error : new Error(String(error)), { component: 'UauthHook' });
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      try {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setError(null);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Sync with backend when signed in
          try {
            const authSession = await AuthApi.getCurrentSession();
            setUser(authSession?.user || null);
          } catch (backendError) {
            logger.warn('Backend sync failed:', { component: 'UauthHook', data: backendError });
            // Keep the user logged in with Supabase data only
            if (session.user) {
              setUser({
                id: session.user.id,
                email: session.user.email!,
                name: session.user.user_metadata?.name,
                avatarUrl: session.user.user_metadata?.avatar_url,
                // Use role from user metadata or default to TENANT (least privileged)
                role: session.user.user_metadata?.role || 'TENANT',
                emailVerified: !!session.user.email_confirmed_at,
                createdAt: session.user.created_at!,
                updatedAt: session.user.updated_at!,
                supabaseId: session.user.id,
                phone: null,
                bio: null,
                stripeCustomerId: null,
                organizationId: null,
              });
            }
          }
        }
      } catch (error) {
        logger.error('Auth state change error:', error instanceof Error ? error : new Error(String(error)), { component: 'UauthHook' });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setUser, setLoading, setError]);

  // Login function
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      setError(null);

      const session = await AuthApi.login(credentials);
      setUser(session.user);
      
      toast.success('Welcome back!');
      return { success: true };
    } catch (error: unknown) {
      const authError: AuthError = {
        type: 'AUTH_ERROR',
        message: error instanceof Error ? error.message : 'Login failed',
        code: error instanceof Error && 'code' in error ? (error as { code: string }).code : 'AUTH_ERROR',
      };
      setError(authError);
      toast.error(authError.message);
      return { success: false, error: authError };
    } finally {
      setLoading(false);
    }
  }, [setUser, setLoading, setError]);

  // Signup function
  const signup = useCallback(async (credentials: SignupCredentials) => {
    try {
      setLoading(true);
      setError(null);

      const result = await AuthApi.signup(credentials);
      toast.success(result.message);
      return { success: true, message: result.message };
    } catch (error: unknown) {
      const authError: AuthError = {
        type: 'AUTH_ERROR',
        message: error instanceof Error ? error.message : 'Signup failed',
        code: error instanceof Error && 'code' in error ? (error as { code: string }).code : 'AUTH_ERROR',
      };
      setError(authError);
      toast.error(authError.message);
      return { success: false, error: authError };
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await AuthApi.logout();
      setUser(null);
      setError(null);
      toast.success('Logged out successfully');
    } catch (error: unknown) {
      logger.error('Logout error:', error instanceof Error ? error : new Error(String(error)), { component: 'UauthHook' });
      // Clear local state even if logout fails
      setUser(null);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [setUser, setLoading, setError]);

  // Reset password function
  const resetPassword = useCallback(async (email: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await AuthApi.resetPassword(email);
      toast.success(result.message);
      return { success: true, message: result.message };
    } catch (error: unknown) {
      const authError: AuthError = {
        type: 'AUTH_ERROR',
        message: error instanceof Error ? error.message : 'Password reset failed',
        code: error instanceof Error && 'code' in error ? (error as { code: string }).code : 'AUTH_ERROR',
      };
      setError(authError);
      toast.error(authError.message);
      return { success: false, error: authError };
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  return {
    // State
    user,
    loading,
    error,
    isAuthenticated: !!user,
    
    // Actions
    login,
    signup,
    logout,
    resetPassword,
  };
}

// Alias for backward compatibility with useMe naming
export const useMe = () => {
  const { user, loading, error } = useAuth();
  return { data: user, isLoading: loading, error };
};