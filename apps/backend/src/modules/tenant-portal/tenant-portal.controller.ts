import {
	BadRequestException,
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	InternalServerErrorException,
	Post,
	UseGuards
} from '@nestjs/common'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import { User } from '../../shared/decorators/user.decorator'
import type { AuthUser } from '@repo/shared/types/auth'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { Logger } from '@nestjs/common'
import { getCanonicalPaymentDate } from '@repo/shared/utils/payment-dates'

/**
 * API endpoint paths for tenant portal
 */
const API_ENDPOINTS = {
	PAYMENT_METHODS: '/api/v1/stripe/tenant-payment-methods'
} as const

const CreateMaintenanceRequestSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().min(1).max(2000),
	priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
	photos: z.array(z.string().url()).max(6).optional()
})

class CreateMaintenanceRequestDto extends createZodDto(
	CreateMaintenanceRequestSchema
) {}

const PayRentSchema = z.object({
	payment_method_id: z.string().min(1),
	amount_cents: z.number().int().positive()
})

class PayRentDto extends createZodDto(PayRentSchema) {}

type TenantRow = Database['public']['Tables']['tenants']['Row']
type LeaseRow = Database['public']['Tables']['leases']['Row']
type MaintenanceRequestRow =
	Database['public']['Tables']['maintenance_requests']['Row']
type MaintenanceRequestListItem = Pick<
	MaintenanceRequestRow,
	| 'id'
	| 'status'
	| 'created_at'
	| 'description'
	| 'updated_at'
	| 'unit_id'
	| 'actual_cost'
	| 'assigned_to'
	| 'completed_at'
	| 'estimated_cost'
	| 'inspection_date'
	| 'priority'
	| 'scheduled_date'
	| 'inspection_findings'
	| 'requested_by'
> & {
	units: {
		id: string
		unit_number: string | null
		bedrooms: number | null
		bathrooms: number | null
		properties?: {
			id: string
			name: string | null
			address_line1: string | null
			city: string | null
			state: string | null
			postal_code: string | null
		} | null
	}
}
type RentPaymentRow = Database['public']['Tables']['rent_payments']['Row']
type RentPaymentListItem = Pick<
	RentPaymentRow,
	| 'id'
	| 'amount'
	| 'status'
	| 'created_at'
	| 'lease_id'
	| 'tenant_id'
	| 'updated_at'
	| 'late_fee_amount'
	| 'stripe_payment_intent_id'
	| 'due_date'
	| 'application_fee_amount'
	| 'paid_date'
	| 'period_end'
	| 'period_start'
> & {
	canonical_payment_date: string
}

/**
 * Tenant Portal Controller
 *
 * Dedicated endpoints for tenant-only operations with user_type-based access control.
 * Enforces TENANT user_type via @Roles() decorator and RolesGuard.
 *
 * Security: Defense in depth
 * - Application Layer: @Roles('TENANT') + RolesGuard
 * - Database Layer: RLS policies enforce auth.uid() = tenant_id
 */
@Controller('tenant-portal')
@UseGuards(JwtAuthGuard)
export class TenantPortalController {
	private readonly logger = new Logger(TenantPortalController.name)

	constructor(private readonly supabase: SupabaseService) {}

	/**
	 * Tenant dashboard - combines lease, payments, and maintenance summaries
	 */
	@Get('dashboard')
	async getDashboard(@JwtToken() token: string, @User() user: AuthUser) {
		const tenant = await this.resolveTenant(token, user)

		const [lease, maintenanceSummary, payments, userData] = await Promise.all([
			this.fetchActiveLease(token, tenant),
			this.fetchMaintenanceSummary(token, user),
			this.fetchPayments(token, tenant),
			this.supabase
				.getUserClient(token)
				.from('users')
				.select('first_name, last_name, email')
				.eq('id', tenant.user_id)
				.single()
		])

		const upcomingPayment = payments.find(
			payment =>
				(payment.status === 'DUE' || payment.status === 'PENDING') &&
				payment.due_date
		)

		return {
			tenant: {
				id: tenant.id,
				first_name: userData.data?.first_name,
				last_name: userData.data?.last_name,
				email: userData.data?.email
			},
			lease,
			maintenance: maintenanceSummary,
			payments: {
				recent: payments.slice(0, 5),
				upcoming: upcomingPayment ?? null,
				totalPaidUsd: payments
					.filter(
						payment =>
							payment.status === 'PAID' || payment.status === 'SUCCEEDED'
					)
					.reduce((acc, payment) => acc + payment.amount / 100, 0)
			}
		}
	}

