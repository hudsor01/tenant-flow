/**
 * Rent Payment Query Service
 * Handles payment history queries
 * Extracted from RentPaymentsService for SRP compliance
 */

import {
	BadRequestException,
	Injectable,
	NotFoundException
} from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import type { Lease, RentPayment } from './types'
import { AppLogger } from '../../logger/app-logger.service'

@Injectable()
export class RentPaymentQueryService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

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
			.select('id, lease_id, tenant_id, amount, currency, status, due_date, paid_date, payment_method_type, stripe_payment_intent_id, period_start, period_end, late_fee_amount, application_fee_amount, notes, created_at, updated_at')
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
			.select('id, lease_id, tenant_id, amount, currency, status, due_date, paid_date, payment_method_type, stripe_payment_intent_id, period_start, period_end, late_fee_amount, application_fee_amount, notes, created_at, updated_at')
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
			.select('id, lease_id, tenant_id, amount, currency, status, due_date, paid_date, payment_method_type, stripe_payment_intent_id, period_start, period_end, late_fee_amount, application_fee_amount, notes, created_at, updated_at')
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
			.select('id, lease_id, tenant_id, amount, currency, status, due_date, paid_date, payment_method_type, stripe_payment_intent_id, period_start, period_end, late_fee_amount, application_fee_amount, notes, created_at, updated_at')
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
			.select('id, unit_id, owner_user_id, primary_tenant_id, start_date, end_date, rent_amount, rent_currency, security_deposit, payment_day, lease_status, stripe_subscription_id, stripe_connected_account_id, stripe_subscription_status, auto_pay_enabled, grace_period_days, late_fee_amount, late_fee_days, pets_allowed, pet_deposit, pet_rent, max_occupants, utilities_included, tenant_responsible_utilities, property_rules, governing_state, property_built_before_1978, lead_paint_disclosure_acknowledged, owner_signed_at, owner_signature_ip, owner_signature_method, tenant_signed_at, tenant_signature_ip, tenant_signature_method, sent_for_signature_at, docuseal_submission_id, subscription_failure_reason, subscription_last_attempt_at, subscription_retry_count, created_at, updated_at')
			.eq('stripe_subscription_id', subscriptionId)
			.single()

		if (error || !data) {
			throw new NotFoundException('Subscription not found')
		}

		return data as Lease
	}
}
