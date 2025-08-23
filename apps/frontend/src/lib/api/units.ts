/**
 * Units API - Direct API calls only
 */

import { apiClient } from '@/lib/api-client'
import type {
	Unit,
	CreateUnitInput,
	UpdateUnitInput,
	UnitQuery
} from '@repo/shared'

// Define UnitStats locally since it's not exported from shared
export interface UnitStats {
	total: number
	vacant: number
	occupied: number
	maintenance: number
}

/**
 * Query keys for React Query caching
 */
export const unitKeys = {
	all: ['units'] as const,
	lists: () => [...unitKeys.all, 'list'] as const,
	list: (filters?: UnitQuery) => [...unitKeys.lists(), filters] as const,
	details: () => [...unitKeys.all, 'detail'] as const,
	detail: (id: string) => [...unitKeys.details(), id] as const,
	stats: () => [...unitKeys.all, 'stats'] as const,
	byProperty: (propertyId: string) =>
		[...unitKeys.all, 'by-property', propertyId] as const
}

/**
 * Units API functions - Backend endpoints not implemented yet
 * Units are managed as part of properties - no separate units controller
 */
export const unitApi = {
	async getAll(filters?: UnitQuery) {
		// Backend units endpoints not implemented yet
		// Units are managed through properties
		return Promise.resolve([])
	},

	async getById(id: string) {
		// Backend units endpoints not implemented yet
		throw new Error(
			'Units module not yet implemented in backend - units are managed through properties'
		)
	},

	async create(data: CreateUnitInput) {
		// Backend units endpoints not implemented yet
		throw new Error(
			'Units module not yet implemented in backend - units are managed through properties'
		)
	},

	async update(id: string, data: UpdateUnitInput) {
		// Backend units endpoints not implemented yet
		throw new Error(
			'Units module not yet implemented in backend - units are managed through properties'
		)
	},

	async delete(id: string) {
		// Backend units endpoints not implemented yet
		throw new Error(
			'Units module not yet implemented in backend - units are managed through properties'
		)
	},

	async getStats() {
		// Backend units endpoints not implemented yet
		// Return empty stats
		return Promise.resolve({
			total: 0,
			vacant: 0,
			occupied: 0,
			maintenance: 0
		})
	},

	async getByProperty(propertyId: string) {
		// Backend units endpoints not implemented yet
		// Units are managed as part of properties
		return Promise.resolve([])
	},

	async updateAvailability(unitId: string, available: boolean) {
		// Backend units endpoints not implemented yet
		throw new Error(
			'Units module not yet implemented in backend - units are managed through properties'
		)
	}
}
