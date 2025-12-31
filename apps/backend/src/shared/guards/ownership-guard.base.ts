/**
 * Base class for ownership guards
 *
 * Provides shared caching and assertion logic for resource ownership verification.
 * Focused guards (PropertyOwnershipGuard, LeaseOwnershipGuard, TenantOwnershipGuard)
 * extend this base to verify specific resource types.
 */
import { ForbiddenException } from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import { AuthRequestCache } from '../services/auth-request-cache.service'
import { AppLogger } from '../../logger/app-logger.service'
import type { AuthenticatedRequest } from '../types/express-request.types'

export abstract class OwnershipGuardBase {
	constructor(
		protected readonly supabase: SupabaseService,
		protected readonly authCache: AuthRequestCache,
		protected readonly logger: AppLogger,
		protected readonly guardName: string
	) {}

	/**
	 * Get user ID from request, throwing if not present
	 */
	protected getUserId(request: AuthenticatedRequest): string {
		const user_id = request.user?.id

		if (!user_id) {
			this.logger.warn(`${this.guardName}: No user ID in request`)
			throw new ForbiddenException('Authentication required')
		}

		return user_id
	}

	/**
	 * Cache ownership check results for the duration of the request
	 */
	protected async cachedOwnership(
		key: string,
		factory: () => Promise<boolean>
	): Promise<boolean> {
		return this.authCache.getOrSet(key, factory)
	}

	/**
	 * Assert ownership, throwing ForbiddenException if not owned
	 */
	protected async assertOwnership(
		cacheKey: string,
		check: () => Promise<boolean>,
		message: string,
		context: Record<string, unknown>
	): Promise<void> {
		const ownsResource = await this.cachedOwnership(cacheKey, check)
		if (!ownsResource) {
			this.logger.warn(`${this.guardName}: access denied`, {
				...context,
				reason: 'ownership_verification_failed',
				message
			})
			throw new ForbiddenException(message)
		}
		this.logger.debug(`${this.guardName}: ownership verified`, context)
	}
}
