/**
 * Authentication & Authorization Types
 * Centralized type definitions for user authentication and authorization
 */

// User roles enum
export const USER_ROLE = {
  ADMIN: 'ADMIN',
  OWNER: 'OWNER', 
  TENANT: 'TENANT',
  MANAGER: 'MANAGER'
} as const

export type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE]

// Core user interface
export interface User {
  id: string
  email: string
  role: UserRole
  name: string | null
  phone: string | null
  avatarUrl: string | null
  bio: string | null
  supabaseId: string
  stripeCustomerId: string | null
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

// Authentication context user (lighter version for TRPC context)
export interface AuthUser {
  id: string
  email: string
  role: UserRole
  phone?: string | null
  name?: string | null
  avatarUrl?: string | null
  bio?: string | null
  supabaseId?: string
  stripeCustomerId?: string | null
  createdAt?: Date | string
  updatedAt?: Date | string
  emailVerified?: boolean
}

// Authentication context for TRPC procedures
export interface AuthenticatedContext {
  user: AuthUser
}

// Authentication response interface
export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken?: string
  expiresAt: Date
}

// Supabase JWT payload interface
export interface SupabaseJwtPayload {
  sub: string
  email?: string
  role?: string
  aud: string
  exp: number
  iat: number
}

// Supabase user interface
export interface SupabaseUser {
  id: string
  email?: string
  email_confirmed_at?: string
  user_metadata?: {
    name?: string
    full_name?: string
    avatar_url?: string
  }
  created_at?: string
  updated_at?: string
}