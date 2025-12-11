/**
 * Rent Payment Query Service
 * Handles payment history queries
 * Extracted from RentPaymentsService for SRP compliance
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import type { Lease, RentPayment } from './types'
import { AppLogger } from '../../logger/app-logger.service'

@Injectable()
export class RentPaymentQueryService {

	constructor(private readonly supabase: SupabaseService, private readonly logger: AppLogger) {}

	/**
	 * Get payment history for authenticated user
	 */
	async getPaymentHistory(token: string): Promise<RentPayment[]> {
		if (!token) {
			throw new BadRequestException('Authentication token is required')
		}

		const client = this.supabase.getUserClient(token)
		const { data, error } = await client
			.from('rent_payments')
			.select('*')
			.order('created_at', { ascending: false })

		if (error) {
			this.logger.error('Failed to load payment history', {
				error: error.message
			})
			throw new BadRequestException('Failed to load payment history')
		}

		return (data as RentPayment[]) ?? []
	}

	/**
	 * Get payment history for a specific subscription
	 */
	async getSubscriptionPaymentHistory(
		subscriptionId: string,
		token: string
	): Promise<RentPayment[]> {
		const lease = await this.findLeaseBySubscription(subscriptionId, token)
		const client = this.supabase.getUserClient(token)

		const { data, error } = await client
			.from('rent_payments')
			.select('*')
			.eq('lease_id', lease.id)
			.order('created_at', { ascending: false })

		if (error) {
			this.logger.error('Failed to load subscription payment history', {
				subscriptionId,
				error: error.message
			})
			throw new BadRequestException(
				'Failed to load subscription payment history'
			)
		}

		return (data as RentPayment[]) ?? []
	}

	/**
	 * Get failed payment attempts for authenticated user
	 */
	async getFailedPaymentAttempts(token: string): Promise<RentPayment[]> {
		if (!token) {
			throw new BadRequestException('Authentication token is required')
		}

		const client = this.supabase.getUserClient(token)
		const { data, error } = await client
			.from('rent_payments')
			.select('*')
			.eq('status', 'failed')
			.order('created_at', { ascending: false })

		if (error) {
			this.logger.error('Failed to fetch failed payment attempts', {
				error: error.message
			})
			throw new BadRequestException('Failed to load failed payment attempts')
		}

		return (data as RentPayment[]) ?? []
	}

	/**
	 * Get failed payment attempts for a specific subscription
	 */
	async getSubscriptionFailedAttempts(
		subscriptionId: string,
		token: string
	): Promise<RentPayment[]> {
		const lease = await this.findLeaseBySubscription(subscriptionId, token)
		const client = this.supabase.getUserClient(token)

		const { data, error } = await client
			.from('rent_payments')
			.select('*')
			.eq('lease_id', lease.id)
			.eq('status', 'failed')
			.order('created_at', { ascending: false })

		if (error) {
			this.logger.error('Failed to load subscription failed attempts', {
				subscriptionId,
				error: error.message
			})
			throw new BadRequestException(
				'Failed to load subscription failed attempts'
			)
		}

		return (data as RentPayment[]) ?? []
	}

	/**
	 * Find lease by subscription ID
	 */
	async findLeaseBySubscription(
		subscriptionId: string,
		token: string
	): Promise<Lease> {
		if (!token) {
			throw new BadRequestException('Authentication token is required')
		}

		const client = this.supabase.getUserClient(token)
		const { data, error } = await client
			.from('leases')
			.select('*')
			.eq('stripe_subscription_id', subscriptionId)
			.single()

		if (error || !data) {
			throw new NotFoundException('Subscription not found')
		}

		return data as Lease
	}
}