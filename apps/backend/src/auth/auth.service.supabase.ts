import { Injectable, UnauthorizedException, Logger, Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SupabaseUser, ValidatedUser } from './auth.service'

/**
 * Alternative implementation of syncUserWithDatabase that uses Supabase client
 * instead of Prisma to properly leverage the service role key and bypass RLS
 */
@Injectable()
export class AuthServiceSupabase {
	private readonly logger = new Logger(AuthServiceSupabase.name)

	constructor(
		private supabase: SupabaseClient,
		@Inject(ConfigService) private configService: ConfigService
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
	 */
	private normalizeSupabaseUser(supabaseRow: any): ValidatedUser {
		return {
			id: supabaseRow.id,
			email: supabaseRow.email,
			name: supabaseRow.name || undefined,
			avatarUrl: supabaseRow.avatarUrl || undefined,
			role: supabaseRow.role,
			phone: supabaseRow.phone || null,
			createdAt: supabaseRow.createdAt,
			updatedAt: supabaseRow.updatedAt,
			emailVerified: supabaseRow.emailVerified ?? true,
			bio: supabaseRow.bio || null,
			supabaseId: supabaseRow.supabaseId || supabaseRow.id,
			stripeCustomerId: null // Would need separate query
		}
	}
}