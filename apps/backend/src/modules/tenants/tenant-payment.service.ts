import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common'
import type { TenantPaymentRecord } from '@repo/shared/types/api-contracts'
import type { Database } from '@repo/shared/types/supabase'
import type { RentPayment, PaymentStatus } from '@repo/shared/types/core'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import { PaymentHistoryService } from './payment-history.service'
import { PaymentStatusService } from './payment-status.service'

type RentPaymentRow = Database['public']['Tables']['rent_payments']['Row']

@Injectable()
export class TenantPaymentService {

	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger,
		private readonly paymentStatusService: PaymentStatusService,
		private readonly paymentHistoryService: PaymentHistoryService
	) {}

	/**
	 * Calculate payment status for a tenant
	 * Moved from TenantAnalyticsService (duplicate)
	 */
	async calculatePaymentStatus(tenant_id: string) {
		return this.paymentStatusService.calculatePaymentStatus(tenant_id)
	}



	async getTenantPaymentHistory(user_id: string, tenant_id: string, limit = 20) {
		return this.paymentHistoryService.getTenantPaymentHistory(user_id, tenant_id, limit)
	}

	async getTenantPaymentHistoryForTenant(authuser_id: string, limit = 20) {
		return this.paymentHistoryService.getTenantPaymentHistoryForTenant(authuser_id, limit)
	}

	/** Send a rent payment reminder notification to a tenant */
	async sendPaymentReminder(
		user_id: string,
		tenant_id: string,
		note?: string
	): Promise<{
		success: true
		tenant_id: string
		notificationId: string
		message: string
	}> {
		await this.paymentHistoryService.ensureTenantOwnedByUser(user_id, tenant_id)

		const client = this.supabase.getAdminClient()
		const { data: tenant, error: tenantError } = await client
			.from('tenants')
			.select('id, user_id')
			.eq('id', tenant_id)
			.single()

		if (tenantError || !tenant) {
			this.logger.warn('Tenant not found during reminder send', {
				user_id,
				tenant_id,
				error: tenantError?.message
			})
			throw new NotFoundException('Tenant not found')
		}

		const recipientId: string | null = tenant.user_id ?? null

		if (!recipientId) {
			this.logger.warn('Tenant has no linked user account for reminder delivery', {
				tenant_id
			})
			throw new BadRequestException('Tenant is not linked to a user account')
		}

		const { data: duePayment, error: dueError } = await client
			.from('rent_payments')
			.select('amount, due_date')
			.eq('tenant_id', tenant_id)
			.in('status', ['pending', 'pending'])
			.order('due_date', { ascending: true })
			.limit(1)
			.maybeSingle<RentPaymentRow>()

		if (dueError) {
			this.logger.warn('Unable to fetch upcoming rent payment for reminder', {
				tenant_id,
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
				entity_id: tenant_id,
				action_url: '/tenant/payments',
				created_at: now,
				is_read: false
			})
			.select('id')
			.single<{ id: string }>()

		if (notificationError || !notification) {
			this.logger.error('Failed to create payment reminder notification', {
				tenant_id,
				owner_id: user_id,
				error: notificationError?.message
			})
			throw new InternalServerErrorException('Failed to send payment reminder')
		}

		this.logger.log('Payment reminder sent', {
			tenant_id,
			notificationId: notification.id
		})

		return {
			success: true,
			tenant_id,
			notificationId: notification.id,
			message: reminderMessage
		}
	}

	async getOwnerPaymentSummary(user_id: string, limitPerTenant = 50) {
		return this.paymentHistoryService.getOwnerPaymentSummary(user_id, limitPerTenant)
	}

	/**
	 * PUBLIC: Query tenant payments with filters
	 * Migrated from TenantAnalyticsService
	 */
	async queryTenantPayments(
		tenant_id: string,
		filters?: {
			status?: PaymentStatus
			startDate?: string
			endDate?: string
			limit?: number
		}
	): Promise<RentPayment[]> {
		return this.paymentHistoryService.queryTenantPayments(tenant_id, filters)
	}

	/**
	 * PUBLIC: Map payment intent to record format
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
		return this.paymentHistoryService.mapPaymentIntentToRecord(intent)
	}
}
