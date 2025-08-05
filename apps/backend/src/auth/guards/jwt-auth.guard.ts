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
		// In case reflector is not available, log and allow public access temporarily
		if (!this.reflector) {
			console.error('⚠️ Reflector service not available in JwtAuthGuard - this should not happen')
			// For critical debugging: temporarily allow access to health checks
			const request = context.switchToHttp().getRequest()
			const url = request.url || request.raw?.url || ''
			if (url === '/health' || url === '/' || url === '/ping') {
				console.warn(`🚨 Allowing ${url} due to reflector unavailable - FIX REQUIRED`)
				return true
			}
			throw new UnauthorizedException('Authentication system unavailable')
		}
		
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		])

		if (isPublic) {
			return true
		}

		const request = context.switchToHttp().getRequest()
		const token = this.extractTokenFromHeader(request)

		if (!token) {
			throw new UnauthorizedException('No authentication token provided')
		}

		try {
			const user = await this.authService.validateTokenAndGetUser(token)
			request['user'] = user
			return true
		} catch {
			throw new UnauthorizedException('Invalid or expired token')
		}
	}

	private extractTokenFromHeader(request: { headers: { authorization?: string } }): string | undefined {
		const [type, token] = request.headers.authorization?.split(' ') ?? []
		return type === 'Bearer' ? token : undefined
	}
}