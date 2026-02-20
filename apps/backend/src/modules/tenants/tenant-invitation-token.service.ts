/**
 * Tenant Invitation Token Service
 *
 * Handles invitation token validation and acceptance
 * Manages: Token validation, Token expiration, Tenant activation
 */

import {
	BadRequestException,
	Injectable,
	NotFoundException
} from '@nestjs/common'
import type { Tenant } from '@repo/shared/types/core'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'

@Injectable()
export class TenantInvitationTokenService {
	constructor(
		private readonly logger: AppLogger,
		private readonly supabase: SupabaseService
	) {}

	/**
	 * Validate invitation token
	 * Checks expiration and token validity
	 * Returns full invitation details for display
	 */
	async validateToken(token: string): Promise<{
		valid: boolean
		unit_id?: string
		email?: string
		expires_at?: string
		property_owner_name?: string
		property_name?: string
		unit_number?: string
		error?: string
	}> {
		try {
			if (!token?.trim()) {
				return { valid: false, error: 'Token is required' }
			}

			const client = this.supabase.getAdminClient()

			// Fetch invitation with related property owner, property, and unit data
			const { data, error } = await client
				.from('tenant_invitations')
				.select(
					`
					unit_id,
					email,
					expires_at,
					accepted_at,
					invitation_code,
					property_id,
					owner_user_id,
					owner:owner_user_id (
						email,
						first_name,
						last_name
					),
					properties!tenant_invitations_property_id_fkey (
						name
					),
					units!tenant_invitations_unit_id_fkey (
						unit_number
					)
				`
				)
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

			// Build response with optional fields
			const owner = data.owner as {
				email?: string
				first_name?: string
				last_name?: string
			} | null
			const property = data.properties as { name?: string } | null
			const unit = data.units as { unit_number?: string } | null

			const result: {
				valid: boolean
				unit_id?: string
				email?: string
				expires_at?: string
				property_owner_name?: string
				property_name?: string
				unit_number?: string
				error?: string
			} = {
				valid: true,
				email: data.email,
				expires_at: data.expires_at
			}

			if (data.unit_id) result.unit_id = data.unit_id
			if (owner?.first_name || owner?.last_name)
				result.property_owner_name =
					`${owner.first_name || ''} ${owner.last_name || ''}`.trim()
			else if (owner?.email) result.property_owner_name = owner.email
			if (property?.name) result.property_name = property.name
			if (unit?.unit_number) result.unit_number = unit.unit_number

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
	 * Handles both platform-only and unit-assigned invitations
	 * Also verifies the user's email to eliminate redundant confirmation emails
	 */
	async acceptToken(
		token: string,
		user_id: string
	): Promise<
		| (Tenant & { emailVerified: boolean })
		| { success: true; message: string; emailVerified: boolean }
	> {
		try {
			// Validate token first
			const validation = await this.validateToken(token)
			if (!validation.valid) {
				throw new BadRequestException(validation.error || 'Invalid token')
			}

			const client = this.supabase.getAdminClient()

			// Mark invitation as accepted
			const { error } = await client
				.from('tenant_invitations')
				.update({
					accepted_at: new Date().toISOString(),
					accepted_by_user_id: user_id,
					status: 'accepted'
				})
				.eq('invitation_code', token)

			if (error) {
				this.logger.error('Failed to accept token', { error: error.message })
				throw new BadRequestException('Failed to accept invitation')
			}

			// Update user type to TENANT
			const { error: userError } = await client
				.from('users')
				.update({ user_type: 'TENANT' })
				.eq('id', user_id)

			if (userError) {
				this.logger.warn('Failed to update user type to TENANT', {
					error: userError.message,
					user_id
				})
			} else {
				this.logger.log(
					'User type updated to TENANT on invitation acceptance',
					{ user_id }
				)
			}

			// Set app_metadata.user_type AND verify email in a single call
			// This eliminates the need for a separate email confirmation flow
			// since accepting a valid invitation proves email ownership
			const { error: authUpdateError } = await client.auth.admin.updateUserById(
				user_id,
				{
					app_metadata: { user_type: 'TENANT' },
					email_confirm: true
				}
			)

			let emailVerified = true
			if (authUpdateError) {
				emailVerified = false
				this.logger.warn(
					'Failed to verify email during invitation acceptance',
					{
						error: authUpdateError.message,
						user_id
					}
				)
			} else {
				this.logger.log('Email verified during invitation acceptance', {
					user_id
				})
			}

			// If this is a platform-only invitation (no unit), just create tenant record
			if (!validation.unit_id) {
				// Check if tenant already exists for this user
				const { data: existingTenant } = await client
					.from('tenants')
					.select('id, user_id, stripe_customer_id, date_of_birth, ssn_last_four, identity_verified, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, created_at, updated_at')
					.eq('user_id', user_id)
					.maybeSingle()

				if (existingTenant) {
					this.logger.log(
						'Platform invitation accepted, tenant already exists',
						{ user_id }
					)
					return { ...(existingTenant as Tenant), emailVerified }
				}

				// Create new tenant record for platform-only invitation
				const { data: newTenant, error: createError } = await client
					.from('tenants')
					.insert({ user_id })
					.select()
					.single()

				if (createError || !newTenant) {
					this.logger.error('Failed to create tenant record', {
						error: createError?.message
					})
					// Don't fail - invitation is accepted, tenant creation is secondary
					return {
						success: true,
						message:
							'Invitation accepted. Please contact your property manager to complete setup.',
						emailVerified
					}
				}

				this.logger.log('Platform invitation accepted, tenant created', {
					user_id,
					tenant_id: newTenant.id
				})
				return { ...(newTenant as Tenant), emailVerified }
			}

			// Unit-assigned invitation: link tenant to existing lease
			const { data: leaseData, error: leaseError } = await client
				.from('leases')
				.select('id, primary_tenant_id')
				.eq('unit_id', validation.unit_id)
				.single()

			if (leaseError || !leaseData?.primary_tenant_id) {
				this.logger.warn(
					'No lease found for unit, creating standalone tenant',
					{ unit_id: validation.unit_id }
				)
				// Create tenant without lease link
				const { data: newTenant } = await client
					.from('tenants')
					.insert({ user_id })
					.select()
					.single()

				return newTenant
					? { ...(newTenant as Tenant), emailVerified }
					: {
							success: true as const,
							message: 'Invitation accepted',
							emailVerified
						}
			}

			// Link user to existing tenant record
			const { data: tenantData, error: tenantError } = await client
				.from('tenants')
				.update({ user_id })
				.eq('id', leaseData.primary_tenant_id)
				.select()
				.single()

			if (tenantError || !tenantData) {
				throw new BadRequestException('Failed to link tenant account')
			}

			this.logger.log('Invitation accepted, tenant linked to lease', {
				user_id,
				tenant_id: tenantData.id,
				lease_id: leaseData.id
			})

			return { ...(tenantData as Tenant), emailVerified }
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
				.update({}) // Tenant is already complete, no status update needed
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
				.is('user_type', null) // Only update if user_type is NULL (new users)

			if (userError) {
				this.logger.warn(
					'Failed to update user type to TENANT on webhook activation',
					{
						error: userError.message,
						user_id
					}
				)
				// Don't throw - tenant activation is more important than user_type update
			} else {
				this.logger.log('User type updated to TENANT on webhook activation', {
					user_id
				})
			}

			// Also set app_metadata.user_type directly on auth user for immediate effect
			const { error: authUpdateError } = await client.auth.admin.updateUserById(
				user_id,
				{ app_metadata: { user_type: 'TENANT' } }
			)

			if (authUpdateError) {
				this.logger.warn(
					'Failed to update auth user app_metadata on webhook activation',
					{
						error: authUpdateError.message,
						user_id
					}
				)
			}

			return tenantData as Tenant
		} catch (error) {
			if (
				error instanceof BadRequestException ||
				error instanceof NotFoundException
			) {
				throw error
			}
			this.logger.error('Error activating tenant', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw new BadRequestException('Failed to activate tenant')
		}
	}
}
