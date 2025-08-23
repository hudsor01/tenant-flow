import {
	CanActivate,
	ExecutionContext,
	Injectable,
	Logger,
	UnauthorizedException
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import type { FastifyRequest } from 'fastify'
import { AuthService } from '../../auth/auth.service'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

/**
 * Unified Auth Guard - Combines JWT validation with additional auth checks
 * Extends the basic JWT guard with enhanced validation and logging
 */
@Injectable()
export class UnifiedAuthGuard implements CanActivate {
	private readonly logger = new Logger(UnifiedAuthGuard.name)

	constructor(
		private readonly authService: AuthService,
		private readonly reflector: Reflector
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<FastifyRequest>()

		// Check if route is marked as public
		const isPublic = this.reflector.getAllAndOverride<boolean>(
			IS_PUBLIC_KEY,
			[context.getHandler(), context.getClass()]
		)

		if (isPublic) {
			return true
		}

		const token = this.extractTokenFromHeader(request)

		if (!token) {
			this.logger.warn('Authentication token missing', {
				method: request.method,
				url: request.url?.substring(0, 100)
			})
			throw new UnauthorizedException('Authentication token is required')
		}

		try {
			const user = await this.authService.validateTokenAndGetUser(token)
			// Attach user to request for downstream handlers
			;(request as FastifyRequest & { user?: unknown }).user = user
			return true
		} catch (error) {
			this.logger.warn('Token validation failed', {
				error: error instanceof Error ? error.message : 'Unknown error',
				method: request.method,
				url: request.url?.substring(0, 100)
			})
			throw new UnauthorizedException('Invalid authentication token')
		}
	}

	private extractTokenFromHeader(
		request: Pick<FastifyRequest, 'headers'>
	): string | undefined {
		const authHeader = request.headers.authorization

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return undefined
		}

		const token = authHeader.substring(7).trim()
		return token || undefined
	}
}
