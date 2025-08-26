import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'

export const AuthToken = createParamDecorator(
	(_data: string | undefined, ctx: ExecutionContext): string | undefined => {
		const request = ctx.switchToHttp().getRequest<FastifyRequest>()
		const authHeader = request.headers.authorization

		if (
			!authHeader ||
			typeof authHeader !== 'string' ||
			!authHeader.startsWith('Bearer ')
		) {
			return undefined
		}

		return authHeader.substring(7).trim()
	}
)
