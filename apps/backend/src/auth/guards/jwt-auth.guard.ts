import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthService } from '../auth.service'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

@Injectable()
export class JwtAuthGuard implements CanActivate {
	private readonly logger = new Logger(JwtAuthGuard.name)
	
	// Token format validation patterns
	private readonly JWT_PATTERN = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*$/
	private readonly MIN_TOKEN_LENGTH = 50 // Minimum reasonable JWT length
	private readonly MAX_TOKEN_LENGTH = 2048 // Maximum reasonable JWT length

	constructor(
		private readonly authService: AuthService,
		private readonly reflector: Reflector
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest()
		const method = request.method
		const url = request.url
		
		// Check if route is marked as public
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		])

		if (isPublic) {
			return true
		}

		const token = this.extractTokenFromHeader(request)

		if (!token) {
			this.logger.warn('Authentication token missing', {
				method,
				url: url?.substring(0, 100), // Limit URL length in logs
				userAgent: request.headers['user-agent']?.substring(0, 100),
				origin: request.headers.origin
			})
			throw new UnauthorizedException({
				error: {
					code: 'AUTH_TOKEN_MISSING',
					message: 'Authentication token is required',
					statusCode: 401,
					details: {
						hint: 'Include Authorization: Bearer <token> header'
					}
				}
			})
		}

		// Validate token format before sending to auth service
		if (!this.isValidTokenFormat(token)) {
			this.logger.warn('Invalid token format detected', {
				method,
				url: url?.substring(0, 100),
				tokenLength: token.length,
				tokenPrefix: token.substring(0, 20), // Safe prefix for debugging
				ip: this.getClientIP(request)
			})
			throw new UnauthorizedException({
				error: {
					code: 'AUTH_TOKEN_INVALID_FORMAT',
					message: 'Invalid authentication token format',
					statusCode: 401
				}
			})
		}

		try {
			// Check if auth service is available
			if (!this.authService) {
				this.logger.error('AuthService not available in JwtAuthGuard')
				throw new UnauthorizedException({
					error: {
						code: 'AUTH_SYSTEM_UNAVAILABLE',
						message: 'Authentication system temporarily unavailable',
						statusCode: 401
					}
				})
			}
			
			// Validate token with auth service
			const user = await this.authService.validateTokenAndGetUser(token)
			
			// Attach user to request for downstream handlers
			request['user'] = user
			
			this.logger.debug('Token validation successful', {
				userId: user.id,
				userEmail: user.email,
				method,
				url: url?.substring(0, 100)
			})
			
			return true
		} catch (error) {
			// Security: Don't log the actual token in production
			this.logger.warn('Token validation failed', {
				error: error instanceof Error ? error.message : 'Unknown error',
				errorType: error instanceof Error ? error.constructor.name : typeof error,
				method,
				url: url?.substring(0, 100),
				ip: this.getClientIP(request)
			})
			
			// Re-throw authorization errors without modification
			if (error instanceof UnauthorizedException) {
				throw error
			}
			
			// Wrap other errors in UnauthorizedException
			throw new UnauthorizedException({
				error: {
					code: 'AUTH_TOKEN_VALIDATION_FAILED',
					message: 'Authentication token validation failed',
					statusCode: 401
				}
			})
		}
	}

	private extractTokenFromHeader(request: { headers: { authorization?: string } }): string | undefined {
		const authHeader = request.headers.authorization
		
		if (!authHeader) {
			return undefined
		}
		
		// Validate Authorization header format
		if (!authHeader.startsWith('Bearer ')) {
			return undefined
		}
		
		const token = authHeader.substring(7) // Remove 'Bearer ' prefix
		
		// Basic sanity check - token should not be empty
		if (!token || token.trim() === '') {
			return undefined
		}
		
		return token.trim()
	}
	
	/**
	 * Validate JWT token format before attempting to verify it
	 * This prevents unnecessary processing of obviously invalid tokens
	 */
	private isValidTokenFormat(token: string): boolean {
		if (typeof token !== 'string') {
			return false
		}
		
		// Length validation
		if (token.length < this.MIN_TOKEN_LENGTH || token.length > this.MAX_TOKEN_LENGTH) {
			return false
		}
		
		// Basic JWT structure validation (header.payload.signature)
		if (!this.JWT_PATTERN.test(token)) {
			return false
		}
		
		// Count JWT parts
		const parts = token.split('.')
		if (parts.length !== 3) {
			return false
		}
		
		// Each part should have reasonable length
		if (parts.some(part => part.length < 4 || part.length > 1024)) {
			return false
		}
		
		// Reject obviously fake tokens
		const fakeTokenPatterns = [
			/^test[-._]?token/i,
			/^fake[-._]?token/i,
			/^dummy[-._]?token/i,
			/^invalid[-._]?token/i,
			/^placeholder/i,
			/^example/i
		]
		
		if (fakeTokenPatterns.some(pattern => pattern.test(token))) {
			return false
		}
		
		return true
	}
	
	/**
	 * Get client IP address for security logging
	 */
	private getClientIP(request: { headers: Record<string, string | string[]>, ip?: string }): string {
		// Check various headers for real IP (in order of trust)
		const forwardedFor = request.headers['x-forwarded-for']
		const realIP = request.headers['x-real-ip']
		const cfConnectingIP = request.headers['cf-connecting-ip'] // Cloudflare
		
		if (forwardedFor) {
			const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0]
			return ip?.trim() || 'unknown'
		}
		
		if (cfConnectingIP) {
			return Array.isArray(cfConnectingIP) ? cfConnectingIP[0] || 'unknown' : cfConnectingIP
		}
		
		if (realIP) {
			return Array.isArray(realIP) ? realIP[0] || 'unknown' : realIP
		}
		
		return request.ip || 'unknown'
	}
}