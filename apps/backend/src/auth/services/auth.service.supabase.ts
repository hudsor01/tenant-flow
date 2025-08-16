import { Injectable, UnauthorizedException, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SupabaseUser, ValidatedUser } from './auth.service'
import { z } from 'zod'

/**
 * Zod schema for runtime validation of Supabase database row results
 * Provides comprehensive type safety and input validation
 */
const SupabaseUserRowSchema = z.object({
	id: z.string().uuid('Invalid user ID format'),
	email: z.string().email('Invalid email format'),
	name: z.string().nullable().optional(),
	avatarUrl: z.string().url('Invalid avatar URL format').nullable().optional(),
	role: z.enum(['OWNER', 'MANAGER', 'TENANT', 'ADMIN']),
	phone: z.string().nullable().optional(),
	createdAt: z.union([z.string().datetime({ offset: true }), z.date()]),
	updatedAt: z.union([z.string().datetime({ offset: true }), z.date()]),
	emailVerified: z.boolean().optional(),
	bio: z.string().nullable().optional(),
	supabaseId: z.string().uuid('Invalid Supabase ID format').optional(),
	organizationId: z.string().uuid('Invalid organization ID format').nullable().optional()
})

/**
 * TypeScript interface derived from Zod schema
 * This ensures type safety when normalizing database results
 */
type SupabaseUserRow = z.infer<typeof SupabaseUserRowSchema>

/**
 * Alternative implementation of syncUserWithDatabase that uses Supabase client
 * instead of Prisma to properly leverage the service role key and bypass RLS
 */
@Injectable()
export class AuthServiceSupabase {
	private readonly logger = new Logger(AuthServiceSupabase.name)

	constructor(
		private supabase: SupabaseClient
	) {}

	/**
	 * Sync Supabase user with local database using Supabase client
	 * This bypasses RLS when using service role key
	 */
	async syncUserWithDatabaseViaSupabase(
		supabaseUser: SupabaseUser
	): Promise<ValidatedUser> {
		if (!supabaseUser) {
			this.logger.error('syncUserWithDatabase called with undefined supabaseUser')
			throw new Error('Supabase user is required')
		}

		this.logger.debug('syncUserWithDatabase called', {
			hasUser: !!supabaseUser,
			userId: supabaseUser?.id,
			userEmail: supabaseUser?.email
		})

		const { id: supabaseId, email, user_metadata } = supabaseUser

		if (!email) {
			throw new UnauthorizedException('User email is required')
		}

		const name = user_metadata?.name || user_metadata?.full_name || ''
		const avatarUrl = user_metadata?.avatar_url || null

		try {
			// First, try to get the existing user
			const { data: existingUser, error: selectError } = await this.supabase
				.from('User')
				.select('*')
				.eq('id', supabaseId)
				.single()

			const isNewUser = !existingUser || selectError?.code === 'PGRST116' // Row not found

			if (isNewUser) {
				// Insert new user
				const { data: newUser, error: insertError } = await this.supabase
					.from('User')
					.insert({
						id: supabaseId,
						email,
						name,
						avatarUrl,
						role: 'OWNER',
						supabaseId,
						createdAt: supabaseUser.created_at || new Date().toISOString(),
						updatedAt: supabaseUser.updated_at || new Date().toISOString()
					})
					.select()
					.single()

				if (insertError) {
					this.logger.error('Failed to insert user via Supabase', {
						error: insertError,
						userId: supabaseId
					})
					throw new Error(`Failed to sync user: ${insertError.message}`)
				}

				return this.normalizeSupabaseUser(newUser)
			} else {
				// Update existing user
				const { data: updatedUser, error: updateError } = await this.supabase
					.from('User')
					.update({
						email,
						name,
						avatarUrl,
						updatedAt: new Date().toISOString()
					})
					.eq('id', supabaseId)
					.select()
					.single()

				if (updateError) {
					this.logger.error('Failed to update user via Supabase', {
						error: updateError,
						userId: supabaseId
					})
					throw new Error(`Failed to update user: ${updateError.message}`)
				}

				return this.normalizeSupabaseUser(updatedUser)
			}
		} catch (error) {
			this.logger.error('Error in syncUserWithDatabaseViaSupabase', {
				error: error instanceof Error ? error.message : 'Unknown error',
				userId: supabaseId
			})
			throw error
		}
	}

	/**
	 * Normalize Supabase query result to ValidatedUser interface
	 * Uses Zod validation for runtime type safety and input sanitization
	 */
	private normalizeSupabaseUser(supabaseRow: unknown): ValidatedUser {
		this.logger.debug('Normalizing Supabase user data', {
			hasData: !!supabaseRow,
			dataType: typeof supabaseRow
		})

		// Runtime validation using Zod schema
		try {
			const validatedRow = SupabaseUserRowSchema.parse(supabaseRow)
			return this.convertToValidatedUser(validatedRow)
		} catch (error) {
			this.logger.error('Supabase user data validation failed', {
				error: error instanceof z.ZodError ? error.issues : error,
				rawData: JSON.stringify(supabaseRow).substring(0, 500)
			})
			throw new Error(`Invalid user data received from database: ${error instanceof z.ZodError ? error.issues.map(i => i.message).join(', ') : 'Unknown validation error'}`)
		}
	}

	/**
	 * Convert validated Supabase row to ValidatedUser format
	 * Helper method to keep normalization logic clean
	 */
	private convertToValidatedUser(validatedRow: SupabaseUserRow): ValidatedUser {
		// Helper function to safely convert date to ISO string
		const toISOString = (date: string | Date): string => {
			if (typeof date === 'string') return date
			if (date instanceof Date) return date.toISOString()
			return new Date().toISOString()
		}

		return {
			id: validatedRow.id,
			email: validatedRow.email,
			name: validatedRow.name || undefined,
			avatarUrl: validatedRow.avatarUrl || undefined,
			role: validatedRow.role,
			phone: validatedRow.phone || null,
			createdAt: toISOString(validatedRow.createdAt),
			updatedAt: toISOString(validatedRow.updatedAt),
			emailVerified: validatedRow.emailVerified ?? true,
			bio: validatedRow.bio || null,
			supabaseId: validatedRow.supabaseId || validatedRow.id,
			stripeCustomerId: null, // Would need separate query
			organizationId: validatedRow.organizationId || null
		}
	}
}