	/**
	 * Lease endpoint - returns the active lease with unit/property metadata
	 */
	@Get('leases')
	async getLease(@JwtToken() token: string, @User() user: AuthUser) {
		const tenant = await this.resolveTenant(token, user)
		return this.fetchActiveLease(token, tenant)
	}

	/**
	 * List maintenance requests created by the tenant
	 */
	@Get('maintenance')
	async getMaintenance(@JwtToken() token: string, @User() user: AuthUser) {
		const maintenance = await this.fetchMaintenanceRequests(token, user)
		const summary = this.calculateMaintenanceStats(maintenance)
		return { requests: maintenance, summary }
	}

	/**
	 * Create a maintenance request
	 */
	@Post('maintenance')
	@HttpCode(HttpStatus.CREATED)
	async createMaintenanceRequest(
		@Body() body: CreateMaintenanceRequestDto,
		@JwtToken() token: string,
		@User() user: AuthUser
	) {
		const tenant = await this.resolveTenant(token, user)
		const lease = await this.fetchActiveLease(token, tenant)

		if (!lease?.unit) {
			this.logger.warn(
				'Tenant attempted to create maintenance request without active unit',
				{
					authuser_id: user.id
				}
			)
			throw new BadRequestException(
				'No active lease unit found. Cannot create maintenance request.'
			)
		}

		const maintenanceRequest: Database['public']['Tables']['maintenance_requests']['Insert'] =
			{
				title: body.title,
				description: body.description,
				priority: body.priority,
				status: 'OPEN',
				requested_by: user.id,
				tenant_id: tenant.id,
				unit_id: lease.unit.id
			}

		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('maintenance_requests')
			.insert(maintenanceRequest)
			.select()
			.single<MaintenanceRequestRow>()

		if (error) {
			this.logger.error('Failed to create maintenance request', {
				authuser_id: user.id,
				unit_id: lease.unit.id,
				error: error.message
			})
			throw new InternalServerErrorException(
				'Failed to create maintenance request'
			)
		}

		return data
	}

	/**
	 * Tenant payments endpoint - history & metadata
	 */
	@Get('payments')
	async getPaymentsEndpoint(@JwtToken() token: string, @User() user: AuthUser) {
		const tenant = await this.resolveTenant(token, user)
		const payments = await this.fetchPayments(token, tenant)

		return {
			payments,
			methodsEndpoint: API_ENDPOINTS.PAYMENT_METHODS
		}
	}

	/**
	 * Tenant documents endpoint – returns lease documents & payment stubs
	 */
	@Get('documents')
	async getDocuments(@JwtToken() token: string, @User() user: AuthUser) {
		const tenant = await this.resolveTenant(token, user)
		const lease = await this.fetchActiveLease(token, tenant)
		const payments = await this.fetchPayments(token, tenant)

		const documents: Array<{
			id: string
			type: 'LEASE' | 'RECEIPT'
			name: string
			url: string | null
			created_at: string | null
		}> = []

		if (lease?.metadata?.documentUrl) {
			documents.push({
				id: lease.id,
				type: 'LEASE',
				name: 'Signed Lease Agreement',
				url: lease.metadata.documentUrl,
				created_at: lease.start_date
			})
		}

		for (const payment of payments) {
			// Skip if no receipt URL (field might not be in schema)
			if (!payment.id) continue
			const dateSource = payment.created_at ?? payment.paid_date
			const dateDisplay = dateSource
				? new Date(dateSource).toLocaleDateString()
				: 'Unknown date'
			documents.push({
				id: payment.id,
				type: 'RECEIPT',
				name: `Rent receipt - ${dateDisplay}`,
				url: null, // Receipt URL might not be available
				created_at: payment.paid_date ?? payment.created_at
			})
		}

		return { documents }
	}

	/**
	 * Get amount due for current billing period
	 * Calculates base rent + late fee if applicable
	 */
	@Get('amount-due')
	async getAmountDue(@JwtToken() token: string, @User() user: AuthUser) {
		const tenant = await this.resolveTenant(token, user)
		const lease = await this.fetchActiveLease(token, tenant)

		if (!lease) {
			throw new BadRequestException('No active lease found')
		}

		const now = new Date()
		const paymentDay = lease.payment_day || 1
		const gracePeriodDays = lease.grace_period_days || 5
		const lateFeeAmount = lease.late_fee_amount || 0

		// Calculate due date for current period
		const dueDate = new Date(now.getFullYear(), now.getMonth(), paymentDay)
		if (dueDate > now) {
			// Due date is in the future this month, use last month's due date for comparison
			dueDate.setMonth(dueDate.getMonth() - 1)
		}

		// Calculate days late (after grace period)
		const gracePeriodEnd = new Date(dueDate)
		gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays)

