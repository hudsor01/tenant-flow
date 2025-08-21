/**
 * Tenant Repository Implementation
 *
 * Implements tenant data access using the API client.
 * Abstracts API-specific logic behind a clean repository interface.
 */

import { ApiService } from '@/lib/api/api-service'
import { logger } from '@/lib/logger'
import type { Tenant, TenantQuery } from '@repo/shared'
import type { TenantRepository } from '../interfaces'
import { DomainError } from '@repo/shared'

export class ApiTenantRepository implements TenantRepository {
	async findById(id: string): Promise<Tenant | null> {
		try {
			const response = await ApiService.getTenant(id)
			return response
		} catch (error) {
			logger.error(
				'Failed to find tenant by ID:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component:
						'repositories_implementations_tenant.repository.ts'
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
				response = await ApiService.updateTenant(entity.id, {
					...entity,
					phone: entity.phone ?? undefined,
					emergencyContact: entity.emergencyContact ?? undefined
				})
			} else {
				// Create new tenant
				response = await ApiService.createTenant({
					...entity,
					phone: entity.phone ?? undefined,
					emergencyContact: entity.emergencyContact ?? undefined
				})
			}

			return response
		} catch (error) {
			throw error instanceof DomainError
				? error
				: new DomainError('Failed to save tenant')
		}
	}

	async delete(id: string): Promise<void> {
		try {
			await ApiService.deleteTenant(id)
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
			const _url = params ? `/tenants?${params.toString()}` : '/tenants'

			const response = await ApiService.getTenants(query)
			return response || []
		} catch (error) {
			logger.error(
				'Failed to fetch tenants:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component:
						'repositories_implementations_tenant.repository.ts'
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
			const _url = params
				? `/tenants/count?${params.toString()}`
				: '/tenants/count'

			// Use the tenants list to count instead of separate endpoint
			const response = await ApiService.getTenants(query)
			return response?.length || 0
		} catch (error) {
			logger.error(
				'Failed to count tenants:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component:
						'repositories_implementations_tenant.repository.ts'
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
			// Use general tenant query with email filter
			const tenants = await ApiService.getTenants({ email })
			return tenants?.[0] || null
		} catch (error) {
			logger.error(
				'Failed to find tenant by email:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component:
						'repositories_implementations_tenant.repository.ts'
				}
			)
			return null
		}
	}

	async findWithActiveLeases(id: string): Promise<Tenant | null> {
		try {
			// Get basic tenant info - lease relationship would be handled separately
			const response = await ApiService.getTenant(id)
			return response
		} catch (error) {
			logger.error(
				'Failed to find tenant with active leases:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component:
						'repositories_implementations_tenant.repository.ts'
				}
			)
			return null
		}
	}

	async findExpiringSoonTenants(days: number): Promise<Tenant[]> {
		try {
			// Use general tenant query with expiring filter
			const response = await ApiService.getTenants({ expiring: days.toString() })
			return response || []
		} catch (error) {
			logger.error(
				'Failed to find expiring tenants:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component:
						'repositories_implementations_tenant.repository.ts'
				}
			)
			return []
		}
	}
}
