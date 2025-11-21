/**
 * Supabase JWT Strategy - ES256 Asymmetric Verification
 *
 * Uses Supabase's ES256 public key for JWT signature verification.
 * ES256 is an asymmetric algorithm (ECDSA with P-256 curve) that requires
 * the PUBLIC KEY for verification (not a secret).
 *
 * Key Management:
 * - SUPABASE_JWT_SECRET: Public key from Supabase Settings > JWT Keys > Current Signing Key
 * - JWT_PUBLIC_KEY_STANDBY: Optional standby key for rotation (currently for reference only)
 * - Algorithm: ES256 (ECDSA, Supabase's default)
 * - Verification: Asymmetric (uses public key only)
 *
 * Authentication Flow:
 * 1. Frontend sends Authorization: Bearer <token> header
 * 2. Strategy extracts and verifies JWT signature using ES256 public key
 * 3. Validates standard claims (issuer, audience, expiration)
 * 4. Ensures user exists in users table (creates if needed for OAuth)
 * 5. Returns authenticated user object for request handlers
 *
 * Security Notes:
 * - Never use SUPABASE_JWT_SECRET as a shared secret (it's a public key)
 * - Key rotation: Supabase rotates keys periodically
 * - Tokens issued by Supabase must match the configured issuer
 * - All authentication MUST use Authorization: Bearer header (no cookies)
 */

import { Injectable, Logger } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import type { SupabaseJwtPayload, authUser } from '@repo/shared/types/auth'
import { UtilityService } from '../services/utility.service'
import type { Algorithm } from 'jsonwebtoken'

import { ExtractJwt, Strategy } from 'passport-jwt'
import { AppConfigService } from '../../config/app-config.service'
import { USER_user_type } from '@repo/shared/constants/auth'

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
	private readonly logger = new Logger(SupabaseStrategy.name)
	private readonly utilityService: UtilityService
	private readonly config: AppConfigService

	constructor(utilityService: UtilityService, config: AppConfigService) {
		// Get JWT configuration (validates environment variables)
		const { algorithm, secretOrKey } = resolveSupabaseJwtConfig(config)

		// Configure passport-jwt strategy with ES256 public key
		const baseConfig = {
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			issuer: `${config.getSupabaseUrl()}/auth/v1`,
			audience: 'authenticated',
			algorithms: [algorithm],
			secretOrKey // Public key for ES256 verification
		}

		super(baseConfig)

		// Safe to assign to 'this' after super()
		this.utilityService = utilityService
		this.config = config

		// SECURITY: Headers-only authentication required
		// Frontend (Vercel) and Backend (Railway) are separate deployments
		this.logger.log(
			`Supabase Strategy initialized - ES256 JWT verification via Bearer token (no cookies)`
		)
	}

	async validate(payload: SupabaseJwtPayload): Promise<authUser> {
		const user_id = payload.sub ?? 'unknown'
		this.logger.debug('Validating JWT payload', {
			user_id,
			issuer: payload.iss,
			audience: payload.aud,
			expiration: payload.exp ? new Date(payload.exp * 1000) : null
		})

		// Basic validation - Passport.js has already verified the JWT signature via Supabase's secret
		if (!payload.sub) {
			this.logger.error('JWT missing subject (sub) claim')
			throw new Error('Invalid token: missing user ID')
		}

		// Validate issuer matches Supabase project
		const supabaseUrl = this.config.getSupabaseUrl()
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

		// Allow 30-second grace period for token expiration to handle refresh timing
		const now = Math.floor(Date.now() / 1000)
		const expWithGrace = payload.exp + 30 // 30 second grace period

		if (now > expWithGrace) {
			this.logger.warn('Token expired (including grace period)', {
				user_id: payload.sub,
				exp: new Date(payload.exp * 1000),
				now: new Date(now * 1000),
				gracePeriodSeconds: 30
			})
			throw new Error('Token expired')
		}

		// Log warning if token is close to expiry (within 5 minutes)
		const fiveMinutesFromNow = now + (5 * 60)
		if (payload.exp < fiveMinutesFromNow) {
			this.logger.debug('Token approaching expiry', {
				user_id: payload.sub,
				expiresInMinutes: Math.round((payload.exp - now) / 60),
				exp: new Date(payload.exp * 1000)
			})
		}

		if (!payload.email) {
			this.logger.warn('JWT missing email claim', { user_id: payload.sub })
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

		// Get users.id (not auth.uid()) for RLS policies
		// RLS policies reference users.id, so req.user.id must be users.id (not supabaseId)
		let internaluser_id: string
		try {
			internaluser_id = await this.utilityService.ensureUserExists(userToEnsure)
		} catch (error) {
			// If database is unavailable, throw a system error to prevent false 401s
			const errorMessage = error instanceof Error ? error.message : 'Unknown database error'
			this.logger.error('Database error during user lookup/creation', {
				user_id: payload.sub,
				email: payload.email,
				error: errorMessage
			})
			throw new Error(`Authentication service unavailable: ${errorMessage}`)
		}

		// app_metadata doesn't have user_type in JWT - get from database instead
		const payloaduser_typeRaw = null
		const payloaduser_typeValid = isValidUserValue(payloaduser_typeRaw)
		const tokenuser_type = payloaduser_typeValid ? payloaduser_typeRaw : null

		if (payloaduser_typeRaw && !payloaduser_typeValid) {
			this.logger.warn('Invalid user_type present in JWT payload app_metadata; ignoring', {
				user_id: payload.sub,
				payloaduser_type: payloaduser_typeRaw
			})
		}

		let dbuser_type: string | null = null
		let dbuser_typeLookupFailed = false
		try {
			dbuser_type = (await this.utilityService.getUserTypeByUserId(internaluser_id)) ?? null
		} catch (error) {
			// Log but don't fail - user_type lookup is not critical for authentication
			dbuser_typeLookupFailed = true
			this.logger.warn('Failed to get user user_type from database, enforcing least-privilege fallback', {
				user_id: internaluser_id,
				error: error instanceof Error ? error.message : 'Unknown error',
				payloaduser_type: payloaduser_typeRaw ?? null,
				payloaduser_typeValid
			})
		}

		if (!dbuser_type && !dbuser_typeLookupFailed) {
			this.logger.warn('User user_type not found in database, enforcing least-privilege fallback', {
				user_id: internaluser_id,
				payloaduser_type: payloaduser_typeRaw ?? null,
				payloaduser_typeValid
			})
		}

		const fallbackuser_type = tokenuser_type ?? SAFE_FALLBACK_user_type
		let user_typeSource: user_typeVerificationStatus = 'safe-default'

		if (dbuser_type) {
			user_typeSource = 'database'
		} else if (tokenuser_type) {
			user_typeSource = 'token'
		}

		let resolveduser_type = dbuser_type ?? fallbackuser_type

		if (
			user_typeSource !== 'database' &&
			(resolveduser_type === 'OWNER' || resolveduser_type === 'ADMIN')
		) {
			this.logger.warn('Downgrading unverified elevated user_type until database user_type verification succeeds', {
				user_id: internaluser_id,
				attempteduser_type: resolveduser_type,
				payloaduser_type: payloaduser_typeRaw ?? null
			})
			resolveduser_type = SAFE_FALLBACK_user_type
			user_typeSource = 'downgraded'
		}

		const user_typeVerified = user_typeSource === 'database'

		// Create user object from JWT payload
		const mergedAppMetadata = {
			...(payload.app_metadata ?? {}),
			user_typeVerificationStatus: user_typeSource,
			user_typeVerified
		}

		const user: authUser = {
			id: internaluser_id,
			aud: actualAud,
			email: payload.email,
			email_confirmed_at: payload.email_confirmed_at ?? '',
			confirmed_at: payload.confirmed_at ?? '',
			last_sign_in_at: payload.last_sign_in_at ?? '',
			app_metadata: {
				...mergedAppMetadata,
				user_type: resolveduser_type
			},
			user_metadata: payload.user_metadata ?? {},
			identities: [],
			created_at: payload.created_at ?? new Date().toISOString(),
			updated_at: payload.updated_at ?? new Date().toISOString(),
			is_anonymous: false
		}

		// Sanitize logs: log only user_id and user_type, never email
		this.logger.debug('User authenticated successfully', {
			user_id: user.id,
			user_type: resolveduser_type,
			user_typeVerificationStatus: user_typeSource
		})

		return user
	}
}

