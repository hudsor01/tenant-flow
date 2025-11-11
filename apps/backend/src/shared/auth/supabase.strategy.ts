/**
 * Supabase JWT Strategy - Direct JWT Secret Verification
 *
 * Uses Supabase's JWT signing secret directly instead of JWKS endpoints.
 * This provides better reliability and performance while maintaining security.
 *
 * Key Management:
 * - Uses SUPABASE_JWT_SECRET from Supabase dashboard (Settings > JWT Keys > Current Signing Key)
 * - Supports HS256 algorithm (Supabase's default)
 * - No external dependencies on JWKS endpoints
 *
 * Authentication Flow:
 * 1. Frontend sends Authorization: Bearer <token> header
 * 2. Strategy verifies JWT signature using Supabase's secret
 * 3. Validates payload (issuer, audience, expiration)
 * 4. Ensures user exists in users table (creates if needed for OAuth)
 * 5. Returns authUser object for use in request handlers
 *
 * Supported Algorithms: HS256 (Supabase default)
 */

import { Injectable, Logger } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import type { SupabaseJwtPayload, authUser } from '@repo/shared/types/auth'
import { UtilityService } from '../services/utility.service'
import type { Algorithm } from 'jsonwebtoken'

import { ExtractJwt, Strategy } from 'passport-jwt'
import { AppConfigService } from '../../config/app-config.service'
import type { Database } from '@repo/shared/types/supabase-generated'
import { USER_ROLE } from '@repo/shared/constants/auth'

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
	private readonly logger = new Logger(SupabaseStrategy.name)
	private readonly utilityService: UtilityService

	constructor(utilityService: UtilityService, config: AppConfigService) {
		// Validate environment before super() - no 'this' access allowed
		const extractors = [ExtractJwt.fromAuthHeaderAsBearerToken()]

		const { algorithm, secretOrKey } = resolveSupabaseJwtConfig(config)

		// Base JWT configuration shared across symmetric and asymmetric modes
		const baseConfig = {
			jwtFromRequest: ExtractJwt.fromExtractors(extractors),
			ignoreExpiration: false,
			issuer: `${process.env.SUPABASE_URL}/auth/v1`,
			audience: 'authenticated',
			algorithms: [algorithm],
			secretOrKey: secretOrKey! // We validated this exists in resolveSupabaseJwtConfig
		}

		super(baseConfig)

		// NOW safe to assign to 'this' after super()
		this.utilityService = utilityService

		// HEADERS-ONLY AUTHENTICATION: Frontend and backend are on separate deployments (Vercel + Railway)
		// All API calls MUST use Authorization: Bearer <token> header - NO cookie support
		this.logger.log(
			`SupabaseStrategy initialized with JWT secret verification (${algorithm}) - HEADERS ONLY (Authorization: Bearer)`
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

		// Basic validation - Passport.js has already verified the JWT signature via Supabase's secret
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

		// Allow 30-second grace period for token expiration to handle refresh timing
		const now = Math.floor(Date.now() / 1000)
		const expWithGrace = payload.exp + 30 // 30 second grace period

		if (now > expWithGrace) {
			this.logger.warn('Token expired (including grace period)', {
				userId: payload.sub,
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
				userId: payload.sub,
				expiresInMinutes: Math.round((payload.exp - now) / 60),
				exp: new Date(payload.exp * 1000)
			})
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
		let internalUserId: string
		try {
			internalUserId = await this.utilityService.ensureUserExists(userToEnsure)
		} catch (error) {
			// If database is unavailable, throw a system error to prevent false 401s
			const errorMessage = error instanceof Error ? error.message : 'Unknown database error'
			this.logger.error('Database error during user lookup/creation', {
				userId: payload.sub,
				email: payload.email,
				error: errorMessage
			})
			throw new Error(`Authentication service unavailable: ${errorMessage}`)
		}

		const payloadRoleRaw = payload.app_metadata?.role
		const payloadRoleValid = isValidUserRoleValue(payloadRoleRaw)
		const tokenRole = payloadRoleValid ? payloadRoleRaw : null

		if (payloadRoleRaw && !payloadRoleValid) {
			this.logger.warn('Invalid role present in JWT payload app_metadata; ignoring', {
				userId: payload.sub,
				payloadRole: payloadRoleRaw
			})
		}

		let dbRole: Database['public']['Enums']['UserRole'] | null = null
		let dbRoleLookupFailed = false
		try {
			dbRole = (await this.utilityService.getUserRoleByUserId(internalUserId)) ?? null
		} catch (error) {
			// Log but don't fail - role lookup is not critical for authentication
			dbRoleLookupFailed = true
			this.logger.warn('Failed to get user role from database, enforcing least-privilege fallback', {
				userId: internalUserId,
				error: error instanceof Error ? error.message : 'Unknown error',
				payloadRole: payloadRoleRaw ?? null,
				payloadRoleValid
			})
		}

		if (!dbRole && !dbRoleLookupFailed) {
			this.logger.warn('User role not found in database, enforcing least-privilege fallback', {
				userId: internalUserId,
				payloadRole: payloadRoleRaw ?? null,
				payloadRoleValid
			})
		}

		const fallbackRole = tokenRole ?? SAFE_FALLBACK_ROLE
		let roleSource: RoleVerificationStatus = 'safe-default'

		if (dbRole) {
			roleSource = 'database'
		} else if (tokenRole) {
			roleSource = 'token'
		}

		let resolvedRole = dbRole ?? fallbackRole

		if (
			roleSource !== 'database' &&
			(resolvedRole === 'OWNER' || resolvedRole === 'ADMIN')
		) {
			this.logger.warn('Downgrading unverified elevated role until database role verification succeeds', {
				userId: internalUserId,
				attemptedRole: resolvedRole,
				payloadRole: payloadRoleRaw ?? null
			})
			resolvedRole = SAFE_FALLBACK_ROLE
			roleSource = 'downgraded'
		}

		const roleVerified = roleSource === 'database'

		// Create user object from JWT payload
		const mergedAppMetadata = {
			...(payload.app_metadata ?? {}),
			roleVerificationStatus: roleSource,
			roleVerified
		}

		const user: authUser = {
			id: internalUserId, // Use users.id for RLS compatibility
			aud: actualAud,
			email: payload.email,
			role: resolvedRole,
			// Use timestamps from JWT payload instead of hardcoded current time
			email_confirmed_at: payload.email_confirmed_at ?? '',
			confirmed_at: payload.confirmed_at ?? '',
			last_sign_in_at: payload.last_sign_in_at ?? '',
			app_metadata: mergedAppMetadata,
			user_metadata: payload.user_metadata ?? {},
			identities: [],
			created_at: payload.created_at ?? new Date().toISOString(),
			updated_at: payload.updated_at ?? new Date().toISOString(),
			is_anonymous: false
		}

		// Sanitize logs: log only userId and role, never email
		this.logger.debug('User authenticated successfully', {
			userId: user.id,
			role: user.role,
			roleVerificationStatus: roleSource
		})

		return user
	}
}

function resolveSupabaseJwtConfig(config: AppConfigService): {
	algorithm: Algorithm
	isAsymmetric: boolean
	secretOrKey?: string
	jwksUri?: string
} {
	const logger = new Logger('SupabaseJwtConfig')
	const explicitAlg = process.env.SUPABASE_JWT_ALGORITHM?.toUpperCase().trim()

	logger.log(
		`SUPABASE_JWT_ALGORITHM env var: "${process.env.SUPABASE_JWT_ALGORITHM}"`
	)
	logger.log(`Parsed explicitAlg: "${explicitAlg}"`)

	// Only HS256 is supported with direct secret verification
	const algorithm: Algorithm = explicitAlg === 'HS256' ? 'HS256' : 'HS256'
	const isAsymmetric = false

	logger.log(`Using HS256 algorithm with Supabase JWT secret`)

	// HS256: Use Supabase's JWT secret (from dashboard)
	const secret = config.supabaseJwtSecret

	logger.log('Using HS256 with Supabase JWT secret verification')
	return {
		algorithm,
		isAsymmetric,
		secretOrKey: secret
	}
}

type RoleVerificationStatus = 'database' | 'token' | 'safe-default' | 'downgraded'

const VALID_USER_ROLES = Object.values(USER_ROLE) as Database['public']['Enums']['UserRole'][]
const SAFE_FALLBACK_ROLE: Database['public']['Enums']['UserRole'] = 'TENANT'

function isValidUserRoleValue(role: unknown): role is Database['public']['Enums']['UserRole'] {
	return typeof role === 'string' && VALID_USER_ROLES.includes(role as Database['public']['Enums']['UserRole'])
}
