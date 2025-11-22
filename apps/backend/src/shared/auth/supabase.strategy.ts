/**
 * Auth User Validation Service
 *
 * Validates JWT payload and ensures user exists in database
 * Replaces Passport.js SupabaseStrategy with jose-based verification
 */

import { Injectable, Logger } from '@nestjs/common'
import type { AuthUser, SupabaseJwtPayload } from '@repo/shared/types/auth'
import { UtilityService } from '../services/utility.service'

@Injectable()
export class AuthUserValidationService {
	private readonly logger = new Logger(AuthUserValidationService.name)

	constructor(private readonly utilityService: UtilityService) {
		this.logger.log('Auth User Validation Service initialized')
	}

	/**
	 * Validate JWT payload and create AuthUser object
	 * This replaces the validate() method from Passport.js strategy
	 */
	async validateJwtPayload(payload: SupabaseJwtPayload): Promise<AuthUser> {
		const userId = payload.sub ?? 'unknown'
		this.logger.debug('Validating JWT payload', {
			userId,
			issuer: payload.iss,
			audience: payload.aud,
			expiration: payload.exp ? new Date(payload.exp * 1000) : null
		})

		// JWT has already been verified by JwtVerificationService
		// Validate required fields
		if (!payload.sub) {
			this.logger.error('JWT missing subject (sub) claim')
			throw new Error('Invalid token: missing user ID')
		}

		if (!payload.email) {
			this.logger.error('JWT missing email claim', { userId: payload.sub })
			throw new Error('Invalid token: missing email')
		}

		// Ensure user exists in users table (creates if doesn't exist - e.g., OAuth sign-ins)
		// This is critical for RLS policies that reference users.id
		let internalUserId: string
		try {
			const ensureUserParams: {
				id: string
				email: string
				user_metadata?: Record<string, unknown>
				app_metadata?: Record<string, unknown>
			} = {
				id: payload.sub,
				email: payload.email
			}

			if (payload.user_metadata) {
				ensureUserParams.user_metadata = payload.user_metadata as Record<string, unknown>
			}

			if (payload.app_metadata) {
				ensureUserParams.app_metadata = payload.app_metadata
			}

			internalUserId = await this.utilityService.ensureUserExists(ensureUserParams)
		} catch (error) {
			// If database is temporarily unavailable, fall back to Supabase ID for authentication
			// This allows authenticated users to access the system even during DB issues
			const errorMessage = error instanceof Error ? error.message : 'Unknown database error'
			this.logger.warn('Database error during user lookup/creation, falling back to Supabase ID', {
				userId: payload.sub,
				email: payload.email,
				error: errorMessage
			})
			// Use Supabase ID as fallback - RLS policies will filter based on this
			internalUserId = payload.sub
		}

		// Get user_type from JWT claims (set via Custom Access Token Hook)
		// No database query needed - it's already in the JWT
		const userType = (payload.app_metadata?.user_type as string) || 'TENANT'

		// Create user object from JWT payload
		const user: AuthUser = {
			id: internalUserId,
			aud: Array.isArray(payload.aud) ? payload.aud[0] : (payload.aud || 'authenticated'),
			email: payload.email,
			email_confirmed_at: payload.email_confirmed_at ?? '',
			confirmed_at: payload.confirmed_at ?? '',
			last_sign_in_at: payload.last_sign_in_at ?? '',
			app_metadata: {
				...(payload.app_metadata ?? {}),
				user_type: userType
			},
			user_metadata: payload.user_metadata ?? {},
			identities: [],
			created_at: payload.created_at ?? new Date().toISOString(),
			updated_at: payload.updated_at ?? new Date().toISOString(),
			is_anonymous: false
		}

		// Sanitize logs: log only userId and user_type, never email
		this.logger.debug('User authenticated successfully', {
			userId: user.id,
			userType
		})

		return user
	}
}
