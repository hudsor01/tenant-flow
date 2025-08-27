import { Injectable } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'
import { SupabaseService } from '../database/supabase.service'
import type { Subscription } from '@repo/shared'

/**
 * Temporary minimal implementation of SubscriptionSupabaseRepository
 * This is a simplified version to resolve compilation errors
 * The full implementation needs to be restored after reorganization
 */
@Injectable()
export class SubscriptionSupabaseRepository {
	constructor(
		private readonly _supabaseService: SupabaseService,
		private readonly logger: PinoLogger
	) {
		// PinoLogger context handled automatically via app-level configuration
		// Service will be used when implementing actual database operations
		void this._supabaseService // Prevent unused variable warning
	}

	async findByIdWithSubscription(
		_userId: string
	): Promise<Subscription | null> {
		this.logger.warn(
			{
				repository: {
					method: 'findByIdWithSubscription',
					status: 'temporary_implementation'
				}
			},
			'SubscriptionSupabaseRepository: findByIdWithSubscription - temporary implementation'
		)
		return null
	}

	async findByStripeCustomerId(
		_customerId: string
	): Promise<Subscription | null> {
		this.logger.warn(
			'SubscriptionSupabaseRepository: findByStripeCustomerId - temporary implementation'
		)
		return null
	}

	async findByStripeSubscriptionId(
		_subscriptionId: string
	): Promise<Subscription | null> {
		this.logger.warn(
			'SubscriptionSupabaseRepository: findByStripeSubscriptionId - temporary implementation'
		)
		return null
	}

	async updateStatusByStripeId(
		_subscriptionId: string,
		_status: string,
		_userId?: string
	): Promise<Subscription | null> {
		this.logger.warn(
			'SubscriptionSupabaseRepository: updateStatusByStripeId - temporary implementation'
		)
		return null
	}

	async upsert(
		_data: Record<string, unknown>,
		_userId: string
	): Promise<Subscription | null> {
		this.logger.warn(
			'SubscriptionSupabaseRepository: upsert - temporary implementation'
		)
		return null
	}

	async cancelSubscription(
		_subscriptionId: string,
		_cancelAtPeriodEnd: boolean,
		_userId?: string
	): Promise<Subscription | null> {
		this.logger.warn(
			'SubscriptionSupabaseRepository: cancelSubscription - temporary implementation'
		)
		return null
	}
}
