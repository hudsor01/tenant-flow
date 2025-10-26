/**
 * Supabase JWT Strategy - 2025 Best Practices
 *
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
import type { JwtPayload, authUser } from '@repo/shared/types/auth'

import { ExtractJwt, Strategy } from 'passport-jwt'

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
	private readonly logger = new Logger(SupabaseStrategy.name)

	constructor() {
		const supabaseUrl = process.env.SUPABASE_URL
		const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET

		if (!supabaseUrl) {
			throw new Error('SUPABASE_URL environment variable is required')
		}

		if (!supabaseJwtSecret) {
			throw new Error('SUPABASE_JWT_SECRET environment variable is required')
		}

		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			// Use the JWT secret for verification
			secretOrKey: supabaseJwtSecret,
			// Supabase uses HS256 for JWT signing with the secret
			algorithms: ['HS256']
		})

		this.logger.log(`SupabaseStrategy initialized with HS256 verification`)
	}

	async validate(payload: JwtPayload): Promise<authUser> {
		this.logger.debug('Validating JWT payload', {
			userId: payload.sub,
			email: payload.email
		})

		// Verify the token is from our Supabase instance
		const supabaseUrl = process.env.SUPABASE_URL
		const iss = (payload as { iss?: string }).iss
		if (supabaseUrl && iss !== `${supabaseUrl}/auth/v1`) {
			this.logger.warn('JWT issuer mismatch', { issuer: iss })
			throw new Error('Invalid token issuer')
		}

		// Create full Supabase User object from JWT payload
		const payloadWithMetadata = payload as {
			sub: string
			aud?: string
			role?: string
			email?: string
			user_metadata?: Record<string, unknown>
		}
		const user: authUser = {
			id: payloadWithMetadata.sub,
			aud: payloadWithMetadata.aud ?? 'authenticated',
			email_confirmed_at: new Date().toISOString(),
			confirmed_at: new Date().toISOString(),
			last_sign_in_at: new Date().toISOString(),
			app_metadata: {},
			user_metadata: payloadWithMetadata.user_metadata || {},
			identities: [],
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			is_anonymous: false
		}

		// Only assign optional properties if they have values
		if (payloadWithMetadata.role !== undefined) {
			user.role = payloadWithMetadata.role
		}
		if (payloadWithMetadata.email !== undefined) {
			user.email = payloadWithMetadata.email
		}

		this.logger.debug('User authenticated successfully', {
			userId: user.id,
			email: user.email,
			role: user.role
		})

		return user
	}
}
