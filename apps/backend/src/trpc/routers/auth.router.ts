import { z } from 'zod'
import { createRouter, readProcedure, writeProcedure } from '../trpc'
import type { AuthService } from '../../auth/auth.service'
import type { EmailService } from '../../email/email.service'
import { TRPCError } from '@trpc/server'
import {
	updateProfileSchema,
	profileUpdateResponseSchema,
	sessionSchema,
	userSchema
} from '../schemas/auth.schemas'
import { USER_ROLE, type AuthUser } from '@tenantflow/shared'
import type { User } from '@prisma/client'
import type { ValidatedUser } from '../../auth/auth.service'

// Helper function to normalize user data for consistent typing
function normalizeUserForResponse(user: User | AuthUser | ValidatedUser): {
	id: string
	email: string
	name?: string
	role: 'TENANT' | 'OWNER' | 'MANAGER' | 'ADMIN'
	phone?: string
	avatarUrl?: string
	emailVerified: boolean
	createdAt: Date
	updatedAt: Date
} {
	return {
		id: user.id,
		email: user.email,
		name: user.name || undefined,
		role:
			(user.role as 'TENANT' | 'OWNER' | 'MANAGER' | 'ADMIN') ??
			USER_ROLE.TENANT,
		phone: user.phone || undefined,
		avatarUrl: user.avatarUrl || undefined,
		emailVerified: 'supabaseId' in user ? true : false, // Supabase users are email verified
		createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
		updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date()
	}
}

// Schema for sending welcome email
const sendWelcomeEmailSchema = z.object({
	email: z.string().email(),
	name: z.string().min(1)
})

/**
 * Simplified Auth Router for Supabase-first authentication
 *
 * Note: Login/register/password reset/logout now handled by Supabase directly on frontend
 * This router only handles backend user profile operations
 */
export const createAuthRouter = (authService: AuthService, emailService?: EmailService) => {
	return createRouter({
		// Get current user profile
		me: readProcedure
			.output(userSchema)
			.query(async ({ ctx }) => {
				if (!ctx.user) {
					throw new TRPCError({
						code: 'UNAUTHORIZED',
						message: 'User not found in context'
					})
				}
				const normalized = normalizeUserForResponse(ctx.user)
				return {
					...normalized,
					createdAt: normalized.createdAt.toISOString(),
					updatedAt: normalized.updatedAt.toISOString()
				}
			}),

		// Update user profile
		updateProfile: writeProcedure
			.input(updateProfileSchema)
			.output(profileUpdateResponseSchema)
			.mutation(
				async ({
					input,
					ctx
				}) => {
					if (!ctx.user) {
						throw new TRPCError({
							code: 'UNAUTHORIZED',
							message: 'User not found in context'
						})
					}
					try {
						const updatedUser = await authService.updateUserProfile(
							ctx.user.id,
							{
								name: input.name,
								phone: input.phone,
								avatarUrl: input.avatarUrl
							}
						)
						const normalized = normalizeUserForResponse(
							updatedUser.user
						)
						return {
							user: {
								...normalized,
								createdAt: normalized.createdAt.toISOString(),
								updatedAt: normalized.updatedAt.toISOString()
							},
							message: 'Profile updated successfully'
						}
					} catch (error) {
						throw new TRPCError({
							code: 'INTERNAL_SERVER_ERROR',
							message: 'Failed to update profile',
							cause: error
						})
					}
				}
			),

		// Validate session (for route guards)
		validateSession: readProcedure
			.output(sessionSchema)
			.query(async ({ ctx }) => {
				if (!ctx.user) {
					throw new TRPCError({
						code: 'UNAUTHORIZED',
						message: 'User not found in context'
					})
				}
				const normalized = normalizeUserForResponse(ctx.user)
				return {
					user: {
						...normalized,
						createdAt: normalized.createdAt.toISOString(),
						updatedAt: normalized.updatedAt.toISOString()
					},
					isValid: true,
					expiresAt: new Date(
						Date.now() + 24 * 60 * 60 * 1000
					).toISOString()
				}
			}),

		// Send welcome email (can be called after successful Supabase signup)
		sendWelcomeEmail: writeProcedure
			.input(sendWelcomeEmailSchema)
			.output(z.object({
				success: z.boolean(),
				message: z.string(),
				messageId: z.string().optional()
			}))
			.mutation(async ({ input }) => {
				if (!emailService) {
					throw new TRPCError({
						code: 'INTERNAL_SERVER_ERROR',
						message: 'Email service not available'
					})
				}

				try {
					const result = await emailService.sendWelcomeEmail(input.email, input.name)
					
					if (result.success) {
						return {
							success: true,
							message: 'Welcome email sent successfully',
							messageId: result.messageId
						}
					} else {
						return {
							success: false,
							message: result.error || 'Failed to send welcome email'
						}
					}
				} catch (error) {
					throw new TRPCError({
						code: 'INTERNAL_SERVER_ERROR',
						message: 'Error sending welcome email',
						cause: error
					})
				}
			})
	})
}

// Export factory function for DI
export const authRouter = createAuthRouter
