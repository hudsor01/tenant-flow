import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import type { AuthUser } from '@repo/shared'

interface AuthenticatedRequest extends Request {
	user?: AuthUser
}

export const CurrentUser = createParamDecorator(
	(
		_data: string | undefined,
		ctx: ExecutionContext
	): AuthUser | undefined => {
		const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>()
		return request.user
	}
)