function resolveSupabaseJwtConfig(config: AppConfigService): {
	algorithm: Algorithm
	secretOrKey: string
} {
	const logger = new Logger('SupabaseJwtConfig')

	// ES256 requires asymmetric public key verification
	// Use SUPABASE_JWT_SECRET which contains the public key from Supabase Dashboard > Settings > JWT Keys > Current Signing Key
	const publicKey = config.supabaseJwtSecret

	if (!publicKey) {
		throw new Error(
			'SUPABASE_JWT_SECRET environment variable is required for ES256 JWT verification.\n' +
			'Get this from your Supabase dashboard:\n' +
			'  1. Go to Settings > JWT Keys\n' +
			'  2. Copy the "Current Signing Key" (the public key for ES256)\n' +
			'  3. Set environment variable: SUPABASE_JWT_SECRET=<paste-public-key>'
		)
	}

	// Support key rotation: also accept standby key for verification
	const standbyPublicKey = config.getJwtPublicKeyStandby()

	logger.log('JWT configuration initialized for ES256 verification', {
		hasCurrent: !!publicKey,
		hasStandby: !!standbyPublicKey,
		algorithm: 'ES256'
	})

	// Note: Key rotation support would require a custom verify function in the strategy
	// For now, use primary key. Standby key is logged but not used for verification
	return {
		algorithm: 'ES256',
		secretOrKey: publicKey as string // Type assertion safe: publicKey is validated above
	}
}

type user_typeVerificationStatus = 'database' | 'token' | 'safe-default' | 'downgraded'

const VALID_USER_user_typeS = Object.values(USER_user_type) as string[]
const SAFE_FALLBACK_user_type: string = 'TENANT'

function isValidUserValue(user_type: unknown): user_type is string {
	return typeof user_type === 'string' && VALID_USER_user_typeS.includes(user_type as string)
}
