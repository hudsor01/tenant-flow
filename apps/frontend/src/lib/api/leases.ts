/**
 * Leases API - Direct API calls only
 */

import { apiClient, createSearchParams } from '@/lib/api-client'
import { config } from '@/lib/config'
import { getSession } from '@/lib/supabase/client'
import type {
	Lease,
	CreateLeaseInput,
	UpdateLeaseInput,
	LeaseQuery,
	LeaseStats
} from '@repo/shared'

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
	expiring: () => [...leaseKeys.all, 'expiring'] as const,
	byUnit: (unitId: string) => [...leaseKeys.all, 'by-unit', unitId] as const,
	byTenant: (tenantId: string) =>
		[...leaseKeys.all, 'by-tenant', tenantId] as const,
	pdf: (id: string) => [...leaseKeys.all, 'pdf', id] as const
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

	async search(query: string) {
		return apiClient.get<Lease[]>('/leases/search', {
			params: { q: query }
		})
	},

	async getExpiring(days = 30) {
		return apiClient.get<Lease[]>('/leases/expiring', {
			params: { days }
		})
	},

	async getByUnit(unitId: string) {
		return apiClient.get<Lease[]>(`/leases/by-unit/${unitId}`)
	},

	async getPdf(
		id: string,
		options?: { format?: 'A4' | 'Letter' | 'Legal'; branding?: boolean }
	) {
		// Backend returns PDF buffer directly - construct query parameters
		const queryParams: Record<string, string> = {}
		if (options?.format) queryParams.format = options.format
		if (options?.branding !== undefined)
			queryParams.branding = String(options.branding)

		// Use raw fetch for blob response since apiClient expects JSON
		const { session } = await getSession()
		const headers: Record<string, string> = {
			Accept: 'application/pdf'
		}

		if (session?.access_token) {
			headers['Authorization'] = `Bearer ${session.access_token}`
		}

		const params =
			Object.keys(queryParams).length > 0
				? `?${new URLSearchParams(queryParams).toString()}`
				: ''

		const response = await fetch(
			`${config.api.baseURL}/leases/${id}/pdf${params}`,
			{
				headers,
				credentials: 'include'
			}
		)

		if (!response.ok) {
			throw new Error(`Failed to generate PDF: ${response.statusText}`)
		}

		return response.blob()
	},

	async renew(id: string, data: { endDate: string; newRent?: number }) {
		// Backend doesn't have dedicated renew endpoint - use update instead
		return apiClient.put<Lease>(`/leases/${id}`, {
			endDate: data.endDate,
			rentAmount: data.newRent
		})
	},

	async terminate(
		id: string,
		data: { reason: string; terminationDate?: string }
	) {
		// Backend doesn't have dedicated terminate endpoint - use update to set status
		return apiClient.put<Lease>(`/leases/${id}`, {
			status: 'TERMINATED',
			notes: data.reason,
			endDate: data.terminationDate
		})
	},

	async getByProperty(propertyId: string) {
		// Backend doesn't have dedicated by-property endpoint
		// Use the general getAll with property filter as workaround
		return this.getAll({ propertyId })
	},

	async getByTenant(tenantId: string) {
		return apiClient.get<Lease[]>(`/leases/by-tenant/${tenantId}`)
	},

	async generatePDF(
		id: string,
		options?: { format?: 'A4' | 'Letter' | 'Legal'; branding?: boolean }
	) {
		// Use the same method as getPdf for consistency
		return this.getPdf(id, options)
	},

	async activate(id: string) {
		// Backend doesn't have dedicated activate endpoint - use update to set status
		return apiClient.put<Lease>(`/leases/${id}`, {
			status: 'ACTIVE'
		})
	}
}
