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
import { z } from 'zod'
import {
	PropertySchema,
	PropertyArraySchema,
	UnitArraySchema,
	UnitSchema
} from '@/lib/api/schemas/properties'

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
		return apiClient.getValidated<Property[]>(
			`/properties${params ? `?${params}` : ''}`,
			PropertyArraySchema,
			'Property[]'
		)
	},

	async getById(id: string) {
		return apiClient.getValidated<Property>(
			`/properties/${id}`,
			PropertySchema,
			'Property'
		)
	},

	async create(data: CreatePropertyInput) {
		return apiClient.postValidated<Property>(
			'/properties',
			PropertySchema,
			'Property',
			data as Record<string, unknown>,
			undefined,
			{ throwOnFailure: true }
		)
	},

	async update(id: string, data: UpdatePropertyInput) {
		return apiClient.putValidated<Property>(
			`/properties/${id}`,
			PropertySchema,
			'Property',
			data as Record<string, unknown>,
			undefined,
			{ throwOnFailure: true }
		)
	},

	async delete(id: string) {
		return apiClient.deleteValidated<{ success: boolean }>(
			`/properties/${id}`,
			z.object({ success: z.boolean() }),
			'PropertyDelete'
		)
	},

	async getStats() {
		return apiClient.getValidated<PropertyStats>(
			'/properties/stats',
			z.object({
				totalUnits: z.number(),
				occupiedUnits: z.number(),
				vacantUnits: z.number(),
				occupancyRate: z.number(),
				totalMonthlyRent: z.number(),
				potentialRent: z.number(),
				total: z.number(),
				singleFamily: z.number(),
				multiFamily: z.number(),
				commercial: z.number()
			}),
			'PropertyStats'
		)
	},

	async search(query: string) {
		return apiClient.get<Property[]>('/properties/search', {
			params: { q: query }
		})
	},

	async getUnits(propertyId: string) {
		// Use the units controller endpoint
		return apiClient.getValidated<Unit[]>(
			`/units/by-property/${propertyId}`,
			UnitArraySchema,
			'Unit[]'
		)
	},

	async updateUnit(
		propertyId: string,
		unitId: string,
		data: UpdateUnitInput
	) {
		// Use the units controller endpoint directly
		return apiClient.putValidated<Unit>(
			`/units/${unitId}`,
			UnitSchema,
			'Unit',
			data as Record<string, unknown>,
			undefined,
			{ throwOnFailure: true }
		)
	},

	async uploadImage(propertyId: string, formData: FormData) {
		return apiClient.postValidated<{ url: string }>(
			`/properties/${propertyId}/images`,
			z.object({ url: z.string() }),
			'UploadImage',
			formData
		)
	},

	async getPropertyStats() {
		return apiClient.get<PropertyStats>('/properties/stats')
	}
}
