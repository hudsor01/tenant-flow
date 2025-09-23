import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'

export const AuthToken = createParamDecorator(
	(_data: string | undefined, ctx: ExecutionContext): string | undefined => {
		const request = ctx.switchToHttp().getRequest<Request>()
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
