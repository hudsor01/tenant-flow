/**
 * Tenant List Service
 *
 * Handles basic tenant listing and search operations.
 * Lease-related queries are delegated to TenantLeaseQueryService.
 */

import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	UnauthorizedException
} from '@nestjs/common'
import type { Tenant, TenantWithLeaseInfo } from '@repo/shared/types/core'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import {
	buildMultiColumnSearch,
	sanitizeSearchInput
} from '../../shared/utils/sql-safe.utils'
import { TenantLeaseQueryService } from './tenant-lease-query.service'

/** Default pagination limit for list queries */
const DEFAULT_LIMIT = 50

/** Maximum allowed pagination limit */
const MAX_LIMIT = 100

export interface ListFilters {
	status?: string
	search?: string
	invitationStatus?: string
	property_id?: string
	limit?: number
	offset?: number
	token?: string
}

@Injectable()
export class TenantListService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger,
		private readonly leaseQueryService: TenantLeaseQueryService
	) {}

	/**
	 * Get a user-scoped Supabase client that respects RLS policies.
	 */
	private requireUserClient(token?: string) {
		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}
		return this.supabase.getUserClient(token)
	}

	/**
	 * Get all tenants for user with optional filtering
	 */
	async findAll(userId: string, filters: ListFilters = {}): Promise<Tenant[]> {
		if (!userId) throw new BadRequestException('User ID required')

		try {
			const [tenantMatches, ownerMatches] = await Promise.all([
				this.fetchTenantsByUser(userId, filters),
				this.fetchTenantsByOwner(userId, filters)
			])

			const deduped = new Map<string, Tenant>()
			for (const tenant of [...ownerMatches, ...tenantMatches]) {
				if (tenant?.id && !deduped.has(tenant.id)) {
					deduped.set(tenant.id, tenant)
				}
			}

			return Array.from(deduped.values())
		} catch (error) {
			this.logger.error('Error finding all tenants', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			throw error
		}
	}

	/**
	 * Fetch tenants where user is the tenant themselves
	 */
	private async fetchTenantsByUser(
		userId: string,
		filters: ListFilters
	): Promise<Tenant[]> {
		const client = this.requireUserClient(filters.token)
		let query = client
			.from('tenants')
			.select(
				'id, user_id, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, identity_verified, created_at, updated_at'
			)
			.eq('user_id', userId)

		if (filters.search) {
			const sanitized = sanitizeSearchInput(filters.search)
			if (sanitized) {
				const searchFilter = buildMultiColumnSearch(sanitized, [
					'emergency_contact_name',
					'emergency_contact_phone'
				])
				query = query.or(searchFilter)
			}
		}

		const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
		const offset = filters.offset ?? 0
		query = query.range(offset, offset + limit - 1)

		const { data, error } = await query

		if (error) {
			this.logger.error('Failed to fetch tenants', {
				error: error.message,
				userId
			})
			throw new BadRequestException('Failed to retrieve tenants')
		}

		return (data as Tenant[]) || []
	}

	/**
	 * Fetch tenants for a property owner using RPC function
	 */
	private async fetchTenantsByOwner(
		userId: string,
		filters: ListFilters
	): Promise<Tenant[]> {
		const client = this.requireUserClient(filters.token)
		const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
		const offset = filters.offset ?? 0

		// Get tenant IDs via RPC function (single efficient JOIN query)
		const { data: tenantIds, error: rpcError } = await client.rpc(
			'get_tenants_by_owner',
			{ p_user_id: userId }
		)

		if (rpcError) {
			this.logger.error('RPC get_tenants_by_owner failed', {
				error: rpcError.message,
				userId
			})
			throw new InternalServerErrorException('Failed to retrieve tenants')
		}

		if (!tenantIds?.length) {
			return []
		}

		// Fetch tenant records with pagination and search
		let query = client
			.from('tenants')
			.select(
				'id, user_id, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, identity_verified, created_at, updated_at'
			)
			.in('id', tenantIds as string[])

		if (filters.search) {
			const sanitized = sanitizeSearchInput(filters.search)
			if (sanitized) {
				const searchFilter = buildMultiColumnSearch(sanitized, [
					'emergency_contact_name',
					'emergency_contact_phone'
				])
				query = query.or(searchFilter)
			}
		}

		const { data, error } = await query.range(offset, offset + limit - 1)

		if (error) {
			this.logger.error('Failed to fetch tenants by owner', {
				error: error.message,
				userId
			})
			throw new BadRequestException('Failed to retrieve tenants')
		}

		return (data as Tenant[]) || []
	}

	/**
	 * Get all tenants with active lease details
	 * Delegates to TenantLeaseQueryService for the complex nested queries
	 */
	async findAllWithLeaseInfo(
		userId: string,
		filters: Omit<ListFilters, 'status'> = {}
	): Promise<TenantWithLeaseInfo[]> {
		return this.leaseQueryService.findAllWithLeaseInfo(userId, filters)
	}

	/**
	 * Get all tenants invited to a specific property
	 * Delegates to TenantLeaseQueryService
	 */
	async findByProperty(
		userId: string,
		propertyId: string,
		filters: ListFilters = {}
	): Promise<Tenant[]> {
		return this.leaseQueryService.findByProperty(userId, propertyId, filters)
	}
}
