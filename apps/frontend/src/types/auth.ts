/**
 * Authentication types
 * Shared types for authentication system
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role: 'OWNER' | 'MANAGER' | 'TENANT';
  phone?: string | null;
  bio?: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  supabaseId?: string;
  stripeCustomerId?: string | null;
  organizationId?: string | null;
  // Supabase-specific properties
  user_metadata?: {
    name?: string;
    full_name?: string;
    avatar_url?: string;
    [key: string]: unknown;
  };
  access_token?: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  name: string;
}

export interface AuthError {
  message: string;
  code?: string;
  type?: string;
}

export interface AuthState {
  user: User | null;
  session: AuthSession | null;
  loading: boolean;
  error: AuthError | null;
}