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
import { UtilityService } from '../services/utility.service'

import { ExtractJwt, Strategy } from 'passport-jwt'
import * as jwksRsa from 'jwks-rsa'

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
	private readonly logger = new Logger(SupabaseStrategy.name)

	constructor(private readonly utilityService: UtilityService) {
		// Must call super() as first statement before accessing 'this' or using local variables
		const supabaseUrl = process.env.SUPABASE_URL
		const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET
		const extractors = [ExtractJwt.fromAuthHeaderAsBearerToken()]

		if (!supabaseUrl) {
			// This throw happens before super(), which is allowed for validation
			throw new Error('SUPABASE_URL environment variable is required')
		}

		// Call super() immediately with configuration
		if (supabaseJwtSecret) {
			// Legacy HS256 projects - use shared secret
			super({
				jwtFromRequest: ExtractJwt.fromExtractors(extractors),
				ignoreExpiration: false,
				secretOrKey: supabaseJwtSecret,
				algorithms: ['HS256']
			})
		} else {
			// Modern JWKS-based authentication (RS256/ES256)
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
		}

		// Now safe to access 'this' after super()
		// HEADERS-ONLY AUTHENTICATION: Frontend and backend are on separate deployments (Vercel + Railway)
		// All API calls MUST use Authorization: Bearer <token> header - NO cookie support
		this.logger.log(
			supabaseJwtSecret
				? 'SupabaseStrategy initialized with shared JWT secret (HS256) - HEADERS ONLY (Authorization: Bearer)'
				: 'SupabaseStrategy initialized with JWKS verification (RS256/ES256) - HEADERS ONLY (Authorization: Bearer)'
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

		// Ensure user exists in users table (creates if doesn't exist - e.g., OAuth sign-ins)
		// This is critical for RLS policies that reference users.id
		const userToEnsure: Parameters<typeof this.utilityService.ensureUserExists>[0] = {
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

		await this.utilityService.ensureUserExists(userToEnsure)

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
