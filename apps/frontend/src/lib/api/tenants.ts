/**
 * Tenants API - Direct API calls only
 */

import { apiClient } from '@/lib/api-client'
import type {
	Tenant,
	CreateTenantInput,
	UpdateTenantInput,
	TenantQuery,
	TenantStats
} from '@repo/shared'
import { z } from 'zod'
import {
	TenantSchema,
	TenantArraySchema,
	TenantStatsSchema
} from '@/lib/api/schemas/tenants'



/**
 * Tenants API functions - Direct calls only
 */
export const tenantApi = {
	async getAll(filters?: TenantQuery) {
		const params = filters
			? new URLSearchParams(
					Object.entries(filters)
						.filter(
							([, value]) => value !== undefined && value !== null
						)
						.map(([key, value]) => [key, String(value)])
				).toString()
			: ''
		return apiClient.getValidated<Tenant[]>(
			`/tenants${params ? `?${params}` : ''}`,
			TenantArraySchema,
			'Tenant[]'
		)
	},

	async getById(id: string) {
	return apiClient.getValidated<Tenant>(`/tenants/${id}`, TenantSchema, 'Tenant')
	},

	async create(data: CreateTenantInput) {
		return apiClient.postValidated<Tenant>(
			'/tenants',
			TenantSchema,
			'Tenant',
			data as Record<string, unknown>,
			undefined,
			{ throwOnFailure: true }
		)
	},

	async update(id: string, data: UpdateTenantInput) {
		return apiClient.putValidated<Tenant>(
			`/tenants/${id}`,
			TenantSchema,
			'Tenant',
			data as Record<string, unknown>,
			undefined,
			{ throwOnFailure: true }
		)
	},

	async delete(id: string) {
			await apiClient.deleteValidated<{ success: boolean }>(
				`/tenants/${id}`,
				z.object({ success: z.boolean() }),
				'TenantDelete'
			)
		// Return void to match hook expectations
		return
	},

	async getStats() {
	return apiClient.getValidated<TenantStats>('/tenants/stats', TenantStatsSchema, 'TenantStats')
	},

	async search(query: string) {
	return apiClient.getValidated<Tenant[]>('/tenants/search', TenantArraySchema, 'Tenant[]', { params: { q: query } })
	},

	async getByProperty(propertyId: string) {
	return apiClient.getValidated<Tenant[]>(`/tenants/by-property/${propertyId}`, TenantArraySchema, 'Tenant[]')
	}
}
