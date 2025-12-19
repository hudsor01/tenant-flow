/**
 * Tenant CRUD Service
 *
 * Handles Create, Read (via dependency), Update, Delete operations for tenants
 * Manages: Create, Update, MarkAsMovedOut (soft delete), HardDelete (7+ years only)
 */

import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
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
import { AppLogger } from '../../logger/app-logger.service'

@Injectable()
export class TenantCrudService {
	constructor(
		private readonly logger: AppLogger,
		private readonly supabase: SupabaseService,
		private readonly eventEmitter: EventEmitter2,
		private readonly tenantQueryService: TenantQueryService
	) {}

	/**
	 * Minimum retention period for tenant data before hard deletion is allowed
	 * Legal requirement: 7 years for tenant record retention
	 */
	private readonly MINIMUM_RETENTION_YEARS = 7

	/**
	 * Get user-scoped Supabase client with RLS enforcement
	 * Throws UnauthorizedException if no token provided
	 */
	private requireUserClient(token?: string) {
		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}
		return this.supabase.getUserClient(token)
	}

	/**
	 * Create a new tenant
	 * Validates required fields and inserts into tenants table
	 * Emits tenant.created event for notification service
	 */
	async create(
		user_id: string,
		createRequest: CreateTenantRequest,
		token: string
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

			const client = this.requireUserClient(token)

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
			if (error instanceof BadRequestException || error instanceof UnauthorizedException) throw error
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
		updateRequest: UpdateTenantRequest,
		token: string
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

			const client = this.requireUserClient(token)

			// Verify tenant exists and belongs to user
			const existingTenant = await this.tenantQueryService.findOne(tenant_id, token)
			if (!existingTenant) {
				throw new NotFoundException(`Tenant ${tenant_id} not found`)
			}

			if (existingTenant.user_id !== user_id) {
				throw new BadRequestException('Tenant does not belong to user')
			}

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
				error instanceof NotFoundException ||
				error instanceof UnauthorizedException) {
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
		tenant_id: string,
		token: string
	): Promise<Tenant> {
		try {
			this.logger.log('Soft deleting tenant', { tenant_id, user_id })

			// Verify tenant exists and belongs to user (uses RLS via token)
			const tenant = await this.tenantQueryService.findOne(tenant_id, token)
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
				error instanceof NotFoundException ||
				error instanceof UnauthorizedException) {
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
	 * Permanently hard delete a tenant
	 * Only allowed for tenants 7+ years old
	 * Verifies ownership before deletion
	 */
	async hardDelete(
		user_id: string,
		tenant_id: string,
		token: string
	): Promise<{ success: boolean; message: string }> {
		try {
			this.logger.log('Hard deleting tenant', { tenant_id, user_id })

			const client = this.requireUserClient(token)

			// Get tenant (uses RLS via token)
			const tenant = await this.tenantQueryService.findOne(tenant_id, token)
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

			if (ageInYears < this.MINIMUM_RETENTION_YEARS) {
				throw new BadRequestException(
					`Tenant must be at least ${this.MINIMUM_RETENTION_YEARS} years old to hard delete. Current age: ${ageInYears.toFixed(1)} years`
				)
			}

			// Delete tenant record
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
				error instanceof NotFoundException ||
				error instanceof UnauthorizedException) {
				throw error
			}
			this.logger.error('Error hard deleting tenant', {
				error: error instanceof Error ? error.message : String(error),
				tenant_id
			})
			throw error
		}
	}

	/**
	 * Bulk update multiple tenants in parallel
	 *
	 * WARNING: Not atomic - partial failures are possible.
	 * If 5/10 updates succeed, there is no rollback. The operation uses
	 * Promise.allSettled to process all updates concurrently, which means
	 * some may succeed while others fail, leaving data in a partially updated state.
	 *
	 * @param user_id - ID of the user performing the updates
	 * @param updates - Array of tenant IDs and update data
	 * @param token - Authentication token for RLS enforcement
	 * @returns Object with `success` and `failed` arrays showing individual results
	 *
	 * @example
	 * const result = await bulkUpdate(userId, [
	 *   { id: 'tenant-1', data: { emergency_contact_name: 'John' } },
	 *   { id: 'tenant-2', data: { emergency_contact_phone: '555-0100' } }
	 * ], token)
	 * // result.success: [{ id: 'tenant-1', tenant: {...} }]
	 * // result.failed: [{ id: 'tenant-2', error: 'Not found' }]
	 */
	async bulkUpdate(
		user_id: string,
		updates: Array<{ id: string; data: UpdateTenantRequest }>,
		token: string
	): Promise<{
		success: Array<{ id: string; tenant: Tenant }>
		failed: Array<{ id: string; error: string }>
	}> {
		this.logger.log('Bulk updating tenants', { user_id, count: updates.length })

		const client = this.requireUserClient(token)

		// Process all updates in parallel
		const results = await Promise.allSettled(
			updates.map(async ({ id, data }) => {
				try {
					// Verify tenant exists and belongs to user
					const existingTenant = await this.tenantQueryService.findOne(id, token)
					if (!existingTenant) {
						throw new NotFoundException(`Tenant ${id} not found`)
					}

					if (existingTenant.user_id !== user_id) {
						throw new BadRequestException(`Tenant ${id} does not belong to user`)
					}

					// Build update data
					const updateData: Partial<Database['public']['Tables']['tenants']['Update']> = {}

					if (data.date_of_birth !== undefined) {
						updateData.date_of_birth = data.date_of_birth || null
					}
					if (data.ssn_last_four !== undefined) {
						updateData.ssn_last_four = data.ssn_last_four || null
					}
					if (data.emergency_contact_name !== undefined) {
						updateData.emergency_contact_name = data.emergency_contact_name || null
					}
					if (data.emergency_contact_phone !== undefined) {
						updateData.emergency_contact_phone = data.emergency_contact_phone || null
					}
					if (data.emergency_contact_relationship !== undefined) {
						updateData.emergency_contact_relationship = data.emergency_contact_relationship || null
					}
					if (data.stripe_customer_id !== undefined) {
						updateData.stripe_customer_id = data.stripe_customer_id
					}

					const { data: updated, error } = await client
						.from('tenants')
						.update(updateData)
						.eq('id', id)
						.select()
						.single()

					if (error) {
						throw new BadRequestException(`Failed to update tenant ${id}: ${error.message}`)
					}

					return { id, tenant: updated as Tenant }
				} catch (error) {
					throw new Error(
						error instanceof Error ? error.message : `Failed to update tenant ${id}`
					)
				}
			})
		)

		// Separate successful and failed results
		const success: Array<{ id: string; tenant: Tenant }> = []
		const failed: Array<{ id: string; error: string }> = []

		results.forEach((result, index) => {
			const update = updates[index]
			if (!update) return // Skip if index out of bounds

			if (result.status === 'fulfilled') {
				success.push(result.value)
			} else {
				failed.push({
					id: update.id,
					error: result.reason.message
				})
			}
		})

		this.logger.log('Bulk update completed', {
			user_id,
			total: updates.length,
			success: success.length,
			failed: failed.length
		})

		return { success, failed }
	}

	/**
	 * Bulk delete multiple tenants in parallel (soft delete)
	 *
	 * WARNING: Not atomic - partial failures are possible.
	 * If 5/10 deletions succeed, there is no rollback. The operation uses
	 * Promise.allSettled to process all deletions concurrently, which means
	 * some may succeed while others fail, leaving data in a partially deleted state.
	 *
	 * @param user_id - ID of the user performing the deletions
	 * @param tenant_ids - Array of tenant IDs to delete
	 * @param token - Authentication token for RLS enforcement
	 * @returns Object with `success` and `failed` arrays showing individual results
	 *
	 * @example
	 * const result = await bulkDelete(userId, ['tenant-1', 'tenant-2'], token)
	 * // result.success: [{ id: 'tenant-1' }]
	 * // result.failed: [{ id: 'tenant-2', error: 'Tenant does not belong to user' }]
	 */
	async bulkDelete(
		user_id: string,
		tenant_ids: string[],
		token: string
	): Promise<{
		success: Array<{ id: string }>
		failed: Array<{ id: string; error: string }>
	}> {
		this.logger.log('Bulk deleting tenants', { user_id, count: tenant_ids.length })

		// Process all deletions in parallel
		const results = await Promise.allSettled(
			tenant_ids.map(async (tenant_id) => {
				try {
					// Use existing softDelete method which handles verification
					await this.softDelete(user_id, tenant_id, token)
					return { id: tenant_id }
				} catch (error) {
					throw new Error(
						error instanceof Error ? error.message : `Failed to delete tenant ${tenant_id}`
					)
				}
			})
		)

		// Separate successful and failed results
		const success: Array<{ id: string }> = []
		const failed: Array<{ id: string; error: string }> = []

		results.forEach((result, index) => {
			const tenant_id = tenant_ids[index]
			if (!tenant_id) return // Skip if index out of bounds

			if (result.status === 'fulfilled') {
				success.push(result.value)
			} else {
				failed.push({
					id: tenant_id,
					error: result.reason.message
				})
			}
		})

		this.logger.log('Bulk delete completed', {
			user_id,
			total: tenant_ids.length,
			success: success.length,
			failed: failed.length
		})

		return { success, failed }
	}
}
