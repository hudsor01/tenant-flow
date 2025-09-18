/**
 * ULTRA-NATIVE SERVICE - DO NOT ADD ORCHESTRATION
 *
 * DIRECT PostgreSQL RPC calls ONLY. Each method <30 lines.
 * FORBIDDEN: Service layers, repositories, business logic classes
 * See: apps/backend/ULTRA_NATIVE_ARCHITECTURE.md
 */

import { Injectable, BadRequestException } from '@nestjs/common'
import { Logger } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'
import type {
	CreateLeaseRequest,
	UpdateLeaseRequest
} from '../schemas/leases.schema'
import type { Tables } from '@repo/shared/types/supabase'

// Use native Supabase table types
type Lease = Tables<'Lease'>
type Unit = Tables<'Unit'>
type Property = Tables<'Property'>
type Tenant = Tables<'Tenant'>

export interface LeaseWithRelations extends Lease {
	Unit?: Unit & {
		Property?: Property
	}
	Tenant?: Tenant
}

export interface LeaseQueryOptions {
	status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
	unitId?: string
	tenantId?: string
	startDateFrom?: string
	startDateTo?: string
	endDateFrom?: string
	endDateTo?: string
	search?: string
	limit?: number
	offset?: number
}

/**
 * Leases service - Direct Supabase implementation following KISS principle
 * No abstraction layers, no base classes, just simple CRUD operations
 */
