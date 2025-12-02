/**
 * Tenant Invitation Token Service
 * 
 * Handles invitation token validation and acceptance
 * Manages: Token validation, Token expiration, Tenant activation
 */

import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException
} from '@nestjs/common'
import type { Tenant } from '@repo/shared/types/core'
import { SupabaseService } from '../../database/supabase.service'

@Injectable()
export class TenantInvitationTokenService {
	constructor(
		private readonly logger: Logger,
		private readonly supabase: SupabaseService
	) {}

	/**
	 * Validate invitation token
	 * Checks expiration and token validity
	 */
	async validateToken(token: string): Promise<{
		valid: boolean
		unit_id?: string
		email?: string
		error?: string
	}> {
		try {
			if (!token?.trim()) {
				return { valid: false, error: 'Token is required' }
			}

			const client = this.supabase.getAdminClient()
			const { data, error } = await client
				.from('tenant_invitations')
				.select('unit_id, email, expires_at, accepted_at, invitation_code')
				.eq('invitation_code', token)
				.single()

			if (error || !data) {
				return { valid: false, error: 'Invalid or expired token' }
			}

			// Check expiration
			const expiresAt = new Date(data.expires_at)
			if (expiresAt < new Date()) {
				return { valid: false, error: 'Token has expired' }
			}

			// Check if already accepted
			if (data.accepted_at) {
				return { valid: false, error: 'Token has already been used' }
			}

			const result: { valid: boolean; unit_id?: string; email?: string; error?: string } = {
				valid: true,
				email: data.email
			}
			if (data.unit_id) {
				result.unit_id = data.unit_id
			}
			return result
		} catch (error) {
			this.logger.error('Error validating token', {
				error: error instanceof Error ? error.message : String(error)
			})
			return { valid: false, error: 'Token validation failed' }
		}
	}

	/**
	 * Accept invitation token and mark as used
	 */
	async acceptToken(token: string, user_id: string): Promise<Tenant> {
		try {
			// Validate token first
			const validation = await this.validateToken(token)
			if (!validation.valid) {
				throw new BadRequestException(validation.error || 'Invalid token')
			}

			const client = this.supabase.getAdminClient()
			const { error } = await client
				.from('tenant_invitations')
				.update({
					accepted_at: new Date().toISOString(),
					accepted_by_user_id: user_id
				})
				.eq('invitation_code', token)

			if (error) {
				this.logger.error('Failed to accept token', {
					error: error.message
				})
				throw new BadRequestException('Failed to accept invitation')
			}

			// Get the lease through the unit, then find the primary tenant
			const { data: unit, error: unitError } = await client
				.from('units')
				.select('property_id')
				.eq('id', validation.unit_id!)
				.single()

			if (unitError || !unit) {
				throw new BadRequestException('Unit not found')
			}

			// Find the lease for this unit and link the tenant
			const { data: leaseData, error: leaseError } = await client
				.from('leases')
				.select('id, primary_tenant_id')
				.eq('unit_id', validation.unit_id!)
				.single()

			if (leaseError || !leaseData?.primary_tenant_id) {
				throw new BadRequestException('Lease not found')
			}

			// Link user to tenant and update tenant record
			const { data: tenantData, error: tenantError } = await client
				.from('tenants')
				.update({ user_id })
				.eq('id', leaseData.primary_tenant_id)
				.select()
				.single()

			if (tenantError || !tenantData) {
				throw new BadRequestException('Failed to retrieve tenant')
			}

			// Update user record to set user_type='TENANT' in public.users
			// The DB trigger will sync this to auth.users.raw_app_meta_data
			const { error: userError } = await client
				.from('users')
				.update({ user_type: 'TENANT' })
				.eq('id', user_id)

			if (userError) {
				this.logger.warn('Failed to update user type to TENANT', {
					error: userError.message,
					user_id
				})
				// Don't throw - tenant acceptance is more important than user_type update
			} else {
				this.logger.log('User type updated to TENANT on invitation acceptance', { user_id })
			}

			// Also set app_metadata.user_type directly on auth user for immediate effect
			const { error: authUpdateError } = await client.auth.admin.updateUserById(
				user_id,
				{ app_metadata: { user_type: 'TENANT' } }
			)

			if (authUpdateError) {
				this.logger.warn('Failed to update auth user app_metadata', {
					error: authUpdateError.message,
					user_id
				})
			}

			return tenantData as Tenant
		} catch (error) {
			if (error instanceof BadRequestException) throw error
			this.logger.error('Error accepting token', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw new BadRequestException('Failed to accept invitation')
		}
	}

	/**
	 * Activate tenant from auth user
	 * Links auth user to tenant
	 */
	async activateTenantFromAuthUser(user_id: string): Promise<Tenant> {
		try {
			// Get tenant by user ID
			const { data: tenant, error: tenantError } = await this.supabase
				.getAdminClient()
				.from('tenants')
				.select('id')
				.eq('user_id', user_id)
				.single()
			if (tenantError || !tenant) {
			throw new NotFoundException('Tenant not found for this user')
		}

			const client = this.supabase.getAdminClient()
			const { data: tenantData, error } = await client
				.from('tenants')
				.update({})  // Tenant is already complete, no status update needed
				.eq('id', tenant.id)
				.select()
				.single()

			if (error || !tenantData) {
				this.logger.error('Failed to activate tenant', {
					error: error?.message
				})
				throw new BadRequestException('Failed to activate tenant')
			}

			// Update user record to set user_type='TENANT' if not already set
			// The DB trigger will sync this to auth.users.raw_app_meta_data
			const { error: userError } = await client
				.from('users')
				.update({ user_type: 'TENANT' })
				.eq('id', user_id)
				.is('user_type', null)  // Only update if user_type is NULL (new users)

			if (userError) {
				this.logger.warn('Failed to update user type to TENANT on webhook activation', {
					error: userError.message,
					user_id
				})
				// Don't throw - tenant activation is more important than user_type update
			} else {
				this.logger.log('User type updated to TENANT on webhook activation', { user_id })
			}

			// Also set app_metadata.user_type directly on auth user for immediate effect
			const { error: authUpdateError } = await client.auth.admin.updateUserById(
				user_id,
				{ app_metadata: { user_type: 'TENANT' } }
			)

			if (authUpdateError) {
				this.logger.warn('Failed to update auth user app_metadata on webhook activation', {
					error: authUpdateError.message,
					user_id
				})
			}

			return tenantData as Tenant
		} catch (error) {
			if (error instanceof BadRequestException ||
				error instanceof NotFoundException) {
				throw error
			}
			this.logger.error('Error activating tenant', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw new BadRequestException('Failed to activate tenant')
		}
	}
}
