/**
 * Tenants API - Direct API calls only
 */

import { apiClient } from '@/lib/api-client'
import type {
	Tenant,
	CreateTenantInput,
	UpdateTenantInput,
<<<<<<< HEAD
	TenantQuery,
	TenantStats
} from '@repo/shared'
import { z } from 'zod'
import {
	TenantSchema,
	TenantArraySchema,
	TenantStatsSchema
} from '@/lib/api/schemas/tenants'
=======
	TenantQuery
} from '@repo/shared'

export interface TenantStats {
	total: number
	active: number
	inactive: number
	newThisMonth: number
}

/**
 * Query keys for React Query caching
 */
export const tenantKeys = {
	all: ['tenants'] as const,
	lists: () => [...tenantKeys.all, 'list'] as const,
	list: (filters?: TenantQuery) => [...tenantKeys.lists(), filters] as const,
	details: () => [...tenantKeys.all, 'detail'] as const,
	detail: (id: string) => [...tenantKeys.details(), id] as const,
	stats: () => [...tenantKeys.all, 'stats'] as const,
	byProperty: (propertyId: string) =>
		[...tenantKeys.all, 'by-property', propertyId] as const
}
>>>>>>> origin/main

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
<<<<<<< HEAD
		return apiClient.getValidated<Tenant[]>(
			`/tenants${params ? `?${params}` : ''}`,
			TenantArraySchema,
			'Tenant[]'
		)
	},

	async getById(id: string) {
		return apiClient.getValidated<Tenant>(
			`/tenants/${id}`,
			TenantSchema,
			'Tenant'
		)
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
=======
		return apiClient.get<Tenant[]>(`/tenants${params ? `?${params}` : ''}`)
	},

	async getById(id: string) {
		return apiClient.get<Tenant>(`/tenants/${id}`)
	},

	async create(data: CreateTenantInput) {
		return apiClient.post<Tenant>('/tenants', data)
	},

	async update(id: string, data: UpdateTenantInput) {
		return apiClient.put<Tenant>(`/tenants/${id}`, data)
	},

	async delete(id: string) {
		await apiClient.delete<{ success: boolean }>(`/tenants/${id}`)
>>>>>>> origin/main
		// Return void to match hook expectations
		return
	},

	async getStats() {
<<<<<<< HEAD
		return apiClient.getValidated<TenantStats>(
			'/tenants/stats',
			TenantStatsSchema,
			'TenantStats'
		)
	},

	async search(query: string) {
		return apiClient.getValidated<Tenant[]>(
			'/tenants/search',
			TenantArraySchema,
			'Tenant[]',
			{ params: { q: query } }
		)
	},

	async getByProperty(propertyId: string) {
		return apiClient.getValidated<Tenant[]>(
			`/tenants/by-property/${propertyId}`,
			TenantArraySchema,
			'Tenant[]'
		)
=======
		return apiClient.get<TenantStats>('/tenants/stats')
	},

	async getByProperty(propertyId: string) {
		return apiClient.get<Tenant[]>(`/tenants/by-property/${propertyId}`)
>>>>>>> origin/main
	}
}
