/**
<<<<<<< HEAD
 * Maintenance API - Direct API calls for maintenance requests
=======
 * Maintenance API - Direct API calls only
>>>>>>> origin/main
 */

import { apiClient } from '@/lib/api-client'
import type {
	MaintenanceRequest,
	CreateMaintenanceInput,
	UpdateMaintenanceInput,
<<<<<<< HEAD
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
=======
	MaintenanceQuery
} from '@repo/shared'

export interface MaintenanceStats {
	total: number
	open: number
	inProgress: number
	completed: number
}

/**
 * Query keys for React Query caching
 */
export const maintenanceKeys = {
	all: ['maintenance'] as const,
	lists: () => [...maintenanceKeys.all, 'list'] as const,
	list: (filters?: MaintenanceQuery) =>
		[...maintenanceKeys.lists(), filters] as const,
	details: () => [...maintenanceKeys.all, 'detail'] as const,
	detail: (id: string) => [...maintenanceKeys.details(), id] as const,
	stats: () => [...maintenanceKeys.all, 'stats'] as const,
	byProperty: (propertyId: string) =>
		[...maintenanceKeys.all, 'by-property', propertyId] as const,
	byTenant: (tenantId: string) =>
		[...maintenanceKeys.all, 'by-tenant', tenantId] as const
}

/**
 * Maintenance API functions - Backend endpoints not implemented yet
 * Returning placeholder data until backend maintenance module is complete
 */
export const maintenanceApi = {
	async getAll(filters?: MaintenanceQuery) {
		// Backend maintenance endpoints not implemented yet
		return Promise.resolve([])
	},

	async getById(id: string) {
		// Backend maintenance endpoints not implemented yet
		throw new Error('Maintenance module not yet implemented in backend')
	},

	async create(data: CreateMaintenanceInput) {
		// Backend maintenance endpoints not implemented yet
		throw new Error('Maintenance module not yet implemented in backend')
	},

	async update(id: string, data: UpdateMaintenanceInput) {
		// Backend maintenance endpoints not implemented yet
		throw new Error('Maintenance module not yet implemented in backend')
	},

	async delete(id: string) {
		// Backend maintenance endpoints not implemented yet
		throw new Error('Maintenance module not yet implemented in backend')
	},

	async getStats() {
		// Backend maintenance endpoints not implemented yet
		return Promise.resolve({
			total: 0,
			open: 0,
			inProgress: 0,
			completed: 0
		})
	},

	async getByProperty(propertyId: string) {
		// Backend maintenance endpoints not implemented yet
		return Promise.resolve([])
	},

	async getByTenant(tenantId: string) {
		// Backend maintenance endpoints not implemented yet
		return Promise.resolve([])
	},

	async updateStatus(id: string, status: string) {
		// Backend maintenance endpoints not implemented yet
		throw new Error('Maintenance module not yet implemented in backend')
	},

	async assignVendor(id: string, vendorId: string) {
		// Backend maintenance endpoints not implemented yet
		throw new Error('Maintenance module not yet implemented in backend')
	},

	async addComment(id: string, comment: string) {
		// Backend maintenance endpoints not implemented yet
		throw new Error('Maintenance module not yet implemented in backend')
	},

	async uploadImage(id: string, formData: FormData) {
		// Backend maintenance endpoints not implemented yet
		throw new Error('Maintenance module not yet implemented in backend')
>>>>>>> origin/main
	}
}
