/**
 * Authentication types
 * Minimal set - only types actually used in the codebase
 */

import type {
	Session as SupabaseSession,
	User as SupabaseAuthUserType
} from '@supabase/supabase-js'

// Supabase Auth user - this is what we get from supabase.auth.getUser()
export type SupabaseAuthUser = SupabaseAuthUserType
export type AuthUser = SupabaseAuthUser

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
