/**
 * Property Repository Implementation
 *
 * Implements property data access using the API client.
 * Abstracts API-specific logic behind a clean repository interface.
 */

import { ApiService } from '@/lib/api/api-service'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import type {
	Property,
	CreatePropertyInput,
	UpdatePropertyInput,
	PropertyQuery,
	Result
} from '@repo/shared'
import type { PropertyRepository, PropertyStats } from '../interfaces'
import { DomainError, NotFoundError } from '@repo/shared'

export class ApiPropertyRepository implements PropertyRepository {
	async findById(id: string): Promise<Property | null> {
		try {
			const response = await ApiService.getProperty(id)
			return response
		} catch (error) {
			logger.error(
				'Failed to find property by ID:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component:
						'repositories_implementations_property.repository.ts'
				}
			)
			return null
		}
	}

	async save(entity: Property): Promise<Property> {
		try {
			let response

			if (entity.id) {
				// Update existing property
				response = await ApiService.updateProperty(entity.id, {
					...entity,
					description: entity.description ?? undefined,
					imageUrl: entity.imageUrl ?? undefined,
					yearBuilt: entity.yearBuilt ?? undefined,
					totalSize: entity.totalSize ?? undefined
				})
			} else {
				// Create new property
				response = await ApiService.createProperty({
					...entity,
					description: entity.description ?? undefined,
					imageUrl: entity.imageUrl ?? undefined,
					yearBuilt: entity.yearBuilt ?? undefined,
					totalSize: entity.totalSize ?? undefined
				})
			}

			return response
		} catch (error) {
			throw error instanceof DomainError
				? error
				: new DomainError('Failed to save property')
		}
	}

	async delete(id: string): Promise<void> {
		try {
			await ApiService.deleteProperty(id)
		} catch (error) {
			throw error instanceof DomainError
				? error
				: new DomainError('Failed to delete property')
		}
	}

	async findMany(query?: PropertyQuery): Promise<Property[]> {
		try {
			const response = await ApiService.getProperties(query)
			return response || []
		} catch (error) {
			logger.error(
				'Failed to fetch properties:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component:
						'repositories_implementations_property.repository.ts'
				}
			)
			return []
		}
	}

	async count(query?: PropertyQuery): Promise<number> {
		try {
			// Use the properties list to count instead of separate endpoint
			const response = await ApiService.getProperties(query)
			return response?.length || 0
		} catch (error) {
			logger.error(
				'Failed to count properties:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component:
						'repositories_implementations_property.repository.ts'
				}
			)
			return 0
		}
	}

	async findByOwner(ownerId: string): Promise<Property[]> {
		return this.findMany({ ownerId })
	}

	async findWithUnits(id: string): Promise<Property | null> {
		try {
			const response = await apiClient.get<Property>(
				`/properties/${id}/units`
			)
			return response
		} catch (error) {
			logger.error(
				'Failed to find property with units:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component:
						'repositories_implementations_property.repository.ts'
				}
			)
			return null
		}
	}

	async findWithTenants(id: string): Promise<Property | null> {
		try {
			const response = await apiClient.get<Property>(
				`/properties/${id}/tenants`
			)
			return response
		} catch (error) {
			logger.error(
				'Failed to find property with tenants:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component:
						'repositories_implementations_property.repository.ts'
				}
			)
			return null
		}
	}

	async findWithLeases(id: string): Promise<Property | null> {
		try {
			const response = await apiClient.get<Property>(
				`/properties/${id}/leases`
			)
			return response
		} catch (error) {
			logger.error(
				'Failed to find property with leases:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component:
						'repositories_implementations_property.repository.ts'
				}
			)
			return null
		}
	}

	async findWithMaintenance(id: string): Promise<Property | null> {
		try {
			const response = await apiClient.get<Property>(
				`/properties/${id}/maintenance`
			)
			return response
		} catch (error) {
			logger.error(
				'Failed to find property with maintenance:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component:
						'repositories_implementations_property.repository.ts'
				}
			)
			return null
		}
	}

	async getStats(_ownerId: string): Promise<PropertyStats> {
		try {
			const response = await ApiService.getPropertyStats()
			return response
		} catch {
			// Return default stats on error
			return {
				total: 0,
				occupied: 0,
				vacant: 0,
				occupancyRate: 0,
				totalMonthlyRent: 0,
				averageRent: 0
			}
		}
	}

	async uploadImage(
		id: string,
		imageFile: File
	): Promise<Result<{ url: string }>> {
		try {
			const formData = new FormData()
			formData.append('image', imageFile)

			const response = await ApiService.uploadPropertyImage(id, formData)

			return {
				success: true,
				value: response
			}
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error
						: new DomainError('Failed to upload property image')
			}
		}
	}

	// Additional helper methods for business logic
	async create(input: CreatePropertyInput): Promise<Result<Property>> {
		try {
			const response = await ApiService.createProperty(input)

			return {
				success: true,
				value: response
			}
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error
						: new DomainError('Failed to create property')
			}
		}
	}

	async update(
		id: string,
		input: UpdatePropertyInput
	): Promise<Result<Property>> {
		try {
			const response = await ApiService.updateProperty(id, input)

			return {
				success: true,
				value: response
			}
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error
						: new DomainError('Failed to update property')
			}
		}
	}

	async findByIdWithResult(id: string): Promise<Result<Property>> {
		try {
			const property = await this.findById(id)

			if (!property) {
				return {
					success: false,
					error: new NotFoundError('Property', id)
				}
			}

			return {
				success: true,
				value: property
			}
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error
						: new DomainError('Failed to find property')
			}
		}
	}
}
