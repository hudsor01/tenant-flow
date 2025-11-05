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
import { RolesGuard } from '../../shared/guards/roles.guard'
import { Roles } from '../../shared/decorators/roles.decorator'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import { User } from '../../shared/decorators/user.decorator'
import type { authUser } from '@repo/shared/types/auth'
import type { Database } from '@repo/shared/types/supabase-generated'
import { SupabaseService } from '../../database/supabase.service'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { Logger } from '@nestjs/common'

const CreateMaintenanceRequestSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().min(1).max(2000),
	priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
	category: z.string().optional(),
	allowEntry: z.boolean().default(true),
	photos: z.array(z.string().url()).max(6).optional()
})

class CreateMaintenanceRequestDto extends createZodDto(
	CreateMaintenanceRequestSchema
) {}

type TenantRow = Database['public']['Tables']['tenant']['Row']
type LeaseRow = Database['public']['Tables']['lease']['Row']
type MaintenanceRequestRow =
	Database['public']['Tables']['maintenance_request']['Row']
type MaintenanceRequestListItem = Pick<
	MaintenanceRequestRow,
	| 'id'
	| 'title'
	| 'description'
	| 'priority'
	| 'status'
	| 'category'
	| 'createdAt'
	| 'updatedAt'
	| 'completedAt'
	| 'requestedBy'
	| 'unitId'
>
type RentPaymentRow = Database['public']['Tables']['rent_payment']['Row']
type RentPaymentListItem = Pick<
	RentPaymentRow,
	| 'id'
	| 'amount'
	| 'status'
	| 'paidAt'
	| 'dueDate'
	| 'createdAt'
	| 'leaseId'
	| 'tenantId'
	| 'stripePaymentIntentId'
	| 'landlordReceives'
> & {
	receiptUrl: string | null
}

/**
 * Tenant Portal Controller
 *
 * Dedicated endpoints for tenant-only operations with role-based access control.
 * Enforces TENANT role via @Roles() decorator and RolesGuard.
 *
 * Security: Defense in depth
 * - Application Layer: @Roles('TENANT') + RolesGuard
 * - Database Layer: RLS policies enforce auth.uid() = tenantId
 */
@Controller('tenant-portal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TENANT')
export class TenantPortalController {
	private readonly logger = new Logger(TenantPortalController.name)

	constructor(private readonly supabase: SupabaseService) {}

	/**
	 * Tenant dashboard - combines lease, payments, and maintenance summaries
	 */
	@Get('dashboard')
	async getDashboard(@JwtToken() token: string, @User() user: authUser) {
		const tenant = await this.resolveTenant(token, user)

		const [lease, maintenanceSummary, payments] = await Promise.all([
			this.fetchActiveLease(token, tenant),
			this.fetchMaintenanceSummary(token, user),
			this.fetchPayments(token, tenant)
		])

		const upcomingPayment = payments.find(
			payment =>
				(payment.status === 'DUE' || payment.status === 'PENDING') &&
				payment.dueDate
		)

		return {
			tenant: {
				id: tenant.id,
				firstName: tenant.firstName,
				lastName: tenant.lastName,
				email: tenant.email,
				status: tenant.status
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
	@Get('lease')
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
					authUserId: user.id
				}
			)
			throw new BadRequestException(
				'No active lease unit found. Cannot create maintenance request.'
			)
		}

		const maintenanceRequest: Database['public']['Tables']['maintenance_request']['Insert'] =
			{
				title: body.title,
				description: body.description,
				priority: body.priority as Database['public']['Enums']['Priority'],
				category: body.category ?? null,
				allowEntry: body.allowEntry,
				status: 'OPEN',
				requestedBy: user.id,
				photos: body.photos && body.photos.length > 0 ? body.photos : null,
				unitId: lease.unit.id
			}

		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('maintenance_request')
			.insert(maintenanceRequest)
			.select()
			.single<MaintenanceRequestRow>()

