/**
 * Leases API - Direct API calls only
 */

import { apiClient, createSearchParams } from '@/lib/api-client'
import type {
	Lease,
	CreateLeaseInput,
	UpdateLeaseInput,
	LeaseQuery
} from '@repo/shared'

export interface LeaseStats {
	total: number
	active: number
	expired: number
	expiringSoon: number
}

/**
 * Query keys for React Query caching
 */
export const leaseKeys = {
	all: ['leases'] as const,
	lists: () => [...leaseKeys.all, 'list'] as const,
	list: (filters?: LeaseQuery) => [...leaseKeys.lists(), filters] as const,
	details: () => [...leaseKeys.all, 'detail'] as const,
	detail: (id: string) => [...leaseKeys.details(), id] as const,
	stats: () => [...leaseKeys.all, 'stats'] as const,
	byProperty: (propertyId: string) =>
		[...leaseKeys.all, 'by-property', propertyId] as const,
	byTenant: (tenantId: string) =>
		[...leaseKeys.all, 'by-tenant', tenantId] as const
}

/**
 * Leases API functions - Direct calls only
 */
export const leaseApi = {
	async getAll(filters?: LeaseQuery) {
		const params = filters ? createSearchParams(filters) : ''
		return apiClient.get<Lease[]>(`/leases${params ? `?${params}` : ''}`)
	},

	async getById(id: string) {
		return apiClient.get<Lease>(`/leases/${id}`)
	},

	async create(data: CreateLeaseInput) {
		return apiClient.post<Lease>('/leases', data)
	},

	async update(id: string, data: UpdateLeaseInput) {
		return apiClient.put<Lease>(`/leases/${id}`, data)
	},

	async delete(id: string) {
		await apiClient.delete<{ success: boolean }>(`/leases/${id}`)
		// Return void to match hook expectations
		return
	},

	async getStats() {
		return apiClient.get<LeaseStats>('/leases/stats')
	},

	async renew(id: string, data: { endDate: string; newRent?: number }) {
		// Backend doesn't have renew endpoint - use update instead
		return apiClient.put<Lease>(`/leases/${id}`, {
			endDate: data.endDate,
			rentAmount: data.newRent
		})
	},

	async terminate(
		id: string,
		data: { reason: string; terminationDate?: string }
	) {
		// Backend doesn't have terminate endpoint - use update to set status
		return apiClient.put<Lease>(`/leases/${id}`, {
			status: 'terminated',
			notes: data.reason,
			endDate: data.terminationDate
		})
	},

	async getByProperty(propertyId: string) {
		// Backend doesn't have by-property endpoint directly
		// Use the general getAll with property filter
		return this.getAll({ propertyId })
	},

	async getByTenant(tenantId: string) {
		return apiClient.get<Lease[]>(`/leases/by-tenant/${tenantId}`)
	},

	async generatePDF(id: string) {
		// Use the correct PDF endpoint
		const response = await apiClient.get<{
			url: string
			downloadUrl: string
		}>(`/leases/${id}/pdf`)
		return response
	},

	async activate(id: string) {
		// Backend doesn't have activate endpoint - use update to set status
		return apiClient.put<Lease>(`/leases/${id}`, {
			status: 'active'
		})
	}
}
