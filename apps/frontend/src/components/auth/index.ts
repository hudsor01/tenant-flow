/**
 * Auth Components - Unified authentication component exports
 * Provides consistent authentication UI across the application
 */

// Layout Components (Server Components)
export { AuthLayout } from './auth-layout'
export { AuthRedirect } from './auth-redirect'

// Form Components (Client Components)
export { LoginForm } from './login-form'
export { SignupForm } from './signup-form'
export { ForgotPasswordForm } from './forgot-password-form'
export { UpdatePasswordForm } from './update-password-form'

// Utility Components (Client Components)
export { OAuthProviders } from './oauth-providers'
export { AuthError } from './auth-error'

// Core Auth Processing (Client Component)
export { SupabaseAuthProcessor } from './supabase-auth-processor'