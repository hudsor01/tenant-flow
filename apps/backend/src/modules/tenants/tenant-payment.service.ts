// TODO: [VIOLATION] CLAUDE.md Standards - KISS Principle violation
//
// File Size Issue:
//    Current: ~652 lines
//    Maximum: 300 lines per CLAUDE.md "Maximum component size: 300 lines"
//
// Recommended Refactoring Strategy:
//    - Extract payment status calculation into: `./tenant-payment-status.service.ts`
//    - Extract payment summary logic into: `./tenant-payment-summary.service.ts`
//    - Extract payment history logic into: `./tenant-payment-history.service.ts`
//    - Keep core payment operations in this service
//
// See: CLAUDE.md section "KISS (Keep It Simple)"

import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	InternalServerErrorException,
	NotFoundException
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

type RentPaymentRow = Database['public']['Tables']['rent_payments']['Row']

@Injectable()
export class TenantPaymentService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Calculate payment status for a tenant
	 * Moved from TenantAnalyticsService (duplicate)
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

	async getTenantPaymentHistory(
		user_id: string,
		tenant_id: string,
		limit = 20
	): Promise<{ payments: TenantPaymentRecord[] }> {
		await this.ensureTenantOwnedByUser(user_id, tenant_id)

		const client = this.supabase.getAdminClient()
		const stripeClient = asStripeSchemaClient(client)

		const { data, error }: { data: unknown; error: SupabaseError | null } =
			await stripeClient
				.schema('stripe')
				.from('payment_intents')
				.select('*')
				.contains('metadata', { tenant_id })
				.order('created', { ascending: false })
				.limit(limit)

		if (error) {
			this.logger.error('Failed to fetch tenant payment history', {
				user_id,
				tenant_id,
				error: error.message
			})
			throw new InternalServerErrorException(
				'Failed to fetch tenant payment history'
			)
		}

		const paymentIntents = (data as StripePaymentIntent[]) || []
		const payments = paymentIntents.map(intent =>
			this._mapStripePaymentIntentToRecord(intent)
		)

		return { payments }
	}

	async getTenantPaymentHistoryForTenant(
		authuser_id: string,
		limit = 20
	): Promise<{ payments: TenantPaymentRecord[] }> {
		const { id: tenant_id } = await this.getTenantByAuthuser_id(authuser_id)
		return { payments: await this._queryPaymentIntents(tenant_id, limit) }
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
		await this.ensureTenantOwnedByUser(user_id, tenant_id)

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
			this.logger.warn(
				'Tenant has no linked user account for reminder delivery',
				{
					tenant_id
				}
			)
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

	private _mapStripePaymentIntentToRecord(
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

	private async _queryPaymentIntents(
		tenant_id: string,
		limit: number
	): Promise<TenantPaymentRecord[]> {
		const client = this.supabase.getAdminClient()
		const stripeClient = asStripeSchemaClient(client)

		const { data, error }: { data: unknown; error: SupabaseError | null } =
			await stripeClient
				.schema('stripe')
				.from('payment_intents')
				.select('*')
				.contains('metadata', { tenant_id })
				.order('created', { ascending: false })
				.limit(limit)

		if (error) {
			this.logger.error('Failed to query tenant payment intents', {
				tenant_id,
				error: error.message
			})
			throw new InternalServerErrorException(
				'Failed to fetch tenant payment history'
			)
		}

		return ((data as StripePaymentIntent[]) || []).map(intent =>
			this._mapStripePaymentIntentToRecord(intent)
		)
	}

	async getOwnerPaymentSummary(
		user_id: string,
		limitPerTenant = 50
	): Promise<OwnerPaymentSummaryResponse> {
		// Graceful fallback - never throw 500 for dashboard widget
		const emptyResponse: OwnerPaymentSummaryResponse = {
			lateFeeTotal: 0,
			unpaidTotal: 0,
			unpaidCount: 0,
			tenantCount: 0
		}

		// DEFENSIVE: Wrap entire method to ensure we never return 500
		try {
			// Handle undefined/null user_id gracefully (e.g., SSR without auth)
			if (!user_id) {
				this.logger.warn(
					'getOwnerPaymentSummary called without user_id, returning empty response'
				)
				return emptyResponse
			}

			let tenant_ids: string[]
			try {
				tenant_ids = await this.gettenant_idsForOwner(user_id)
			} catch (error) {
				this.logger.warn(
					'Failed to get tenant IDs for payment summary, returning zeros',
					{
						user_id,
						error: error instanceof Error ? error.message : String(error)
					}
				)
				return emptyResponse
			}

			if (!tenant_ids.length) {
				return emptyResponse
			}

			// Build a single batched query to avoid per-tenant round-trips (was N+1)
			const stripeClient = asStripeSchemaClient(this.supabase.getAdminClient())

			const { data: intents, error } = await stripeClient
				.schema('stripe')
				.from('payment_intents')
				.select('id, amount, status, metadata, description')
				.order('created', { ascending: false })
				.limit(limitPerTenant * tenant_ids.length)

			if (error) {
				// Stripe schema may not exist or have permission issues - return zeros gracefully
				this.logger.warn(
					'Stripe schema query failed for payment summary, returning zeros',
					{
						user_id,
						error: error.message
					}
				)
				return {
					...emptyResponse,
					tenantCount: tenant_ids.length
				}
			}

			// Filter intents in-memory since stripe schema doesn't support .or()
			const filteredIntents =
				(intents as StripePaymentIntent[])?.filter(intent => {
					const tenantId = (intent.metadata as { tenant_id?: string } | null)
						?.tenant_id
					return tenantId && tenant_ids.includes(tenantId)
				}) || []

			let lateFeeTotal = 0
			let unpaidTotal = 0
			let unpaidCount = 0
			const perTenantCount = new Map<string, number>()

			for (const intent of filteredIntents) {
				const tenantId = (intent.metadata as { tenant_id?: string } | null)
					?.tenant_id
				if (!tenantId) continue

				// Enforce per-tenant cap in-memory since PostgREST can't window by group
				const used = perTenantCount.get(tenantId) ?? 0
				if (used >= limitPerTenant) continue
				perTenantCount.set(tenantId, used + 1)

				const record = this._mapStripePaymentIntentToRecord(intent)
				if (record.status !== 'succeeded') {
					unpaidTotal += record.amount
					unpaidCount += 1
				}
				if (this.isLateFeeRecord(record)) {
					lateFeeTotal += record.amount
				}
			}

			return {
				lateFeeTotal,
				unpaidTotal,
				unpaidCount,
				tenantCount: tenant_ids.length
			}
		} catch (outerError) {
			// DEFENSIVE: Catch any unexpected errors and return gracefully
			this.logger.error(
				'Unexpected error in getOwnerPaymentSummary, returning zeros',
				{
					user_id,
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

	private async getTenantByAuthuser_id(
		authuser_id: string
	): Promise<{ id: string }> {
		const client = this.supabase.getAdminClient()
		const { data, error } = await client
			.from('tenants')
			.select('id')
			.eq('user_id', authuser_id)
			.single()

		if (error || !data) {
			this.logger.warn('Tenant record not found for auth user', {
				authuser_id,
				error
			})
			throw new NotFoundException('Tenant record not found')
		}

		return { id: data.id }
	}

	private async ensureTenantOwnedByUser(user_id: string, tenant_id: string) {
		const client = this.supabase.getAdminClient()

		const { data: lease, error: leaseError } = await client
			.from('leases')
			.select('id, unit_id')
			.eq('primary_tenant_id', tenant_id)
			.order('start_date', { ascending: false })
			.limit(1)
			.maybeSingle()

		if (leaseError || !lease) {
			this.logger.warn('No lease found for tenant when checking ownership', {
				tenant_id,
				error: leaseError
			})
			throw new NotFoundException('Lease not found for tenant')
		}

		let property_id = null

		if (lease?.unit_id) {
			const { data: unit, error: unitError } = await client
				.from('units')
				.select('property_id')
				.eq('id', lease.unit_id)
				.single()

			if (unitError || !unit?.property_id) {
				this.logger.warn(
					'Unit missing property when verifying tenant ownership',
					{
						unit_id: lease.unit_id,
						error: unitError
					}
				)
				throw new NotFoundException('Property not found for tenant lease')
			}
			property_id = unit.property_id
		}

		if (!property_id) {
			this.logger.warn('Tenant lease has no associated property', {
				tenant_id,
				lease_id: lease?.id
			})
			throw new NotFoundException('Property not associated with tenant lease')
		}

		const { data: property, error: propertyError } = await client
			.from('properties')
			.select('owner_user_id')
			.eq('id', property_id)
			.single()

		if (propertyError || !property) {
			this.logger.warn('Property not found during tenant ownership check', {
				property_id,
				error: propertyError
			})
			throw new NotFoundException('Property not found for tenant')
		}

		const propertyOwnerUserId = property.owner_user_id
		if (propertyOwnerUserId !== user_id) {
			this.logger.warn('User is not property owner', {
				user_id,
				propertyOwnerId: propertyOwnerUserId
			})
			throw new ForbiddenException('Access denied: Not property owner')
		}
	}

	private async getOwnerproperty_ids(auth_user_id: string): Promise<string[]> {
		const client = this.supabase.getAdminClient()

		// Get properties owned by this user directly
		const { data, error } = await client
			.from('properties')
			.select('id')
			.eq('owner_user_id', auth_user_id)

		if (error) {
			this.logger.error(
				'Failed to fetch owner properties for payment summary',
				{
					auth_user_id,
					error: error.message
				}
			)
			throw new InternalServerErrorException('Failed to fetch owner properties')
		}

		return (data || []).map(p => p.id)
	}

	private async gettenant_idsForOwner(owner_id: string): Promise<string[]> {
		const property_ids = await this.getOwnerproperty_ids(owner_id)

		if (!property_ids.length) {
			return []
		}

		const client = this.supabase.getAdminClient()
		const { data, error } = await client
			.from('leases')
			.select(
				`
				primary_tenant_id,
				units!inner(property_id)
			`
			)
			.in('units.property_id', property_ids)
			.not('primary_tenant_id', 'is', null)

		if (error) {
			this.logger.error('Failed to fetch leases for owner payment summary', {
				owner_id,
				error: error.message
			})
			throw new InternalServerErrorException('Failed to fetch owner leases')
		}

		const tenant_ids = (data || [])
			.map(
				(lease: { primary_tenant_id: string | null }) => lease.primary_tenant_id
			)
			.filter((id): id is string => id !== null && id !== undefined)

		return Array.from(new Set(tenant_ids))
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
			queryBuilder = queryBuilder
				.order('created_at', { ascending: false })
				.limit(limit)

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
	 * PUBLIC: Check if a record is a late fee record
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
	 * PRIVATE: Check metadata for late fee flag
	 * Handles legacy key variants for backward compatibility
	 *
	 * STANDARD: isLateFee (boolean)
	 * LEGACY: lateFee (boolean/string), type='late_fee'
	 */
	private hasLateFeeFlag(metadata: Record<string, unknown>): boolean {
		// Standard key (preferred)
		if (metadata.isLateFee === true) return true

		// Legacy: lateFee key (boolean or string 'true')
		if (metadata.lateFee === true || metadata.lateFee === 'true') return true

		// Legacy: type field
		if (metadata.type === 'late_fee') return true

		return false
	}

	/**
	 * PUBLIC: Map payment intent to record format
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
}
