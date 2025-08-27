/**
 * Auth types - NOW USING SHARED TYPES
 * All types moved to @repo/shared for centralization
 */

// Use shared auth types
export type {
	User,
	AuthUser,
	LoginCredentials,
	SignupCredentials,
	AuthError,
	AuthErrorCode,
	ValidatedUser,
	SupabaseUser,
	AuthServiceValidatedUser,
	LoginFormData,
	SignupFormData,
	ForgotPasswordFormData,
	ResetPasswordFormData,
	UpdatePasswordFormData,
	ProfileFormData,
	ContactFormData
} from '@repo/shared'
