/**
 * Lease Repository Implementation
 *
 * Implements lease data access using the API client.
 * Abstracts API-specific logic behind a clean repository interface.
 */

import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import type { Lease, LeaseQuery } from '@repo/shared'
import type { LeaseRepository } from '../interfaces'
import { DomainError } from '@repo/shared'

export class ApiLeaseRepository implements LeaseRepository {
	async findById(id: string): Promise<Lease | null> {
		try {
			const response = await apiClient.get<Lease>(`/leases/${id}`)

			if (!response.success) {
				return null
			}

			return response.data
		} catch (error) {
			logger.error(
				'Failed to find lease by ID:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component:
						'repositories_implementations_lease.repository.ts'
				}
			)
			return null
		}
	}

	async save(entity: Lease): Promise<Lease> {
		try {
			let response

			if (entity.id) {
				// Update existing lease
				response = await apiClient.put<Lease>(
					`/leases/${entity.id}`,
					entity as unknown as Record<string, unknown>
				)
			} else {
				// Create new lease
				response = await apiClient.post<Lease>(
					'/leases',
					entity as unknown as Record<string, unknown>
				)
			}

			if (!response.success) {
				throw new DomainError('Failed to save lease')
			}

			return response.data
		} catch (error) {
			throw error instanceof DomainError
				? error
				: new DomainError('Failed to save lease')
		}
	}

	async delete(id: string): Promise<void> {
		try {
			const response = await apiClient.delete(`/leases/${id}`)

			if (!response.success) {
				throw new DomainError('Failed to delete lease')
			}
		} catch (error) {
			throw error instanceof DomainError
				? error
				: new DomainError('Failed to delete lease')
		}
	}

	async findMany(query?: LeaseQuery): Promise<Lease[]> {
		try {
			const params = query
				? new URLSearchParams(query as Record<string, string>)
				: undefined
			const url = params ? `/leases?${params.toString()}` : '/leases'

			const response = await apiClient.get<Lease[]>(url)

			if (!response.success) {
				throw new DomainError('Failed to fetch leases')
			}

			// Handle both direct array and wrapped response
			const data = response.data
			return Array.isArray(data)
				? data
				: (data as { data: Lease[] }).data || []
		} catch (error) {
			logger.error(
				'Failed to fetch leases:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component:
						'repositories_implementations_lease.repository.ts'
				}
			)
			return []
		}
	}

	async count(query?: LeaseQuery): Promise<number> {
		try {
			const params = query
				? new URLSearchParams(query as Record<string, string>)
				: undefined
			const url = params
				? `/leases/count?${params.toString()}`
				: '/leases/count'

			const response = await apiClient.get<{ count: number }>(url)

			if (!response.success) {
				return 0
			}

			return response.data.count || 0
		} catch (error) {
			logger.error(
				'Failed to count leases:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component:
						'repositories_implementations_lease.repository.ts'
				}
			)
			return 0
		}
	}

	async findByProperty(propertyId: string): Promise<Lease[]> {
		return this.findMany({ propertyId })
	}

	async findByTenant(tenantId: string): Promise<Lease[]> {
		return this.findMany({ tenantId })
	}

	async findExpiring(days: number): Promise<Lease[]> {
		try {
			const response = await apiClient.get<Lease[]>(
				`/leases/expiring?days=${days}`
			)

			if (!response.success) {
				throw new DomainError('Failed to fetch expiring leases')
			}

			return Array.isArray(response.data) ? response.data : []
		} catch (error) {
			logger.error(
				'Failed to find expiring leases:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component:
						'repositories_implementations_lease.repository.ts'
				}
			)
			return []
		}
	}

	async findActive(): Promise<Lease[]> {
		try {
			const response = await apiClient.get<Lease[]>('/leases/active')

			if (!response.success) {
				throw new DomainError('Failed to fetch active leases')
			}

			return Array.isArray(response.data) ? response.data : []
		} catch (error) {
			logger.error(
				'Failed to find active leases:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component:
						'repositories_implementations_lease.repository.ts'
				}
			)
			return []
		}
	}

	async findByDateRange(startDate: Date, endDate: Date): Promise<Lease[]> {
		try {
			const params = new URLSearchParams({
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString()
			})
			const response = await apiClient.get<Lease[]>(
				`/leases/date-range?${params.toString()}`
			)

			if (!response.success) {
				throw new DomainError('Failed to fetch leases by date range')
			}

			return Array.isArray(response.data) ? response.data : []
		} catch (error) {
			logger.error(
				'Failed to find leases by date range:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component:
						'repositories_implementations_lease.repository.ts'
				}
			)
			return []
		}
	}
}
