/**
 * JWT Auth Guard - Supabase Authentication
 *
 * Protects routes with Supabase JWT verification using jose library
 * Follows 2025 NestJS + Supabase best practices
 */

import {
	type ExecutionContext,
	Injectable,
	Logger,
	UnauthorizedException,
	InternalServerErrorException
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { type CanActivate } from '@nestjs/common'
import { User } from '@supabase/supabase-js'
import { JwtVerificationService } from './jwt-verification.service'
import { AuthUserValidationService } from './supabase.strategy'

@Injectable()
export class JwtAuthGuard implements CanActivate {
	private readonly logger = new Logger(JwtAuthGuard.name)

	constructor(
		private readonly reflector: Reflector,
		private readonly jwtVerificationService: JwtVerificationService,
		private readonly authUserValidationService: AuthUserValidationService
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		// Check if route is marked as public
		const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
			context.getHandler(),
			context.getClass()
		])

		if (isPublic) {
			return true
		}

		const request = context.switchToHttp().getRequest<Request & { user?: User }>()
		const authHeader = (request.headers as { authorization?: string }).authorization

		try {
			// Extract token from Authorization header
			if (!authHeader || !authHeader.startsWith('Bearer ')) {
				throw new UnauthorizedException('Missing authentication token. Please log in again.')
			}

			const token = authHeader.substring(7) // Remove 'Bearer ' prefix

			// Verify JWT using jose
			const payload = await this.jwtVerificationService.verifyToken(token)

			// Validate payload and create user object
			const user = await this.authUserValidationService.validateJwtPayload(payload)

			// Attach user to request for downstream use
			request.user = user

			this.logger.debug('Authentication successful', {
				user_id: user.id,
				path: (request as { url?: string }).url,
				method: (request as { method?: string }).method
			})

			return true
		} catch (error) {
			// Determine if this is an authentication error vs system error
			const isAuthError = this.isAuthenticationError(error as Error | null)

			if (isAuthError) {
				// Log authentication failures (normal security events)
				this.logger.warn('Authentication failed for protected route', {
					error: error instanceof Error ? error.message : 'Unknown error',
					errorName: error instanceof Error ? error.name : undefined,
					path: (request as { url?: string }).url,
					method: (request as { method?: string }).method,
					hasAuthHeader: !!authHeader
				})

				// Re-throw UnauthorizedException or create new one
				if (error instanceof UnauthorizedException) {
					throw error
				}

				// Provide specific error message based on auth failure type
				let errorMessage = 'Authentication required'

				if (!authHeader) {
					errorMessage = 'Missing authentication token. Please log in again.'
				} else if (error instanceof Error) {
					if (error.message?.includes('expired')) {
						errorMessage = 'Your session has expired. Please log in again.'
					} else if (error.message?.includes('invalid') || error.message?.includes('malformed')) {
						errorMessage = 'Invalid authentication token. Please log in again.'
					}
				}

				throw new UnauthorizedException(errorMessage)
			} else {
				// Log system errors that could cause false 401s
				this.logger.error('System error during authentication - preventing false 401', {
					error: error instanceof Error ? error.message : 'Unknown error',
					errorName: error instanceof Error ? error.name : undefined,
					errorStack: error instanceof Error ? error.stack : undefined,
					path: (request as { url?: string }).url,
					method: (request as { method?: string }).method,
					hasAuthHeader: !!authHeader
				})

				// Return 500 for system errors to avoid false 401s for authenticated users
				// Provide more context about what failed
				let errorMessage = 'Authentication service temporarily unavailable'

				if (error instanceof Error) {
					if (error.message?.includes('database') || error.message?.includes('postgres')) {
						errorMessage = 'Database connection error. Please try again in a moment.'
					} else if (error.message?.includes('timeout')) {
						errorMessage = 'Authentication service is slow. Please try again.'
					}
				}

				throw new InternalServerErrorException(errorMessage)
			}
		}
	}

	/**
	 * Determine if an error is an authentication error (invalid token, expired, etc.)
	 * vs a system/configuration error (database issues, network problems, misconfiguration, etc.)
	 *
	 * Returns true for 401-worthy errors (user's fault - invalid/missing token)
	 * Returns false for 500-worthy errors (server's fault - misconfiguration/database/system)
	 */
	private isAuthenticationError(err: Error | null): boolean {
		if (!err) return false

		const errorMessage = err.message?.toLowerCase() || ''
		const errorName = err.name?.toLowerCase() || ''

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
				errorName.includes(pattern)
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
			errorName.includes(pattern)
		)

		return hasAuthError
	}
}
