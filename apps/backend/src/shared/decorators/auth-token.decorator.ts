import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
<<<<<<< HEAD
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
=======

export const AuthToken = createParamDecorator(
	(_data: string | undefined, ctx: ExecutionContext): string | undefined => {
		const request = ctx.switchToHttp().getRequest()
		const authHeader = request.headers.authorization

		if (!authHeader?.startsWith('Bearer ')) {
>>>>>>> origin/main
			return undefined
		}

		return authHeader.substring(7).trim()
	}
<<<<<<< HEAD
)
=======
)
>>>>>>> origin/main
