/**
 * Auth Components - Unified authentication component exports
 * Provides consistent authentication UI across the application
 */

// Layout Components (Server Components)
export { AuthLayout } from '../layout/auth/layout'
export { AuthRedirect } from './auth-redirect'

// Utility Components (Client Components)
export { OAuthProviders } from './oauth-providers'
export { AuthError } from './auth-error'
export { ErrorDisplay } from './error-display'
export { PasswordInput } from './password-input'
export { SignupFormFields } from './signup-form-fields'
export { GoogleSignupButton } from './google-signup-button'

// Core Auth Processing (Client Component)
export { SupabaseAuthProcessor } from './supabase-auth-processor'
