import type { ExecutionContext } from '@nestjs/common'
import { createParamDecorator } from '@nestjs/common'

export const CurrentUser = createParamDecorator(
	(_data: string | undefined, ctx: ExecutionContext) => {
		const request = ctx.switchToHttp().getRequest()
		return request.user
	}
)
