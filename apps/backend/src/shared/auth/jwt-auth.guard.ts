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
					hasAuthHeader: !!(request.headers as { authorization?: string }).authorization
				})
				// Return 401 for authentication failures
				throw err instanceof UnauthorizedException
					? err
					: new UnauthorizedException('Authentication required')
			} else {
				// Log system errors that could cause false 401s
				this.logger.error('System error during authentication - preventing false 401', {
					error: err instanceof Error ? err.message : 'Unknown error',
					errorName: err instanceof Error ? err.name : undefined,
					errorStack: err instanceof Error ? err.stack : undefined,
					info: info,
					path: (request as { url?: string }).url,
					method: (request as { method?: string }).method,
					hasAuthHeader: !!(request.headers as { authorization?: string }).authorization
				})
				// Return 500 for system errors to avoid false 401s for authenticated users
				throw new InternalServerErrorException('Authentication service temporarily unavailable')
			}
		}

		this.logger.debug('Authentication successful', {
			userId: (user as { id?: string }).id,
			path: (request as { url?: string }).url,
			method: (request as { method?: string }).method
		})

		return user
	}

	/**
	 * Determine if an error is an authentication error (invalid token, expired, etc.)
	 * vs a system error (database issues, network problems, etc.)
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

		// Authentication-related error patterns
		const authErrorPatterns = [
			'invalid',
			'expired',
			'malformed',
			'signature',
			'token',
			'jwt',
			'unauthorized',
			'authentication',
			'auth',
			'login',
			'session'
		]

		// Check error message and name
		const hasAuthError = authErrorPatterns.some(pattern =>
			errorMessage.includes(pattern) ||
			errorName.includes(pattern) ||
			infoMessage.includes(pattern) ||
			infoError.includes(pattern)
		)

		// System error patterns (database, network, etc.)
		const systemErrorPatterns = [
			'database',
			'connection',
			'network',
			'timeout',
			'server',
			'internal',
			'service',
			'unavailable',
			'postgres',
			'supabase'
		]

		const hasSystemError = systemErrorPatterns.some(pattern =>
			errorMessage.includes(pattern) ||
			errorName.includes(pattern)
		)

		// If it has both auth and system patterns, it's likely a system error
		// (e.g., "database connection failed during token validation")
		if (hasAuthError && hasSystemError) {
			return false // Treat as system error
		}

		// If it only has auth patterns, it's an auth error
		if (hasAuthError) {
			return true
		}

		// Default to system error for unknown cases (safer for authenticated users)
		return false
	}
}
