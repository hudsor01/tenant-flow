import { Controller, Get, InternalServerErrorException } from '@nestjs/common'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import { User } from '../../shared/decorators/user.decorator'
import type { AuthUser } from '@repo/shared/types/auth'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'
import { getCanonicalPaymentDate } from '@repo/shared/utils/payment-dates'
import { AppLogger } from '../../logger/app-logger.service'

type TenantRow = Database['public']['Tables']['tenants']['Row']
type LeaseRow = Database['public']['Tables']['leases']['Row']
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

interface UnitWithProperty {
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
}

interface LeaseWithUnit extends LeaseRow {
	unit: UnitWithProperty | null
	metadata: {
		documentUrl: string | null
	}
}

interface MaintenanceSummary {
	total: number
	open: number
	inProgress: number
	completed: number
}

/**
 * Tenant Portal Dashboard Controller
 *
 * Provides the dashboard endpoint that orchestrates data from multiple tenant domains.
 * Individual domain endpoints are available at /tenants/* routes via RouterModule.
 *
 * Route: /tenant-portal/dashboard
 *
 * Security: Defense in depth
 * - Application Layer: JWT validation via decorators
 * - Database Layer: RLS policies enforce auth.uid() = tenant_id
 */
@Controller('tenant-portal')
export class TenantPortalController {

	constructor(private readonly supabase: SupabaseService, private readonly logger: AppLogger) {}

	/**
	 * Tenant dashboard - combines lease, payments, and maintenance summaries
	 *
	 * This is the orchestration endpoint that aggregates data from multiple domains.
	 * Individual domain endpoints are available at /tenants/* routes.
	 */
	@Get('dashboard')
	async getDashboard(@JwtToken() token: string, @User() user: AuthUser) {
		const tenant = await this.resolveTenant(user)

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
				(payment.status === 'pending') &&
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
							payment.status === 'succeeded'
					)
					.reduce((acc, payment) => acc + payment.amount / 100, 0)
			}
		}
	}

	// -------------------------------------------------------------------------
	// Private helpers for dashboard aggregation
	// -------------------------------------------------------------------------

	private async resolveTenant(user: AuthUser): Promise<TenantRow> {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('tenants')
			.select('id, user_id, stripe_customer_id')
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
	): Promise<LeaseWithUnit | null> {
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
			.maybeSingle<LeaseRow & { unit: UnitWithProperty | null }>()

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

	private async fetchMaintenanceSummary(
		token: string,
		user: AuthUser
	): Promise<MaintenanceSummary> {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('maintenance_requests')
			.select('id, status')
			.eq('requested_by', user.id)

		if (error) {
			this.logger.error('Failed to fetch maintenance requests', {
				authuser_id: user.id,
				error: error.message
			})
			throw new InternalServerErrorException(
				'Failed to load maintenance requests'
			)
		}

		const requests = data ?? []
		const total = requests.length
		const open = requests.filter(r => r.status === 'open').length
		const inProgress = requests.filter(r => r.status === 'in_progress').length
		const completed = requests.filter(r => r.status === 'completed').length

		return { total, open, inProgress, completed }
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
		const paymentsWithCanonicalDates =
			(data as RentPaymentListItem[])?.map(payment => ({
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