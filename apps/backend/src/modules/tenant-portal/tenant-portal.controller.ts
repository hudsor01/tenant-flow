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
import type { authUser } from '@repo/shared/types/auth'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { Logger } from '@nestjs/common'

/**
 * API endpoint paths for tenant portal
 */
const API_ENDPOINTS = {
	PAYMENT_METHODS: '/api/v1/stripe/tenant-payment-methods'
} as const

const CreateMaintenanceRequestSchema = z.object({
	description: z.string().min(1).max(2000),
	priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
	photos: z.array(z.string().url()).max(6).optional()
})

class CreateMaintenanceRequestDto extends createZodDto(
	CreateMaintenanceRequestSchema
) {}

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
>
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
>

/**
 * Tenant Portal Controller
 *
 * Dedicated endpoints for tenant-only operations with user_type-based access control.
 * Enforces TENANT user_type via @user_types() decorator and user_typesGuard.
 *
 * Security: Defense in depth
 * - Application Layer: @user_types('TENANT') + user_typesGuard
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
	async getDashboard(@JwtToken() token: string, @User() user: authUser) {
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
	async getLease(@JwtToken() token: string, @User() user: authUser) {
		const tenant = await this.resolveTenant(token, user)
		return this.fetchActiveLease(token, tenant)
	}

	/**
	 * List maintenance requests created by the tenant
	 */
	@Get('maintenance')
	async getMaintenance(@JwtToken() token: string, @User() user: authUser) {
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
		@User() user: authUser
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
	async getPaymentsEndpoint(@JwtToken() token: string, @User() user: authUser) {
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
	async getDocuments(@JwtToken() token: string, @User() user: authUser) {
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

	// -------------------------------------------------------------------------
	// Private helpers
	// -------------------------------------------------------------------------

	private async resolveTenant(
		token: string,
		user: authUser
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
		user: authUser
	): Promise<MaintenanceRequestListItem[]> {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('maintenance_requests')
			.select(
				'id, description, priority, status, created_at, updated_at, completed_at, unit_id, actual_cost, assigned_to, estimated_cost, inspection_date, scheduled_date, inspection_findings, requested_by'
			)
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
		user: authUser
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

		return (data as RentPaymentListItem[]) ?? []
	}
}
