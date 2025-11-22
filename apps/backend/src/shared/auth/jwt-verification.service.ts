/**
 * JWT Verification Service using jose
 *
 * Replaces Passport.js with native jose library for JWT verification
 * Supports JWKS key rotation and fallback to static keys
 */

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { jwtVerify, createRemoteJWKSet, type JWTPayload, type JWTVerifyResult } from 'jose'
import { AppConfigService } from '../../config/app-config.service'
import type { SupabaseJwtPayload } from '@repo/shared/types/auth'

@Injectable()
export class JwtVerificationService {
	private readonly logger = new Logger(JwtVerificationService.name)
	private readonly jwks: ReturnType<typeof createRemoteJWKSet>
	private readonly issuer: string
	private readonly audience: string
	private readonly staticPublicKey: string | undefined

	constructor(config: AppConfigService) {
		const supabaseUrl = config.getSupabaseUrl()
		this.issuer = `${supabaseUrl}/auth/v1`
		this.audience = 'authenticated'
		this.staticPublicKey = config.getJwtPublicKeyCurrent()

		// Initialize JWKS client with Supabase discovery URL
		const jwksUrl = `${supabaseUrl}/auth/v1/.well-known/jwks.json`

		// Validate JWKS URL format
		try {
			const parsedUrl = new URL(jwksUrl)
			if (parsedUrl.protocol !== 'https:') {
				throw new Error('JWKS URL must use HTTPS protocol')
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Invalid URL format'
			this.logger.error(`Invalid JWKS URL configuration: ${message}`)
			throw new Error(`JWKS URL validation failed: ${message}. Check SB_URL configuration.`)
		}

		// Create remote JWKS set for automatic key rotation
		this.jwks = createRemoteJWKSet(new URL(jwksUrl))

		this.logger.log(
			`JWT Verification Service initialized - JWKS from ${jwksUrl}`
		)
	}

	/**
	 * Verify JWT token using jose library
	 * Tries JWKS first, falls back to static key if available
	 */
	async verifyToken(token: string): Promise<SupabaseJwtPayload> {
		if (!token) {
			throw new UnauthorizedException('No token provided')
		}

		// Validate token format
		const tokenParts = token.split('.')
		if (tokenParts.length !== 3) {
			this.logger.error('Invalid JWT format - expected 3 parts', {
				partsFound: tokenParts.length,
				tokenPreview: token.substring(0, 20) + '...'
			})
			throw new UnauthorizedException(
				`Invalid JWT format: expected 3 parts, got ${tokenParts.length}`
			)
		}

		// Try JWKS verification first
		try {
			const result = await jwtVerify(token, this.jwks, {
				issuer: this.issuer,
				audience: this.audience,
				algorithms: ['ES256', 'RS256']
			})

			this.logger.debug('JWT verified using JWKS')
			return this.mapJwtPayload(result)
		} catch (jwksError) {
			this.logger.warn('JWKS verification failed, attempting fallback to static key', {
				error: jwksError instanceof Error ? jwksError.message : 'unknown error'
			})

			// Fallback to static key if available
			if (this.staticPublicKey) {
				try {
					// Convert PEM string to key object
					const encoder = new TextEncoder()
					const keyData = encoder.encode(this.staticPublicKey)

					const result = await jwtVerify(token, keyData, {
						issuer: this.issuer,
						audience: this.audience,
						algorithms: ['ES256', 'RS256']
					})

					this.logger.debug('JWT verified using static key')
					return this.mapJwtPayload(result)
				} catch (staticKeyError) {
					this.logger.error('Static key verification failed', {
						error: staticKeyError instanceof Error ? staticKeyError.message : 'unknown error'
					})
					throw new UnauthorizedException('Invalid token: verification failed')
				}
			}

			// No static key available, re-throw original error
			if (jwksError instanceof Error) {
				const errorMessage = this.getAuthErrorMessage(jwksError)
				throw new UnauthorizedException(errorMessage)
			}

			throw new UnauthorizedException('Token verification failed')
		}
	}

	/**
	 * Map jose JWTVerifyResult to SupabaseJwtPayload
	 */
	private mapJwtPayload(result: JWTVerifyResult): SupabaseJwtPayload {
		const payload = result.payload as JWTPayload & Partial<SupabaseJwtPayload>

		if (!payload.sub) {
			throw new UnauthorizedException('Invalid token: missing user ID')
		}

		if (!payload.email) {
			throw new UnauthorizedException('Invalid token: missing email')
		}

		const mapped: SupabaseJwtPayload = {
			sub: payload.sub,
			email: payload.email,
			iat: payload.iat ?? 0,
			exp: payload.exp ?? 0
		}

		// Only add optional properties if they exist
		if (payload.email_confirmed_at !== undefined) {
			mapped.email_confirmed_at = payload.email_confirmed_at
		}
		if (payload.confirmed_at !== undefined) {
			mapped.confirmed_at = payload.confirmed_at
		}
		if (payload.last_sign_in_at !== undefined) {
			mapped.last_sign_in_at = payload.last_sign_in_at
		}
		if (payload.created_at !== undefined) {
			mapped.created_at = payload.created_at
		}
		if (payload.updated_at !== undefined) {
			mapped.updated_at = payload.updated_at
		}
		if (payload.user_metadata !== undefined) {
			mapped.user_metadata = payload.user_metadata
		}
		if (payload.app_metadata !== undefined) {
			mapped.app_metadata = payload.app_metadata
		}
		if (payload.org_id !== undefined) {
			mapped.org_id = payload.org_id
		}
		if (payload.organization_id !== undefined) {
			mapped.organization_id = payload.organization_id
		}
		if (payload.aud !== undefined) {
			mapped.aud = payload.aud as string
		}
		if (payload.iss !== undefined) {
			mapped.iss = payload.iss
		}

		return mapped
	}

	/**
	 * Get user-friendly error message from jose errors
	 */
	private getAuthErrorMessage(error: Error): string {
		const message = error.message.toLowerCase()

		if (message.includes('expired')) {
			return 'Your session has expired. Please log in again.'
		}

		if (message.includes('invalid') || message.includes('malformed')) {
			return 'Invalid authentication token. Please log in again.'
		}

		if (message.includes('signature')) {
			return 'Invalid token signature. Please log in again.'
		}

		return 'Authentication required'
	}
}
