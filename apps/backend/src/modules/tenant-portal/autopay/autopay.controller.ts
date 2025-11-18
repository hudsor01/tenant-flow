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
 * Tenant Autopay Controller
 *
 * Manages automatic payment subscriptions and recurring rent payments
 * for tenants. Enforces TENANT user_type via TenantAuthGuard.
 *
 * Routes: /tenant/autopay/*
 */
@Controller()
@UseGuards(JwtAuthGuard, TenantAuthGuard)
@UseInterceptors(TenantContextInterceptor)
export class TenantAutopayController {
	private readonly logger = new Logger(TenantAutopayController.name)

	constructor(private readonly supabase: SupabaseService) {}

	/**
	 * Get autopay/subscription status for active lease
	 *
	 * @returns Autopay configuration and subscription details
	 */
	@Get()
	async getAutopayStatus(@JwtToken() token: string, @User() user: authUser) {
		const tenant = await this.resolveTenant(token, user)
		const lease = await this.fetchActiveLease(token, tenant.id)

		if (!lease) {
			return {
				autopayEnabled: false,
				message: 'No active lease found'
			}
		}

		return {
			autopayEnabled: !!lease.stripe_subscription_id,
			subscriptionId: lease.stripe_subscription_id,
			lease_id: lease.id,
			tenant_id: tenant.id,
			rent_amount: lease.rent_amount,
			nextPaymentDate: lease.stripe_subscription_id
				? await this.getNextPaymentDate(token, lease.id)
				: null
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

	private async fetchActiveLease(token: string, tenant_id: string) {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('leases')
			.select('id, rent_amount, stripe_subscription_id')
			.eq('tenant_id', tenant_id)
			.eq('status', 'ACTIVE')
			.order('start_date', { ascending: false })
			.limit(1)
			.maybeSingle()

		if (error) {
			this.logger.error('Failed to load active lease', {
				tenant_id,
				error: error.message
			})
			return null
		}

		return data
	}

	private async getNextPaymentDate(token: string, lease_id: string) {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('rent_payments')
			.select('due_date')
			.eq('lease_id', lease_id)
			.in('status', ['DUE', 'PENDING'])
			.order('due_date', { ascending: true })
			.limit(1)
			.maybeSingle()

		if (error || !data) {
			return null
		}

		return data.due_date
	}
}
