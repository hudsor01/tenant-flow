import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { AuthUser } from '@repo/shared'
import type { Request } from 'express'

interface AuthenticatedRequest extends Request {
	user?: AuthUser
}

export const CurrentUser = createParamDecorator(
	(_data: string | undefined, ctx: ExecutionContext): AuthUser | undefined => {
		const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>()
		return request.user
	}
)
