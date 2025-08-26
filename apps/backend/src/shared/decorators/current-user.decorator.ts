import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
<<<<<<< HEAD
import type { FastifyRequest } from 'fastify'
import type { AuthUser } from '@repo/shared'

interface AuthenticatedRequest extends FastifyRequest {
	user?: AuthUser
}

export const CurrentUser = createParamDecorator(
	(
		_data: string | undefined,
		ctx: ExecutionContext
	): AuthUser | undefined => {
		const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>()
=======

export const CurrentUser = createParamDecorator(
	(_data: string | undefined, ctx: ExecutionContext) => {
		const request = ctx.switchToHttp().getRequest()
>>>>>>> origin/main
		return request.user
	}
)
