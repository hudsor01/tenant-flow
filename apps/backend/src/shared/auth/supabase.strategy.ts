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

		const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET

		const cookieExtractor = (request: unknown): string | null => {
			if (!request || typeof request !== 'object') return null
			const cookies = (request as { cookies?: Record<string, unknown> }).cookies
			if (!cookies) return null

			const baseName = `sb-${projectId}-auth-token`
			const combinedValue = this.combineCookieValues(cookies, baseName)
			if (!combinedValue) return null

			return this.extractAccessTokenFromCookieValue(combinedValue)
		}

		const extractors = [
			ExtractJwt.fromAuthHeaderAsBearerToken(),
			cookieExtractor
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
				'SupabaseStrategy initialized with shared JWT secret (HS256) - supports Authorization header and cookies'
			)
		} else {
			// Modern JWKS-based authentication (RS256/ES256)
			// Supports both Authorization header AND Supabase cookies (Next.js middleware)
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
				'SupabaseStrategy initialized with JWKS verification (RS256/ES256) - supports Authorization header and cookies'
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

	private combineCookieValues(
		cookies: Record<string, unknown>,
		baseName: string
	): string | null {
		const baseValue = cookies[baseName]
		if (typeof baseValue === 'string' && baseValue.length > 0) {
			return baseValue
		}
		if (Array.isArray(baseValue) && baseValue.length > 0) {
			return baseValue.join('')
		}

		const combined = Object.keys(cookies)
			.filter(key => key.startsWith(`${baseName}.`))
			.sort((a, b) => {
				const suffixA = a.substring(baseName.length + 1)
				const suffixB = b.substring(baseName.length + 1)
				const numA = Number.parseInt(suffixA, 10)
				const numB = Number.parseInt(suffixB, 10)
				const isNumA = Number.isFinite(numA)
				const isNumB = Number.isFinite(numB)
				if (isNumA && isNumB) return numA - numB
				if (isNumA) return -1
				if (isNumB) return 1
				return suffixA.localeCompare(suffixB)
			})
			.map(key => cookies[key])
			.filter(Boolean)
			.map(value =>
				typeof value === 'string'
					? value
					: Array.isArray(value)
						? value.join('')
						: ''
			)
			.join('')

		return combined.length > 0 ? combined : null
	}

	private extractAccessTokenFromCookieValue(value: string): string | null {
		const candidates = new Set<string>([value])
		try {
			const decoded = decodeURIComponent(value)
			candidates.add(decoded)
		} catch {
			// ignore decode failures
		}

		for (const candidate of Array.from(candidates)) {
			if (candidate.startsWith('base64-')) {
				const base64Payload = candidate.slice('base64-'.length)
				try {
					const decodedBase64 = Buffer.from(base64Payload, 'base64').toString('utf-8')
					candidates.add(decodedBase64)
				} catch {
					// ignore base64 decode errors
				}
			}
		}

		for (const candidate of candidates) {
			const token = this.tryParseAccessToken(candidate)
			if (token) return token
		}

		return null
	}

	private tryParseAccessToken(raw: string): string | null {
		try {
			const parsed = JSON.parse(raw)

			if (typeof parsed === 'string') {
				return this.tryParseAccessToken(parsed)
			}

			if (parsed && typeof parsed === 'object') {
				const possibleSessions = [
					(parsed as { currentSession?: unknown }).currentSession,
					(parsed as { session?: unknown }).session,
					parsed,
					Array.isArray(parsed) ? parsed[0] : undefined
				]

				for (const session of possibleSessions) {
					if (!session || typeof session !== 'object') continue
					const directToken =
						(session as Record<string, unknown>).access_token ??
						(session as Record<string, unknown>).accessToken ??
						(session as Record<string, unknown>)['access-token']

					if (typeof directToken === 'string' && directToken.length > 0) {
						return directToken
					}
				}
			}
		} catch {
			// ignore parse errors
		}

		const regexMatch = raw.match(/"access[_-]?token"\s*:\s*"([^"]+)"/)
		return regexMatch?.[1] ?? null
	}
}
