/**
 * Lease Repository Implementation
 *
 * Implements lease data access using the API client.
 * Abstracts API-specific logic behind a clean repository interface.
 */

import { ApiService } from '@/lib/api/api-service'
import { logger } from '@/lib/logger'
import type { Lease, LeaseQuery } from '@repo/shared'
import type { LeaseRepository } from '../interfaces'
import { DomainError } from '@repo/shared'

export class ApiLeaseRepository implements LeaseRepository {
	async findById(id: string): Promise<Lease | null> {
		try {
			const response = await ApiService.getLease(id)
			return response
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
				response = await ApiService.updateLease(entity.id, {
					...entity,
					leaseTerms: entity.terms ?? undefined,
					securityDeposit: entity.securityDeposit ?? undefined,
					startDate: typeof entity.startDate === 'string' ? entity.startDate : entity.startDate.toISOString(),
					endDate: typeof entity.endDate === 'string' ? entity.endDate : entity.endDate.toISOString()
				})
			} else {
				// Create new lease
				response = await ApiService.createLease({
					...entity,
					leaseTerms: entity.terms ?? undefined,
					securityDeposit: entity.securityDeposit ?? undefined,
					startDate: typeof entity.startDate === 'string' ? entity.startDate : entity.startDate.toISOString(),
					endDate: typeof entity.endDate === 'string' ? entity.endDate : entity.endDate.toISOString()
				})
			}

			return response
		} catch (error) {
			throw error instanceof DomainError
				? error
				: new DomainError('Failed to save lease')
		}
	}

	async delete(id: string): Promise<void> {
		try {
			await ApiService.deleteLease(id)
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
			const _url = params ? `/leases?${params.toString()}` : '/leases'

			const response = await ApiService.getLeases(query)
			return response || []
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
			const _url = params
				? `/leases/count?${params.toString()}`
				: '/leases/count'

			// Use the leases list to count instead of separate endpoint
			const response = await ApiService.getLeases(query)
			return response?.length || 0
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
			// Use general lease query with expiring filter
			const response = await ApiService.getLeases({ expiring: days.toString() })

			return response || []
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
			// Use general lease query with active status filter
			const response = await ApiService.getLeases({ status: 'active' })

			return response || []
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
			// Use general lease query with date range filter
			const response = await ApiService.getLeases({
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString()
			})

			return response || []
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
