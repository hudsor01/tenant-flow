/**
 * Supabase JWT Strategy - JWKS/ES256/RS256 Verification (November 2025)
 *
 * Validates JWTs issued by Supabase using JWKS (JSON Web Key Set) discovery.
 * Automatically handles key rotation and supports ES256/RS256 algorithms.
 *
 * Key Management:
 * - Algorithm: ES256 (default), RS256 (supported)
 * - Keys: Fetched from Supabase JWKS endpoint via discovery URL
 * - Automatic key rotation: Uses kid (key ID) from JWT header to select key
 * - Fallback: Static keys (JWT_PUBLIC_KEY_CURRENT) if JWKS is unavailable
 * - No shared secrets (asymmetric key verification only)
 *
 * Authentication Flow:
 * 1. Frontend sends Authorization: Bearer <token> header
 * 2. Extract kid (key ID) from JWT header
 * 3. Fetch public key from Supabase JWKS endpoint (cached)
 * 4. Verify signature using the correct key
 * 5. Validate standard claims (issuer, audience, expiration)
 * 6. Ensure user exists in users table (creates if needed for OAuth)
 * 7. Return authenticated user with custom claims
 *
 * Custom Claims:
 * - user_type: Set via Supabase Custom Access Token Hook (PL/pgSQL)
 * - Available in payload.user_type (no database query needed)
 *
 * Security:
 * - Asymmetric key verification (no shared secrets in code)
 * - Dynamic key fetching with caching
 * - Automatic key rotation support
 * - Validation includes issuer and audience checks
 * - All authentication MUST use Authorization: Bearer header (no cookies)
 */

import { Injectable, Logger } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import type { SupabaseJwtPayload, authUser } from '@repo/shared/types/auth'
import { UtilityService } from '../services/utility.service'

import { ExtractJwt, Strategy } from 'passport-jwt'
import { AppConfigService } from '../../config/app-config.service'
import JwksClient from 'jwks-rsa'
import { jwtDecode } from 'jwt-decode'

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
	private readonly logger = new Logger(SupabaseStrategy.name)
	private readonly utilityService: UtilityService

	constructor(utilityService: UtilityService, config: AppConfigService) {
		const supabaseUrl = config.getSupabaseUrl()
		const jwtPublicKeyCurrent = config.getJwtPublicKeyCurrent()
		const logger = new Logger(SupabaseStrategy.name)

		// Try to initialize JWKS client with discovery URL
		const jwksUrl = `${supabaseUrl}/.well-known/jwks.json`

		let jwksClient: JwksClient.JwksClient | null = null
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			jwksClient = new (JwksClient as any)({
				jwksUri: jwksUrl,
				cache: true,
				rateLimit: true,
				jwksRequestsPerMinute: 10
			})
			logger.log(
				`JWKS client initialized with discovery URL: ${jwksUrl}`
			)
		} catch (error) {
			logger.warn(
				`Failed to initialize JWKS client: ${error instanceof Error ? error.message : 'unknown error'}`
			)
			jwksClient = null
		}

		// Use secretOrKeyProvider to dynamically fetch keys
		const secretOrKeyProvider = async (
			_req: unknown,
			rawtokenString: string,
			done: (err: unknown, key?: string) => void
		) => {
			try {
				const token = rawtokenString.startsWith('Bearer ')
					? rawtokenString.substring(7)
					: rawtokenString

				if (!token) {
					return done(new Error('No token provided'))
				}

				// Decode header to get kid (key ID)
				let kid: string | undefined
				try {
					const decoded = jwtDecode(token, { header: true }) as { kid?: string }
					kid = decoded.kid
				} catch {
					// Ignore decode errors
				}

				// Try JWKS first
				if (jwksClient && kid) {
					try {
						const key = await jwksClient.getSigningKey(kid)
						const publicKey = key.getPublicKey()
						logger.debug('JWT verified using JWKS', { kid })
						return done(null, publicKey)
					} catch (error) {
						logger.warn(
							`JWKS verification failed for kid ${kid}, falling back to static key`,
							{
								error: error instanceof Error ? error.message : 'unknown error'
							}
						)
					}
				}

				// Fallback to static key
				if (jwtPublicKeyCurrent) {
					logger.debug('JWT verified using static key')
					return done(null, jwtPublicKeyCurrent)
				}

				// No key available
				return done(
					new Error('No valid key found (JWKS unavailable and no static key configured)')
				)
			} catch (error) {
				return done(error)
			}
		}

		// Configure passport-jwt strategy with dynamic key provider
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			issuer: `${supabaseUrl}/auth/v1`,
			audience: 'authenticated',
			algorithms: ['ES256', 'RS256'],
			secretOrKeyProvider
		})

		this.utilityService = utilityService

		this.logger.log(
			'Supabase Strategy initialized - JWKS/ES256/RS256 JWT verification (Bearer token, no cookies)'
		)
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
