import type { ExecutionContext } from '@nestjs/common'
import { createParamDecorator, UnauthorizedException } from '@nestjs/common'

export const UserId = createParamDecorator(
	(_data: unknown, ctx: ExecutionContext) => {
		const request = ctx.switchToHttp().getRequest()
		if (!request.user) {
			throw new UnauthorizedException('User not authenticated')
		}
		return request.user.id
	}
)
