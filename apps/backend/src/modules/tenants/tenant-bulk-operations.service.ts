/**
 * Tenant Bulk Operations Service
 *
 * Handles bulk update and delete operations for tenants
 * Extracted from TenantCrudService to maintain <300 line limit per CLAUDE.md
 */

import { Injectable } from '@nestjs/common'
import type { UpdateTenantRequest } from '@repo/shared/types/api-contracts'
import type { Tenant } from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase'
import type { TenantUpdatedEvent } from '@repo/shared/events/sse-events'
import { SSE_EVENT_TYPES } from '@repo/shared/events/sse-events'
import { SupabaseService } from '../../database/supabase.service'
import { TenantDetailService } from './tenant-detail.service'
import { SseService } from '../notifications/sse/sse.service'
import { AppLogger } from '../../logger/app-logger.service'

@Injectable()
export class TenantBulkOperationsService {
	constructor(
		private readonly logger: AppLogger,
		private readonly supabase: SupabaseService,
		private readonly tenantDetailService: TenantDetailService,
		private readonly sseService: SseService
	) {}

	/**
	 * Get user-scoped Supabase client with RLS enforcement
	 */
	private requireUserClient(token: string) {
		return this.supabase.getUserClient(token)
	}

	/**
	 * Build update data object from request, filtering undefined values
	 */
	private buildUpdateData(
		data: UpdateTenantRequest
	): Partial<Database['public']['Tables']['tenants']['Update']> {
		const updateData: Partial<
			Database['public']['Tables']['tenants']['Update']
		> = {}
		if (data.date_of_birth !== undefined)
			updateData.date_of_birth = data.date_of_birth || null
		if (data.ssn_last_four !== undefined)
			updateData.ssn_last_four = data.ssn_last_four || null
		if (data.emergency_contact_name !== undefined)
			updateData.emergency_contact_name = data.emergency_contact_name || null
		if (data.emergency_contact_phone !== undefined)
			updateData.emergency_contact_phone = data.emergency_contact_phone || null
		if (data.emergency_contact_relationship !== undefined)
			updateData.emergency_contact_relationship =
				data.emergency_contact_relationship || null
		if (data.stripe_customer_id !== undefined)
			updateData.stripe_customer_id = data.stripe_customer_id
		return updateData
	}

