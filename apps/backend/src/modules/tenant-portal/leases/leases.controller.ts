import {
	Controller,
	Get,
	InternalServerErrorException,
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
 * Tenant Leases Controller
 *
 * Provides lease information and lease-related documents for tenants.
 * Enforces TENANT user_type via TenantAuthGuard.
 *
 * Routes: /tenant/leases/*
 */
@Controller()
@UseGuards(JwtAuthGuard, TenantAuthGuard)
@UseInterceptors(TenantContextInterceptor)
export class TenantLeasesController {
	private readonly logger = new Logger(TenantLeasesController.name)

	constructor(private readonly supabase: SupabaseService) {}

	/**
	 * Get active lease with unit/property metadata
	 *
	 * @returns Active lease details
	 */
	@Get()
	async getLease(@JwtToken() token: string, @User() user: authUser) {
		const tenant = await this.resolveTenant(token, user)
		return this.fetchActiveLease(token, tenant.id)
	}

	/**
	 * Get lease documents (signed agreement, receipts)
	 *
	 * @returns List of lease-related documents
	 */
	@Get('documents')
	async getDocuments(@JwtToken() token: string, @User() user: authUser) {
		const tenant = await this.resolveTenant(token, user)
		const lease = await this.fetchActiveLease(token, tenant.id)
		const payments = await this.fetchPayments(token, tenant.id)

		const documents: Array<{
			id: string
			type: 'LEASE' | 'RECEIPT'
			name: string
			url: string | null
			created_at: string | null
		}> = []

		if (lease?.id) {
			documents.push({
				id: lease.id,
				type: 'LEASE',
				name: 'Signed Lease Agreement',
				url: null,
				created_at: lease.start_date
			})
		}

		for (const payment of payments) {
			if (!payment.paid_date) continue
			const dateDisplay = new Date(payment.paid_date).toLocaleDateString()
			documents.push({
				id: payment.id,
				type: 'RECEIPT',
				name: `Rent receipt - ${dateDisplay}`,
				url: null,
				created_at: payment.paid_date
			})
		}

		return { documents }
	}

	private async resolveTenant(token: string, user: authUser) {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('tenants')
			.select('id, user_id')
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
			.select(
				`
				id,
				start_date,
				end_date,
				rent_amount,
				security_deposit,
				lease_status,
				stripe_subscription_id,
				created_at,
				unit:unit_id(
					id,
					unit_number,
					bedrooms,
					bathrooms,
					property:property_id(
						id,
						name,
						address_line1,
						address_line2,
						city,
						state,
						postal_code
					)
				)
				`
			)
			.eq('primary_tenant_id', tenant_id)
			.eq('lease_status', 'active')
			.order('start_date', { ascending: false })
			.limit(1)
			.maybeSingle()

		if (error) {
			this.logger.error('Failed to load tenant lease', {
				tenant_id,
				error: error.message
			})
			throw new InternalServerErrorException('Failed to load lease information')
		}

		if (!data) {
			return null
		}

		// Return full data with metadata
		return {
			...data,
			metadata: {
				documentUrl: null
			}
		}
	}

	private async fetchPayments(token: string, tenant_id: string) {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('rent_payments')
			.select(
				'id, amount, status, paid_date, due_date, created_at'
			)
			.eq('tenant_id', tenant_id)
			.order('created_at', { ascending: false })
			.limit(50)

		if (error) {
			this.logger.error('Failed to load rent payments', {
				tenant_id,
				error: error.message
			})
			throw new InternalServerErrorException('Failed to load payment history')
		}

		return data ?? []
	}
}
