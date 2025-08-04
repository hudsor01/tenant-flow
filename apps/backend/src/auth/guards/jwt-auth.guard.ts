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
		// Add safety check for reflector
		if (!this.reflector) {
			console.warn('Reflector not available in JwtAuthGuard, allowing request')
			return true
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