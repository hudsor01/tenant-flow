/**
 * Authentication and user management types
 * All types related to users, authentication, and user roles
 */

// Import constants from the single source of truth
import type { USER_ROLE } from '../constants/auth.js'
import type { authUser as BackendauthUser } from './backend-domain.js'

// Use Supabase User type directly - matches what we get from auth
import type { User } from '@supabase/supabase-js'
export type authUser = User

// User role type derived from constants
export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE]

// Use Supabase SubStatus instead of custom SubscriptionStatus
import type { Database } from './supabase-generated.js'
export type SubscriptionStatus = Database['public']['Enums']['SubStatus']

export function hasOrganizationId(
	user: authUser
): user is authUser & { organizationId: string } {
	const userWithOrg = user as authUser & { organizationId?: string }
	return (
		typeof userWithOrg.organizationId === 'string' &&
		userWithOrg.organizationId.length > 0
	)
}

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
	firstName?: string
	lastName?: string
	company?: string
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
	user: User | authUser
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
	company_type?: 'OWNER' | 'PROPERTY_MANAGER' | 'TENANT' | 'VENDOR'
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
	confirmed_at?: string
	last_sign_in_at?: string
	created_at?: string
	updated_at?: string
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

// Google OAuth user type - extends Supabase's User with Google-specific fields
export interface GoogleOAuthUser extends authUser {
	name?: string
	picture?: string
}

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
	user: BackendauthUser
	// Additional authenticated request context could be added here with specific types
}

// MIGRATED from apps/backend/src/shared/guards/roles.guard.ts
export interface RequestWithUser {
	user?: User & { organizationId?: string }
	params?: Record<string, string>
	query?: Record<string, string>
	body?: Record<string, string | number | boolean | null> // HTTP request bodies have constrained JSON values
	ip?: string
	route?: { path?: string }
	method?: string
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
	user: authUser | null
	loading: boolean
	signIn: (credentials: LoginCredentials) => Promise<void>
	signOut: () => Promise<void>
	signUp: (credentials: SignupCredentials) => Promise<void>
}

// Permission and role enums (consolidated from security.ts)

// Use const object instead of TypeScript enum (ENUM STANDARDIZATION compliance)
export const Permission = {
	READ_PROPERTIES: 'READ_PROPERTIES',
	WRITE_PROPERTIES: 'WRITE_PROPERTIES',
	DELETE_PROPERTIES: 'DELETE_PROPERTIES',
	READ_TENANTS: 'READ_TENANTS',
	WRITE_TENANTS: 'WRITE_TENANTS',
	DELETE_TENANTS: 'DELETE_TENANTS',
	READ_LEASES: 'READ_LEASES',
	WRITE_LEASES: 'WRITE_LEASES',
	DELETE_LEASES: 'DELETE_LEASES',
	READ_MAINTENANCE: 'READ_MAINTENANCE',
	WRITE_MAINTENANCE: 'WRITE_MAINTENANCE',
	DELETE_MAINTENANCE: 'DELETE_MAINTENANCE',
	READ_FINANCIAL: 'READ_FINANCIAL',
	WRITE_FINANCIAL: 'WRITE_FINANCIAL',
	ADMIN_ACCESS: 'ADMIN_ACCESS',
	MANAGE_BILLING: 'MANAGE_BILLING',
	MANAGE_USERS: 'MANAGE_USERS'
} as const

export type PermissionValue = (typeof Permission)[keyof typeof Permission]

// Security validation and context types
export interface SecurityValidationResult {
	isValid: boolean
	errors: string[]
	warnings: string[]
}

export interface AuthContext {
	user: User | null
	permissions: PermissionValue[]
	roles: UserRole[]
}

// Form state type alias for auth forms
import type { FormState } from './forms.js'
export type AuthFormState = FormState<User>

// FRONTEND AUTH STORE STATE (moved from auth-store.ts)

// Frontend auth store state for Zustand (compatible with Supabase types)
export interface AuthState {
	user: authUser | null // Support both Supabase User and authUser
	session: AuthSession | null // Use AuthSession for Supabase compatibility
	isAuthenticated: boolean
	isLoading: boolean
	setUser: (user: authUser | null) => void
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

// LOGIN LAYOUT PROPS - UI component configuration
export interface LoginLayoutProps {
	mode?: 'login' | 'signup'
	imageOnRight?: boolean
	imageUrl?: string
	authProps?: AuthFormProps
	title?: string
	subtitle?: string
	content?: {
		heading: string
		description: string
		stats: Array<{ value: string; label: string }>
	}
	className?: string
}
