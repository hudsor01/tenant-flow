/**
 * Tenant Payment Mapper Service
 *
 * Handles payment record mapping, status calculation, and late fee detection.
 * Extracted from TenantPaymentService to maintain <300 line limit per CLAUDE.md
 */

import { Injectable } from '@nestjs/common'
import type { TenantPaymentRecord } from '@repo/shared/types/api-contracts'
import type { RentPayment, PaymentStatus } from '@repo/shared/types/core'
import type { StripePaymentIntent } from '../../types/stripe-schema'

@Injectable()
export class TenantPaymentMapperService {
	/**
	 * Map Stripe payment intent to TenantPaymentRecord format
	 */
	mapStripePaymentIntentToRecord(
		intent: StripePaymentIntent
	): TenantPaymentRecord {
		return {
			id: intent.id,
			amount: intent.amount ?? 0,
			currency: intent.currency ?? 'usd',
			status: intent.status ?? 'unknown',
			description: intent.description ?? undefined,
			metadata: (intent.metadata as Record<string, unknown>) ?? undefined,
			created_at: new Date((intent.created ?? 0) * 1000).toISOString(),
			paid_date: null,
			due_date: '',
			lease_id: '',
			tenant_id: '',
			payment_method_type: '',
			period_start: '',
			period_end: '',
			receipt_email: intent.receipt_email ?? null
		} as TenantPaymentRecord
	}

	/**
	 * Map generic payment intent data to TenantPaymentRecord format
	 * Migrated from TenantAnalyticsService
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
		const tenantId = intent.tenant_id ?? intent.metadata?.tenant_id
		const paidDate = intent.succeeded_at
		const paymentId =
			typeof intent.id === 'string' && intent.id.length > 0
				? intent.id
				: `pi_${Date.now()}`

		return {
			id: paymentId,
			...(tenantId ? { tenant_id: tenantId } : {}),
			amount: intent.amount ?? 0,
			status: intent.status ?? 'pending',
			currency: intent.currency ?? 'USD',
			receipt_email: null,
			metadata: intent.metadata
				? { tenant_id: intent.metadata.tenant_id }
				: undefined,
			created_at: new Date().toISOString(),
			...(paidDate ? { paid_date: paidDate } : {}),
			due_date: '',
			lease_id: '',
			payment_method_type: '',
			period_start: '',
			period_end: ''
		} as TenantPaymentRecord
	}

	/**
	 * Check if a record is a late fee record
	 * Migrated from TenantAnalyticsService - polymorphic version
	 *
	 * STANDARD KEY: New records should use metadata.isLateFee = true
	 * Legacy support: Also checks lateFee, type='late_fee' for backward compatibility
	 */
	isLateFeeRecord(record: RentPayment | TenantPaymentRecord): boolean {
		// RentPayment has explicit type field
		if ('type' in record && typeof record.type === 'string') {
			return record.type === 'LATE_FEE'
		}

		// TenantPaymentRecord - check metadata and description
		if ('description' in record) {
			const tenantRecord = record as TenantPaymentRecord
			const description = tenantRecord.description?.toLowerCase() ?? ''

			// Check description first (most reliable)
			if (description.includes('late fee')) {
				return true
			}

			// Check metadata flags (normalized check)
			const metadata = tenantRecord.metadata as Record<string, unknown> | null
			if (metadata) {
				return this.hasLateFeeFlag(metadata)
			}
		}

		return false
	}

	/**
	 * Check metadata for late fee flag
	 * Handles legacy key variants for backward compatibility
	 *
	 * STANDARD: isLateFee (boolean)
	 * LEGACY: lateFee (boolean/string), type='late_fee'
	 */
	hasLateFeeFlag(metadata: Record<string, unknown>): boolean {
		// Standard key (preferred)
		if (metadata.isLateFee === true) return true

		// Legacy: lateFee key (boolean or string 'true')
		if (metadata.lateFee === true || metadata.lateFee === 'true') return true

		// Legacy: type field
		if (metadata.type === 'late_fee') return true

		return false
	}
}
