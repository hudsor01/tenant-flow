import {
	Injectable,
	CanActivate,
	ExecutionContext,
	UnauthorizedException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'
import { timingSafeEqual } from 'crypto'

@Injectable()
export class BearerTokenGuard implements CanActivate {
	constructor(private readonly config: ConfigService) {}

	canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest<Request>()
		const authHeader = request.headers.authorization

		if (!authHeader) {
			throw new UnauthorizedException('Missing Authorization header')
		}

		const [type, token] = authHeader.split(' ')

		if (type !== 'Bearer') {
			throw new UnauthorizedException('Invalid authorization type')
		}

		const expectedToken = this.config.get<string>('PROMETHEUS_BEARER_TOKEN')

		if (!expectedToken) {
			throw new UnauthorizedException('Bearer token not configured')
		}

		// Use constant-time comparison to prevent timing attacks
		try {
			const tokenBuffer = Buffer.from(token || '', 'utf8')
			const expectedBuffer = Buffer.from(expectedToken, 'utf8')

			// Check lengths first (constant-time comparison requires same length)
			if (tokenBuffer.length !== expectedBuffer.length) {
				throw new UnauthorizedException('Invalid bearer token')
			}

			// Constant-time comparison
			if (!timingSafeEqual(tokenBuffer, expectedBuffer)) {
				throw new UnauthorizedException('Invalid bearer token')
			}
		} catch (error) {
			if (error instanceof UnauthorizedException) {
				throw error
			}
			throw new UnauthorizedException('Invalid bearer token')
		}

		return true
	}
}
