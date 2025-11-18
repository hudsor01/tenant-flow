/**
 * Tenant Query Service - Coordinator Pattern
 *
 * Coordinates specialized query services with clean, modern API
 * No backward compatibility - all callers must migrate
 *
 * Performance improvements:
 * - Eliminates N+1 query pattern with batch operations
 * - Column selection to avoid over-fetching
 * - Proper index usage for all queries
 */

import { Injectable } from '@nestjs/common'
import type { Tenant, TenantStats, TenantSummary, TenantWithLeaseInfo, RentPayment } from '@repo/shared/types/core'
import { TenantListService, type ListFilters } from './tenant-list.service'
import { TenantDetailService } from './tenant-detail.service'
import { TenantStatsService } from './tenant-stats.service'
import { TenantRelationsService } from './tenant-relations.service'

@Injectable()
export class TenantQueryService {
	constructor(
		private readonly list: TenantListService,
		private readonly detail: TenantDetailService,
		private readonly stats: TenantStatsService,
		private readonly relations: TenantRelationsService
	) {}

	// ============================================================================
	// LIST QUERIES
	// ============================================================================

	async findAll(userId: string, filters: ListFilters = {}): Promise<Tenant[]> {
		return this.list.findAll(userId, filters)
	}

	async findAllWithLeaseInfo(userId: string, filters?: Omit<ListFilters, 'status'>): Promise<TenantWithLeaseInfo[]> {
		return this.list.findAllWithActiveLease(userId, filters)
	}

	// ============================================================================
	// DETAIL QUERIES
	// ============================================================================

	async findOne(tenantId: string): Promise<Tenant> {
		return this.detail.findById(tenantId)
	}

	async findOneWithLease(tenantId: string): Promise<TenantWithLeaseInfo> {
		return this.detail.findByIdWithLeases(tenantId)
	}

	async getTenantByAuthUserId(authUserId: string): Promise<Tenant> {
		return this.detail.findByAuthUserId(authUserId)
	}

	// ============================================================================
	// STATISTICS
	// ============================================================================

	async getStats(userId: string): Promise<TenantStats> {
		return this.stats.getStatusCounts(userId)
	}

	async getSummary(userId: string): Promise<TenantSummary> {
		return this.stats.getSummary(userId)
	}

	async fetchPaymentStatuses(tenantIds: string[]) {
		return this.stats.getLatestPaymentStatus(tenantIds)
	}

	// ============================================================================
	// RELATIONS & JOINS
	// ============================================================================

	async getOwnerPropertyIds(ownerId: string): Promise<string[]> {
		return this.relations.getOwnerPropertyIds(ownerId)
	}

	async getTenantIdsForOwner(ownerId: string): Promise<string[]> {
		return this.relations.getTenantIdsForOwner(ownerId)
	}

	async getTenantPaymentHistory(tenantId: string, limit?: number): Promise<RentPayment[]> {
		return this.relations.getPaymentHistory(tenantId, limit)
	}

	async getTenantPaymentHistoryForTenant(tenantId: string, limit?: number): Promise<RentPayment[]> {
		return this.relations.getPaymentHistory(tenantId, limit)
	}

	async batchFetchPaymentStatuses(tenantIds: string[]): Promise<Map<string, RentPayment>> {
		return this.relations.fetchPaymentStatuses(tenantIds)
	}
}
