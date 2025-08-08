/**
 * Authentication Repository Implementation
 * 
 * Implements authentication data access using Supabase Auth.
 * Abstracts Supabase-specific logic behind a clean interface.
 */

import { auth } from '@/lib/supabase';
import type { Result, UserRole } from '@repo/shared';
import type { AuthRepository, AuthResult, SignUpData } from '../interfaces';
import type { User } from '@repo/shared';

export class SupabaseAuthRepository implements AuthRepository {
  async signIn(email: string, password: string): Promise<Result<AuthResult>> {
    try {
      const { data, error } = await auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          success: false,
          error: new Error(error.message),
        };
      }

      if (!data.user || !data.session) {
        return {
          success: false,
          error: new Error('Authentication failed - no user or session returned'),
        };
      }

      const user: User = {
        id: data.user.id,
        supabaseId: data.user.id,
        stripeCustomerId: null,
        email: data.user.email!,
        name: data.user.user_metadata?.full_name || data.user.email!,
        phone: null,
        bio: null,
        avatarUrl: data.user.user_metadata?.avatar_url || null,
        role: 'OWNER' as UserRole,
        organizationId: null,
        createdAt: new Date(data.user.created_at),
        updatedAt: data.user.updated_at ? new Date(data.user.updated_at) : new Date(),
      };

      const authResult: AuthResult = {
        user,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at || 0,
        },
      };

      return {
        success: true,
        value: authResult,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Sign in failed'),
      };
    }
  }

  async signUp(userData: SignUpData): Promise<Result<AuthResult>> {
    try {
      const { data, error } = await auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.fullName,
            company_name: userData.companyName,
          },
        },
      });

      if (error) {
        return {
          success: false,
          error: new Error(error.message),
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: new Error('Signup failed - no user returned'),
        };
      }

      const user: User = {
        id: data.user.id,
        supabaseId: data.user.id,
        stripeCustomerId: null,
        email: data.user.email!,
        name: userData.fullName,
        phone: null,
        bio: null,
        avatarUrl: data.user.user_metadata?.avatar_url || null,
        role: 'OWNER' as UserRole,
        organizationId: null,
        createdAt: new Date(data.user.created_at),
        updatedAt: data.user.updated_at ? new Date(data.user.updated_at) : new Date(),
      };

      // For email confirmation flow, session might not be available immediately
      const authResult: AuthResult = {
        user,
        session: data.session ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at || 0,
        } : {
          access_token: '',
          refresh_token: '',
          expires_at: 0,
        },
      };

      return {
        success: true,
        value: authResult,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Signup failed'),
      };
    }
  }

  async signOut(): Promise<Result<void>> {
    try {
      const { error } = await auth.signOut();

      if (error) {
        return {
          success: false,
          error: new Error(error.message),
        };
      }

      return {
        success: true,
        value: undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Sign out failed'),
      };
    }
  }

  async resetPassword(email: string): Promise<Result<void>> {
    try {
      const { error } = await auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/update-password`,
      });

      if (error) {
        return {
          success: false,
          error: new Error(error.message),
        };
      }

      return {
        success: true,
        value: undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Password reset failed'),
      };
    }
  }

  async updatePassword(password: string): Promise<Result<void>> {
    try {
      const { error } = await auth.updateUser({
        password,
      });

      if (error) {
        return {
          success: false,
          error: new Error(error.message),
        };
      }

      return {
        success: true,
        value: undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Password update failed'),
      };
    }
  }

  async getCurrentUser(): Promise<Result<User | null>> {
    try {
      const { data: { user }, error } = await auth.getUser();

      if (error) {
        return {
          success: false,
          error: new Error(error.message),
        };
      }

      if (!user) {
        return {
          success: true,
          value: null,
        };
      }

      const currentUser: User = {
        id: user.id,
        supabaseId: user.id,
        stripeCustomerId: null,
        email: user.email!,
        name: user.user_metadata?.full_name || user.email!,
        phone: null,
        bio: null,
        avatarUrl: user.user_metadata?.avatar_url || null,
        role: 'OWNER' as UserRole,
        organizationId: null,
        createdAt: new Date(user.created_at),
        updatedAt: user.updated_at ? new Date(user.updated_at) : new Date(),
      };

      return {
        success: true,
        value: currentUser,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get current user'),
      };
    }
  }

  async refreshToken(): Promise<Result<AuthResult>> {
    try {
      const { data, error } = await auth.refreshSession();

      if (error) {
        return {
          success: false,
          error: new Error(error.message),
        };
      }

      if (!data.user || !data.session) {
        return {
          success: false,
          error: new Error('Token refresh failed - no user or session returned'),
        };
      }

      const user: User = {
        id: data.user.id,
        supabaseId: data.user.id,
        stripeCustomerId: null,
        email: data.user.email!,
        name: data.user.user_metadata?.full_name || data.user.email!,
        phone: null,
        bio: null,
        avatarUrl: data.user.user_metadata?.avatar_url || null,
        role: 'OWNER' as UserRole,
        organizationId: null,
        createdAt: new Date(data.user.created_at),
        updatedAt: data.user.updated_at ? new Date(data.user.updated_at) : new Date(),
      };

      const authResult: AuthResult = {
        user,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at || 0,
        },
      };

      return {
        success: true,
        value: authResult,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Token refresh failed'),
      };
    }
  }
}