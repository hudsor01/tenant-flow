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
 * Enforces TENANT role via TenantAuthGuard.
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
			const dateSource = payment.createdAt ?? payment.dueDate ?? payment.paidAt
			const dateDisplay = dateSource
				? new Date(dateSource).toLocaleDateString()
				: 'Unknown date'
			documents.push({
				id: payment.id,
				type: 'RECEIPT',
				name: `Rent receipt - ${dateDisplay}`,
				url: payment.receiptUrl,
				createdAt: payment.paidAt ?? payment.createdAt
			})
		}

		return { documents }
	}

	private async resolveTenant(token: string, user: authUser) {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('tenant')
			.select('id, auth_user_id')
			.eq('auth_user_id', user.id)
			.single()

		if (error || !data) {
			throw new Error('Tenant account not found')
		}

		return data
	}

	private async fetchActiveLease(token: string, tenantId: string) {
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
			.eq('tenantId', tenantId)
			.eq('status', 'ACTIVE')
			.order('startDate', { ascending: false })
			.limit(1)
			.maybeSingle()

		if (error) {
			this.logger.error('Failed to load tenant lease', {
				tenantId,
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
				documentUrl: data.lease_document_url ?? null
			}
		}
	}

	private async fetchPayments(token: string, tenantId: string) {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('rent_payment')
			.select(
				'id, amount, status, paidAt, dueDate, createdAt, receiptUrl'
			)
			.eq('tenantId', tenantId)
			.order('createdAt', { ascending: false })
			.limit(50)

		if (error) {
			this.logger.error('Failed to load rent payments', {
				tenantId,
				error: error.message
			})
			throw new InternalServerErrorException('Failed to load payment history')
		}

		return data ?? []
	}
}
