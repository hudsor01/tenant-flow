/**
 * Auth Components - Unified authentication component exports
 * Provides consistent authentication UI across the application
 */

// Layout Components (Server Components)
export { AuthLayout } from './auth-layout'
export { AuthRedirect } from './auth-redirect'

// Form Components (Client Components)
export { LoginFormRefactored } from './login-form'
export { SignupFormRefactored } from './signup-form'
export { ForgotPasswordFormRefactored } from './forgot-password-form'
export { UpdatePasswordForm } from './update-password-form'

// Auth Factory Components
export { AuthFormFactory } from './auth-form-factory'

// Utility Components (Client Components)
export { OAuthProviders } from './oauth-providers'
export { AuthError } from './auth-error'

// Core Auth Processing (Client Component)
export { SupabaseAuthProcessor } from './supabase-auth-processor'