/**
 * 🤖 AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * 
 * This file is generated from backend JSON schemas by scripts/generate-frontend-schemas.ts
 * To update these schemas, modify the backend JSON schemas and regenerate.
 * 
 * Generated at: 2025-08-29T04:59:00.971Z
 * Source: apps/backend/src/schemas/
 */

import { z } from 'zod'

// =============================================================================
// GENERATED ZOD SCHEMAS FROM BACKEND JSON SCHEMAS
// =============================================================================

// loginSchema

export const loginSchema = z.object({ "email": z.string().email().min(1).max(255).describe("Please enter a valid email address"), "password": z.string().min(1).describe("User password"), "rememberMe": z.boolean().describe("Keep user logged in for extended period").default(false) }).strict()

// registerSchema

export const registerSchema = z.object({ "name": z.string().regex(new RegExp("^[a-zA-Z\\s\\-\\.']+$")).min(2).max(100).describe("Name must contain only letters, spaces, hyphens, periods, and apostrophes"), "email": z.string().email().min(1).max(255).describe("Please enter a valid email address"), "password": z.string().regex(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]")).min(8).describe("Password must contain uppercase, lowercase, number and special character"), "company": z.string().max(100).describe("Company name must be less than 100 characters").optional(), "acceptTerms": z.boolean().describe("User acceptance of terms and conditions").default(false) }).strict()

// refreshTokenSchema

export const refreshTokenSchema = z.object({ "refresh_token": z.string().min(1).describe("Valid refresh token") }).strict()

// forgotPasswordSchema

export const forgotPasswordSchema = z.object({ "email": z.string().email().min(1).max(255).describe("Please enter a valid email address") }).strict()

// resetPasswordSchema

export const resetPasswordSchema = z.object({ "token": z.string().min(1).describe("Password reset token"), "newPassword": z.string().regex(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]")).min(8).describe("Password must contain uppercase, lowercase, number and special character"), "confirmPassword": z.string().min(8).describe("Password confirmation (must match newPassword)") }).strict()

// changePasswordSchema

export const changePasswordSchema = z.object({ "currentPassword": z.string().min(1).describe("Current password for verification"), "newPassword": z.string().regex(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]")).min(8).describe("Password must contain uppercase, lowercase, number and special character"), "confirmPassword": z.string().min(8).describe("Password confirmation (must match newPassword)") }).strict()

// authResponseSchema

export const authResponseSchema = z.object({ "user": z.object({ "id": z.string().uuid(), "email": z.string().email(), "name": z.string(), "company": z.string().optional(), "emailVerified": z.boolean(), "createdAt": z.string().datetime({ offset: true }), "updatedAt": z.string().datetime({ offset: true }) }), "tokens": z.object({ "accessToken": z.string(), "refreshToken": z.string(), "expiresIn": z.number(), "tokenType": z.literal("Bearer") }) })

// userProfileResponseSchema

export const userProfileResponseSchema = z.object({ "id": z.string().uuid(), "email": z.string().email(), "name": z.string(), "company": z.string().optional(), "phone": z.string().optional(), "bio": z.string().optional(), "avatarUrl": z.string().url().optional(), "emailVerified": z.boolean(), "createdAt": z.string().datetime({ offset: true }), "updatedAt": z.string().datetime({ offset: true }) })

// =============================================================================
// SCHEMA ALIASES & COMPATIBILITY EXPORTS
// =============================================================================

// Schema aliases for compatibility
export const signupSchema = registerSchema // Alias for registerSchema

// =============================================================================
// GENERATED TYPESCRIPT TYPES
// =============================================================================

export type LoginRequest = z.infer<typeof loginSchema>
export type RegisterRequest = z.infer<typeof registerSchema>
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>
export type AuthResponse = z.infer<typeof authResponseSchema>
export type UserProfileResponse = z.infer<typeof userProfileResponseSchema>

// Legacy type aliases for existing code compatibility
export type LoginFormData = LoginRequest
export type SignupFormData = RegisterRequest
export type ForgotPasswordFormData = ForgotPasswordRequest
export type ResetPasswordFormData = ResetPasswordRequest
export type ChangePasswordFormData = ChangePasswordRequest
