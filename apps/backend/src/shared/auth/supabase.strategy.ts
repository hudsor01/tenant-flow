/**
 * Supabase JWT Strategy - ES256/RS256 Verification (November 2025)
 *
 * Validates JWTs issued by Supabase using asymmetric algorithms.
 * Uses public key provided by Supabase (ES256 or RS256).
 *
 * Key Management:
 * - Algorithm: ES256 (default), RS256 (supported)
 * - Public Key: Obtained from Supabase project settings
 * - No shared secrets (HS256 deprecated for production security)
 *
 * Authentication Flow:
 * 1. Frontend sends Authorization: Bearer <token> header
 * 2. Strategy extracts JWT and verifies signature using Supabase public key
 * 3. Validates standard claims (issuer, audience, expiration)
 * 4. Ensures user exists in users table (creates if needed for OAuth)
 * 5. Returns authenticated user with custom claims from Custom Access Token Hook
 *
 * Custom Claims:
 * - user_type: Set via Supabase Custom Access Token Hook (PL/pgSQL)
 * - Available in payload.user_type (no database query needed)
 *
 * Security:
 * - Asymmetric key verification (no shared secrets in code)
 * - Validation includes issuer and audience checks
 * - All authentication MUST use Authorization: Bearer header (no cookies)
 */

import { Injectable, Logger } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import type { SupabaseJwtPayload, authUser } from '@repo/shared/types/auth'
import { UtilityService } from '../services/utility.service'

import { ExtractJwt, Strategy } from 'passport-jwt'
import { AppConfigService } from '../../config/app-config.service'

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
	private readonly logger = new Logger(SupabaseStrategy.name)
	private readonly utilityService: UtilityService

	constructor(utilityService: UtilityService, config: AppConfigService) {
		const supabaseUrl = config.getSupabaseUrl()
		const jwtPublicKey = config.getJwtPublicKeyCurrent()

		// If no JWT public key is configured, use a placeholder
		// The strategy will fail at runtime when used, providing a helpful error message
		// This allows the backend to start up and serve health checks
		const secretOrKey = jwtPublicKey || 'NOT_CONFIGURED'

		// Configure passport-jwt strategy with ES256/RS256 public key verification
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			issuer: `${supabaseUrl}/auth/v1`,
			audience: 'authenticated',
			algorithms: ['ES256', 'RS256'],
			secretOrKey: secretOrKey
		})

		this.utilityService = utilityService

		if (jwtPublicKey) {
			this.logger.log(
				'Supabase Strategy initialized - ES256/RS256 JWT verification (Bearer token, no cookies)'
			)
		} else {
			this.logger.warn(
				'Supabase Strategy initialized WITHOUT JWT public key. ' +
				'Protected routes will fail with helpful error message. ' +
				'Set JWT_PUBLIC_KEY_CURRENT in Doppler for production use. ' +
				'Get this from your Supabase dashboard: Settings > JWT Keys > Copy Public Key (PEM).'
			)
		}
	}

	async validate(payload: SupabaseJwtPayload): Promise<authUser> {
		const userId = payload.sub ?? 'unknown'
		this.logger.debug('Validating JWT payload', {
			userId,
			issuer: payload.iss,
			audience: payload.aud,
			expiration: payload.exp ? new Date(payload.exp * 1000) : null
		})

		// Passport.js has already verified JWT signature, expiration, issuer, and audience
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
		const user: authUser = {
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
