/**
 * Authentication and user management types
 * All types related to users, authentication, and user roles
 */

// Import constants from the single source of truth
import { USER_ROLE } from '../constants/auth'

// User role type derived from constants
export type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE]

// User role display helpers
export const getUserRoleLabel = (role: UserRole): string => {
  const labels: Record<UserRole, string> = {
    OWNER: 'Property Owner',
    MANAGER: 'Property Manager',
    TENANT: 'Tenant',
    ADMIN: 'Administrator'
  }
  return labels[role] || role
}

export const getUserRoleColor = (role: UserRole): string => {
  const colors: Record<UserRole, string> = {
    OWNER: 'bg-purple-100 text-purple-800',
    MANAGER: 'bg-blue-100 text-blue-800',
    TENANT: 'bg-green-100 text-green-800',
    ADMIN: 'bg-red-100 text-red-800'
  }
  return colors[role] || 'bg-gray-100 text-gray-800'
}

// User entity types
export interface User {
  supabaseId: string
  stripeCustomerId: string | null
  id: string
  email: string
  name: string | null
  phone: string | null
  bio: string | null
  avatarUrl: string | null
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

export interface AuthUser extends User {
  emailVerified: boolean
  supabaseId: string
  stripeCustomerId: string | null
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
  iat?: number
  exp?: number
  aud?: string
  iss?: string
}
