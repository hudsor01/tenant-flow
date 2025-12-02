/**
 * Tenant Emergency Contact Service
 *
 * Handles CRUD operations for tenant emergency contact information
 * NOTE: Emergency contact fields are stored in the tenants table:
 * - emergency_contact_name
 * - emergency_contact_phone
 * - emergency_contact_relationship
 */

import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException
} from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'

/**
 * Emergency contact information for a tenant
 */
export interface EmergencyContactResponse {
	id: string
	tenant_id: string
	contactName: string
	relationship: string
	phoneNumber: string
	created_at: string
	updated_at: string
}

/**
 * Maps database tenant record to emergency contact API response format
 * Converts snake_case database fields to camelCase API fields
 */
function mapEmergencyContactToResponse(
	tenant: Database['public']['Tables']['tenants']['Row']
): EmergencyContactResponse {
	return {
		id: tenant.id,
		tenant_id: tenant.id,
		contactName: tenant.emergency_contact_name || '',
		relationship: tenant.emergency_contact_relationship || '',
		phoneNumber: tenant.emergency_contact_phone || '',
		created_at: tenant.created_at || new Date().toISOString(),
		updated_at: tenant.updated_at || new Date().toISOString()
	}
}

@Injectable()
export class TenantEmergencyContactService {
	constructor(
		private readonly logger: Logger,
		private readonly supabase: SupabaseService
	) {}

	/**
	 * Get emergency contact for a tenant
	 * Verifies user owns the tenant through property/lease relationship
	 */
	async getEmergencyContact(
		user_id: string,
		tenant_id: string
	): Promise<EmergencyContactResponse | null> {
		try {
			// Verify user owns this tenant
			await this._verifyTenantOwnership(user_id, tenant_id)

			const client = this.supabase.getAdminClient()
			const { data, error } = await client
				.from('tenants')
				.select('*')
				.eq('id', tenant_id)
				.single()

			if (error) {
				// No tenant found is not an error
				if (error.code === 'PGRST116') {
					return null
				}
				this.logger.error('Failed to fetch tenant emergency contact', {
					error: error.message,
					tenant_id
				})
				return null
			}

			return mapEmergencyContactToResponse(data)
		} catch (error) {
			if (error instanceof ForbiddenException ||
				error instanceof NotFoundException ||
				error instanceof BadRequestException) {
				throw error
			}
			this.logger.error('Error getting emergency contact', {
				error: error instanceof Error ? error.message : String(error),
				tenant_id
			})
			throw error
		}
	}