@Injectable()
export class LeasesService {
	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly logger: Logger
	) {
		// Logger context handled automatically via app-level configuration
	}

	/**
	 * Get all leases for a user using RPC
	 */
	async findAll(userId: string, query: Record<string, unknown>) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_user_leases', {
				p_user_id: userId,
				p_tenant_id: query.tenantId as string | undefined,
				p_unit_id: query.unitId as string | undefined,
				p_property_id: query.propertyId as string | undefined,
				p_status: query.status as string | undefined,
				p_limit: query.limit as number | undefined,
				p_offset: query.offset as number | undefined,
				p_sort_by: query.sortBy as string | undefined,
				p_sort_order: query.sortOrder as string | undefined
			})

		if (error) {
			this.logger.error(
				{
					error: {
						name: error.constructor?.name || 'DatabaseError',
						message: error.message,
						code: error.code
					},
					leases: { userId, query }
				},
				'Failed to get leases'
			)
			throw new BadRequestException('Failed to retrieve leases')
		}

		return data
	}

	/**
	 * Get lease statistics using RPC
	 */
	async getStats(userId: string) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_lease_stats', { p_user_id: userId })
			.single()

		if (error) {
			this.logger.error('Failed to get lease stats', {
				userId,
				error: error.message
			})
			throw new BadRequestException('Failed to retrieve lease statistics')
		}

		return data
	}

	/**
	 * Get expiring leases using RPC
	 */
	async getExpiring(userId: string, days: number) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_expiring_leases', {
				p_user_id: userId,
				p_days: days
			})

		if (error) {
			this.logger.error('Failed to get expiring leases', {
				userId,
				days,
				error: error.message
			})
			throw new BadRequestException('Failed to retrieve expiring leases')
		}

		return data
	}

	/**
	 * Get single lease using RPC
	 */
	async findOne(userId: string, leaseId: string) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_lease_by_id', {
				p_user_id: userId,
				p_lease_id: leaseId
			})
			.single()

		if (error) {
			this.logger.error('Failed to get lease', {
				userId,
				leaseId,
				error: error.message
			})
			return null
		}

		return data
	}

	/**
	 * Create lease using RPC
	 */
	async create(userId: string, createRequest: CreateLeaseRequest) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('create_lease', {
				p_user_id: userId,
				p_tenant_id: createRequest.tenantId,
				p_unit_id: createRequest.unitId,
				p_start_date: createRequest.startDate,
				p_end_date: createRequest.endDate,
				p_rentamount: createRequest.monthlyRent,
				p_security_deposit: createRequest.securityDeposit,
				p_payment_frequency:
					createRequest.paymentFrequency || 'MONTHLY',
				p_status: createRequest.status || 'DRAFT'
			})
			.single()

		if (error) {
			this.logger.error('Failed to create lease', {
				userId,
				error: error.message
			})
			throw new BadRequestException('Failed to create lease')
		}

		return data
	}

	/**
	 * Update lease using RPC
	 */
	async update(
		userId: string,
		leaseId: string,
		updateRequest: UpdateLeaseRequest
	) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('update_lease', {
				p_user_id: userId,
				p_lease_id: leaseId,
				p_start_date: updateRequest.startDate,
				p_end_date: updateRequest.endDate,
				p_rentamount: updateRequest.monthlyRent,
				p_security_deposit: updateRequest.securityDeposit,
				p_payment_frequency: updateRequest.paymentFrequency,
				p_status: updateRequest.status
			})
			.single()

		if (error) {
			this.logger.error('Failed to update lease', {
				userId,
				leaseId,
				error: error.message
			})
			return null
		}

		return data
	}

	/**
	 * Delete lease using RPC
	 */
	async remove(userId: string, leaseId: string) {
		const { error } = await this.supabaseService
			.getAdminClient()
			.rpc('delete_lease', {
				p_user_id: userId,
				p_lease_id: leaseId
			})

		if (error) {
			this.logger.error('Failed to delete lease', {
				userId,
				leaseId,
				error: error.message
			})
			throw new BadRequestException('Failed to delete lease')
		}
	}

	/**
	 * Renew lease using RPC
	 */
	async renew(userId: string, leaseId: string, endDate: string) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('renew_lease', {
				p_user_id: userId,
				p_lease_id: leaseId,
				p_new_end_date: endDate
			})
			.single()

		if (error) {
			this.logger.error('Failed to renew lease', {
				userId,
				leaseId,
				error: error.message
			})
			throw new BadRequestException('Failed to renew lease')
		}

		return data
	}

	/**
	 * Terminate lease using RPC
	 */
	async terminate(userId: string, leaseId: string, reason?: string) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('terminate_lease', {
				p_user_id: userId,
				p_lease_id: leaseId,
				p_reason: reason || 'Terminated by landlord'
			})
			.single()

		if (error) {
			this.logger.error('Failed to terminate lease', {
				userId,
				leaseId,
				error: error.message
			})
			throw new BadRequestException('Failed to terminate lease')
		}

		return data
	}

	/**
	 * Get lease performance analytics
	 * Per-lease metrics and detailed performance data
	 */
	async getLeasePerformanceAnalytics(
		userId: string,
		query: {
			leaseId?: string
			propertyId?: string
			timeframe: string
		}
	) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_lease_performance_analytics', {
				p_user_id: userId,
				p_lease_id: query.leaseId || undefined,
				p_property_id: query.propertyId || undefined,
				p_timeframe: query.timeframe
			})

		if (error) {
			this.logger.error('Failed to get lease performance analytics', {
				userId,
				query,
				error: error.message
			})
			throw new BadRequestException('Failed to retrieve lease performance analytics')
		}

		return data || []
	}

	/**
	 * Get lease duration and renewal analytics
	 * Analysis of lease terms and renewal patterns
	 */
	async getLeaseDurationAnalytics(
		userId: string,
		query: {
			propertyId?: string
			period: string
		}
	) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_lease_duration_analytics', {
				p_user_id: userId,
				p_property_id: query.propertyId || undefined,
				p_period: query.period
			})

		if (error) {
			this.logger.error('Failed to get lease duration analytics', {
				userId,
				query,
				error: error.message
			})
			throw new BadRequestException('Failed to retrieve lease duration analytics')
		}

		return data || []
	}

	/**
	 * Get lease turnover and retention analytics
	 * Tenant turnover rates and retention metrics
	 */
	async getLeaseTurnoverAnalytics(
		userId: string,
		query: {
			propertyId?: string
			timeframe: string
		}
	) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_lease_turnover_analytics', {
				p_user_id: userId,
				p_property_id: query.propertyId || undefined,
				p_timeframe: query.timeframe
			})

		if (error) {
			this.logger.error('Failed to get lease turnover analytics', {
				userId,
				query,
				error: error.message
			})
			throw new BadRequestException('Failed to retrieve lease turnover analytics')
		}

		return data || []
	}

	/**
	 * Get lease revenue analytics
	 * Per-lease revenue trends and payment analytics
	 */
	async getLeaseRevenueAnalytics(
		userId: string,
		query: {
			leaseId?: string
			propertyId?: string
			period: string
		}
	) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_lease_revenue_analytics', {
				p_user_id: userId,
				p_lease_id: query.leaseId || undefined,
				p_property_id: query.propertyId || undefined,
				p_period: query.period
			})

		if (error) {
			this.logger.error('Failed to get lease revenue analytics', {
				userId,
				query,
				error: error.message
			})
			throw new BadRequestException('Failed to retrieve lease revenue analytics')
		}

		return data || []
	}
}
