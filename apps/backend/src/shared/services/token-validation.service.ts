import {
	Injectable,
	InternalServerErrorException,
	Logger,
	UnauthorizedException
} from '@nestjs/common'
import type { Database, ValidatedUser } from '@repo/shared'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'

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
		const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

		if (!supabaseUrl || !supabaseServiceKey) {
			throw new InternalServerErrorException(
				'Supabase configuration is missing'
			)
		}

		this.adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
			auth: {
				persistSession: false,
				autoRefreshToken: false
			}
		})

		this.logger.log(
			'TokenValidationService initialized with direct Supabase client'
		)
	}

	async validateTokenAndGetUser(token: string): Promise<ValidatedUser> {
		try {
			// Step 1: Validate token and get Supabase user atomically
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

			// Step 2: Immediately fetch database user with the validated Supabase ID
			// This minimizes the race condition window to the smallest possible time
			const { data: dbUser, error: dbError } = await this.adminClient
				.from('User')
				.select('*')
				.eq('supabaseId', user.id)
				.single()

			if (dbError) {
				this.logger.error('Database user lookup failed', {
					supabaseId: user.id,
					error: dbError.message
				})
				throw new UnauthorizedException('User lookup failed')
			}

			if (!dbUser) {
				this.logger.error('User not found in database', {
					supabaseId: user.id,
					email: user.email
				})
				throw new UnauthorizedException('User not found in database')
			}

			// Step 3: Critical consistency checks to prevent race condition exploits
			if (dbUser.supabaseId !== user.id) {
				this.logger.error(
					'User ID mismatch detected - potential race condition exploit',
					{
						supabaseId: user.id,
						dbSupabaseId: dbUser.supabaseId,
						userId: dbUser.id,
						email: user.email
					}
				)
				throw new UnauthorizedException('User data consistency error')
			}

			// Step 4: Additional security checks for account status
			if (!dbUser.role || !dbUser.email) {
				this.logger.warn('Invalid user data detected', {
					userId: dbUser.id,
					hasRole: !!dbUser.role,
					hasEmail: !!dbUser.email
				})
				throw new UnauthorizedException('User account data is invalid')
			}

			// Step 5: Email consistency check
			if (dbUser.email !== user.email) {
				this.logger.error(
					'Email mismatch detected - potential data corruption',
					{
						supabaseEmail: user.email,
						dbEmail: dbUser.email,
						userId: dbUser.id
					}
				)
				throw new UnauthorizedException('User data integrity error')
			}

			// Log successful validation for security monitoring
			this.logger.debug('Token validation successful', {
				userId: dbUser.id,
				email: dbUser.email,
				role: dbUser.role
			})

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

			// Log all other errors for security monitoring
			this.logger.error('Token validation error', {
				error: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined
			})
			throw new UnauthorizedException('Token validation failed')
		}
	}
}
