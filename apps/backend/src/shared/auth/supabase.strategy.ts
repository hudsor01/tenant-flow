/**
 * Supabase JWT Strategy - adaptive signing key verification
 *
 * Supports both modern asymmetric (ES256/RS256 via JWKS) and legacy
 * symmetric (HS256) signing keys without manually switching strategies.
 *
 * Authentication Flow:
 * 1. Frontend sends Authorization: Bearer <token> header
 * 2. Strategy resolves Supabase project's signing algorithm
 * 3. Verifies JWT signature using JWKS (ES256/RS256) or shared secret (HS256)
 * 4. Validates payload (issuer, audience, expiration)
 * 5. Ensures user exists in users table (creates if needed for OAuth)
 * 6. Returns authUser object for use in request handlers
 *
 * Supported Algorithms: ES256, RS256, HS256
 */

import { Injectable, Logger } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import type { SupabaseJwtPayload, authUser } from '@repo/shared/types/auth'
import { UtilityService } from '../services/utility.service'
import { passportJwtSecret } from 'jwks-rsa'
import type { Algorithm } from 'jsonwebtoken'

import { ExtractJwt, Strategy } from 'passport-jwt'

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
	private readonly logger = new Logger(SupabaseStrategy.name)
	private readonly utilityService: UtilityService

	constructor(utilityService: UtilityService) {
		// Validate environment before super() - no 'this' access allowed
		const supabaseUrl = process.env.SUPABASE_URL
		const extractors = [ExtractJwt.fromAuthHeaderAsBearerToken()]

		if (!supabaseUrl) {
			throw new Error('SUPABASE_URL environment variable is required')
		}

		const { algorithm, isAsymmetric, secretOrKey, jwksUri } =
			resolveSupabaseJwtConfig(supabaseUrl)

		super(
			isAsymmetric
				? {
						jwtFromRequest: ExtractJwt.fromExtractors(extractors),
						ignoreExpiration: false,
						issuer: `${supabaseUrl}/auth/v1`,
						audience: 'authenticated',
						algorithms: [algorithm],
						secretOrKeyProvider: passportJwtSecret({
							cache: true,
							rateLimit: true,
							jwksRequestsPerMinute: 10,
							jwksUri
						})
					}
				: {
						jwtFromRequest: ExtractJwt.fromExtractors(extractors),
						ignoreExpiration: false,
						issuer: `${supabaseUrl}/auth/v1`,
						audience: 'authenticated',
						algorithms: [algorithm],
						secretOrKey: secretOrKey!
					}
		)

		// NOW safe to assign to 'this' after super()
		this.utilityService = utilityService

		// HEADERS-ONLY AUTHENTICATION: Frontend and backend are on separate deployments (Vercel + Railway)
		// All API calls MUST use Authorization: Bearer <token> header - NO cookie support
		if (isAsymmetric) {
			this.logger.log(
				`SupabaseStrategy initialized with JWKS verification (${algorithm}) - HEADERS ONLY (Authorization: Bearer)`
			)
			this.logger.log(`JWKS endpoint: ${jwksUri}`)
		} else {
			this.logger.log(
				`SupabaseStrategy initialized with shared-secret verification (${algorithm}) - HEADERS ONLY (Authorization: Bearer)`
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

		// Basic validation - Passport.js has already verified the JWT signature via JWKS (ES256/RS256)
		if (!payload.sub) {
			this.logger.error('JWT missing subject (sub) claim')
			throw new Error('Invalid token: missing user ID')
		}

		// Validate issuer matches Supabase project
		const supabaseUrl = process.env.SUPABASE_URL
		if (
			supabaseUrl &&
			payload.iss &&
			payload.iss !== `${supabaseUrl}/auth/v1`
		) {
			this.logger.warn('JWT issuer mismatch', {
				issuer: payload.iss,
				expected: `${supabaseUrl}/auth/v1`
			})
			throw new Error('Invalid token issuer')
		}

		// Validate required timestamps exist
		if (!payload.exp || !payload.iat) {
			this.logger.warn('Token missing required timestamps', {
				hasExp: !!payload.exp,
				hasIat: !!payload.iat
			})
			throw new Error('Token missing expiration or issued-at timestamp')
		}

		if (!payload.email) {
			this.logger.warn('JWT missing email claim', { userId: payload.sub })
			throw new Error('Invalid token: missing email')
		}

		// Validate audience is authenticated
		const expectedAud = 'authenticated'
		const actualAud = Array.isArray(payload.aud)
			? payload.aud[0]
			: (payload.aud ?? 'authenticated')
		if (actualAud !== expectedAud) {
			this.logger.warn('JWT audience mismatch', {
				expected: expectedAud,
				actual: actualAud
			})
			throw new Error('Invalid token audience')
		}

		// Ensure user exists in users table (creates if doesn't exist - e.g., OAuth sign-ins)
		// This is critical for RLS policies that reference users.id
		const userToEnsure: Parameters<
			typeof this.utilityService.ensureUserExists
		>[0] = {
			id: payload.sub,
			email: payload.email
		}

		if (payload.user_metadata) {
			userToEnsure.user_metadata = payload.user_metadata as {
				full_name?: string
				name?: string
				avatar_url?: string
				picture?: string
				[key: string]: unknown
			}
		}

		if (payload.app_metadata) {
			userToEnsure.app_metadata = payload.app_metadata
		}

		// ✅ CRITICAL FIX: Get users.id (not auth.uid()) for RLS policies
		// RLS policies reference users.id, so req.user.id must be users.id (not supabaseId)
		const internalUserId =
			await this.utilityService.ensureUserExists(userToEnsure)

		// Create user object from JWT payload
		const user: authUser = {
			id: internalUserId, // Use users.id for RLS compatibility
			aud: actualAud,
			email: payload.email,
			role: payload.app_metadata?.role ?? 'authenticated',
			// Use timestamps from JWT payload instead of hardcoded current time
			email_confirmed_at: payload.email_confirmed_at ?? '',
			confirmed_at: payload.confirmed_at ?? '',
			last_sign_in_at: payload.last_sign_in_at ?? '',
			app_metadata: payload.app_metadata ?? {},
			user_metadata: payload.user_metadata ?? {},
			identities: [],
			created_at: payload.created_at ?? new Date().toISOString(),
			updated_at: payload.updated_at ?? new Date().toISOString(),
			is_anonymous: false
		}

		// Sanitize logs: log only userId and role, never email
		this.logger.debug('User authenticated successfully', {
			userId: user.id,
			role: user.role
		})

		return user
	}
}

function resolveSupabaseJwtConfig(supabaseUrl: string): {
	algorithm: Algorithm
	isAsymmetric: boolean
	secretOrKey?: string
	jwksUri: string
} {
	const explicitAlg = process.env.SUPABASE_JWT_ALGORITHM?.toUpperCase().trim()

	// SECURITY: Algorithm detection strategy (recommended by official docs):
	// 1. Use SUPABASE_JWT_ALGORITHM if explicitly configured
	// 2. Default to asymmetric algorithms (RS256/ES256) with JWKS
	// 3. Only fall back to HS256 if SUPABASE_JWT_ALGORITHM=HS256 is explicitly set
	//
	// NEVER decode the service role key as a JWT - it's a signing secret, not a token!
	// Modern Supabase projects use ES256/RS256, legacy projects use HS256.

	const algorithm: Algorithm = (explicitAlg as Algorithm) ?? 'RS256'
	const asymmetricAlgs = new Set(['ES256', 'RS256'])
	const isAsymmetric = asymmetricAlgs.has(algorithm)

	if (!isAsymmetric) {
		// HS256: Requires SUPABASE_JWT_SECRET for verification
		const secret =
			process.env.SUPABASE_JWT_SECRET ??
			process.env.SUPABASE_SECRET_KEY ??
			process.env.SERVICE_ROLE_KEY

		if (!secret) {
			throw new Error(
				'HS256 algorithm requires SUPABASE_JWT_SECRET (or SUPABASE_SECRET_KEY) for verification'
			)
		}

		return {
			algorithm,
			isAsymmetric,
			secretOrKey: secret,
			jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`
		}
	}

	// RS256/ES256: Use JWKS for verification (no secret needed)
	return {
		algorithm,
		isAsymmetric,
		jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`
	}
}
