import { Injectable } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase-generated'
import { BaseSupabaseRepository } from '../common/repositories/base-supabase.repository'
import { SupabaseService } from '../common/supabase/supabase.service'
import { MultiTenantSupabaseService } from '../common/supabase/multi-tenant-supabase.service'

type UserRow = Database['public']['Tables']['User']['Row']

export interface UserWithSubscription extends UserRow {
	Subscription?: Database['public']['Tables']['Subscription']['Row'][]
}

/**
 * Supabase repository for User entity
 * Handles user data operations for authentication and billing
 */
@Injectable()
export class UserSupabaseRepository extends BaseSupabaseRepository<UserRow> {
	protected readonly tableName = 'User'

	constructor(
		supabaseService: SupabaseService,
		multiTenantService: MultiTenantSupabaseService
	) {
		super(supabaseService, multiTenantService)
	}

	/**
	 * Find user by ID with subscription information
	 */
	async findByIdWithSubscription(
		userId: string,
		userToken?: string
	): Promise<UserWithSubscription | null> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data, error } = await client
				.from(this.tableName)
				.select(
					`
					*,
					Subscription(*)
				`
				)
				.eq('id', userId)
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
				`Failed to find user with subscription ${userId}:`,
				error
			)
			throw error
		}
	}

	/**
	 * Find user by Stripe customer ID
	 */
	async findByStripeCustomerId(
		stripeCustomerId: string,
		userId?: string,
		userToken?: string
	): Promise<UserRow | null> {
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
				`Failed to find user by Stripe customer ID ${stripeCustomerId}:`,
				error
			)
			throw error
		}
	}

	/**
	 * Update user's Stripe customer ID
	 */
	async updateStripeCustomerId(
		userId: string,
		stripeCustomerId: string,
		userToken?: string
	): Promise<UserRow> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data, error } = await client
				.from(this.tableName)
				.update({
					stripeCustomerId,
					updatedAt: new Date().toISOString()
				})
				.eq('id', userId)
				.select()
				.single()

			if (error) {
				throw error
			}

			return data
		} catch (error) {
			this.logger.error(
				`Failed to update Stripe customer ID for user ${userId}:`,
				error
			)
			throw error
		}
	}

	/**
	 * Find user by email
	 */
	async findByEmail(
		email: string,
		userId?: string,
		userToken?: string
	): Promise<UserRow | null> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data, error } = await client
				.from(this.tableName)
				.select('*')
				.eq('email', email)
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
			this.logger.error(`Failed to find user by email ${email}:`, error)
			throw error
		}
	}

	/**
	 * Find users with active subscriptions
	 */
	async findUsersWithSubscriptions(
		userId?: string,
		userToken?: string
	): Promise<UserWithSubscription[]> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data, error } = await client
				.from(this.tableName)
				.select(
					`
					*,
					Subscription!inner(*)
				`
				)
				.neq('Subscription.status', 'CANCELED')

			if (error) {
				throw error
			}

			return data || []
		} catch (error) {
			this.logger.error('Failed to find users with subscriptions:', error)
			throw error
		}
	}
}
