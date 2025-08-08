/**
 * Authentication and user management types
 * All types related to users, authentication, and user roles
 */

// Import constants from the single source of truth
import type { USER_ROLE } from '../constants/auth'

// User role type derived from constants
export type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE]

// User role display helpers are now imported from utils
// This ensures single source of truth for these functions

// User entity types
export interface User {
  id: string
  supabaseId: string
  stripeCustomerId: string | null
  email: string
  name: string | null
  phone: string | null
  bio: string | null
  avatarUrl: string | null
  role: UserRole
  organizationId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface AuthUser extends User {
  emailVerified: boolean
  organizationName?: string
  permissions?: string[]
  subscription?: {
    status: string
    plan: string
    expiresAt?: Date
  }
}

// Authentication related types
export interface AuthResponse {
  user: {
    id: string
    email: string
    name?: string
    role: UserRole
  }
  message: string
}

export interface SupabaseJwtPayload {
  sub: string // Supabase user ID
  email: string
  email_confirmed_at?: string
  user_metadata?: {
    name?: string
    full_name?: string
    avatar_url?: string
  }
  app_metadata?: {
    provider?: string
    providers?: string[]
  }
  iat: number
  exp: number
  aud?: string
  iss?: string
}
