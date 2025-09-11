import { Injectable, UnauthorizedException, Logger, InternalServerErrorException } from '@nestjs/common'
import { createClient } from '@supabase/supabase-js'
import type { ValidatedUser, Database } from '@repo/shared'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Standalone Token Validation Service
 * 
 * Ultra-native service for breaking circular dependencies between 
 * AuthGuard and AuthService. Contains only essential token validation
 * logic without business operations.
 * 
 * Used by both AuthGuard (for request authentication) and AuthService
 * (for full user management operations).
 */
@Injectable()
export class TokenValidationService {
	private readonly logger = new Logger(TokenValidationService.name)
	private adminClient: SupabaseClient<Database>

	constructor() {
		// Ultra-native: Initialize Supabase client directly to avoid circular dependency
		const supabaseUrl = process.env.SUPABASE_URL
		const supabaseServiceKey = process.env.SERVICE_ROLE_KEY

		if (!supabaseUrl || !supabaseServiceKey) {
			throw new InternalServerErrorException('Supabase configuration is missing')
		}

		this.adminClient = createClient<Database>(
			supabaseUrl,
			supabaseServiceKey,
			{
				auth: {
					persistSession: false,
					autoRefreshToken: false
				}
			}
		)

		console.log('TokenValidationService initialized with direct Supabase client')
	}

	async validateTokenAndGetUser(token: string): Promise<ValidatedUser> {
		try {
			const {
				data: { user },
				error
			} = await this.adminClient.auth.getUser(token)

			if (error || !user) {
				this.logger.warn('Token validation failed', {
					errorType: error?.name ?? 'unknown'
				})
				throw new UnauthorizedException('Invalid or expired token')
			}

			if (!user.email_confirmed_at) {
				throw new UnauthorizedException('Email verification required')
			}

			if (!user.id || !user.email) {
				throw new UnauthorizedException('User data integrity error')
			}

			// Get user from database for role and organization info
			const adminClient = this.adminClient
			const { data: dbUser } = await adminClient
				.from('User')
				.select('*')
				.eq('supabaseId', user.id)
				.single()

			if (!dbUser) {
				throw new UnauthorizedException('User not found in database')
			}

			return {
				id: dbUser.id,
				email: dbUser.email,
				name: dbUser.name ?? null,
				avatarUrl: dbUser.avatarUrl ?? null,
				phone: dbUser.phone ?? null,
				bio: dbUser.bio ?? null,
				role: dbUser.role ?? 'TENANT',
				organizationId: null, // User table doesn't have organizationId field
				supabaseId: dbUser.supabaseId,
				stripeCustomerId: dbUser.stripeCustomerId ?? null,
				emailVerified: !!user.email_confirmed_at,
				createdAt: new Date(dbUser.createdAt),
				updatedAt: new Date(dbUser.updatedAt)
			}
		} catch (error) {
			if (error instanceof UnauthorizedException) {
				throw error
			}
			this.logger.error('Token validation error', error instanceof Error ? error.message : 'Unknown error')
			throw new UnauthorizedException('Token validation failed')
		}
	}
}