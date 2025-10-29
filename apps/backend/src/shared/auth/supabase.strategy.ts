/**
 * Supabase JWT Strategy - 2025 Best Practices
 *
 * Comprehensive token validation and expiration handling
 * Follows official NestJS + Supabase authentication patterns
 * Uses JWKS endpoint for JWT verification (supports RS256/ES256)
 *
 * Migration from legacy JWT secrets to JWT Signing Keys:
 * - Legacy: HS256 symmetric key with SUPABASE_JWT_SECRET
 * - Modern: RS256/ES256 asymmetric keys via JWKS endpoint
 * - JWKS endpoint: https://{project}.supabase.co/auth/v1/.well-known/jwks.json
 */

import { Injectable, Logger } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import type { JwtPayload, authUser, UserRole } from '@repo/shared/types/auth'

import { ExtractJwt, Strategy } from 'passport-jwt'
import * as jwksRsa from 'jwks-rsa'

/**
 * Extended JWT payload with Supabase-specific fields
 */
interface SupabaseJwtPayload extends JwtPayload {
	iss?: string
	aud?: string | string[]
	email: string
	role?: UserRole
	user_metadata?: Record<string, unknown>
	exp?: number
	iat?: number
	sub: string
}

/**
 * Enhanced token validation result with expiration info
 */
export interface TokenValidationResult {
	user: authUser
	tokenInfo: {
		expiresAt: Date
		issuedAt: Date
		issuer: string
		audience: string
		timeUntilExpiry: number // seconds
		tokenAge: number // seconds
	}
}

/**
 * Token expiration service for proper handling
 */
@Injectable()
export class TokenExpirationService {
	private readonly clockSkewTolerance = 30 // seconds for clock skew

	/** Check if token is expired with clock skew tolerance */
	isTokenExpired(expiresAt: Date): boolean {
		const now = Date.now()
		const expiry = expiresAt.getTime()
		const adjustedExpiry = expiry - this.clockSkewTolerance * 1000

		return now >= adjustedExpiry
	}

	/** Calculate time until expiry in seconds */
	getTimeUntilExpiry(expiresAt: Date): number {
		const now = Date.now()
		const expiry = expiresAt.getTime()
		const adjustedExpiry = expiry - this.clockSkewTolerance * 1000

		return Math.max(0, Math.floor((adjustedExpiry - now) / 1000))
	}

	/** Get token age in seconds */
	getTokenAge(issuedAt: Date): number {
		return Math.floor((Date.now() - issuedAt.getTime()) / 1000)
	}

	/** Determine if token needs refresh (within N minutes of expiry) */
	needsRefresh(expiresAt: Date, refreshThresholdMinutes = 5): boolean {
		const timeUntilExpiry = this.getTimeUntilExpiry(expiresAt)
		const refreshThreshold = refreshThresholdMinutes * 60
		return timeUntilExpiry <= refreshThreshold
	}
}

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
	private readonly logger = new Logger(SupabaseStrategy.name)
	private readonly tokenExpiration = new TokenExpirationService()

	constructor() {
		const supabaseUrl = process.env.SUPABASE_URL
		const jwtSecret = process.env.SUPABASE_JWT_SECRET

		if (!supabaseUrl) {
			throw new Error('SUPABASE_URL environment variable is required')
		}

		// Support both legacy HS256 (JWT secret) and modern JWKS (RS256/ES256)
		if (jwtSecret) {
			// Legacy mode: Use JWT secret for HS256
			super({
				jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
				ignoreExpiration: false,
				secretOrKey: jwtSecret,
				algorithms: ['HS256', 'RS256', 'ES256']
			})
		} else {
			// Modern mode: Use JWKS for RS256/ES256
			super({
				jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
				ignoreExpiration: false,
				secretOrKeyProvider: jwksRsa.passportJwtSecret({
					jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
					cache: true,
					cacheMaxEntries: 5,
					cacheMaxAge: 600000, // 10 minutes
					rateLimit: true,
					jwksRequestsPerMinute: 10
				}),
				algorithms: ['HS256', 'RS256', 'ES256']
			})
		}

		// Log after super() call
		if (jwtSecret) {
			this.logger.log('SupabaseStrategy initialized with HS256 JWT secret (legacy mode)')
		} else {
			this.logger.log('SupabaseStrategy initialized with JWKS verification (modern mode)')
		}
	}

	async validate(payload: SupabaseJwtPayload): Promise<TokenValidationResult> {
		const userId = payload.sub ?? 'unknown'
		this.logger.debug('Starting JWT validation', {
			userId,
			email: payload.email,
			issuer: payload.iss,
			audience: payload.aud,
			expiresAt: payload.exp ? new Date(payload.exp * 1000) : null
		})

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

		if (!payload.exp || !payload.iat) {
			this.logger.warn('Token missing required timestamps', {
				hasExp: !!payload.exp,
				hasIat: !!payload.iat
			})
			throw new Error('Token missing expiration or issued-at timestamp')
		}

		const expiresAt = new Date(payload.exp * 1000)
		const issuedAt = new Date(payload.iat * 1000)

		const isExpired = this.tokenExpiration.isTokenExpired(expiresAt)
		const timeUntilExpiry = this.tokenExpiration.getTimeUntilExpiry(expiresAt)
		const tokenAge = this.tokenExpiration.getTokenAge(issuedAt)

		if (isExpired) {
			this.logger.warn('Token is expired', {
				expiresAt,
				issuedAt,
				tokenAge,
				timeUntilExpiry,
				userId
			})
			throw new Error('Token has expired')
		}

		if (timeUntilExpiry < 300) {
			this.logger.warn('Token approaching expiry', { timeUntilExpiry, userId })
		}

		if (tokenAge > 86400) {
			this.logger.warn('Token is unusually old', { tokenAge, userId })
		}

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

		const user: authUser = {
			id: payload.sub ?? '',
			aud: actualAud,
			email_confirmed_at: new Date().toISOString(),
			confirmed_at: new Date().toISOString(),
			last_sign_in_at: new Date().toISOString(),
			app_metadata: {},
			user_metadata: payload.user_metadata ?? {},
			identities: [],
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			is_anonymous: false
		}

		if (payload.role !== undefined) user.role = payload.role
		if (payload.email !== undefined) user.email = payload.email

		const validationResult: TokenValidationResult = {
			user,
			tokenInfo: {
				expiresAt,
				issuedAt,
				issuer: payload.iss ?? 'unknown',
				audience: actualAud,
				timeUntilExpiry,
				tokenAge
			}
		}

		this.logger.debug('User authenticated successfully', {
			userId: user.id,
			email: user.email,
			role: user.role,
			timeUntilExpiry,
			tokenAge
		})

		return validationResult
	}
}
