import { Injectable, Logger } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'
import type { Stripe } from 'stripe'

interface StripeSubscriptionWithPeriod extends Stripe.Subscription {
	current_period_start: number
	current_period_end: number
}

interface SubscriptionData {
	id: string
	userId: string
	stripeSubscriptionId: string
	stripeCustomerId: string
	status: string
	planId: string
	currentPeriodStart: Date
	currentPeriodEnd: Date
	createdAt: Date
	updatedAt: Date
}

@Injectable()
export class SubscriptionSupabaseRepository {
	private readonly logger = new Logger(SubscriptionSupabaseRepository.name)

	constructor(private readonly supabaseService: SupabaseService) {}

	async findByIdWithSubscription(userId: string): Promise<SubscriptionData | null> {
		try {
			const { data, error } = await this.supabaseService.getAdminClient()
				.from('Subscription')
				.select('*')
				.eq('userId', userId)
				.single()

			if (error) {
				if (error.code === 'PGRST116') {
					return null
				}
				throw error
			}

			return this.mapToSubscriptionData(data)
		} catch (error) {
			this.logger.error('Error finding subscription by user ID', { userId, error })
			return null
		}
	}

	async findByStripeCustomerId(customerId: string): Promise<SubscriptionData | null> {
		try {
			const { data, error } = await this.supabaseService.getAdminClient()
				.from('Subscription')
				.select('*')
				.eq('stripeCustomerId', customerId)
				.single()

			if (error) {
				if (error.code === 'PGRST116') {
					return null
				}
				throw error
			}

			return this.mapToSubscriptionData(data)
		} catch (error) {
			this.logger.error('Error finding subscription by customer ID', { customerId, error })
			return null
		}
	}

	async findByStripeSubscriptionId(subscriptionId: string): Promise<SubscriptionData | null> {
		try {
			const { data, error } = await this.supabaseService.getAdminClient()
				.from('Subscription')
				.select('*')
				.eq('stripeSubscriptionId', subscriptionId)
				.single()

			if (error) {
				if (error.code === 'PGRST116') {
					return null
				}
				throw error
			}

			return this.mapToSubscriptionData(data)
		} catch (error) {
			this.logger.error('Error finding subscription by subscription ID', { subscriptionId, error })
			return null
		}
	}

	async updateStatusByStripeId(
		subscriptionId: string,
		status: string,
		userId?: string
	): Promise<SubscriptionData | null> {
		try {
			const updateData: Record<string, unknown> = {
				status,
				updatedAt: new Date().toISOString()
			}

			if (userId) {
				updateData.userId = userId
			}

			const { data, error } = await this.supabaseService.getAdminClient()
				.from('Subscription')
				.update(updateData)
				.eq('stripeSubscriptionId', subscriptionId)
				.select()
				.single()

			if (error) {
				throw error
			}

			return this.mapToSubscriptionData(data)
		} catch (error) {
			this.logger.error('Error updating subscription status', { subscriptionId, status, error })
			return null
		}
	}

	async upsert(stripeSubscription: StripeSubscriptionWithPeriod, userId: string): Promise<SubscriptionData | null> {
		try {
			const subscriptionData = {
				userId: userId,
				stripeSubscriptionId: stripeSubscription.id,
				stripeCustomerId: typeof stripeSubscription.customer === 'string' 
					? stripeSubscription.customer 
					: stripeSubscription.customer.id,
				status: stripeSubscription.status as any,
				planId: stripeSubscription.items.data[0]?.price.id || '',
				currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
				currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
				updatedAt: new Date().toISOString()
			}

			const { data, error } = await this.supabaseService.getAdminClient()
				.from('Subscription')
				.upsert(subscriptionData, { onConflict: 'stripeSubscriptionId' })
				.select()
				.single()

			if (error) {
				throw error
			}

			return this.mapToSubscriptionData(data)
		} catch (error) {
			this.logger.error('Error upserting subscription', { subscriptionId: stripeSubscription.id, error })
			return null
		}
	}

	async cancelSubscription(
		subscriptionId: string,
		cancelAtPeriodEnd: boolean,
		userId?: string
	): Promise<SubscriptionData | null> {
		try {
			const updateData: Record<string, unknown> = {
				status: cancelAtPeriodEnd ? 'active' : 'canceled',
				cancelAtPeriodEnd: cancelAtPeriodEnd,
				updatedAt: new Date().toISOString()
			}

			if (userId) {
				updateData.userId = userId
			}

			const { data, error } = await this.supabaseService.getAdminClient()
				.from('Subscription')
				.update(updateData)
				.eq('stripeSubscriptionId', subscriptionId)
				.select()
				.single()

			if (error) {
				throw error
			}

			return this.mapToSubscriptionData(data)
		} catch (error) {
			this.logger.error('Error canceling subscription', { subscriptionId, error })
			return null
		}
	}

	private mapToSubscriptionData(data: any): SubscriptionData {
		return {
			id: data.id,
			userId: data.userId,
			stripeSubscriptionId: data.stripeSubscriptionId,
			stripeCustomerId: data.stripeCustomerId,
			status: data.status,
			planId: data.planId,
			currentPeriodStart: new Date(data.currentPeriodStart),
			currentPeriodEnd: new Date(data.currentPeriodEnd),
			createdAt: new Date(data.createdAt),
			updatedAt: new Date(data.updatedAt)
		}
	}
}
