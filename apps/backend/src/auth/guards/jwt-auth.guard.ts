import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthService } from '../auth.service'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

@Injectable()
export class JwtAuthGuard implements CanActivate {
	constructor(
		private readonly authService: AuthService,
		private readonly reflector: Reflector
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		// Check if route is marked as public
		// Handle reflector unavailability gracefully
		let isPublic = false
		
		if (!this.reflector) {
			console.error('⚠️ Reflector service not available in JwtAuthGuard')
			// Fallback: Allow known public routes by URL pattern
			const request = context.switchToHttp().getRequest()
			const url = request.url || request.raw?.url || ''
			if (url === '/health' || url === '/' || url === '/ping') {
				console.warn(`🚨 Allowing ${url} via fallback routing - Reflector unavailable`)
				return true
			}
			// Don't throw error, continue to auth check for other routes
		} else {
			try {
				isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
					context.getHandler(),
					context.getClass(),
				])
			} catch (error) {
				console.error('⚠️ Error reading metadata from Reflector:', error)
				// Fallback to URL-based public route detection
				const request = context.switchToHttp().getRequest()
				const url = request.url || request.raw?.url || ''
				if (url === '/health' || url === '/' || url === '/ping') {
					console.warn(`🚨 Allowing ${url} via fallback due to Reflector error`)
					return true
				}
			}
		}

		if (isPublic) {
			return true
		}

		const request = context.switchToHttp().getRequest()
		const token = this.extractTokenFromHeader(request)

		if (!token) {
			throw new UnauthorizedException('No authentication token provided')
		}

		try {
			// Check if auth service is available
			if (!this.authService) {
				console.error('⚠️ AuthService not available in JwtAuthGuard')
				throw new UnauthorizedException('Authentication system unavailable')
			}
			
			const user = await this.authService.validateTokenAndGetUser(token)
			request['user'] = user
			return true
		} catch (error) {
			console.error('🚨 Auth validation failed:', error instanceof Error ? error.message : 'Unknown error')
			
			// Provide more specific error messages
			if (error instanceof UnauthorizedException) {
				throw error
			}
			
			throw new UnauthorizedException('Invalid or expired token')
		}
	}

	private extractTokenFromHeader(request: { headers: { authorization?: string } }): string | undefined {
		const [type, token] = request.headers.authorization?.split(' ') ?? []
		return type === 'Bearer' ? token : undefined
	}
}