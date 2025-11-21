/**
 * JWT Auth Guard - Supabase Authentication
 *
 * Protects routes with Supabase JWT verification
 * Follows 2025 NestJS + Supabase best practices
 */

import {
	ExecutionContext,
	Injectable,
	Logger,
	UnauthorizedException,
	InternalServerErrorException
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'
import { User } from '@supabase/supabase-js'

@Injectable()
export class JwtAuthGuard extends AuthGuard('supabase') {
	private readonly logger = new Logger(JwtAuthGuard.name)

	constructor(private reflector: Reflector) {
		super()
	}

	override canActivate(context: ExecutionContext) {
		// Check if route is marked as public
		const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
			context.getHandler(),
			context.getClass()
		])

		if (isPublic) {
			return true
		}

		return super.canActivate(context)
	}

	override handleRequest<TUser = User>(
		err: Error | null,
		user: TUser | null,
		info: { message?: string; error?: string } | null,
		context: ExecutionContext,
		status?: string | number | null
	): TUser {
		void status
		const request = context.switchToHttp().getRequest<Request>()
		const authHeader = (request.headers as { authorization?: string }).authorization

		// For protected routes, require authentication
		if (err || !user) {
			// Determine if this is an authentication error vs system error
			const isAuthError = this.isAuthenticationError(err, info)

			if (isAuthError) {
				// Log authentication failures (normal security events)
				this.logger.warn('Authentication failed for protected route', {
					error: err instanceof Error ? err.message : 'Unknown error',
					errorName: err instanceof Error ? err.name : undefined,
					info: info,
					path: (request as { url?: string }).url,
					method: (request as { method?: string }).method,
					hasAuthHeader: !!authHeader
				})

				// Provide specific error message based on auth failure type
				let errorMessage = 'Authentication required'

				if (!authHeader) {
					errorMessage = 'Missing authentication token. Please log in again.'
				} else if (err?.message?.includes('expired')) {
					errorMessage = 'Your session has expired. Please log in again.'
				} else if (err?.message?.includes('invalid') || err?.message?.includes('malformed')) {
					errorMessage = 'Invalid authentication token. Please log in again.'
				}

				// Return 401 for authentication failures
				throw err instanceof UnauthorizedException
					? err
					: new UnauthorizedException(errorMessage)
			} else {
				// Log system errors that could cause false 401s
				this.logger.error('System error during authentication - preventing false 401', {
					error: err instanceof Error ? err.message : 'Unknown error',
					errorName: err instanceof Error ? err.name : undefined,
					errorStack: err instanceof Error ? err.stack : undefined,
					info: info,
					path: (request as { url?: string }).url,
					method: (request as { method?: string }).method,
					hasAuthHeader: !!authHeader
				})

				// Return 500 for system errors to avoid false 401s for authenticated users
				// Provide more context about what failed
				let errorMessage = 'Authentication service temporarily unavailable'

				if (err?.message?.includes('database') || err?.message?.includes('postgres')) {
					errorMessage = 'Database connection error. Please try again in a moment.'
				} else if (err?.message?.includes('timeout')) {
					errorMessage = 'Authentication service is slow. Please try again.'
				}

				throw new InternalServerErrorException(errorMessage)
			}
		}

		this.logger.debug('Authentication successful', {
			user_id: (user as { id?: string }).id,
			path: (request as { url?: string }).url,
			method: (request as { method?: string }).method
		})

		return user
	}

	/**
	 * Determine if an error is an authentication error (invalid token, expired, etc.)
	 * vs a system/configuration error (database issues, network problems, misconfiguration, etc.)
	 *
	 * Returns true for 401-worthy errors (user's fault - invalid/missing token)
	 * Returns false for 500-worthy errors (server's fault - misconfiguration/database/system)
	 */
	private isAuthenticationError(
		err: Error | null,
		info: { message?: string; error?: string } | null
	): boolean {
		if (!err) return false

		const errorMessage = err.message?.toLowerCase() || ''
		const errorName = err.name?.toLowerCase() || ''
		const infoMessage = info?.message?.toLowerCase() || ''
		const infoError = info?.error?.toLowerCase() || ''

		// SYSTEM/CONFIG errors (should return 500, not 401)
		// These indicate misconfiguration or infrastructure problems
		const systemErrorPatterns = [
			'asymmetric',
			'publickey',
			'secret',
			'jwks',
			'keyid',
			'database',
			'connection',
			'network',
			'timeout',
			'postgres',
			'supabase',
			'econnrefused',
			'enotfound'
		]

		if (
			systemErrorPatterns.some(pattern =>
				errorMessage.includes(pattern) ||
				errorName.includes(pattern) ||
				infoMessage.includes(pattern) ||
				infoError.includes(pattern)
			)
		) {
			return false // System error - return 500
		}

		// AUTHENTICATION errors (should return 401)
		// These are token validation failures (user's responsibility)
		const authErrorPatterns = [
			'invalid',
			'expired',
			'malformed',
			'signature',
			'token',
			'jwt',
			'unauthorized'
		]

		const hasAuthError = authErrorPatterns.some(pattern =>
			errorMessage.includes(pattern) ||
			errorName.includes(pattern) ||
			infoMessage.includes(pattern) ||
			infoError.includes(pattern)
		)

		return hasAuthError
	}
}
