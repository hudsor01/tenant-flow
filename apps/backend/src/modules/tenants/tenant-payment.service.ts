import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	InternalServerErrorException,
	Logger,
	NotFoundException
} from '@nestjs/common'
import type {
	OwnerPaymentSummaryResponse,
	TenantPaymentRecord
} from '@repo/shared/types/api-contracts'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'

type StripePaymentIntentRow = Database['public']['Tables']['stripe_payment_intents']['Row']
type RentPaymentRow = Database['public']['Tables']['rent_payments']['Row']

@Injectable()
export class TenantPaymentService {
	private readonly logger = new Logger(TenantPaymentService.name)

	constructor(
		private readonly supabase: SupabaseService
	) {}



	async getTenantPaymentHistory(
		user_id: string,
		tenant_id: string,
		limit = 20
	): Promise<{ payments: TenantPaymentRecord[] }> {
		await this.ensureTenantOwnedByUser(user_id, tenant_id)

		const client = this.supabase.getAdminClient()
		const { data, error } = await client
			.from('stripe_payment_intents')
			.select('*')
			.contains('metadata', { tenant_id })
			.order('created_at', { ascending: false })
			.limit(limit)

		if (error) {
			this.logger.error('Failed to fetch tenant payment history', {
				user_id,
				tenant_id,
				error: error.message
			})
			throw new InternalServerErrorException('Failed to fetch tenant payment history')
		}

		const paymentIntents = (data as StripePaymentIntentRow[]) || []
		const payments = paymentIntents.map(intent => this.mapPaymentIntentToRecord(intent))

		return { payments }
	}

	async getTenantPaymentHistoryForTenant(
		authuser_id: string,
		limit = 20
	): Promise<{ payments: TenantPaymentRecord[] }> {
		const { id: tenant_id } = await this.getTenantByAuthuser_id(authuser_id)
		return { payments: await this.queryTenantPayments(tenant_id, limit) }
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
			this.logger.warn('Tenant has no linked user account for reminder delivery', {
				tenant_id
			})
			throw new BadRequestException('Tenant is not linked to a user account')
		}

		const { data: duePayment, error: dueError } = await client
			.from('rent_payments')
			.select('amount, due_date')
			.eq('tenant_id', tenant_id)
			.in('status', ['DUE', 'PENDING'])
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

	private mapPaymentIntentToRecord(intent: StripePaymentIntentRow): TenantPaymentRecord {
		return {
			id: intent.id,
			amount: intent.amount ?? 0,
			currency: intent.currency,
			status: intent.status ?? 'unknown',
			description: null,
			receiptEmail: null,
			metadata: null,
			created_at: intent.created_at
		}
	}

	private async queryTenantPayments(
		tenant_id: string,
		limit: number
	): Promise<TenantPaymentRecord[]> {
		const client = this.supabase.getAdminClient()
		const { data, error } = await client
			.from('stripe_payment_intents')
			.select('*')
			.contains('metadata', { tenant_id })
			.order('created_at', { ascending: false })
			.limit(limit)

		if (error) {
			this.logger.error('Failed to query tenant payment intents', {
				tenant_id,
				error: error.message
			})
			throw new InternalServerErrorException('Failed to fetch tenant payment history')
		}

		return ((data as StripePaymentIntentRow[]) || []).map(intent =>
			this.mapPaymentIntentToRecord(intent)
		)
	}

	async getOwnerPaymentSummary(
		user_id: string,
		limitPerTenant = 50
	): Promise<OwnerPaymentSummaryResponse> {
		const tenant_ids = await this.gettenant_idsForOwner(user_id)

		if (!tenant_ids.length) {
			return {
				lateFeeTotal: 0,
				unpaidTotal: 0,
				unpaidCount: 0,
				tenantCount: 0
			}
		}

		let lateFeeTotal = 0
		let unpaidTotal = 0
		let unpaidCount = 0

		for (const tenant_id of tenant_ids) {
			const payments = await this.queryTenantPayments(tenant_id, limitPerTenant)
			for (const payment of payments) {
				if (payment.status !== 'succeeded') {
					unpaidTotal += payment.amount
					unpaidCount += 1
				}
				if (this.isLateFeeRecord(payment)) {
					lateFeeTotal += payment.amount
				}
			}
		}

		return {
			lateFeeTotal,
			unpaidTotal,
			unpaidCount,
			tenantCount: tenant_ids.length
		}
	}

	private async getTenantByAuthuser_id(authuser_id: string): Promise<{ id: string }> {
		const client = this.supabase.getAdminClient()
		const { data, error } = await client
			.from('tenants')
			.select('id')
			.eq('auth_user_id', authuser_id)
			.single()

		if (error || !data) {
			this.logger.warn('Tenant record not found for auth user', { authuser_id, error })
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

	private async getOwnerproperty_ids(owner_id: string): Promise<string[]> {
		const client = this.supabase.getAdminClient()
		const { data, error } = await client
			.from('properties')
			.select('id')
			.eq('property_owner_id', owner_id)

		if (error) {
			this.logger.error('Failed to fetch owner properties for payment summary', {
				owner_id,
				error: error.message
			})
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

	private isLateFeeRecord(payment: TenantPaymentRecord): boolean {
		const description = payment.description?.toLowerCase() ?? ''
		const metadata = payment.metadata ?? {}
		const hasLateFlag =
			(metadata as Record<string, unknown>).lateFee === true ||
			(metadata as Record<string, unknown>).lateFee === 'true' ||
			(metadata as Record<string, unknown>).isLateFee === true ||
			(metadata as Record<string, unknown>).isLateFee === 'true' ||
			(metadata as Record<string, unknown>).type === 'late_fee'

		return hasLateFlag || description.includes('late fee')
	}
}
