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

export const User = createParamDecorator(
	(_data: unknown, ctx: ExecutionContext) => {
		const request = ctx.switchToHttp().getRequest()
		if (!request.user) {
			throw new UnauthorizedException('User not authenticated')
		}
		return request.user
	}
)

/**
 * Extract connected account ID from authenticated user
 * Requires StripeConnectedGuard to be applied first
 */
export const ConnectedAccountId = createParamDecorator(
	(_data: unknown, ctx: ExecutionContext) => {
		const request = ctx.switchToHttp().getRequest()
		if (!request.user) {
			throw new UnauthorizedException('User not authenticated')
		}
		// User data comes from database via StripeConnectedGuard
		return request.connectedAccountId
	}
)
