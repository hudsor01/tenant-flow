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
import type {
	Tenant,
	TenantStats,
	TenantSummary,
	TenantWithLeaseInfo,
	RentPayment
} from '@repo/shared/types/core'
import { TenantDetailService } from './tenant-detail.service'
import { TenantListService, ListFilters } from './tenant-list.service'
import { TenantStatsService } from './tenant-stats.service'
import { TenantRelationService, LeaseHistoryItem } from './tenant-relation.service'
import {
	TenantInvitationQueryService,
	TenantInvitation,
	InvitationFilters
} from './tenant-invitation-query.service'

// Re-export types for backwards compatibility
export type { ListFilters } from './tenant-list.service'
export type { TenantInvitation, InvitationFilters } from './tenant-invitation-query.service'
export type { LeaseHistoryItem } from './tenant-relation.service'

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
	 */
	async findAllWithLeaseInfo(
		userId: string,
		filters: Omit<ListFilters, 'status'> = {}
	): Promise<TenantWithLeaseInfo[]> {
		return this.listService.findAllWithLeaseInfo(userId, filters)
	}

	/**
	 * Get all tenants invited to a specific property
	 * Excludes tenants who already have an active lease (one property per tenant)
	 */
	async findByProperty(
		userId: string,
		propertyId: string,
		filters: ListFilters = {}
	): Promise<Tenant[]> {
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
	async findOneWithLease(tenantId: string, token: string): Promise<TenantWithLeaseInfo> {
		return this.detailService.findOneWithLease(tenantId, token)
	}

	/**
	 * Get tenant by auth user ID
	 */
	async getTenantByAuthUserId(authUserId: string, token: string): Promise<Tenant> {
		return this.detailService.getTenantByAuthUserId(authUserId, token)
	}

	// ============================================================================
	// STATISTICS - Delegated to TenantStatsService
	// ============================================================================

	/**
	 * Get tenant count for a user
	 */
	async getStats(userId: string): Promise<TenantStats> {
		return this.statsService.getStats(userId)
	}

	/**
	 * Get summary stats (active tenants, pending payments, etc.)
	 */
	async getSummary(userId: string): Promise<TenantSummary> {
		return this.statsService.getSummary(userId)
	}

	/**
	 * Get latest payment status for multiple tenants
	 */
	async fetchPaymentStatuses(tenantIds: string[]): Promise<RentPayment[]> {
		return this.statsService.fetchPaymentStatuses(tenantIds)
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
		limit?: number
	): Promise<RentPayment[]> {
		return this.relationService.getTenantPaymentHistory(tenantId, limit)
	}

	/**
	 * Alias for getTenantPaymentHistory (backwards compatibility)
	 */
	async getTenantPaymentHistoryForTenant(
		tenantId: string,
		limit?: number
	): Promise<RentPayment[]> {
		return this.getTenantPaymentHistory(tenantId, limit)
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
	async getTenantLeaseHistory(tenantId: string): Promise<LeaseHistoryItem[]> {
		return this.relationService.getTenantLeaseHistory(tenantId)
	}

	// ============================================================================
	// INVITATIONS - Delegated to TenantInvitationQueryService
	// ============================================================================

	/**
	 * Get paginated tenant invitations for an owner
	 */
	async getInvitations(
		userId: string,
		filters?: InvitationFilters
	): Promise<{ data: TenantInvitation[]; total: number }> {
		return this.invitationService.getInvitations(userId, filters)
	}
}
