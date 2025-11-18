import {
	Controller,
	Get,
	Logger,
	UseGuards,
	UseInterceptors
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard'
import { JwtToken } from '../../../shared/decorators/jwt-token.decorator'
import { User } from '../../../shared/decorators/user.decorator'
import type { authUser } from '@repo/shared/types/auth'
import { SupabaseService } from '../../../database/supabase.service'
import { TenantAuthGuard } from '../guards/tenant-auth.guard'
import { TenantContextInterceptor } from '../interceptors/tenant-context.interceptor'

/**
 * Tenant Payments Controller
 *
 * Handles payment history, upcoming payments, and payment method management
 * for tenants. Enforces TENANT user_type via TenantAuthGuard.
 *
 * Routes: /tenant/payments/*
 */
@Controller()
@UseGuards(JwtAuthGuard, TenantAuthGuard)
@UseInterceptors(TenantContextInterceptor)
export class TenantPaymentsController {
	private readonly logger = new Logger(TenantPaymentsController.name)

	constructor(private readonly supabase: SupabaseService) {}

	/**
	 * Get payment history and upcoming payments
	 *
	 * @returns Payment list with metadata
	 */
	@Get()
	async getPayments(
		@JwtToken() token: string,
		@User() user: authUser
	): // eslint-disable-next-line @typescript-eslint/no-explicit-any
	Promise<{ payments: any[]; methodsEndpoint: string }> {
		const tenant = await this.resolveTenant(token, user)
		const payments = await this.fetchPayments(token, tenant.id)

		return {
			payments,
			methodsEndpoint: '/api/v1/stripe/tenant-payment-methods'
		}
	}

	private async resolveTenant(token: string, user: authUser) {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('tenants')
			.select('id, user_id, stripe_customer_id')
			.eq('user_id', user.id)
			.single()

		if (error || !data) {
			throw new Error('Tenant account not found')
		}

		return data
	}

	private async fetchPayments(token: string, tenant_id: string) {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('rent_payments')
			.select(
				'id, amount, status, paidAt, dueDate, created_at, lease_id, tenant_id, stripePaymentIntentId, ownerReceives, receiptUrl'
			)
			.eq('tenant_id', tenant_id)
			.order('created_at', { ascending: false })
			.limit(50)

		if (error) {
			this.logger.error('Failed to load rent payments', {
				tenant_id,
				error: error.message
			})
			throw new Error('Failed to load payment history')
		}

		return data ?? []
	}
}
