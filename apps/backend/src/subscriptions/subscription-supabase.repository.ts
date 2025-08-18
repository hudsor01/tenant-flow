import { Injectable } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase-generated'
import { BaseSupabaseRepository } from '../common/repositories/base-supabase.repository'
import { SupabaseService } from '../common/supabase/supabase.service'
import { MultiTenantSupabaseService } from '../common/supabase/multi-tenant-supabase.service'

type SubscriptionRow = Database['public']['Tables']['Subscription']['Row']
type SubscriptionInsert = Database['public']['Tables']['Subscription']['Insert']
type SubscriptionUpdate = Database['public']['Tables']['Subscription']['Update']

export interface SubscriptionWithUser extends SubscriptionRow {
	User?: Database['public']['Tables']['User']['Row']
}

export interface SubscriptionQueryOptions {
	status?: string
	planType?: string
	stripeCustomerId?: string
	stripeSubscriptionId?: string
	userId?: string
	search?: string
	limit?: number
	offset?: number
	page?: number
}

/**
 * Supabase repository for Subscription entity
 * Handles subscription data operations for Stripe integration
 */
@Injectable()
export class SubscriptionSupabaseRepository extends BaseSupabaseRepository<SubscriptionRow> {
	protected readonly tableName = 'Subscription'

	constructor(
		supabaseService: SupabaseService,
		multiTenantService: MultiTenantSupabaseService
	) {
		super(supabaseService, multiTenantService)
	}

	/**
	 * Find subscription by Stripe subscription ID
	 */
	async findByStripeSubscriptionId(
		stripeSubscriptionId: string,
		userId?: string,
		userToken?: string
	): Promise<SubscriptionRow | null> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data, error } = await client
				.from(this.tableName)
				.select('*')
				.eq('stripeSubscriptionId', stripeSubscriptionId)
				.single()

			if (error) {
				if (error.code === 'PGRST116') {
					// No rows returned
					return null
				}
				throw error
			}

			return data
		} catch (error) {
			this.logger.error(
				`Failed to find subscription by Stripe ID ${stripeSubscriptionId}:`,
				error
			)
			throw error
		}
	}

	/**
	 * Find subscription by Stripe customer ID
	 */
	async findByStripeCustomerId(
		stripeCustomerId: string,
		userId?: string,
		userToken?: string
	): Promise<SubscriptionRow | null> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data, error } = await client
				.from(this.tableName)
				.select('*')
				.eq('stripeCustomerId', stripeCustomerId)
				.single()

			if (error) {
				if (error.code === 'PGRST116') {
					// No rows returned
					return null
				}
				throw error
			}

			return data
		} catch (error) {
			this.logger.error(
				`Failed to find subscription by Stripe customer ID ${stripeCustomerId}:`,
				error
			)
			throw error
		}
	}

	/**
	 * Find subscription by user ID
	 */
	async findByUserId(
		userId: string,
		userToken?: string
	): Promise<SubscriptionRow | null> {
		try {
			const client = await this.getClient(userId, userToken)

			// Join with User table to get user's subscription
			const { data, error } = await client
				.from(this.tableName)
				.select(
					`
					*,
					User!inner(*)
				`
				)
				.eq('User.id', userId)
				.single()

			if (error) {
				if (error.code === 'PGRST116') {
					// No rows returned
					return null
				}
				throw error
			}

			return data
		} catch (error) {
			this.logger.error(
				`Failed to find subscription by user ID ${userId}:`,
				error
			)
			throw error
		}
	}

	/**
	 * Upsert subscription (create or update)
	 */
	override async upsert(
		subscriptionData: SubscriptionInsert,
		userId?: string,
		userToken?: string
	): Promise<SubscriptionRow> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data, error } = await client
				.from(this.tableName)
				.upsert(subscriptionData, {
					onConflict: 'stripeSubscriptionId'
				})
				.select()
				.single()

			if (error) {
				throw error
			}

			return data
		} catch (error) {
			this.logger.error('Failed to upsert subscription:', error)
			throw error
		}
	}

	/**
	 * Update subscription status by Stripe subscription ID
	 */
	async updateStatusByStripeId(
		stripeSubscriptionId: string,
		status: Database['public']['Enums']['SubStatus'],
		userId?: string,
		userToken?: string
	): Promise<SubscriptionRow | null> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data, error } = await client
				.from(this.tableName)
				.update({
					status,
					updatedAt: new Date().toISOString()
				})
				.eq('stripeSubscriptionId', stripeSubscriptionId)
				.select()
				.single()

			if (error) {
				if (error.code === 'PGRST116') {
					// No rows updated
					return null
				}
				throw error
			}

			return data
		} catch (error) {
			this.logger.error(
				`Failed to update subscription status for ${stripeSubscriptionId}:`,
				error
			)
			throw error
		}
	}

	/**
	 * Cancel subscription
	 */
	async cancelSubscription(
		stripeSubscriptionId: string,
		cancelAtPeriodEnd = false,
		userId?: string,
		userToken?: string
	): Promise<SubscriptionRow | null> {
		try {
			const client = await this.getClient(userId, userToken)

			const updateData: SubscriptionUpdate = {
				status: 'CANCELED',
				cancelAtPeriodEnd,
				canceledAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}

			const { data, error } = await client
				.from(this.tableName)
				.update(updateData)
				.eq('stripeSubscriptionId', stripeSubscriptionId)
				.select()
				.single()

			if (error) {
				if (error.code === 'PGRST116') {
					// No rows updated
					return null
				}
				throw error
			}

			return data
		} catch (error) {
			this.logger.error(
				`Failed to cancel subscription ${stripeSubscriptionId}:`,
				error
			)
			throw error
		}
	}

	/**
	 * Find all subscriptions for multiple users
	 */
	async findByUserIds(
		userIds: string[],
		userId?: string,
		userToken?: string
	): Promise<SubscriptionWithUser[]> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data, error } = await client
				.from(this.tableName)
				.select(
					`
					*,
					User!inner(*)
				`
				)
				.in('User.id', userIds)

			if (error) {
				throw error
			}

			return data || []
		} catch (error) {
			this.logger.error(
				`Failed to find subscriptions for user IDs:`,
				error
			)
			throw error
		}
	}
}
