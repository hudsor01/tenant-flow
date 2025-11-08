import {
	Injectable,
	CanActivate,
	ExecutionContext,
	UnauthorizedException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'

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

		if (token !== expectedToken) {
			throw new UnauthorizedException('Invalid bearer token')
		}

		return true
	}
}
