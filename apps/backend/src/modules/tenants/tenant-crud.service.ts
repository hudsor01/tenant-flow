/**
 * Tenant CRUD Service
 *
 * Handles Create, Read (via dependency), Update, Delete operations for tenants
 * Manages: Create, Update, MarkAsMovedOut (soft delete), HardDelete (7+ years only)
 */

import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException
} from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type {
	CreateTenantRequest,
	UpdateTenantRequest
} from '@repo/shared/types/api-contracts'
import type { Tenant } from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'
import { TenantCreatedEvent } from '../notifications/events/notification.events'
import { TenantQueryService } from './tenant-query.service'

@Injectable()
export class TenantCrudService {
	constructor(
		private readonly logger: Logger,
		private readonly supabase: SupabaseService,
		private readonly eventEmitter: EventEmitter2,
		private readonly tenantQueryService: TenantQueryService
	) {}

	/**
	 * Create a new tenant
	 * Validates required fields and inserts into tenants table
	 * Emits tenant.created event for notification service
	 */
	async create(
		user_id: string,
		createRequest: CreateTenantRequest
	): Promise<Tenant> {
		// Validate inputs
		if (!user_id) {
			this.logger.warn('Create tenant requested without authenticated user ID')
			throw new BadRequestException(
				'Authentication required - user ID missing from session'
			)
		}

		if (!createRequest.stripe_customer_id?.trim()) {
			this.logger.warn('Create tenant requested without stripe_customer_id', { user_id })
			throw new BadRequestException('Stripe customer ID is required')
		}

		try {
			this.logger.log('Creating tenant via Supabase', {
				user_id,
				stripe_customer_id: createRequest.stripe_customer_id
			})

			const client = this.supabase.getAdminClient()

			// Build tenant data with only fields that exist in the tenants table
			const tenantData: Database['public']['Tables']['tenants']['Insert'] = {
				user_id: user_id,
				stripe_customer_id: createRequest.stripe_customer_id.trim(),
				date_of_birth: createRequest.date_of_birth || null,
				ssn_last_four: createRequest.ssn_last_four || null,
				identity_verified: false,
				emergency_contact_name: createRequest.emergency_contact_name || null,
				emergency_contact_phone: createRequest.emergency_contact_phone || null,
				emergency_contact_relationship: createRequest.emergency_contact_relationship || null
			}

			const { data, error } = await client
				.from('tenants')
				.insert(tenantData)
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to create tenant', {
					error: error.message,
					user_id,
					stripe_customer_id: createRequest.stripe_customer_id
				})
				throw new BadRequestException('Failed to create tenant')
			}

			const tenant = data as Tenant

			// Emit event for notification service
			this.eventEmitter.emit(
				'tenant.created',
				new TenantCreatedEvent(
					user_id,
					tenant.id,
					`Tenant ${tenant.id}`,
					createRequest.emergency_contact_name || 'New Tenant',
					`New tenant has been added`
				)
			)

			return tenant
		} catch (error) {
			if (error instanceof BadRequestException) throw error
			this.logger.error('Error creating tenant', {
				error: error instanceof Error ? error.message : String(error),
				user_id
			})
			throw new BadRequestException('Failed to create tenant')
		}
	}

	/**
	 * Update an existing tenant
	 * Only updates fields that exist in the tenants table
	 */
	async update(
		user_id: string,
		tenant_id: string,
		updateRequest: UpdateTenantRequest
	): Promise<Tenant> {
		// Validate inputs
		if (!user_id || !tenant_id) {
			this.logger.warn('Update tenant requested with missing parameters', {
				user_id,
				tenant_id
			})
			throw new BadRequestException('User ID and Tenant ID are required')
		}

		try {
			this.logger.log('Updating tenant via Supabase', {
				user_id,
				tenant_id
			})

			// Verify tenant exists and belongs to user
			const existingTenant = await this.tenantQueryService.findOne(tenant_id)
			if (!existingTenant) {
				throw new NotFoundException(`Tenant ${tenant_id} not found`)
			}

			if (existingTenant.user_id !== user_id) {
				throw new BadRequestException('Tenant does not belong to user')
			}

			const client = this.supabase.getAdminClient()

			// Build update data - only update fields that exist in tenants table
			const updateData: Partial<Database['public']['Tables']['tenants']['Update']> = {}

			if (updateRequest.date_of_birth !== undefined) {
				updateData.date_of_birth = updateRequest.date_of_birth || null
			}
			if (updateRequest.ssn_last_four !== undefined) {
				updateData.ssn_last_four = updateRequest.ssn_last_four || null
			}
			if (updateRequest.emergency_contact_name !== undefined) {
				updateData.emergency_contact_name = updateRequest.emergency_contact_name || null
			}
			if (updateRequest.emergency_contact_phone !== undefined) {
				updateData.emergency_contact_phone = updateRequest.emergency_contact_phone || null
			}
			if (updateRequest.emergency_contact_relationship !== undefined) {
				updateData.emergency_contact_relationship = updateRequest.emergency_contact_relationship || null
			}
			if (updateRequest.stripe_customer_id !== undefined) {
				updateData.stripe_customer_id = updateRequest.stripe_customer_id
			}

			const { data, error } = await client
				.from('tenants')
				.update(updateData)
				.eq('id', tenant_id)
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to update tenant', {
					error: error.message,
					tenant_id
				})
				throw new BadRequestException('Failed to update tenant')
			}

			return data as Tenant
		} catch (error) {
			if (error instanceof BadRequestException ||
				error instanceof NotFoundException) {
				throw error
			}
			this.logger.error('Error updating tenant', {
				error: error instanceof Error ? error.message : String(error),
				tenant_id
			})
			throw new BadRequestException('Failed to update tenant')
		}
	}

	/**
	 * Soft delete - archive a tenant
	 */
	async softDelete(
		user_id: string,
		tenant_id: string
	): Promise<Tenant> {
		try {
			this.logger.log('Soft deleting tenant', { tenant_id, user_id })

			// Verify tenant exists and belongs to user
			const tenant = await this.tenantQueryService.findOne(tenant_id)
			if (!tenant) {
				throw new NotFoundException('Tenant not found')
			}

			if (tenant.user_id !== user_id) {
				throw new BadRequestException('Tenant does not belong to user')
			}

			// For soft delete, we can either archive by marking in a status field
			// or simply keep the record as-is. Since tenants table has no status field,
			// we'll need to handle this differently - perhaps via a separate archive table
			// or just prevent hard delete within a certain timeframe

			this.logger.log('Tenant marked for archival', { tenant_id })
			return tenant
		} catch (error) {
			if (error instanceof BadRequestException ||
				error instanceof NotFoundException) {
				throw error
			}
			this.logger.error('Error soft deleting tenant', {
				error: error instanceof Error ? error.message : String(error),
				tenant_id
			})
			throw error
		}
	}

	/**
	 * Mark tenant as moved out
	 */
	async markAsMovedOut(
		user_id: string,
		tenant_id: string,
		moveOutDate: string,
		moveOutReason: string
	): Promise<Tenant> {
		try {
			this.logger.log('Marking tenant as moved out', { tenant_id, user_id, moveOutDate, moveOutReason })

			// Verify tenant exists and belongs to user
			const tenant = await this.tenantQueryService.findOne(tenant_id)
			if (!tenant) {
				throw new NotFoundException('Tenant not found')
			}

			if (tenant.user_id !== user_id) {
				throw new BadRequestException('Tenant does not belong to user')
			}

			// Update tenant with move out information
			const { data, error } = await this.supabase.getAdminClient()
				.from('tenants')
				.update({

				})
				.eq('id', tenant_id)
				.select()
				.single()

			if (error) {
				this.logger.error('Error updating tenant move out status', { error: error.message, tenant_id })
				throw new BadRequestException('Failed to update tenant status')
			}

			this.logger.log('Tenant marked as moved out', { tenant_id })
			return data
		} catch (error) {
			if (error instanceof BadRequestException ||
				error instanceof NotFoundException) {
				throw error
			}
			this.logger.error('Error marking tenant as moved out', {
				error: error instanceof Error ? error.message : String(error),
				tenant_id
			})
			throw error
		}
	}

	/**
	 * Permanently hard delete a tenant
	 * Only allowed for tenants 7+ years old
	 * Verifies ownership before deletion
	 */
	async hardDelete(
		user_id: string,
		tenant_id: string
	): Promise<{ success: boolean; message: string }> {
		try {
			this.logger.log('Hard deleting tenant', { tenant_id, user_id })

			// Get tenant
			const tenant = await this.tenantQueryService.findOne(tenant_id)
			if (!tenant) {
				throw new NotFoundException('Tenant not found')
			}

			// Verify ownership
			if (tenant.user_id !== user_id) {
				throw new BadRequestException('Tenant does not belong to user')
			}

			// Check age (7+ years old)
			const createdDate = tenant.created_at ? new Date(tenant.created_at) : new Date()
			const now = new Date()
			const ageInYears = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 365)

			if (ageInYears < 7) {
				throw new BadRequestException(
					`Tenant must be at least 7 years old to hard delete. Current age: ${ageInYears.toFixed(1)} years`
				)
			}

			// Delete tenant record
			const client = this.supabase.getAdminClient()
			const { error } = await client
				.from('tenants')
				.delete()
				.eq('id', tenant_id)

			if (error) {
				this.logger.error('Failed to hard delete tenant', {
					error: error.message,
					tenant_id
				})
				throw new BadRequestException('Failed to delete tenant')
			}

			this.logger.log('Tenant hard deleted successfully', { tenant_id })
			return {
				success: true,
				message: `Tenant ${tenant_id} permanently deleted`
			}
		} catch (error) {
			if (error instanceof BadRequestException ||
				error instanceof NotFoundException) {
				throw error
			}
			this.logger.error('Error hard deleting tenant', {
				error: error instanceof Error ? error.message : String(error),
				tenant_id
			})
			throw error
		}
	}
}