		if (error) {
			this.logger.error('Failed to create maintenance request', {
				authUserId: user.id,
				unitId: lease.unit.id,
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
			methodsEndpoint: '/api/v1/stripe/tenant-payment-methods'
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
			createdAt: string | null
		}> = []

		if (lease?.metadata?.documentUrl) {
			documents.push({
				id: lease.id,
				type: 'LEASE',
				name: 'Signed Lease Agreement',
				url: lease.metadata.documentUrl,
				createdAt: lease.startDate
			})
		}

		for (const payment of payments) {
			if (!payment.receiptUrl) continue
			documents.push({
				id: payment.id,
				type: 'RECEIPT',
				name: `Rent receipt - ${new Date(payment.createdAt ?? payment.dueDate ?? '').toLocaleDateString()}`,
				url: payment.receiptUrl,
				createdAt: payment.paidAt ?? payment.createdAt
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
			.from('tenant')
			.select(
				'id, auth_user_id, firstName, lastName, email, status, stripe_customer_id'
			)
			.eq('auth_user_id', user.id)
			.single<TenantRow>()

		if (error || !data) {
			this.logger.error('Tenant record not found for auth user', {
				authUserId: user.id,
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
					unitNumber: string | null
					bedrooms: number | null
					bathrooms: number | null
					property?: {
						id: string
						name: string | null
						address: string | null
						city: string | null
						state: string | null
						zipCode: string | null
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
			.from('lease')
			.select(
				`
				id,
				startDate,
				endDate,
				rentAmount,
				securityDeposit,
				status,
				stripe_subscription_id,
				lease_document_url,
				createdAt,
				unit:unitId(
					id,
					unitNumber,
					bedrooms,
					bathrooms,
					property:propertyId(
						id,
						name,
						address,
						city,
						state,
						zipCode
					)
				)
			`
			)
			.eq('tenantId', tenant.id)
			.eq('status', 'ACTIVE')
			.order('startDate', { ascending: false })
			.limit(1)
			.maybeSingle()

		if (error) {
			this.logger.error('Failed to load tenant lease', {
				tenantId: tenant.id,
				error: error.message
			})
			throw new InternalServerErrorException('Failed to load lease information')
		}

		if (!data) {
			return null
		}

		const {
			lease_document_url: leaseDocumentUrl,
			unit,
			...leaseCore
		} = data as LeaseRow & {
			lease_document_url?: string | null
			unit?: {
				id: string
				unitNumber: string | null
				bedrooms: number | null
				bathrooms: number | null
				property?: {
					id: string
					name: string | null
					address: string | null
					city: string | null
					state: string | null
					zipCode: string | null
				} | null
			} | null
		}

		return {
			...leaseCore,
			lease_document_url: leaseDocumentUrl,
			unit: unit ?? null,
			metadata: {
				documentUrl: leaseDocumentUrl ?? null
			}
		}
	}

	private async fetchMaintenanceRequests(
		token: string,
		user: authUser
	): Promise<MaintenanceRequestListItem[]> {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('maintenance_request')
			.select(
				'id, title, description, priority, status, category, createdAt, updatedAt, completedAt, requestedBy, unitId'
			)
			.eq('requestedBy', user.id)
			.order('createdAt', { ascending: false })

		if (error) {
			this.logger.error('Failed to fetch maintenance requests', {
				authUserId: user.id,
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
			.from('rent_payment')
			.select(
				'id, amount, status, paidAt, dueDate, createdAt, leaseId, tenantId, stripePaymentIntentId, landlordReceives'
			)
			.eq('tenantId', tenant.id)
			.order('createdAt', { ascending: false })
			.limit(50)

		if (error) {
			this.logger.error('Failed to load rent payments', {
				tenantId: tenant.id,
				error: error.message
			})
			throw new InternalServerErrorException('Failed to load payment history')
		}

		return (data ?? []).map(payment => ({
			...payment,
			receiptUrl: this.buildStripeReceiptUrl(payment.stripePaymentIntentId)
		}))
	}

	private buildStripeReceiptUrl(paymentIntentId: string | null) {
		// TODO: Store and return Stripe's public receipt_url from payment creation
		// Dashboard URLs are not accessible to tenants
		// Proper fix: Add receipt_url column to rent_payment table and populate it
		// when creating PaymentIntent (from charges.data[0].receipt_url)
		if (!paymentIntentId) return null
		return null // Returning null instead of inaccessible dashboard URL
	}
}
