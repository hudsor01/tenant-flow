import { createParamDecorator, type ExecutionContext } from '@nestjs/common'

export const AuthToken = createParamDecorator(
	(_data: string | undefined, ctx: ExecutionContext): string | undefined => {
		const request = ctx.switchToHttp().getRequest()
		const authHeader = request.headers.authorization

		if (!authHeader?.startsWith('Bearer ')) {
			return undefined
		}

		return authHeader.substring(7).trim()
	}
)
