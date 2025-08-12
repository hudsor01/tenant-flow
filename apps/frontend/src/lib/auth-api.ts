/**
 * Authentication API functions
 * Handles auth operations with the backend
 */
import { apiClient } from './api-client';
import { logger } from '@/lib/logger'
import { supabase } from './supabase';
import type { AuthSession, LoginCredentials, SignupCredentials, User } from '../types/auth';

// Supabase user interface for type safety
interface SupabaseUser {
  id: string;
  email: string;
  email_confirmed_at?: string;
  created_at: string;
  updated_at: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface BackendAuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

export class AuthApi {
  /**
   * Login with email and password
   */
  static async login(credentials: LoginCredentials): Promise<AuthSession> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      throw { message: error.message, code: error.message };
    }

    if (!data.session || !data.user) {
      throw { message: 'Login failed - no session created' };
    }

    // Sync with backend and get user profile
    try {
      const backendUser = await this.syncWithBackend();
      
      return {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in || 3600,
        user: backendUser,
      };
    } catch (backendError) {
      // If backend sync fails, still return the Supabase session
      logger.warn('Backend sync failed during login:', { component: 'lib_auth_api.ts', data: backendError });
      
      return {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in || 3600,
        user: this.mapSupabaseUser(data.user as SupabaseUser),
      };
    }
  }

  /**
   * Sign up new user
   */
  static async signup(credentials: SignupCredentials): Promise<{ message: string }> {
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          name: credentials.name,
          full_name: credentials.name,
        },
      },
    });

    if (error) {
      throw { message: error.message, code: error.message };
    }

    if (!data.user) {
      throw { message: 'Signup failed - user not created' };
    }

    return {
      message: 'Account created successfully. Please check your email to verify your account.',
    };
  }

  /**
   * Logout current user
   */
  static async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.warn('Logout error:', { component: 'lib_auth_api.ts', data: error });
    }
  }

  /**
   * Get current session
   */
  static async getCurrentSession(): Promise<AuthSession | null> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return null;
    }

    try {
      const backendUser = await this.syncWithBackend();
      
      return {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in || 3600,
        user: backendUser,
      };
    } catch (error: unknown) {
      logger.warn('Failed to sync with backend:', { component: 'lib_auth_api.ts', data: error });
      return null;
    }
  }

  /**
   * Refresh session
   */
  static async refreshSession(): Promise<AuthSession | null> {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error || !data.session) {
      return null;
    }

    try {
      const backendUser = await this.syncWithBackend();
      
      return {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in || 3600,
        user: backendUser,
      };
    } catch (error: unknown) {
      logger.warn('Failed to sync with backend during refresh:', { component: 'lib_auth_api.ts', data: error });
      return null;
    }
  }

  /**
   * Sync user with backend (validates token and gets user profile)
   */
  private static async syncWithBackend(): Promise<User> {
    try {
      // The backend auth service will validate the token and return user data
      const response = await apiClient.get<{ user?: User } | User>('/auth/me');
      
      // Handle both wrapped and direct user response formats
      if (response.data && typeof response.data === 'object' && 'user' in response.data && response.data.user) {
        return response.data.user;
      }
      
      // If response.data is directly the user object
      return response.data as User;
    } catch (error: unknown) {
      logger.error('Backend sync failed:', error instanceof Error ? error : new Error(String(error)), { component: 'lib_auth_api.ts' });
      throw error;
    }
  }

  /**
   * Map Supabase user to our User interface (fallback)
   */
  private static mapSupabaseUser(supabaseUser: SupabaseUser): User {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name,
      avatarUrl: supabaseUser.user_metadata?.avatar_url,
      role: 'OWNER', // Default role
      emailVerified: !!supabaseUser.email_confirmed_at,
      createdAt: supabaseUser.created_at,
      updatedAt: supabaseUser.updated_at,
      supabaseId: supabaseUser.id,
      phone: null,
      bio: null,
      stripeCustomerId: null,
      organizationId: null,
    };
  }

  /**
   * Reset password
   */
  static async resetPassword(email: string): Promise<{ message: string }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      throw { message: error.message, code: error.message };
    }

    return {
      message: 'Password reset email sent. Please check your inbox.',
    };
  }

  /**
   * Update password
   */
  static async updatePassword(newPassword: string): Promise<{ message: string }> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw { message: error.message, code: error.message };
    }

    return {
      message: 'Password updated successfully.',
    };
  }
}