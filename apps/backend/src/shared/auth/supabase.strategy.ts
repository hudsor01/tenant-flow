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
import type { SupabaseJwtPayload, authUser } from '@repo/shared/types/auth'

import { ExtractJwt, Strategy } from 'passport-jwt'
import * as jwksRsa from 'jwks-rsa'

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
	private readonly logger = new Logger(SupabaseStrategy.name)

	constructor() {
		const supabaseUrl = process.env.SUPABASE_URL

		if (!supabaseUrl) {
			throw new Error('SUPABASE_URL environment variable is required')
		}

		const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET

		// HEADERS-ONLY AUTHENTICATION
		// Frontend and backend are on separate deployments (Vercel + Railway)
		// All API calls MUST use Authorization: Bearer <token> header
		// NO cookie support - cookies are for Next.js middleware only
		const extractors = [
			ExtractJwt.fromAuthHeaderAsBearerToken()
		]

		if (supabaseJwtSecret) {
			// Legacy HS256 projects - use shared secret
			super({
				jwtFromRequest: ExtractJwt.fromExtractors(extractors),
				ignoreExpiration: false,
				secretOrKey: supabaseJwtSecret,
				algorithms: ['HS256']
			})

			this.logger.log(
				'SupabaseStrategy initialized with shared JWT secret (HS256) - HEADERS ONLY (Authorization: Bearer)'
			)
		} else {
			// Modern JWKS-based authentication (RS256/ES256)
			// HEADERS ONLY - Authorization: Bearer <token>
			super({
				jwtFromRequest: ExtractJwt.fromExtractors(extractors),
				ignoreExpiration: false,
				secretOrKeyProvider: jwksRsa.passportJwtSecret({
					jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
					cache: true,
					cacheMaxEntries: 5,
					cacheMaxAge: 600000, // 10 minutes
					rateLimit: true,
					jwksRequestsPerMinute: 10
				}),
				algorithms: ['RS256', 'ES256']
			})

			this.logger.log(
				'SupabaseStrategy initialized with JWKS verification (RS256/ES256) - HEADERS ONLY (Authorization: Bearer)'
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

		// Basic validation - Passport.js has already verified the JWT signature via JWKS
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

		// Create user object from JWT payload
		const user: authUser = {
			id: payload.sub,
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

		this.logger.debug('User authenticated successfully', {
			userId: user.id,
			role: user.role,
			email: user.email
		})

		return user
	}

	}
