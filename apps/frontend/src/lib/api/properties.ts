/**
 * Properties API - Direct API calls only
 */

import { apiClient } from '@/lib/api-client'
import type {
	Property,
	CreatePropertyInput,
	UpdatePropertyInput,
	PropertyQuery,
	Unit,
	UpdateUnitInput,
	PropertyStats
} from '@repo/shared'

/**
 * Query keys for React Query caching
 */
export const propertyKeys = {
	all: ['properties'] as const,
	lists: () => [...propertyKeys.all, 'list'] as const,
	list: (filters?: PropertyQuery) =>
		[...propertyKeys.lists(), filters] as const,
	details: () => [...propertyKeys.all, 'detail'] as const,
	detail: (id: string) => [...propertyKeys.details(), id] as const,
	stats: () => [...propertyKeys.all, 'stats'] as const
}

/**
 * Properties API functions - Direct calls only
 */
export const propertyApi = {
	async getAll(filters?: PropertyQuery) {
		const params = filters
			? new URLSearchParams(
					Object.entries(filters)
						.filter(
							([, value]) => value !== undefined && value !== null
						)
						.map(([key, value]) => [key, String(value)])
				).toString()
			: ''
		return apiClient.get<Property[]>(
			`/properties${params ? `?${params}` : ''}`
		)
	},

	async getById(id: string) {
		return apiClient.get<Property>(`/properties/${id}`)
	},

	async create(data: CreatePropertyInput) {
		return apiClient.post<Property>('/properties', data)
	},

	async update(id: string, data: UpdatePropertyInput) {
		return apiClient.put<Property>(`/properties/${id}`, data)
	},

	async delete(id: string) {
		return apiClient.delete<{ success: boolean }>(`/properties/${id}`)
	},

	async getStats() {
		return apiClient.get<PropertyStats>('/properties/stats')
	},

	async getUnits(propertyId: string) {
		return apiClient.get<Unit[]>(`/properties/${propertyId}/units`)
	},

	async updateUnit(
		propertyId: string,
		unitId: string,
		data: UpdateUnitInput
	) {
		return apiClient.put<Unit>(
			`/properties/${propertyId}/units/${unitId}`,
			data
		)
	},

	async uploadImage(propertyId: string, formData: FormData) {
		return apiClient.post<{ url: string }>(
			`/properties/${propertyId}/images`,
			formData
		)
	},

	async getPropertyStats() {
		return apiClient.get<PropertyStats>('/properties/stats')
	}
}
