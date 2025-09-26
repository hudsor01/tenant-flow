/**
 * Authentication and user management types
 * All types related to users, authentication, and user roles
 */

// Import constants from the single source of truth
import type { USER_ROLE } from '../constants/auth.js'
import type { ValidatedUser as BackendValidatedUser } from './backend-domain.js'
import type { Database } from './supabase-generated.js'

// Use Supabase User type directly - matches what we get from auth
import type { User } from '@supabase/supabase-js'
export type AuthUser = User

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

// Type guard to check if user has organizationId (for when feature is implemented)
export function hasOrganizationId(
	user: AuthUser
): user is AuthUser & { organizationId: string } {
	const userWithOrg = user as AuthUser & { organizationId?: string }
	return (
		typeof userWithOrg.organizationId === 'string' &&
		userWithOrg.organizationId.length > 0
	)
}

// AUTH FORM DATA TYPES - CONSOLIDATED from frontend forms

export interface LoginFormData {
	email: string
	password: string
	rememberMe?: boolean
}

export interface SignupFormData {
	email: string
	password: string
	confirmPassword: string
	fullName: string
	companyName?: string
	acceptTerms: boolean
}

export interface ForgotPasswordFormData {
	email: string
}

export interface ResetPasswordFormData {
	password: string
	confirmPassword: string
}

export interface UpdatePasswordFormData {
	currentPassword: string
	newPassword: string
	confirmPassword: string
}

export interface ProfileFormData {
	name: string
	email: string
	phone?: string
	company?: string
	address?: string
	avatar?: string
}

export interface ContactFormData {
	name: string
	email: string
	subject: string
	message: string
	phone?: string
}

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

// Client-side auth action types
export interface SignupData {
	email: string
	password: string
	firstName: string
	lastName: string
	company?: string
}

export interface ClientAuthResponse {
	success: boolean
	error?: string
	data?: unknown
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

// Use Supabase Session type directly - no custom interface needed
import type { Session } from '@supabase/supabase-js'
export type AuthSession = Session

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

// Re-export ValidatedUser from backend-domain.ts to avoid duplication
export type { ValidatedUser } from './backend-domain.js'

// Supabase user structure (from Supabase auth.getUser())
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

// Auth service validated user - directly extends database User table type
export interface AuthServiceValidatedUser
	extends Omit<
		Database['public']['Tables']['User']['Row'],
		'createdAt' | 'updatedAt'
	> {
	createdAt: Date
	updatedAt: Date
	profileComplete: boolean
	lastLoginAt: Date
	organizationId: string | null | undefined
	emailVerified: boolean
}

// ADDITIONAL AUTH TYPES - MIGRATED from inline definitions

// Backend auth request/response schemas
export interface LoginRequest {
	email: string
	password: string
	rememberMe?: boolean
}

export interface RegisterRequest {
	email: string
	password: string
	fullName?: string
	companyName?: string
}

export interface ForgotPasswordRequest {
	email: string
}

export interface ResetPasswordRequest {
	password: string
	token: string
}

export interface ChangePasswordRequest {
	currentPassword: string
	newPassword: string
}

// Extended auth context and guard types
// MIGRATED from apps/backend/src/shared/guards/auth.guard.ts
export interface AuthenticatedRequest {
	user: BackendValidatedUser
	// Additional authenticated request context could be added here with specific types
}

// MIGRATED from apps/backend/src/shared/guards/roles.guard.ts
export interface RequestWithUser {
	user?: User & { organizationId?: string }
	params?: Record<string, string>
	query?: Record<string, string>
	body?: Record<string, string | number | boolean | null> // HTTP request bodies have constrained JSON values
	ip?: string
}

// MIGRATED from apps/backend/src/shared/guards/throttler-proxy.guard.ts
export interface ThrottlerRequest {
	headers: Record<string, string | string[] | undefined>
	ip?: string
	socket?: { remoteAddress?: string }
}

// MIGRATED from apps/backend/src/auth/auth-webhook.controller.ts
export interface SupabaseWebhookEvent {
	type: 'INSERT' | 'UPDATE' | 'DELETE'
	table: string
	schema: 'auth' | 'public'
	record: {
		id: string
		email?: string
		email_confirmed_at?: string | null
		user_metadata?: {
			name?: string
			full_name?: string
		}
		created_at: string
		updated_at: string
	}
}

export interface AuthContextType {
	user: AuthUser | null
	loading: boolean
	signIn: (credentials: LoginCredentials) => Promise<void>
	signOut: () => Promise<void>
	signUp: (credentials: SignupCredentials) => Promise<void>
}

// Permission and role enums (consolidated from security.ts)

export enum Permission {
	READ_PROPERTIES = 'READ_PROPERTIES',
	WRITE_PROPERTIES = 'WRITE_PROPERTIES',
	DELETE_PROPERTIES = 'DELETE_PROPERTIES',
	READ_TENANTS = 'READ_TENANTS',
	WRITE_TENANTS = 'WRITE_TENANTS',
	DELETE_TENANTS = 'DELETE_TENANTS',
	READ_LEASES = 'READ_LEASES',
	WRITE_LEASES = 'WRITE_LEASES',
	DELETE_LEASES = 'DELETE_LEASES',
	READ_MAINTENANCE = 'READ_MAINTENANCE',
	WRITE_MAINTENANCE = 'WRITE_MAINTENANCE',
	DELETE_MAINTENANCE = 'DELETE_MAINTENANCE',
	READ_FINANCIAL = 'READ_FINANCIAL',
	WRITE_FINANCIAL = 'WRITE_FINANCIAL',
	ADMIN_ACCESS = 'ADMIN_ACCESS',
	MANAGE_BILLING = 'MANAGE_BILLING',
	MANAGE_USERS = 'MANAGE_USERS'
}

// Security validation and context types
export interface SecurityValidationResult {
	isValid: boolean
	errors: string[]
	warnings: string[]
}

export interface AuthContext {
	user: User | null
	permissions: Permission[]
	roles: UserRole[]
}

// Define FormState locally since UI types were moved to frontend-only
type FormState<T = Record<string, string | number | boolean | null>> = {
	data: Partial<T>
	errors: Record<string, string[]>
	isDirty: boolean
	isSubmitting: boolean
	isValid: boolean
}

// Form state type alias for auth forms
export type AuthFormState = FormState<User>

// FRONTEND AUTH STORE STATE (moved from auth-store.ts)

// Frontend auth store state for Zustand (compatible with Supabase types)
export interface AuthState {
	user: AuthUser | null // Support both Supabase User and AuthUser
	session: AuthSession | null // Use AuthSession for Supabase compatibility
	isAuthenticated: boolean
	isLoading: boolean
	setUser: (user: AuthUser | null) => void
	setSession: (session: AuthSession | null) => void
	setLoading: (loading: boolean) => void
	signOut: () => void
}

// AUTH FORM PROPS TYPES

export interface AuthFormProps {
	onSubmit?: (data: LoginFormData | SignupFormData) => Promise<void> | void
	onForgotPassword?: () => void
	onSignUp?: () => void
	onLogin?: () => void
	onGoogleLogin?: () => Promise<void> | void
	onGoogleSignUp?: () => Promise<void> | void
	isLoading?: boolean
	isGoogleLoading?: boolean
	className?: string
}