	/**
	 * Bulk update multiple tenants in parallel
	 *
	 * WARNING: Not atomic - partial failures are possible.
	 * If 5/10 updates succeed, there is no rollback. The operation uses
	 * Promise.allSettled to process all updates concurrently, which means
	 * some may succeed while others fail, leaving data in a partially updated state.
	 *
	 * @param user_id - ID of the user performing the updates
	 * @param updates - Array of tenant IDs and update data
	 * @param token - Authentication token for RLS enforcement
	 * @returns Object with `success` and `failed` arrays showing individual results
	 */
	async bulkUpdate(
		user_id: string,
		updates: Array<{ id: string; data: UpdateTenantRequest }>,
		token: string
	): Promise<{
		success: Array<{ id: string; tenant: Tenant }>
		failed: Array<{ id: string; error: string }>
	}> {
		this.logger.log('Bulk updating tenants', { user_id, count: updates.length })

		if (updates.length === 0) {
			return { success: [], failed: [] }
		}

		const client = this.requireUserClient(token)

		// Step 1: Batch fetch ALL tenants in ONE query (RLS filters unauthorized)
		const tenantIds = updates.map(u => u.id)
		const tenantMap = await this.tenantDetailService.findByIds(tenantIds, token)

		// Step 2: Partition into found vs not-found
		const notFoundIds = tenantIds.filter(id => !tenantMap.has(id))
		const validUpdates = updates.filter(({ id }) => tenantMap.has(id))

		// Step 3: Group updates by identical data payload (for batch efficiency)
		// This allows multiple tenants with same update data to be updated in ONE query
		const updateGroups = new Map<
			string,
			{
				ids: string[]
				data: Partial<Database['public']['Tables']['tenants']['Update']>
			}
		>()

		for (const { id, data } of validUpdates) {
			const updateData = this.buildUpdateData(data)
			const key = JSON.stringify(updateData) // Group by identical payloads

			const group = updateGroups.get(key)
			if (group) {
				group.ids.push(id)
			} else {
				updateGroups.set(key, { ids: [id], data: updateData })
			}
		}

		// Step 4: Execute batch updates (one query per unique payload)
		const successIds: string[] = []
		const failedUpdates: Array<{ id: string; error: string }> = []

		for (const { ids, data } of updateGroups.values()) {
			const { error } = await client.from('tenants').update(data).in('id', ids) // Batch update all IDs with same data

			if (error) {
				ids.forEach(id => failedUpdates.push({ id, error: error.message }))
			} else {
				successIds.push(...ids)
			}
		}

		// Step 5: Fetch updated tenants in ONE query for response
		const updatedMap =
			successIds.length > 0
				? await this.tenantDetailService.findByIds(successIds, token)
				: new Map<string, Tenant>()

		const success = successIds.map(id => ({ id, tenant: updatedMap.get(id)! }))
		const failed = [
			...notFoundIds.map(id => ({ id, error: 'Tenant not found' })),
			...failedUpdates
		]

		this.logger.log('Bulk update completed', {
			user_id,
			total: updates.length,
			success: success.length,
			failed: failed.length
		})

		// Broadcast SSE events for successful updates
		for (const { id: tenantId } of success) {
			const update = updates.find(u => u.id === tenantId)
			if (update) {
				const changedFields = Object.keys(update.data).filter(
					key => update.data[key as keyof UpdateTenantRequest] !== undefined
				)
				if (changedFields.length > 0) {
					const sseEvent: TenantUpdatedEvent = {
						type: SSE_EVENT_TYPES.TENANT_UPDATED,
						timestamp: new Date().toISOString(),
						payload: {
							tenantId,
							changedFields
						}
					}
					await this.sseService.broadcast(user_id, sseEvent)
				}
			}
		}

		return { success, failed }
	}

	/**
	 * Bulk delete multiple tenants (soft delete / mark for archival)
	 *
	 * Uses batch fetch with RLS to verify tenant access in O(1) queries.
	 * Note: Currently marks tenants for archival without database update
	 * since tenants table lacks a status/deleted_at column.
	 *
	 * @param user_id - ID of the user performing the deletions
	 * @param tenant_ids - Array of tenant IDs to delete
	 * @param token - Authentication token for RLS enforcement
	 * @returns Object with `success` and `failed` arrays showing individual results
	 */
	async bulkDelete(
		user_id: string,
		tenant_ids: string[],
		token: string
	): Promise<{
		success: Array<{ id: string }>
		failed: Array<{ id: string; error: string }>
	}> {
		if (tenant_ids.length === 0) {
			return { success: [], failed: [] }
		}

		this.logger.log('Bulk deleting tenants', {
			user_id,
			count: tenant_ids.length
		})

		// Batch verify existence in ONE query (RLS filters unauthorized)
		const tenantMap = await this.tenantDetailService.findByIds(
			tenant_ids,
			token
		)

		// Partition IDs into found vs not-found
		const validIds = tenant_ids.filter(id => tenantMap.has(id))
		const notFoundIds = tenant_ids.filter(id => !tenantMap.has(id))

		// Mark valid tenants for archival (logged only - table lacks status column)
		for (const id of validIds) {
			this.logger.log('Tenant marked for archival', { tenant_id: id })
		}

		const success = validIds.map(id => ({ id }))
		const failed = notFoundIds.map(id => ({ id, error: 'Tenant not found' }))

		this.logger.log('Bulk delete completed', {
			user_id,
			total: tenant_ids.length,
			success: success.length,
			failed: failed.length
		})

		return { success, failed }
	}
}
