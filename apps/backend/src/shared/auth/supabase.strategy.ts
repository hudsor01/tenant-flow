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

		// Extract project ID from Supabase URL for cookie name
		const projectId = supabaseUrl.match(/https:\/\/(.*?)\.supabase\.co/)?.[1]
		if (!projectId) {
			throw new Error('Invalid SUPABASE_URL format - cannot extract project ID')
		}

		// Modern JWKS-based authentication (RS256/ES256)
		// Supports both Authorization header AND Supabase cookies (Next.js middleware)
		super({
			jwtFromRequest: ExtractJwt.fromExtractors([
				ExtractJwt.fromAuthHeaderAsBearerToken(),
				(request) => {
					// Extract from Supabase auth cookie (set by Next.js middleware)
					// Cookie format: sb-{project-id}-auth-token
					const cookieName = `sb-${projectId}-auth-token`

					// cookie-parser middleware parses cookies into req.cookies object
					return request?.cookies?.[cookieName] || null
				}
			]),
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
			'SupabaseStrategy initialized with JWKS verification (RS256/ES256) - supports Authorization header and cookies'
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
			email_confirmed_at: payload.email_confirmed_at ?? null,
			confirmed_at: payload.confirmed_at ?? null,
			last_sign_in_at: payload.last_sign_in_at ?? null,
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
