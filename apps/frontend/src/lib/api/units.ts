/**
 * Units API - Direct API calls only
 */

import type {
	Unit,
	CreateUnitInput,
	UpdateUnitInput,
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
	}
}
