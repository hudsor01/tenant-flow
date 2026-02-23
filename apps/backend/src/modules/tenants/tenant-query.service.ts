/**
 * Tenant Query Service - Coordinator Pattern
 *
 * Coordinates specialized query services with clean, modern API
 * This is now a facade that delegates to focused services.
 *
 * Performance improvements:
 * - Eliminates N+1 query pattern with batch operations
 * - Column selection to avoid over-fetching
 * - Proper index usage for all queries
 */

import { Injectable } from '@nestjs/common'
import type { TenantStats, TenantSummary } from '@repo/shared/types/stats'
import type {
	Tenant,
	TenantWithLeaseInfo,
	RentPayment
} from '@repo/shared/types/core'
import { TenantDetailService } from './tenant-detail.service'
import {
	TenantListService,
	type ListFilters
} from './tenant-list.service'
import { TenantStatsService } from './tenant-stats.service'
import {
	TenantRelationService,
	type LeaseHistoryItem
} from './tenant-relation.service'
import {
	TenantInvitationQueryService,
	type TenantInvitation,
	type InvitationFilters
} from './tenant-invitation-query.service'

@Injectable()
export class TenantQueryService {
	constructor(
		private readonly detailService: TenantDetailService,
		private readonly listService: TenantListService,
		private readonly statsService: TenantStatsService,
		private readonly relationService: TenantRelationService,
		private readonly invitationService: TenantInvitationQueryService
	) {}

	// ============================================================================
	// LIST QUERIES - Delegated to TenantListService
	// ============================================================================

	/**
	 * Get all tenants for user with optional filtering
	 */
	async findAll(userId: string, filters: ListFilters = {}): Promise<Tenant[]> {
		return this.listService.findAll(userId, filters)
	}

	/**
	 * Get all tenants with active lease details
	 * Returns { data, count } for accurate pagination totals
	 */
	async findAllWithLeaseInfo(
		userId: string,
		filters: Omit<ListFilters, 'status'> = {}
	): Promise<{ data: TenantWithLeaseInfo[]; count: number }> {
		return this.listService.findAllWithLeaseInfo(userId, filters)
	}

	/**
	 * Get all tenants invited to a specific property
	 * Excludes tenants who already have an active lease (one property per tenant)
	 * Returns { data, count } for accurate pagination totals
	 */
	async findByProperty(
		userId: string,
		propertyId: string,
		filters: ListFilters = {}
	): Promise<{ data: Tenant[]; count: number }> {
		return this.listService.findByProperty(userId, propertyId, filters)
	}

	// ============================================================================
	// DETAIL QUERIES - Delegated to TenantDetailService
	// All methods require token for RLS enforcement
	// ============================================================================

	/**
	 * Get single tenant by ID
	 */
	async findOne(tenantId: string, token: string): Promise<Tenant> {
		return this.detailService.findOne(tenantId, token)
	}

	/**
	 * Get tenant with all lease details
	 */
	async findOneWithLease(
		tenantId: string,
		token: string
	): Promise<TenantWithLeaseInfo> {
		return this.detailService.findOneWithLease(tenantId, token)
	}

	/**
	 * Get tenant by auth user ID
	 */
	async getTenantByAuthUserId(
		authUserId: string,
		token: string
	): Promise<Tenant> {
		return this.detailService.getTenantByAuthUserId(authUserId, token)
	}

	// ============================================================================
	// STATISTICS - Delegated to TenantStatsService
	// ============================================================================

	/**
	 * Get tenant count for a user
	 */
	async getStats(userId: string, token: string): Promise<TenantStats> {
		return this.statsService.getStats(userId, token)
	}

	/**
	 * Get summary stats (active tenants, pending payments, etc.)
	 */
	async getSummary(userId: string, token: string): Promise<TenantSummary> {
		return this.statsService.getSummary(userId, token)
	}

	/**
	 * Get latest payment status for multiple tenants
	 */
	async fetchPaymentStatuses(
		userId: string,
		token: string,
		tenantIds: string[]
	): Promise<RentPayment[]> {
		return this.statsService.fetchPaymentStatuses(userId, token, tenantIds)
	}

	// ============================================================================
	// RELATIONS & JOINS - Delegated to TenantRelationService
	// ============================================================================

	/**
	 * Get all owner property IDs
	 */
	async getOwnerPropertyIds(authUserId: string): Promise<string[]> {
		return this.relationService.getOwnerPropertyIds(authUserId)
	}

	/**
	 * Get all tenant IDs for owner (via lease relationships)
	 */
	async getTenantIdsForOwner(authUserId: string): Promise<string[]> {
		return this.relationService.getTenantIdsForOwner(authUserId)
	}

	/**
	 * Get payment history for tenant
	 */
	async getTenantPaymentHistory(
		tenantId: string,
		requesterUserId: string,
		limit?: number
	): Promise<RentPayment[]> {
		return this.relationService.getTenantPaymentHistory(
			tenantId,
			requesterUserId,
			limit
		)
	}

	/**
	 * Alias for getTenantPaymentHistory (backwards compatibility)
	 */
	async getTenantPaymentHistoryForTenant(
		tenantId: string,
		requesterUserId: string,
		limit?: number
	): Promise<RentPayment[]> {
		return this.getTenantPaymentHistory(tenantId, requesterUserId, limit)
	}

	/**
	 * Fetch payment statuses for multiple tenants in batch
	 */
	async batchFetchPaymentStatuses(
		tenantIds: string[]
	): Promise<Map<string, RentPayment>> {
		return this.relationService.batchFetchPaymentStatuses(tenantIds)
	}

	/**
	 * Get all leases (past and current) for a tenant
	 * Used in tenant detail view for lease history
	 */
	async getTenantLeaseHistory(
		tenantId: string,
		requesterUserId: string
	): Promise<LeaseHistoryItem[]> {
		return this.relationService.getTenantLeaseHistory(
			tenantId,
			requesterUserId
		)
	}

	// ============================================================================
	// INVITATIONS - Delegated to TenantInvitationQueryService
	// ============================================================================

	/**
	 * Get paginated tenant invitations for an owner
	 */
	async getInvitations(
		userId: string,
		token: string,
		filters?: InvitationFilters
	): Promise<{ data: TenantInvitation[]; total: number }> {
		return this.invitationService.getInvitations(userId, token, filters)
	}
}
