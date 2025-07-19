import type { z } from 'zod'
import { createRouter, protectedProcedure, readProcedure, writeProcedure } from '../trpc'
import type { AuthService } from '../../auth/auth.service'
import type { AuthenticatedContext } from '../types/common'
import { TRPCError } from '@trpc/server'
import {
	updateProfileSchema,
	profileUpdateResponseSchema,
	sessionSchema,
	userSchema
} from '../schemas/auth.schemas'
import { USER_ROLE } from '@tenantflow/shared'
import type { User } from '@prisma/client'
import type { ValidatedUser } from '../../auth/auth.service'

// AuthUser extends User with email verification info
interface AuthUser extends User {
	emailVerified: boolean
	supabaseId: string
	stripeCustomerId: string | null
}

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

/**
 * Simplified Auth Router for Supabase-first authentication
 *
 * Note: Login/register/password reset/logout now handled by Supabase directly on frontend
 * This router only handles backend user profile operations
 */
export const createAuthRouter = (authService: AuthService) => {
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
			})
	})
}

// Export factory function for DI
export const authRouter = createAuthRouter
