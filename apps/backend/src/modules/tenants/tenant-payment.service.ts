/**
 * Tenant Payment Service
 *
 * Coordinates tenant payment operations by delegating to specialized services.
 * Handles payment history retrieval, reminders, and payment summaries.
 *
 * Architecture:
 * TenantPaymentService (Coordinator)
 * ├─ TenantPaymentQueryService (Lookups, access control, queries)
 * └─ TenantPaymentMapperService (Mapping, status calculation, late fee detection)
 */

import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
	UnauthorizedException
} from '@nestjs/common'
import type {
	OwnerPaymentSummaryResponse,
	TenantPaymentRecord
} from '@repo/shared/types/api-contracts'
import type { Database } from '@repo/shared/types/supabase'
import type { RentPayment, PaymentStatus } from '@repo/shared/types/core'
import { SupabaseService } from '../../database/supabase.service'
import {
	asStripeSchemaClient,
	type SupabaseError,
	type StripePaymentIntent
} from '../../types/stripe-schema'
import { AppLogger } from '../../logger/app-logger.service'
import { TenantPaymentQueryService } from './tenant-payment-query.service'
import { TenantPaymentMapperService } from './tenant-payment-mapper.service'

type RentPaymentRow = Database['public']['Tables']['rent_payments']['Row']

