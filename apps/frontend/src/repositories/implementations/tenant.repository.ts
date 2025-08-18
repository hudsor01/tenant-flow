/**
 * Tenant Repository Implementation
 *
 * Implements tenant data access using the API client.
 * Abstracts API-specific logic behind a clean repository interface.
 */

import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import type {
	Tenant,
	TenantQuery
} from '@repo/shared'
import type { TenantRepository } from '../interfaces'
import { DomainError } from '@repo/shared'

export class ApiTenantRepository implements TenantRepository {
	async findById(id: string): Promise<Tenant | null> {
		try {
			const response = await apiClient.get<Tenant>(`/tenants/${id}`)

			if (!response.success) {
				return null
			}

			return response.data
		} catch (error) {
			logger.error(
				'Failed to find tenant by ID:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component: 'repositories_implementations_tenant.repository.ts'
				}
			)
			return null
		}
	}

	async save(entity: Tenant): Promise<Tenant> {
		try {
			let response

			if (entity.id) {
				// Update existing tenant
				response = await apiClient.put<Tenant>(
					`/tenants/${entity.id}`,
					entity as unknown as Record<string, unknown>
				)
			} else {
				// Create new tenant
				response = await apiClient.post<Tenant>(
					'/tenants',
					entity as unknown as Record<string, unknown>
				)
			}

			if (!response.success) {
				throw new DomainError('Failed to save tenant')
			}

			return response.data
		} catch (error) {
			throw error instanceof DomainError
				? error
				: new DomainError('Failed to save tenant')
		}
	}

	async delete(id: string): Promise<void> {
		try {
			const response = await apiClient.delete(`/tenants/${id}`)

			if (!response.success) {
				throw new DomainError('Failed to delete tenant')
			}
		} catch (error) {
			throw error instanceof DomainError
				? error
				: new DomainError('Failed to delete tenant')
		}
	}

	async findMany(query?: TenantQuery): Promise<Tenant[]> {
		try {
			const params = query
				? new URLSearchParams(query as Record<string, string>)
				: undefined
			const url = params ? `/tenants?${params.toString()}` : '/tenants'

			const response = await apiClient.get<Tenant[]>(url)

			if (!response.success) {
				throw new DomainError('Failed to fetch tenants')
			}

			// Handle both direct array and wrapped response
			const data = response.data
			return Array.isArray(data)
				? data
				: (data as { data: Tenant[] }).data || []
		} catch (error) {
			logger.error(
				'Failed to fetch tenants:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component: 'repositories_implementations_tenant.repository.ts'
				}
			)
			return []
		}
	}

	async count(query?: TenantQuery): Promise<number> {
		try {
			const params = query
				? new URLSearchParams(query as Record<string, string>)
				: undefined
			const url = params
				? `/tenants/count?${params.toString()}`
				: '/tenants/count'

			const response = await apiClient.get<{ count: number }>(url)

			if (!response.success) {
				return 0
			}

			return response.data.count || 0
		} catch (error) {
			logger.error(
				'Failed to count tenants:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component: 'repositories_implementations_tenant.repository.ts'
				}
			)
			return 0
		}
	}

	async findByProperty(propertyId: string): Promise<Tenant[]> {
		return this.findMany({ propertyId })
	}

	async findByEmail(email: string): Promise<Tenant | null> {
		try {
			const response = await apiClient.get<Tenant>(`/tenants/email/${email}`)

			if (!response.success) {
				return null
			}

			return response.data
		} catch (error) {
			logger.error(
				'Failed to find tenant by email:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component: 'repositories_implementations_tenant.repository.ts'
				}
			)
			return null
		}
	}

	async findWithActiveLeases(id: string): Promise<Tenant | null> {
		try {
			const response = await apiClient.get<Tenant>(`/tenants/${id}/active-leases`)

			if (!response.success) {
				return null
			}

			return response.data
		} catch (error) {
			logger.error(
				'Failed to find tenant with active leases:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component: 'repositories_implementations_tenant.repository.ts'
				}
			)
			return null
		}
	}

	async findExpiringSoonTenants(days: number): Promise<Tenant[]> {
		try {
			const response = await apiClient.get<Tenant[]>(
				`/tenants/expiring?days=${days}`
			)

			if (!response.success) {
				throw new DomainError('Failed to fetch expiring tenants')
			}

			return Array.isArray(response.data) ? response.data : []
		} catch (error) {
			logger.error(
				'Failed to find expiring tenants:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component: 'repositories_implementations_tenant.repository.ts'
				}
			)
			return []
		}
	}
}