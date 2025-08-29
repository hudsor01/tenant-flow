/**
 * Authentication validation schemas - MOVED TO GENERATED SCHEMAS
 * 
 * ❌ DEPRECATED: Auth schemas in this shared package have been moved to maintain single source of truth.
 * 
 * 🎯 NEW PATTERN: Authentication schemas are now generated from backend JSON schemas.
 * 
 * USAGE:
 * - Frontend: Import from `apps/frontend/src/lib/validation/generated-auth-schemas.ts`
 * - Backend: Use native JSON schemas in `apps/backend/src/schemas/auth.schemas.ts`
 * 
 * WHY THIS CHANGE:
 * - Backend uses native Fastify JSON Schema validation (10x faster performance)
 * - Frontend auto-generates Zod schemas from backend JSON schemas
 * - Single source of truth prevents schema drift between frontend/backend
 * - Eliminates duplicate validation logic
 * 
 * MIGRATION GUIDE:
 * Replace imports like this:
 * 
 * BEFORE:
 * import { loginSchema } from '@repo/shared/validation'
 * 
 * AFTER:
 * // Frontend
 * import { loginSchema } from '../lib/validation/generated-auth-schemas'
 * 
 * // Backend  
 * import { loginSchema } from '../schemas/auth.schemas'
 */

// ❌ All auth schemas removed - use generated schemas instead
// This ensures CLAUDE.md DRY compliance and single source of truth

// Re-export common validation utilities that auth schemas might need
export { emailSchema, requiredString } from './common'

// ⚠️  TEMPORARY: Legacy type aliases for backward compatibility during migration
// These will be removed in a future version
export type LoginDto = {
  email: string
  password: string
  rememberMe?: boolean
}

export type RegisterDto = {
  name: string
  email: string
  password: string
  company?: string
  acceptTerms?: boolean
}

export type RefreshTokenDto = {
  refresh_token: string
}

export type PasswordResetDto = {
  email: string
}

export type PasswordResetConfirmDto = {
  token: string
  newPassword: string
  confirmPassword: string
}

export type ChangePasswordDto = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

/**
 * 🚨 IMPORTANT: These schemas have been moved to generated files
 * 
 * This file will be removed in a future version. Update your imports to use:
 * - Frontend: generated-auth-schemas.ts
 * - Backend: JSON schemas in auth.schemas.ts
 */