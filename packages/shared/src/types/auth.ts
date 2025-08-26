/**
 * Authentication and user management types
 * All types related to users, authentication, and user roles
 */

// Import constants from the single source of truth
import type { USER_ROLE } from '../constants/auth'

// User role type derived from constants
export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE]

// Subscription status type
export type SubscriptionStatus =
	| 'ACTIVE'
	| 'TRIALING'
	| 'PAST_DUE'
	| 'CANCELED'
	| 'UNPAID'
	| 'INCOMPLETE'
	| 'INCOMPLETE_EXPIRED'

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

<<<<<<< HEAD
// Auth request/response types for API
export interface LoginCredentials {
	email: string
	password: string
}

export interface RegisterCredentials {
	email: string
	password: string
	fullName?: string
}

export interface AuthResponse {
	user: User | AuthUser
	session?: {
		access_token: string
		refresh_token: string
		expires_in: number
		expires_at?: number
	}
	message?: string
}

export interface RefreshTokenRequest {
	refresh_token: string
}

=======
>>>>>>> origin/main
// Secure subscription data type
export interface SecureSubscriptionData {
	status: SubscriptionStatus
	plan: string
	expiresAt?: Date
	stripeSubscriptionId?: string
	trialEndsAt?: Date
	cancelAtPeriodEnd?: boolean
}

// Enhanced user metadata with validation
export interface SecureUserMetadata {
	name?: string
	full_name?: string
	avatar_url?: string
	company_name?: string
	company_type?: 'LANDLORD' | 'PROPERTY_MANAGER' | 'TENANT' | 'VENDOR'
	company_size?: '1-10' | '11-50' | '51-200' | '201+'
	onboarding_completed?: boolean
	terms_accepted_at?: string
	privacy_policy_accepted_at?: string
}

// Authentication error types
export type AuthErrorCode =
	| 'INVALID_CREDENTIALS'
	| 'USER_NOT_FOUND'
	| 'EMAIL_NOT_VERIFIED'
	| 'ACCOUNT_LOCKED'
	| 'PASSWORD_TOO_WEAK'
	| 'EMAIL_ALREADY_EXISTS'
	| 'INVALID_TOKEN'
	| 'TOKEN_EXPIRED'
	| 'RATE_LIMITED'
	| 'NETWORK_ERROR'
	| 'VALIDATION_ERROR'
	| 'UNKNOWN_ERROR'

export interface AuthError {
	code: AuthErrorCode
	message: string
	field?: string
	details?: Record<string, string | number | boolean>
}

// Authentication related types
export interface AuthSession {
	access_token: string
	refresh_token: string
	expires_at: number
	user: User
}

<<<<<<< HEAD
=======
export interface AuthResponse {
	user: {
		id: string
		email: string
		name?: string
		role: UserRole
	}
	message: string
	session?: AuthSession
}

// Frontend-specific credential types
export interface LoginCredentials {
	email: string
	password: string
}

>>>>>>> origin/main
export interface SignupCredentials {
	email: string
	password: string
	name: string
}

export interface SupabaseJwtPayload {
	sub: string // Supabase user ID
	email: string
	email_confirmed_at?: string
	user_metadata?: SecureUserMetadata
	app_metadata?: {
		provider?: string
		providers?: string[]
		role?: UserRole
	}
	iat: number
	exp: number
	aud?: string
	iss?: string
}

// Standard JWT Payload
export interface JwtPayload {
	sub: string
	email: string
	role?: UserRole
	iat?: number
	exp?: number
}

// Validated user (after authentication) - type-safe with security context
export interface ValidatedUser {
	id: string
	email: string
	name?: string
	role?: UserRole
	organizationId?: string
	stripeCustomerId?: string
	subscription?: SecureSubscriptionData
	metadata?: SecureUserMetadata
	emailVerified?: boolean
	lastLoginAt?: Date
	createdAt?: Date
	updatedAt?: Date
	securityFlags?: {
		requiresMFA?: boolean
		isLocked?: boolean
		suspiciousActivity?: boolean
		passwordExpiresAt?: Date
		lastPasswordChange?: Date
		failedLoginAttempts?: number
	}
}