	/**
	 * Create/update emergency contact for a tenant
	 */
	async createEmergencyContact(
		user_id: string,
		tenant_id: string,
		dto: {
			contact_name: string
			relationship: string
			phone_number: string
		}
	): Promise<EmergencyContactResponse> {
		try {
			// Verify user owns this tenant
			await this._verifyTenantOwnership(user_id, tenant_id)

			// Validate input
			if (!dto.contact_name?.trim()) {
				throw new BadRequestException('Contact name is required')
			}
			if (!dto.relationship?.trim()) {
				throw new BadRequestException('Relationship is required')
			}
			if (!dto.phone_number?.trim()) {
				throw new BadRequestException('Phone number is required')
			}

			const client = this.supabase.getAdminClient()
			const { data, error } = await client
				.from('tenants')
				.update({
					emergency_contact_name: dto.contact_name.trim(),
					emergency_contact_relationship: dto.relationship.trim(),
					emergency_contact_phone: dto.phone_number.trim()
				})
				.eq('id', tenant_id)
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to create emergency contact', {
					error: error.message,
					tenant_id
				})
				throw new BadRequestException('Failed to create emergency contact')
			}

			return mapEmergencyContactToResponse(data)
		} catch (error) {
			if (error instanceof ForbiddenException ||
				error instanceof NotFoundException ||
				error instanceof BadRequestException) {
				throw error
			}
			this.logger.error('Error creating emergency contact', {
				error: error instanceof Error ? error.message : String(error),
				tenant_id
			})
			throw error
		}
	}

	/**
	 * Update emergency contact for a tenant
	 */
	async updateEmergencyContact(
		user_id: string,
		tenant_id: string,
		dto: {
			contact_name?: string
			relationship?: string
			phone_number?: string
		}
	): Promise<EmergencyContactResponse> {
		try {
			// Verify user owns this tenant
			await this._verifyTenantOwnership(user_id, tenant_id)

			// Check that tenant exists
			const existing = await this.getEmergencyContact(user_id, tenant_id)
			if (!existing) {
				throw new NotFoundException('Tenant not found')
			}

			// Build update object with only provided fields
			const updateData: Partial<Database['public']['Tables']['tenants']['Update']> = {}
			if (dto.contact_name !== undefined) {
				updateData.emergency_contact_name = dto.contact_name?.trim() || null
			}
			if (dto.relationship !== undefined) {
				updateData.emergency_contact_relationship = dto.relationship?.trim() || null
			}
			if (dto.phone_number !== undefined) {
				updateData.emergency_contact_phone = dto.phone_number?.trim() || null
			}

			const client = this.supabase.getAdminClient()
			const { data, error } = await client
				.from('tenants')
				.update(updateData)
				.eq('id', tenant_id)
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to update emergency contact', {
					error: error.message,
					tenant_id
				})
				throw new BadRequestException('Failed to update emergency contact')
			}

			return mapEmergencyContactToResponse(data)
		} catch (error) {
			if (error instanceof ForbiddenException ||
				error instanceof NotFoundException ||
				error instanceof BadRequestException) {
				throw error
			}
			this.logger.error('Error updating emergency contact', {
				error: error instanceof Error ? error.message : String(error),
				tenant_id
			})
			throw error
		}
	}

	/**
	 * Delete emergency contact for a tenant (clear the fields)
	 */
	async deleteEmergencyContact(
		user_id: string,
		tenant_id: string
	): Promise<{ success: boolean }> {
		try {
			// Verify user owns this tenant
			await this._verifyTenantOwnership(user_id, tenant_id)

			const client = this.supabase.getAdminClient()
			const { error } = await client
				.from('tenants')
				.update({
					emergency_contact_name: null,
					emergency_contact_phone: null,
					emergency_contact_relationship: null
				})
				.eq('id', tenant_id)

			if (error) {
				this.logger.error('Failed to delete emergency contact', {
					error: error.message,
					tenant_id
				})
				throw new BadRequestException('Failed to delete emergency contact')
			}

			return { success: true }
		} catch (error) {
			if (error instanceof ForbiddenException ||
				error instanceof NotFoundException ||
				error instanceof BadRequestException) {
				throw error
			}
			this.logger.error('Error deleting emergency contact', {
				error: error instanceof Error ? error.message : String(error),
				tenant_id
			})
			throw error
		}
	}

	// ============================================================================
	// PRIVATE HELPER METHODS
	// ============================================================================

	/**
	 * Verify that user owns the specified tenant
	 * Checks complete ownership chain: tenant -> lease -> unit -> property -> owner
	 */
	private async _verifyTenantOwnership(
		user_id: string,
		tenant_id: string
	): Promise<void> {
		const client = this.supabase.getAdminClient()

		// Verify tenant exists
		const { data: tenant, error: tenantError } = await client
			.from('tenants')
			.select('id')
			.eq('id', tenant_id)
			.single()

		if (tenantError || !tenant) {
			this.logger.warn('Tenant not found', { user_id, tenant_id })
			throw new NotFoundException('Tenant not found')
		}

		// Get lease associated with tenant
		const { data: lease, error: leaseError } = await client
			.from('leases')
			.select('id, unit_id')
			.eq('primary_tenant_id', tenant_id)
			.single()

		if (leaseError || !lease || !lease.unit_id) {
			this.logger.warn('No lease found for tenant', { tenant_id })
			throw new NotFoundException('No lease found for tenant')
		}

		// Get unit and property
		const { data: unit, error: unitError } = await client
			.from('units')
			.select('property_id')
			.eq('id', lease.unit_id)
			.single()

		if (unitError || !unit || !unit.property_id) {
			this.logger.warn('Unit not found', { unit_id: lease.unit_id })
			throw new NotFoundException('Unit not found')
		}

		// Verify property ownership
		const { data: property, error: propertyError } = await client
			.from('properties')
			.select('property_owner_id')
			.eq('id', unit.property_id)
			.single()

		if (propertyError || !property) {
			this.logger.warn('Property not found', { property_id: unit.property_id })
			throw new NotFoundException('Property not found')
		}

		// Final check: property owner matches requesting user
		if (property.property_owner_id !== user_id) {
			this.logger.warn('Access denied: Not property owner', {
				user_id,
				propertyOwnerId: property.property_owner_id
			})
			throw new ForbiddenException('Access denied: Not property owner')
		}
	}
}
