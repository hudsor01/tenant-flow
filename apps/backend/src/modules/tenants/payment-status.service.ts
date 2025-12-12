import { Injectable } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'

type RentPaymentRow = Database['public']['Tables']['rent_payments']['Row']

@Injectable()
export class PaymentStatusService {
	constructor(private readonly supabase: SupabaseService, private readonly logger: AppLogger) {}

	/**
	 * Calculate payment status for a tenant (latest payment)
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

			const payment = data[0] as RentPaymentRow
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
	 * PUBLIC: Check if a record is a late fee record
	 * Handles both RentPayment and TenantPaymentRecord types
	 */
	isLateFeeRecord(record: { type?: string; description?: string | null; metadata?: Record<string, unknown> | null }): boolean {
		// RentPayment has explicit type field
		if (record.type && typeof record.type === 'string') {
			return record.type === 'LATE_FEE'
		}

		// TenantPaymentRecord - check metadata and description
		const description = record.description?.toLowerCase() ?? ''
		if (description.includes('late fee')) return true

		const metadata = record.metadata
		if (metadata) {
			return this.hasLateFeeFlag(metadata)
		}

		return false
	}

	/**
	 * PRIVATE: Check metadata for late fee flag
	 * Handles legacy key variants for backward compatibility
	 */
	private hasLateFeeFlag(metadata: Record<string, unknown>): boolean {
		if (metadata.isLateFee === true) return true
		if (metadata.lateFee === true || metadata.lateFee === 'true') return true
		if (metadata.type === 'late_fee') return true
		return false
	}
}
