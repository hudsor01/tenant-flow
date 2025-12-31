/**
 * Tenant Payment Query Service
 *
 * Handles lookup and access control queries for tenant payments.
 * Extracted from TenantPaymentService to maintain <300 line limit per CLAUDE.md
 */

import {
	ForbiddenException,
	Injectable,
	InternalServerErrorException,
	NotFoundException
} from '@nestjs/common'
import type { RentPayment, PaymentStatus } from '@repo/shared/types/core'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'

@Injectable()
export class TenantPaymentQueryService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Get tenant record by auth user ID
	 */
	async getTenantByAuthUserId(authUserId: string): Promise<{ id: string }> {
		const client = this.supabase.getAdminClient()
		const { data, error } = await client
			.from('tenants')
			.select('id')
			.eq('user_id', authUserId)
			.single()

		if (error || !data) {
			this.logger.warn('Tenant record not found for auth user', {
				authUserId,
				error
			})
			throw new NotFoundException('Tenant record not found')
		}

		return { id: data.id }
	}

	/**
	 * Verify tenant is owned by user (through property ownership)
	 * Throws ForbiddenException if not authorized
	 */
	async ensureTenantOwnedByUser(
		userId: string,
		tenantId: string
	): Promise<void> {
		const client = this.supabase.getAdminClient()

		const { data: lease, error: leaseError } = await client
			.from('leases')
			.select('id, unit_id')
			.eq('primary_tenant_id', tenantId)
			.order('start_date', { ascending: false })
			.limit(1)
			.maybeSingle()

		if (leaseError || !lease) {
			this.logger.warn('No lease found for tenant when checking ownership', {
				tenantId,
				error: leaseError
			})
			throw new NotFoundException('Lease not found for tenant')
		}

		let propertyId = null

		if (lease?.unit_id) {
			const { data: unit, error: unitError } = await client
				.from('units')
				.select('property_id')
				.eq('id', lease.unit_id)
				.single()

			if (unitError || !unit?.property_id) {
				this.logger.warn(
					'Unit missing property when verifying tenant ownership',
					{
						unit_id: lease.unit_id,
						error: unitError
					}
				)
				throw new NotFoundException('Property not found for tenant lease')
			}
			propertyId = unit.property_id
		}

		if (!propertyId) {
			this.logger.warn('Tenant lease has no associated property', {
				tenantId,
				lease_id: lease?.id
			})
			throw new NotFoundException('Property not associated with tenant lease')
		}

		const { data: property, error: propertyError } = await client
			.from('properties')
			.select('owner_user_id')
			.eq('id', propertyId)
			.single()

		if (propertyError || !property) {
			this.logger.warn('Property not found during tenant ownership check', {
				propertyId,
				error: propertyError
			})
			throw new NotFoundException('Property not found for tenant')
		}

		const propertyOwnerUserId = property.owner_user_id
		if (propertyOwnerUserId !== userId) {
			this.logger.warn('User is not property owner', {
				userId,
				propertyOwnerId: propertyOwnerUserId
			})
			throw new ForbiddenException('Access denied: Not property owner')
		}
	}

	/**
	 * Get property IDs owned by a user
	 */
	async getOwnerPropertyIds(authUserId: string): Promise<string[]> {
		const client = this.supabase.getAdminClient()

		const { data, error } = await client
			.from('properties')
			.select('id')
			.eq('owner_user_id', authUserId)

		if (error) {
			this.logger.error(
				'Failed to fetch owner properties for payment summary',
				{
					authUserId,
					error: error.message
				}
			)
			throw new InternalServerErrorException('Failed to fetch owner properties')
		}

		return (data || []).map(p => p.id)
	}

	/**
	 * Get tenant IDs for properties owned by a user
	 */
	async getTenantIdsForOwner(ownerId: string): Promise<string[]> {
		const propertyIds = await this.getOwnerPropertyIds(ownerId)

		if (!propertyIds.length) {
			return []
		}

		const client = this.supabase.getAdminClient()
		const { data, error } = await client
			.from('leases')
			.select(
				`
				primary_tenant_id,
				units!inner(property_id)
			`
			)
			.in('units.property_id', propertyIds)
			.not('primary_tenant_id', 'is', null)

		if (error) {
			this.logger.error('Failed to fetch leases for owner payment summary', {
				ownerId,
				error: error.message
			})
			throw new InternalServerErrorException('Failed to fetch owner leases')
		}

		const tenantIds = (data || [])
			.map(
				(lease: { primary_tenant_id: string | null }) => lease.primary_tenant_id
			)
			.filter((id): id is string => id !== null && id !== undefined)

		return Array.from(new Set(tenantIds))
	}

	/**
	 * Query tenant payments with filters
	 * Migrated from TenantAnalyticsService
	 */
	async queryTenantPayments(
		tenantId: string,
		filters?: {
			status?: PaymentStatus
			startDate?: string
			endDate?: string
			limit?: number
		}
	): Promise<RentPayment[]> {
		try {
			const client = this.supabase.getAdminClient()
			let queryBuilder = client
				.from('rent_payments')
				.select('*')
				.eq('tenant_id', tenantId)

			if (filters?.status) {
				queryBuilder = queryBuilder.eq('status', filters.status)
			}

			if (filters?.startDate) {
				queryBuilder = queryBuilder.gte('created_at', filters.startDate)
			}

			if (filters?.endDate) {
				queryBuilder = queryBuilder.lte('created_at', filters.endDate)
			}

			const limit = filters?.limit || 50
			queryBuilder = queryBuilder
				.order('created_at', { ascending: false })
				.limit(limit)

			const { data, error } = await queryBuilder

			if (error) {
				this.logger.error('Failed to query tenant payments', {
					error: error.message,
					tenantId
				})
				return []
			}

			return (data as RentPayment[]) || []
		} catch (error) {
			this.logger.error('Error querying tenant payments', {
				error: error instanceof Error ? error.message : String(error),
				tenantId
			})
			return []
		}
	}
}
