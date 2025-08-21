/**
 * Unit Repository Implementation
 *
 * Implements unit data access using the API client.
 * Abstracts API-specific logic behind a clean repository interface.
 */

import { ApiService } from '@/lib/api/api-service'
import { logger } from '@/lib/logger'
import type { Unit, UnitQuery } from '@repo/shared'
import type { UnitRepository } from '../interfaces'
import { DomainError } from '@repo/shared'

export class ApiUnitRepository implements UnitRepository {
	async findById(id: string): Promise<Unit | null> {
		try {
			const response = await ApiService.getUnit(id)
			return response
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
				response = await ApiService.updateUnit(entity.id, {
					...entity,
					squareFeet: entity.squareFeet ?? undefined,
					monthlyRent: entity.monthlyRent ?? entity.rent ?? entity.rentAmount ?? 0
				})
			} else {
				// Create new unit
				response = await ApiService.createUnit({
					...entity,
					squareFeet: entity.squareFeet ?? undefined,
					monthlyRent: entity.monthlyRent ?? entity.rent ?? entity.rentAmount ?? 0
				})
			}

			return response
		} catch (error) {
			throw error instanceof DomainError
				? error
				: new DomainError('Failed to save unit')
		}
	}

	async delete(id: string): Promise<void> {
		try {
			await ApiService.deleteUnit(id)
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
			const _url = params ? `/units?${params.toString()}` : '/units'

			const response = await ApiService.getUnits(query)
			return response || []
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
			const _url = params
				? `/units/count?${params.toString()}`
				: '/units/count'

			// Use the units list to count instead of separate endpoint
			const response = await ApiService.getUnits(query)
			return response?.length || 0
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
