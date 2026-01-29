/**
 * Authentication types
 * Minimal set - only types actually used in the codebase
 */

import type { USER_user_type } from '../constants/auth.js'
import type {
	Session as SupabaseSession,
	User as SupabaseAuthUserType
} from '@supabase/supabase-js'

// Supabase Auth user - this is what we get from supabase.auth.getUser()
export type SupabaseAuthUser = SupabaseAuthUserType
export type AuthUser = SupabaseAuthUser

// User role from database constants
export type UserRole = (typeof USER_user_type)[keyof typeof USER_user_type]

// Session from Supabase Auth
export type AuthSession = SupabaseSession

// Login credentials for auth hooks
export type LoginCredentials = {
	email: string
	password: string
}

// Signup form data for registration
export interface SignupFormData {
	email: string
	password: string
	confirmPassword: string
	fullName: string
	firstName?: string
	lastName?: string
	company?: string
	companyName?: string
	acceptTerms: boolean
}
