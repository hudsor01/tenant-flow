import type { CanActivate, ExecutionContext } from '@nestjs/common'
import {
	ForbiddenException,
	Injectable,
	ServiceUnavailableException,
	SetMetadata,
	UnauthorizedException
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import type { AuthenticatedRequest } from '../types/express-request.types'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'

export const SKIP_SUBSCRIPTION_CHECK_KEY = 'skipSubscriptionCheck'
export const SkipSubscriptionCheck = () =>
	SetMetadata(SKIP_SUBSCRIPTION_CHECK_KEY, true)

@Injectable()
export class SubscriptionGuard implements CanActivate {
	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly reflector: Reflector,
		private readonly logger: AppLogger
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
			context.getHandler(),
			context.getClass()
		])

		const skipSubscriptionCheck = this.reflector.getAllAndOverride<boolean>(
			SKIP_SUBSCRIPTION_CHECK_KEY,
			[context.getHandler(), context.getClass()]
		)

		if (isPublic || skipSubscriptionCheck) {
			return true
		}

		const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
		const user = request.user

		if (!user) {
			throw new UnauthorizedException('Authentication required')
		}

		// Tenant-facing routes are covered by invite-only access and do not require payment
		const userType = user.app_metadata?.user_type as string | undefined
		if (userType === 'TENANT') {
			return true
		}

		// Trust the RPC for subscription verification - no fallback to avoid N+1 queries
		const { data, error } = await this.supabaseService.rpc(
			'check_user_feature_access',
			{
				p_user_id: user.id,
				p_feature: 'basic_properties'
			},
			{ maxAttempts: 2 }
		)

		if (error) {
			this.logger.error('Subscription RPC failed', {
				user_id: user.id,
				error: error.message
			})
			throw new ServiceUnavailableException({
				code: 'SERVICE_UNAVAILABLE',
				message:
					'Unable to verify subscription status. Please try again later.'
			})
		}

		const hasAccess = this.normalizeBoolean(data)

		if (!hasAccess) {
			this.logger.warn('Access denied: Active subscription required', {
				user_id: user.id,
				endpoint: request.url
			})
			throw new ForbiddenException({
				code: 'SUBSCRIPTION_REQUIRED',
				message: 'An active subscription is required to use this feature.'
			})
		}

		return true
	}

	private normalizeBoolean(value: unknown): boolean {
		if (value === null || value === undefined) return false
		if (typeof value === 'boolean') return value
		if (typeof value === 'number') return value === 1
		if (typeof value === 'string' && value.length > 0) {
			const normalized = value.toLowerCase()
			return normalized === 'true' || normalized === 't' || normalized === '1'
		}
		return false
	}
}
