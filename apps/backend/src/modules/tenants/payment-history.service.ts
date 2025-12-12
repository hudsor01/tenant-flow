import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common'
import type { OwnerPaymentSummaryResponse, TenantPaymentRecord } from '@repo/shared/types/api-contracts'
import type { RentPayment, PaymentStatus } from '@repo/shared/types/core'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import { asStripeSchemaClient, type SupabaseError, type StripePaymentIntent } from '../../types/stripe-schema'
import { PaymentStatusService } from './payment-status.service'

@Injectable()
export class PaymentHistoryService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger,
		private readonly paymentStatusService: PaymentStatusService
	) {}

	async getTenantPaymentHistory(
		user_id: string,
		tenant_id: string,
		limit = 20
	): Promise<{ payments: TenantPaymentRecord[] }> {
		await this.ensureTenantOwnedByUser(user_id, tenant_id)
		const payments = await this._queryPaymentIntents(tenant_id, limit)
		return { payments }
	}

	async getTenantPaymentHistoryForTenant(
		authuser_id: string,
		limit = 20
	): Promise<{ payments: TenantPaymentRecord[] }> {
		const { id: tenant_id } = await this.getTenantByAuthuser_id(authuser_id)
		return { payments: await this._queryPaymentIntents(tenant_id, limit) }
	}

	async getOwnerPaymentSummary(user_id: string, limitPerTenant = 50): Promise<OwnerPaymentSummaryResponse> {
		const emptyResponse: OwnerPaymentSummaryResponse = {
			lateFeeTotal: 0,
			unpaidTotal: 0,
			unpaidCount: 0,
			tenantCount: 0
		}

		try {
			if (!user_id) {
				this.logger.warn('getOwnerPaymentSummary called without user_id, returning empty response')
				return emptyResponse
			}

			let tenant_ids: string[]
			try {
				tenant_ids = await this.gettenant_idsForOwner(user_id)
			} catch (error) {
				this.logger.warn('Failed to get tenant IDs for payment summary, returning zeros', {
					user_id,
					error: error instanceof Error ? error.message : String(error)
				})
				return emptyResponse
			}

			if (!tenant_ids.length) {
				return emptyResponse
			}

			const stripeClient = asStripeSchemaClient(this.supabase.getAdminClient())
			const { data: intents, error } = await stripeClient
				.schema('stripe')
				.from('payment_intents')
				.select('id, amount, status, metadata, description')
				.order('created', { ascending: false })
				.limit(limitPerTenant * tenant_ids.length)

			if (error) {
				this.logger.warn('Stripe schema query failed for payment summary, returning zeros', {
					user_id,
					error: error.message
				})
				return {
					...emptyResponse,
					tenantCount: tenant_ids.length
				}
			}

			const filteredIntents = (intents as StripePaymentIntent[])?.filter(intent => {
				const tenantId = (intent.metadata as { tenant_id?: string } | null)?.tenant_id
				return tenantId && tenant_ids.includes(tenantId)
			}) || []

			let lateFeeTotal = 0
			let unpaidTotal = 0
			let unpaidCount = 0
			const perTenantCount = new Map<string, number>()

			for (const intent of filteredIntents) {
				const tenantId = (intent.metadata as { tenant_id?: string } | null)?.tenant_id
				if (!tenantId) continue

				const used = perTenantCount.get(tenantId) ?? 0
				if (used >= limitPerTenant) continue
				perTenantCount.set(tenantId, used + 1)

				const record = this._mapStripePaymentIntentToRecord(intent)
				if (record.status !== 'succeeded') {
					unpaidTotal += record.amount
					unpaidCount += 1
				}
				if (this.paymentStatusService.isLateFeeRecord(record)) {
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
			this.logger.error('Unexpected error in getOwnerPaymentSummary, returning zeros', {
				user_id,
				error: outerError instanceof Error ? outerError.message : String(outerError),
				stack: outerError instanceof Error ? outerError.stack : undefined
			})
			return emptyResponse
		}
	}

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
		const paymentId = typeof intent.id === 'string' && intent.id.length > 0 ? intent.id : `pi_${Date.now()}`

		return {
			id: paymentId,
			...(tenantId ? { tenant_id: tenantId } : {}),
			amount: intent.amount ?? 0,
			status: intent.status ?? 'pending',
			currency: intent.currency ?? 'USD',
			receipt_email: null,
			metadata: intent.metadata ? { tenant_id: intent.metadata.tenant_id } : undefined,
			created_at: new Date().toISOString(),
			...(paidDate ? { paid_date: paidDate } : {}),
			due_date: '',
			lease_id: '',
			payment_method_type: '',
			period_start: '',
			period_end: ''
		} as TenantPaymentRecord
	}

	private _mapStripePaymentIntentToRecord(intent: StripePaymentIntent): TenantPaymentRecord {
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

		const { data, error }: { data: unknown; error: SupabaseError | null } = await stripeClient
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
			throw new InternalServerErrorException('Failed to fetch tenant payment history')
		}

		return ((data as StripePaymentIntent[]) || []).map(intent => this._mapStripePaymentIntentToRecord(intent))
	}

	async getTenantByAuthuser_id(authuser_id: string): Promise<{ id: string }> {
		const client = this.supabase.getAdminClient()
		const { data, error } = await client
			.from('tenants')
			.select('id')
			.eq('user_id', authuser_id)
			.single()

		if (error || !data) {
			this.logger.warn('Tenant record not found for auth user', { authuser_id, error })
			throw new NotFoundException('Tenant record not found')
		}

		return { id: data.id }
	}

	async ensureTenantOwnedByUser(user_id: string, tenant_id: string) {
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
				this.logger.warn('Unit missing property when verifying tenant ownership', {
					unit_id: lease.unit_id,
					error: unitError
				})
				throw new NotFoundException('Property not found for tenant lease')
			}
			property_id = unit.property_id
		}

		if (!property_id) {
			this.logger.warn('Tenant lease has no associated property', { tenant_id, lease_id: lease?.id })
			throw new NotFoundException('Property not associated with tenant lease')
		}

		const { data: property, error: propertyError } = await client
			.from('properties')
			.select('property_owner_id')
			.eq('id', property_id)
			.single()

		if (propertyError || !property) {
			this.logger.warn('Property not found during tenant ownership check', {
				property_id,
				error: propertyError
			})
			throw new NotFoundException('Property not found for tenant')
		}

		if (property.property_owner_id !== user_id) {
			this.logger.warn('User is not property owner', {
				user_id,
				propertyOwnerId: property.property_owner_id
			})
			throw new ForbiddenException('Access denied: Not property owner')
		}
	}

	async getOwnerproperty_ids(auth_user_id: string): Promise<string[]> {
		const client = this.supabase.getAdminClient()

		const { data: ownerRecord, error: ownerError } = await client
			.from('property_owners')
			.select('id')
			.eq('user_id', auth_user_id)
			.maybeSingle()

		if (ownerError) {
			this.logger.error('Failed to fetch property owner record', {
				auth_user_id,
				error: ownerError.message
			})
			throw new InternalServerErrorException('Failed to fetch owner properties')
		}

		if (!ownerRecord) {
			return []
		}

		const { data, error } = await client
			.from('properties')
			.select('id')
			.eq('property_owner_id', ownerRecord.id)

		if (error) {
			this.logger.error('Failed to fetch owner properties for payment summary', {
				auth_user_id,
				property_owner_id: ownerRecord.id,
				error: error.message
			})
			throw new InternalServerErrorException('Failed to fetch owner properties')
		}

		return (data || []).map(p => p.id)
	}

	async gettenant_idsForOwner(owner_id: string): Promise<string[]> {
		const property_ids = await this.getOwnerproperty_ids(owner_id)

		if (!property_ids.length) {
			return []
		}

		const client = this.supabase.getAdminClient()
		const { data, error } = await client
			.from('leases')
			.select(`
				primary_tenant_id,
				units!inner(property_id)
			`)
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
			.map((lease: { primary_tenant_id: string | null }) => lease.primary_tenant_id)
			.filter((id): id is string => id !== null && id !== undefined)

		return Array.from(new Set(tenant_ids))
	}
}