@Injectable()
export class TenantPaymentService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger,
		private readonly queryService: TenantPaymentQueryService,
		private readonly mapperService: TenantPaymentMapperService
	) {}

	/**
	 * Calculate payment status for a tenant
	 */
	async calculatePaymentStatus(tenantId: string): Promise<{
		status: string
		amount_due: number
		late_fees: number
		last_payment?: string
	}> {
		try {
			const client = this.supabase.getAdminClient()
			const { data, error } = await client
				.from('rent_payments')
				.select('*')
				.eq('tenant_id', tenantId)
				.order('created_at', { ascending: false })
				.limit(1)

			if (error || !data?.length) {
				return {
					status: 'NO_PAYMENTS',
					amount_due: 0,
					late_fees: 0
				}
			}

			const payment = data[0] as RentPayment
			const result: {
				status: string
				amount_due: number
				late_fees: number
				last_payment?: string
			} = {
				status: payment.status,
				amount_due: 0,
				late_fees: payment.late_fee_amount || 0
			}

			if (payment.created_at) {
				result.last_payment = payment.created_at
			}

			return result
		} catch (error) {
			this.logger.error('Error calculating payment status', {
				error: error instanceof Error ? error.message : String(error),
				tenantId
			})
			return { status: 'ERROR', amount_due: 0, late_fees: 0 }
		}
	}

	/**
	 * Get tenant payment history (owner view)
	 */
	async getTenantPaymentHistory(
		userId: string,
		tenantId: string,
		limit = 20
	): Promise<{ payments: TenantPaymentRecord[] }> {
		await this.queryService.ensureTenantOwnedByUser(userId, tenantId)
		const payments = await this.fetchPaymentIntents(tenantId, limit)
		return { payments }
	}

	/**
	 * Get tenant payment history (tenant's own view)
	 */
	async getTenantPaymentHistoryForTenant(
		authUserId: string,
		token: string,
		limit = 20
	): Promise<{ payments: TenantPaymentRecord[] }> {
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const { id: tenantId } = await this.queryService.getTenantByAuthUserId(
			authUserId,
			token
		)
		const payments = await this.fetchPaymentIntents(tenantId, limit)
		return { payments }
	}

	/**
	 * Send a rent payment reminder notification to a tenant
	 */
	async sendPaymentReminder(
		userId: string,
		tenantId: string,
		note?: string
	): Promise<{
		success: true
		tenant_id: string
		notificationId: string
		message: string
	}> {
		await this.queryService.ensureTenantOwnedByUser(userId, tenantId)

		const client = this.supabase.getAdminClient()
		const { data: tenant, error: tenantError } = await client
			.from('tenants')
			.select('id, user_id')
			.eq('id', tenantId)
			.single()

		if (tenantError || !tenant) {
			this.logger.warn('Tenant not found during reminder send', {
				userId,
				tenantId,
				error: tenantError?.message
			})
			throw new NotFoundException('Tenant not found')
		}

		const recipientId: string | null = tenant.user_id ?? null

		if (!recipientId) {
			this.logger.warn(
				'Tenant has no linked user account for reminder delivery',
				{ tenantId }
			)
			throw new BadRequestException('Tenant is not linked to a user account')
		}

		const { data: duePayment, error: dueError } = await client
			.from('rent_payments')
			.select('amount, due_date')
			.eq('tenant_id', tenantId)
			.in('status', ['pending', 'pending'])
			.order('due_date', { ascending: true })
			.limit(1)
			.maybeSingle<RentPaymentRow>()

		if (dueError) {
			this.logger.warn('Unable to fetch upcoming rent payment for reminder', {
				tenantId,
				error: dueError.message
			})
		}

		const formattedAmount =
			typeof duePayment?.amount === 'number'
				? `$${(duePayment.amount / 100).toFixed(2)}`
				: null
		const dueDateText = duePayment?.due_date
			? new Date(duePayment.due_date).toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric'
				})
			: 'soon'

		const defaultMessage = formattedAmount
			? `Reminder: Rent payment of ${formattedAmount} is due ${dueDateText}.`
			: `Reminder: Rent payment is due ${dueDateText}.`
		const reminderMessage = note?.trim() || defaultMessage

		const now = new Date().toISOString()
		const { data: notification, error: notificationError } = await client
			.from('notifications')
			.insert({
				user_id: recipientId,
				title: 'Rent Payment Reminder',
				message: reminderMessage,
				notification_type: 'payment',
				entity_type: 'tenant',
				entity_id: tenantId,
				action_url: '/tenant/payments',
				created_at: now,
				is_read: false
			})
			.select('id')
			.single<{ id: string }>()

		if (notificationError || !notification) {
			this.logger.error('Failed to create payment reminder notification', {
				tenantId,
				owner_id: userId,
				error: notificationError?.message
			})
			throw new InternalServerErrorException('Failed to send payment reminder')
		}

		this.logger.log('Payment reminder sent', {
			tenantId,
			notificationId: notification.id
		})

		return {
			success: true,
			tenant_id: tenantId,
			notificationId: notification.id,
			message: reminderMessage
		}
	}

	/**
	 * Get payment summary for all tenants owned by a user
	 */
	async getOwnerPaymentSummary(
		userId: string,
		token: string,
		limitPerTenant = 50
	): Promise<OwnerPaymentSummaryResponse> {
		const emptyResponse: OwnerPaymentSummaryResponse = {
			lateFeeTotal: 0,
			unpaidTotal: 0,
			unpaidCount: 0,
			tenantCount: 0
		}

		try {
			if (!userId || !token) {
				this.logger.warn(
					'getOwnerPaymentSummary called without user or token, returning empty response'
				)
				return emptyResponse
			}

			let tenantIds: string[]
			try {
				tenantIds = await this.queryService.getTenantIdsForOwner(userId, token)
			} catch (error) {
				this.logger.warn(
					'Failed to get tenant IDs for payment summary, returning zeros',
					{
						userId,
						error: error instanceof Error ? error.message : String(error)
					}
				)
				return emptyResponse
			}

			if (!tenantIds.length) {
				return emptyResponse
			}

			const stripeClient = asStripeSchemaClient(this.supabase.getAdminClient())

			const { data: intents, error } = await stripeClient
				.schema('stripe')
				.from('payment_intents')
				.select('id, amount, status, metadata, description')
				.order('created', { ascending: false })
				.limit(limitPerTenant * tenantIds.length)

			if (error) {
				this.logger.warn(
					'Stripe schema query failed for payment summary, returning zeros',
					{
						userId,
						error: error.message
					}
				)
				return {
					...emptyResponse,
					tenantCount: tenantIds.length
				}
			}

			const filteredIntents =
				(intents as StripePaymentIntent[])?.filter(intent => {
					const tenantId = (intent.metadata as { tenant_id?: string } | null)
						?.tenant_id
					return tenantId && tenantIds.includes(tenantId)
				}) || []

			let lateFeeTotal = 0
			let unpaidTotal = 0
			let unpaidCount = 0
			const perTenantCount = new Map<string, number>()

			for (const intent of filteredIntents) {
				const tenantId = (intent.metadata as { tenant_id?: string } | null)
					?.tenant_id
				if (!tenantId) continue

				const used = perTenantCount.get(tenantId) ?? 0
				if (used >= limitPerTenant) continue
				perTenantCount.set(tenantId, used + 1)

				const record = this.mapperService.mapStripePaymentIntentToRecord(intent)
				if (record.status !== 'succeeded') {
					unpaidTotal += record.amount
					unpaidCount += 1
				}
				if (this.mapperService.isLateFeeRecord(record)) {
					lateFeeTotal += record.amount
				}
			}

			return {
				lateFeeTotal,
				unpaidTotal,
				unpaidCount,
				tenantCount: tenantIds.length
			}
		} catch (outerError) {
			this.logger.error(
				'Unexpected error in getOwnerPaymentSummary, returning zeros',
				{
					userId,
					error:
						outerError instanceof Error
							? outerError.message
							: String(outerError),
					stack: outerError instanceof Error ? outerError.stack : undefined
				}
			)
			return emptyResponse
		}
	}

	// ─────────────────────────────────────────────────────────────────────────────
	// Delegated Methods (public API compatibility)
	// ─────────────────────────────────────────────────────────────────────────────

	/**
	 * Query tenant payments with filters
	 * Delegates to TenantPaymentQueryService
	 */
	async queryTenantPayments(
		tenantId: string,
		requesterUserId: string,
		filters?: {
			status?: PaymentStatus
			startDate?: string
			endDate?: string
			limit?: number
		}
	): Promise<RentPayment[]> {
		return this.queryService.queryTenantPayments(
			tenantId,
			requesterUserId,
			filters
		)
	}

	/**
	 * Check if a record is a late fee record
	 * Delegates to TenantPaymentMapperService
	 */
	isLateFeeRecord(record: RentPayment | TenantPaymentRecord): boolean {
		return this.mapperService.isLateFeeRecord(record)
	}

	/**
	 * Map payment intent to record format
	 * Delegates to TenantPaymentMapperService
	 */
	mapPaymentIntentToRecord(intent: {
		id?: string
		amount?: number
		currency?: string | null
		status?: PaymentStatus
		succeeded_at?: string
		tenant_id?: string
		metadata?: { tenant_id?: string } | null
	}): TenantPaymentRecord {
		return this.mapperService.mapPaymentIntentToRecord(intent)
	}

	// ─────────────────────────────────────────────────────────────────────────────
	// Private Helpers
	// ─────────────────────────────────────────────────────────────────────────────

	/**
	 * Fetch payment intents from Stripe schema for a tenant
	 */
	private async fetchPaymentIntents(
		tenantId: string,
		limit: number
	): Promise<TenantPaymentRecord[]> {
		const client = this.supabase.getAdminClient()
		const stripeClient = asStripeSchemaClient(client)

		const { data, error }: { data: unknown; error: SupabaseError | null } =
			await stripeClient
				.schema('stripe')
				.from('payment_intents')
				.select('*')
				.contains('metadata', { tenant_id: tenantId })
				.order('created', { ascending: false })
				.limit(limit)

		if (error) {
			this.logger.error('Failed to query tenant payment intents', {
				tenantId,
				error: error.message
			})
			throw new InternalServerErrorException(
				'Failed to fetch tenant payment history'
			)
		}

		return ((data as StripePaymentIntent[]) || []).map(intent =>
			this.mapperService.mapStripePaymentIntentToRecord(intent)
		)
	}
}
