/**
 * JWT Token Decorator
 * 
 * Extracts the JWT token from the request for passing to services.
 * Supports both Authorization header and Supabase cookies (Next.js middleware).
 * 
 * Usage:
 * @Get()
 * async findAll(@JwtToken() token: string) {
 *   return this.service.findAll(token)
 * }
 */

import type { ExecutionContext} from '@nestjs/common';
import { createParamDecorator, UnauthorizedException } from '@nestjs/common'
import { ExtractJwt } from 'passport-jwt'

export const JwtToken = createParamDecorator(
	(_data: unknown, ctx: ExecutionContext): string => {
		const request = ctx.switchToHttp().getRequest()

		// Try Authorization header first (primary method)
		const headerExtractor = ExtractJwt.fromAuthHeaderAsBearerToken()
		const headerToken = headerExtractor(request)

		if (headerToken) {
			return headerToken
		}

		// Try cookies (Supabase Next.js middleware sets cookies)
		const supabaseUrl = process.env.SUPABASE_URL
		if (!supabaseUrl) {
			throw new UnauthorizedException('Supabase configuration missing')
		}

		// Extract project ID from Supabase URL
		const projectId = supabaseUrl.match(/https:\/\/(.*?)\.supabase\.co/)?.[1]

		if (projectId && request.cookies) {
			const baseName = `sb-${projectId}-auth-token`
			const cookieValue = request.cookies[baseName]

			if (cookieValue) {
				// Try to extract access_token from cookie value
				// The cookie may be a JSON object with session data
				try {
					const parsed = JSON.parse(cookieValue)
					const accessToken = parsed?.access_token || parsed?.accessToken

					if (accessToken && typeof accessToken === 'string') {
						return accessToken
					}
				} catch {
					// If parsing fails, the cookie might be the token itself
					if (typeof cookieValue === 'string' && cookieValue.length > 20) {
						return cookieValue
					}
				}
			}

			// Check for chunked cookies (sb-{project}-auth-token.0, .1, etc.)
			const cookieChunks = Object.keys(request.cookies)
				.filter((key) => key.startsWith(`${baseName}.`))
				.sort((a, b) => {
					const numA = parseInt(a.split('.').pop() || '0', 10)
					const numB = parseInt(b.split('.').pop() || '0', 10)
					return numA - numB
				})
				.map((key) => request.cookies[key])
				.join('')

			if (cookieChunks) {
				try {
					const parsed = JSON.parse(cookieChunks)
					const accessToken = parsed?.access_token || parsed?.accessToken

					if (accessToken && typeof accessToken === 'string') {
						return accessToken
					}
				} catch {
					// Ignore parse errors
				}
			}
		}

		// No token found
		throw new UnauthorizedException('No JWT token found in request')
	}
)