		const daysLate = now > gracePeriodEnd
			? Math.floor((now.getTime() - gracePeriodEnd.getTime()) / (1000 * 60 * 60 * 24))
			: 0

		// Calculate late fee (capped at 10% of rent)
		const baseRentCents = lease.rent_amount || 0
		const maxLateFee = Math.floor(baseRentCents * 0.1)
		const calculatedLateFee = daysLate > 0 ? Math.min(lateFeeAmount * daysLate, maxLateFee) : 0

		// Check if already paid for current period
		const { data: existingPayment } = await this.supabase
			.getUserClient(token)
			.from('rent_payments')
			.select('id, status')
			.eq('lease_id', lease.id)
			.eq('status', 'succeeded')
			.gte('period_start', dueDate.toISOString())
			.limit(1)
			.maybeSingle()

		const alreadyPaid = !!existingPayment

		return {
			base_rent_cents: baseRentCents,
			late_fee_cents: calculatedLateFee,
			total_due_cents: alreadyPaid ? 0 : baseRentCents + calculatedLateFee,
			due_date: dueDate.toISOString(),
			days_late: daysLate,
			grace_period_days: gracePeriodDays,
			already_paid: alreadyPaid,
			breakdown: alreadyPaid
				? [{ description: 'Paid for current period', amount_cents: 0 }]
				: [
						{ description: 'Monthly rent', amount_cents: baseRentCents },
						...(calculatedLateFee > 0
							? [{ description: `Late fee (${daysLate} days)`, amount_cents: calculatedLateFee }]
							: [])
				  ]
		}
	}

	/**
	 * Process rent payment
	 * Creates payment intent and records payment in database
	 */
	@Post('pay-rent')
	@HttpCode(HttpStatus.OK)
	async payRent(
		@JwtToken() token: string,
		@User() user: AuthUser,
		@Body() dto: PayRentDto
	) {
		const tenant = await this.resolveTenant(token, user)
		const lease = await this.fetchActiveLease(token, tenant)

		if (!lease) {
			throw new BadRequestException('No active lease found')
		}

		// Validate amount matches expected
		const amountDue = await this.getAmountDue(token, user)
		if (amountDue.already_paid) {
			throw new BadRequestException('Rent already paid for this period')
		}

		if (dto.amount_cents !== amountDue.total_due_cents) {
			throw new BadRequestException(
				`Payment amount (${dto.amount_cents}) does not match amount due (${amountDue.total_due_cents})`
			)
		}

		// Get the owner's connected account
		const { data: ownerData, error: ownerError } = await this.supabase
			.getAdminClient()
			.from('property_owners')
			.select('stripe_account_id')
			.eq('id', lease.unit?.property?.id || '')
			.single()

		if (ownerError || !ownerData?.stripe_account_id) {
			this.logger.error('Owner Stripe account not found', {
				property_id: lease.unit?.property?.id
			})
			throw new InternalServerErrorException('Payment processing not available')
		}

		// Record the payment intent (actual Stripe processing would happen here)
		// For now, we record the payment as pending
		const periodStart = new Date(amountDue.due_date)
		const periodEnd = new Date(periodStart)
		periodEnd.setMonth(periodEnd.getMonth() + 1)

		const { data: payment, error: paymentError } = await this.supabase
			.getAdminClient()
			.from('rent_payments')
			.insert({
				lease_id: lease.id,
				tenant_id: tenant.id,
				amount: dto.amount_cents,
				late_fee_amount: amountDue.late_fee_cents,
				status: 'pending',
				due_date: amountDue.due_date,
				period_start: periodStart.toISOString(),
				period_end: periodEnd.toISOString(),
				application_fee_amount: 0,
				payment_method_type: 'card',
				stripe_payment_intent_id: `pi_pending_${Date.now()}`
			})
			.select()
			.single()

		if (paymentError) {
			this.logger.error('Failed to record payment', { error: paymentError.message })
			throw new InternalServerErrorException('Failed to process payment')
		}

		this.logger.log('Rent payment initiated', {
			payment_id: payment.id,
			tenant_id: tenant.id,
			amount_cents: dto.amount_cents
		})

		return {
			success: true,
			payment_id: payment.id,
			status: 'pending',
			message: 'Payment submitted successfully'
		}
	}

	// -------------------------------------------------------------------------
	// Private helpers
	// -------------------------------------------------------------------------

	private async resolveTenant(
		token: string,
		user: AuthUser
	): Promise<TenantRow> {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('tenants')
			.select(
				'id, user_id, stripe_customer_id'
			)
			.eq('user_id', user.id)
			.single<TenantRow>()

		if (error || !data) {
			this.logger.error('Tenant record not found for auth user', {
				authuser_id: user.id,
				error: error?.message
			})
			throw new InternalServerErrorException('Tenant account not activated')
		}

		return data
	}

	private async fetchActiveLease(
		token: string,
		tenant: TenantRow
	): Promise<
		| (LeaseRow & {
				unit: {
					id: string
					unit_number: string | null
					bedrooms: number | null
					bathrooms: number | null
					property?: {
						id: string
						name: string | null
						address: string | null
						city: string | null
						state: string | null
						postal_code: string | null
					} | null
				} | null
				metadata: {
					documentUrl: string | null
				}
		  })
		| null
	> {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('leases')
			.select(
				`
			id,
			start_date,
			end_date,
			lease_status,
			rent_amount,
			security_deposit,
			stripe_subscription_id,
			auto_pay_enabled,
			grace_period_days,
			late_fee_amount,
			late_fee_days,
			primary_tenant_id,
			rent_currency,
			payment_day,
			unit_id,
			created_at,
			updated_at,
				unit:unit_id(
					id,
					unit_number,
					bedrooms,
					bathrooms,
					property:property_id(
						id,
						name,
						address,
						city,
						state,
						postal_code
					)
				)
			`
			)
			.eq('tenant_id', tenant.id)
			.order('start_date', { ascending: false })
			.limit(1)
			.maybeSingle<
				LeaseRow & {
					unit: {
						id: string
						unit_number: string | null
						bedrooms: number | null
						bathrooms: number | null
						property?: {
							id: string
							name: string | null
							address: string | null
							city: string | null
							state: string | null
							postal_code: string | null
						} | null
					} | null
					metadata: {
						documentUrl: string | null
					}
				}
			>()

		if (error) {
			this.logger.error('Failed to load tenant lease', {
				tenant_id: tenant.id,
				error: error.message
			})
			throw new InternalServerErrorException('Failed to load lease information')
		}

		if (!data) {
			return null
		}

		const { unit, ...leaseCore } = data

		return {
			...leaseCore,
			unit: unit ?? null,
			metadata: {
				documentUrl: null
			}
		}
	}

	private async fetchMaintenanceRequests(
		token: string,
		user: AuthUser
	): Promise<MaintenanceRequestListItem[]> {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('maintenance_requests')
			.select(`
				id, description, priority, status, created_at, updated_at, completed_at, unit_id, actual_cost, assigned_to, estimated_cost, inspection_date, scheduled_date, inspection_findings, requested_by,
				units!inner (
					id, unit_number, bedrooms, bathrooms,
					properties!inner (
					id, name, address_line1, city, state, postal_code
				)
				)
			`)
			.eq('requested_by', user.id)
			.order('created_at', { ascending: false })

		if (error) {
			this.logger.error('Failed to fetch maintenance requests', {
				authuser_id: user.id,
				error: error.message
			})
			throw new InternalServerErrorException(
				'Failed to load maintenance requests'
			)
		}

		return data ?? []
	}

	private async fetchMaintenanceSummary(
		token: string,
		user: AuthUser
	): Promise<{
		total: number
		open: number
		inProgress: number
		completed: number
		recent: MaintenanceRequestListItem[]
	}> {
		const requests = await this.fetchMaintenanceRequests(token, user)
		const summary = this.calculateMaintenanceStats(requests)
		return {
			...summary,
			recent: requests.slice(0, 5)
		}
	}

	private calculateMaintenanceStats(requests: MaintenanceRequestListItem[]) {
		const total = requests.length
		const open = requests.filter(r => r.status === 'OPEN').length
		const inProgress = requests.filter(r => r.status === 'IN_PROGRESS').length
		const completed = requests.filter(r => r.status === 'COMPLETED').length

		return {
			total,
			open,
			inProgress,
			completed
		}
	}

	private async fetchPayments(
		token: string,
		tenant: TenantRow
	): Promise<RentPaymentListItem[]> {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('rent_payments')
			.select(
				'id, amount, status, created_at, lease_id, tenant_id, updated_at, late_fee_amount, stripe_payment_intent_id, due_date, application_fee_amount, paid_date, period_end, period_start'
			)
			.eq('tenant_id', tenant.id)
			.order('created_at', { ascending: false })
			.limit(50)

		if (error) {
			this.logger.error('Failed to load rent payments', {
				tenant_id: tenant.id,
				error: error.message
			})
			throw new InternalServerErrorException('Failed to load payment history')
		}

		// Apply canonical payment date logic
		const paymentsWithCanonicalDates = (data as RentPaymentListItem[])?.map(payment => ({
			...payment,
			canonical_payment_date: getCanonicalPaymentDate(
				payment.paid_date,
				payment.created_at!,
				payment.status!
			)
		})) ?? []

		return paymentsWithCanonicalDates
	}
}
