import {
	Controller,
	Get,
	NotFoundException,
	Request,
	UnauthorizedException,
	UseGuards,
	UseInterceptors
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'
import type { AuthUser } from '@repo/shared/types/auth'
import { SupabaseService } from '../../../database/supabase.service'
import { TenantAuthGuard } from '../guards/tenant-auth.guard'
import { TenantContextInterceptor } from '../interceptors/tenant-context.interceptor'
import { AppLogger } from '../../../logger/app-logger.service'
import { RentPaymentAutopayService } from '../../rent-payments/rent-payment-autopay.service'

/**
 * Tenant Autopay Controller
 *
 * Manages automatic payment subscriptions and recurring rent payments
 * for tenants. Enforces TENANT user_type via TenantAuthGuard.
 *
 * Routes: /tenant/autopay/*
 */
@ApiTags('Tenant Portal - Autopay')
@ApiBearerAuth('supabase-auth')
@Controller()
@UseGuards(TenantAuthGuard)
@UseInterceptors(TenantContextInterceptor)
export class TenantAutopayController {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger,
		private readonly autopayService: RentPaymentAutopayService
	) {}

	/**
	 * Get autopay/subscription status for active lease
	 *
	 * Returns subscription details including next payment date from Stripe.
	 * The nextPaymentDate is derived from Stripe's current_period_end timestamp.
	 */
	@ApiOperation({ summary: 'Get autopay status', description: 'Get autopay/subscription status for active lease including next payment date' })
	@ApiResponse({ status: 200, description: 'Autopay status retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized - tenant authentication required' })
	@ApiResponse({ status: 404, description: 'Tenant account not found' })
	@Get()
	async getAutopayStatus(@Request() req: AuthenticatedRequest) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const user = req.user
		const tenant = await this.resolveTenant(token, user)
		const lease = await this.fetchActiveLease(token, tenant.id)

		if (!lease) {
			return {
				autopayEnabled: false,
				message: 'No active lease found'
			}
		}

		// Get autopay status from Stripe including next payment date
		const autopayStatus = await this.autopayService.getAutopayStatus(
			{ tenant_id: tenant.id, lease_id: lease.id },
			user.id
		)

		return {
			autopayEnabled: autopayStatus.enabled,
			subscriptionId: autopayStatus.subscriptionId,
			subscriptionStatus: autopayStatus.status,
			lease_id: lease.id,
			tenant_id: tenant.id,
			rent_amount: lease.rent_amount,
			nextPaymentDate: autopayStatus.nextPaymentDate
		}
	}

	private async resolveTenant(token: string, user: AuthUser) {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('tenants')
			.select('id, user_id, stripe_customer_id')
			.eq('user_id', user.id)
			.single()

		if (error || !data) {
			throw new NotFoundException('Tenant account not found')
		}

		return data
	}

	private async fetchActiveLease(token: string, tenant_id: string) {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('leases')
			.select('id, rent_amount, stripe_subscription_id')
			.eq('tenant_id', tenant_id)
			.eq('status', 'active')
			.order('start_date', { ascending: false })
			.limit(1)
			.maybeSingle()

		if (error) {
			this.logger.error('Failed to load active lease', {
				tenant_id,
				error: error.message
			})
		}

		return data
	}
}
