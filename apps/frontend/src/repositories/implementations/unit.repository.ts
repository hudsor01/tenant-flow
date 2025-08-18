/**
 * Unit Repository Implementation
 *
 * Implements unit data access using the API client.
 * Abstracts API-specific logic behind a clean repository interface.
 */

import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import type {
	Unit,
	UnitQuery
} from '@repo/shared'
import type { UnitRepository } from '../interfaces'
import { DomainError } from '@repo/shared'

export class ApiUnitRepository implements UnitRepository {
	async findById(id: string): Promise<Unit | null> {
		try {
			const response = await apiClient.get<Unit>(`/units/${id}`)

			if (!response.success) {
				return null
			}

			return response.data
		} catch (error) {
			logger.error(
				'Failed to find unit by ID:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component: 'repositories_implementations_unit.repository.ts'
				}
			)
			return null
		}
	}

	async save(entity: Unit): Promise<Unit> {
		try {
			let response

			if (entity.id) {
				// Update existing unit
				response = await apiClient.put<Unit>(
					`/units/${entity.id}`,
					entity as unknown as Record<string, unknown>
				)
			} else {
				// Create new unit
				response = await apiClient.post<Unit>(
					'/units',
					entity as unknown as Record<string, unknown>
				)
			}

			if (!response.success) {
				throw new DomainError('Failed to save unit')
			}

			return response.data
		} catch (error) {
			throw error instanceof DomainError
				? error
				: new DomainError('Failed to save unit')
		}
	}

	async delete(id: string): Promise<void> {
		try {
			const response = await apiClient.delete(`/units/${id}`)

			if (!response.success) {
				throw new DomainError('Failed to delete unit')
			}
		} catch (error) {
			throw error instanceof DomainError
				? error
				: new DomainError('Failed to delete unit')
		}
	}

	async findMany(query?: UnitQuery): Promise<Unit[]> {
		try {
			const params = query
				? new URLSearchParams(query as Record<string, string>)
				: undefined
			const url = params ? `/units?${params.toString()}` : '/units'

			const response = await apiClient.get<Unit[]>(url)

			if (!response.success) {
				throw new DomainError('Failed to fetch units')
			}

			// Handle both direct array and wrapped response
			const data = response.data
			return Array.isArray(data)
				? data
				: (data as { data: Unit[] }).data || []
		} catch (error) {
			logger.error(
				'Failed to fetch units:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component: 'repositories_implementations_unit.repository.ts'
				}
			)
			return []
		}
	}

	async count(query?: UnitQuery): Promise<number> {
		try {
			const params = query
				? new URLSearchParams(query as Record<string, string>)
				: undefined
			const url = params
				? `/units/count?${params.toString()}`
				: '/units/count'

			const response = await apiClient.get<{ count: number }>(url)

			if (!response.success) {
				return 0
			}

			return response.data.count || 0
		} catch (error) {
			logger.error(
				'Failed to count units:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component: 'repositories_implementations_unit.repository.ts'
				}
			)
			return 0
		}
	}

	async findByProperty(propertyId: string): Promise<Unit[]> {
		return this.findMany({ propertyId })
	}

	async findVacant(propertyId?: string): Promise<Unit[]> {
		const query: UnitQuery = { status: 'vacant' }
		if (propertyId) {
			query.propertyId = propertyId
		}
		return this.findMany(query)
	}

	async findOccupied(propertyId?: string): Promise<Unit[]> {
		const query: UnitQuery = { status: 'occupied' }
		if (propertyId) {
			query.propertyId = propertyId
		}
		return this.findMany(query)
	}

	async findByStatus(status: string): Promise<Unit[]> {
		return this.findMany({ status })
	}
}