/**
 * Maintenance API - Direct API calls for maintenance requests
 */

import { apiClient } from '@/lib/api-client'
import type {
	MaintenanceRequest,
	CreateMaintenanceInput,
	UpdateMaintenanceInput,
	MaintenanceStatus,
	MaintenanceStats
} from '@repo/shared'

/**
 * Maintenance API functions
 */
export const maintenanceApi = {
	async getAll(params?: {
		status?: MaintenanceStatus
		priority?: string
		propertyId?: string
		unitId?: string
	}) {
		return apiClient.get<MaintenanceRequest[]>('/maintenance-requests', {
			params
		})
	},

	async getById(id: string) {
		return apiClient.get<MaintenanceRequest>(`/maintenance-requests/${id}`)
	},

	async getStats() {
		return apiClient.get<MaintenanceStats>('/maintenance-requests/stats')
	},

	async create(data: CreateMaintenanceInput) {
		return apiClient.post<MaintenanceRequest>('/maintenance-requests', data)
	},

	async update(id: string, data: UpdateMaintenanceInput) {
		return apiClient.put<MaintenanceRequest>(
			`/maintenance-requests/${id}`,
			data
		)
	},

	async updateStatus(id: string, status: MaintenanceStatus) {
		return apiClient.put<MaintenanceRequest>(
			`/maintenance-requests/${id}/status`,
			{ status }
		)
	},

	async delete(id: string) {
		return apiClient.delete<void>(`/maintenance-requests/${id}`)
	}
}
