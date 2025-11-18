/**
 * Tenant Analytics Service
 *
 * Handles payment analytics, statistics, and financial reports
 * Manages: Payment status calculations, payment history, owner summaries
 */

import {
	Injectable,
	Logger,
	BadRequestException
} from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { RentPayment } from '@repo/shared/types/core'
import type { TenantPaymentRecord, OwnerPaymentSummaryResponse, SendPaymentReminderResponse } from '@repo/shared/types/api-contracts'
import { SupabaseService } from '../../database/supabase.service'
import { TenantQueryService } from './tenant-query.service'

@Injectable()
export class TenantAnalyticsService {
	constructor(
		private readonly logger: Logger,
		private readonly supabase: SupabaseService,
		private readonly tenantQueryService: TenantQueryService,
		private readonly eventEmitter: EventEmitter2
	) {}

	/**
	 * Calculate payment status for a single tenant
	 */
	async calculatePaymentStatus(tenant_id: string): Promise<{
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
				.eq('tenant_id', tenant_id)
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
				tenant_id
			})
			return { status: 'ERROR', amount_due: 0, late_fees: 0 }
		}
	}

	/**
	 * Get payment summary for an owner
	 */
	async getOwnerPaymentSummary(owner_id: string): Promise<OwnerPaymentSummaryResponse> {
		try {
			const tenantIds = await this.tenantQueryService.getTenantIdsForOwner(owner_id)
			if (!tenantIds.length) {
				return {
					lateFeeTotal: 0,
					unpaidTotal: 0,
					unpaidCount: 0,
					tenantCount: 0
				}
			}

			const client = this.supabase.getAdminClient()
			const { data, error } = await client
				.from('rent_payments')
				.select('*')
				.in('tenant_id', tenantIds)

			if (error || !data) {
				return {
					lateFeeTotal: 0,
					unpaidTotal: 0,
					unpaidCount: 0,
					tenantCount: tenantIds.length
				}
			}

			let lateFeeTotal = 0
			let unpaidTotal = 0
			let unpaidCount = 0

			for (const payment of data as RentPayment[]) {
				if (payment.status === 'OVERDUE') {
					lateFeeTotal += payment.late_fee_amount || 0
					unpaidTotal += payment.amount || 0
					unpaidCount++
				}
			}

			return {
				lateFeeTotal,
				unpaidTotal,
				unpaidCount,
				tenantCount: tenantIds.length
			}
		} catch (error) {
			this.logger.error('Error getting owner payment summary', {
				error: error instanceof Error ? error.message : String(error),
				owner_id
			})
			throw error
		}
	}

	/**
	 * Send payment reminder to tenant
	 */
	async sendPaymentReminder(
		tenant_id: string,
		email: string,
		amount_due: number
	): Promise<SendPaymentReminderResponse> {
		try {
			const tenant = await this.tenantQueryService.findOne(tenant_id)
			if (!tenant) {
				throw new BadRequestException('Tenant not found')
			}

			const notificationId = `payment-reminder-${tenant_id}-${Date.now()}`

			this.eventEmitter.emit('payment.reminder', {
			tenant_id,
			email,
			name: email,
			amount_due
		})

			this.logger.log('Payment reminder sent', { tenant_id, email })
			return {
				success: true,
				tenant_id,
				notificationId,
				message: 'Payment reminder sent successfully'
			}
		} catch (error) {
			this.logger.error('Error sending payment reminder', {
				error: error instanceof Error ? error.message : String(error),
				tenant_id
			})
			throw error
		}
	}

	/**
	 * Query tenant payments with filters
	 */
	async queryTenantPayments(
		tenant_id: string,
		filters?: {
			status?: string
			startDate?: string
			endDate?: string
			limit?: number
		}
	): Promise<RentPayment[]> {
		try {
			const client = this.supabase.getAdminClient()
			let queryBuilder = client
				.from('rent_payments')
				.select('*')
				.eq('tenant_id', tenant_id)

			if (filters?.status) {
				queryBuilder = queryBuilder.eq('status', filters.status)
			}

			if (filters?.startDate) {
				queryBuilder = queryBuilder.gte('created_at', filters.startDate)
			}

			if (filters?.endDate) {
				queryBuilder = queryBuilder.lte('created_at', filters.endDate)
			}

			const limit = filters?.limit || 50
			queryBuilder = queryBuilder.order('created_at', { ascending: false }).limit(limit)

			const { data, error } = await queryBuilder

			if (error) {
				this.logger.error('Failed to query tenant payments', {
					error: error.message,
					tenant_id
				})
				return []
			}

			return (data as RentPayment[]) || []
		} catch (error) {
			this.logger.error('Error querying tenant payments', {
				error: error instanceof Error ? error.message : String(error),
				tenant_id
			})
			return []
		}
	}

	/**
	 * Check if a record is a late fee record
	 */
	isLateFeeRecord(record: RentPayment | TenantPaymentRecord): boolean {
		if ('type' in record) {
			return record.type === 'LATE_FEE'
		}
		return false
	}

	/** 
	 * Map payment intent to record format 
	 */ 
	mapPaymentIntentToRecord(intent: { 
		id?: string 
		amount?: number 
		currency?: string | null 
		status?: string 
		succeeded_at?: string 
		tenant_id?: string 
		metadata?: { tenant_id?: string } | null 
	}): TenantPaymentRecord { 
		const tenantId = intent.tenant_id ?? intent.metadata?.tenant_id 
		const paidDate = intent.succeeded_at 
		const paymentId = typeof intent.id === 'string' && intent.id.length > 0 ? intent.id : `pi_${Date.now()}` 
 
		return { 
			id: paymentId, 
			...(tenantId ? { tenant_id: tenantId } : {}), 
			amount: intent.amount ?? 0, 
			status: intent.status ?? 'PENDING', 
			currency: intent.currency ?? 'USD', 
			description: null, 
			receiptEmail: null, 
			metadata: intent.metadata ? { tenant_id: intent.metadata.tenant_id } : null, 
			created_at: new Date().toISOString(), 
			...(paidDate ? { paid_date: paidDate } : {}) 
		} 
	} 
} 
