/**
 * Units API - Direct API calls only
 */

<<<<<<< HEAD
=======
import { apiClient } from '@/lib/api-client'
>>>>>>> origin/main
import type {
	Unit,
	CreateUnitInput,
	UpdateUnitInput,
<<<<<<< HEAD
	UnitQuery,
	UnitStats
} from '@repo/shared'
import { apiClient } from '../api-client'

/**
 * Units API functions - Connected to backend units controller
 */
export const unitApi = {
	async getAll(filters?: UnitQuery): Promise<Unit[]> {
		return apiClient.get<Unit[]>('/units', {
			params: filters
		})
	},

	async getById(id: string): Promise<Unit> {
		return apiClient.get<Unit>(`/units/${id}`)
	},

	async create(data: CreateUnitInput): Promise<Unit> {
		return apiClient.post<Unit>('/units', data)
	},

	async update(id: string, data: UpdateUnitInput): Promise<Unit> {
		return apiClient.put<Unit>(`/units/${id}`, data)
	},

	async delete(id: string): Promise<void> {
		return apiClient.delete<void>(`/units/${id}`)
	},

	async getStats(): Promise<UnitStats> {
		return apiClient.get<UnitStats>('/units/stats')
	},

	async getByProperty(propertyId: string): Promise<Unit[]> {
		return apiClient.get<Unit[]>(`/units/by-property/${propertyId}`)
	},

	async updateAvailability(
		unitId: string,
		available: boolean
	): Promise<Unit> {
		return apiClient.put<Unit>(`/units/${unitId}/availability`, {
			available
		})
=======
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
>>>>>>> origin/main
	}
}
