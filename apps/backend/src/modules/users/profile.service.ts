/**
 * Profile Service
 *
 * Handles user profile operations including:
 * - Fetching profile with role-specific data
 * - Avatar upload/removal
 * - Profile updates
 */

import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	NotFoundException
} from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'

export interface UserProfile {
	id: string
	email: string
	first_name: string | null
	last_name: string | null
	full_name: string
	phone: string | null
	avatar_url: string | null
	user_type: string
	status: string
	created_at: string
	updated_at: string | null
	tenant_profile?: TenantProfile
	owner_profile?: OwnerProfile
}

export interface TenantProfile {
	date_of_birth: string | null
	emergency_contact_name: string | null
	emergency_contact_phone: string | null
	emergency_contact_relationship: string | null
	identity_verified: boolean | null
	current_lease?: {
		property_name: string
		unit_number: string
		move_in_date: string
	} | null
}

export interface OwnerProfile {
	stripe_connected: boolean
	properties_count: number
	units_count: number
}

@Injectable()
export class ProfileService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Get user profile with role-specific data
	 */
	async getProfile(token: string, user_id: string): Promise<UserProfile> {
		const client = this.supabase.getUserClient(token)

		// Fetch base user data
		const { data: user, error: userError } = await client
			.from('users')
			.select(
				'id, email, first_name, last_name, full_name, phone, avatar_url, user_type, status, created_at, updated_at'
			)
			.eq('id', user_id)
			.single()

		if (userError || !user) {
			this.logger.error('Failed to fetch user profile', {
				action: 'get_profile',
				metadata: { user_id, error: userError?.message ?? 'User not found' }
			})
			if (userError?.code === 'PGRST116') {
				throw new NotFoundException('User profile not found')
			}
			throw new InternalServerErrorException('Failed to fetch profile')
		}

		const profile: UserProfile = {
			id: user.id,
			email: user.email ?? '',
			first_name: user.first_name,
			last_name: user.last_name,
			full_name: user.full_name ?? '',
			phone: user.phone,
			avatar_url: user.avatar_url,
			user_type: user.user_type ?? 'owner',
			status: user.status ?? 'active',
			created_at: user.created_at ?? new Date().toISOString(),
			updated_at: user.updated_at
		}

		// Fetch role-specific data
		if (user.user_type === 'tenant') {
			const { data: tenant } = await client
				.from('tenants')
				.select(
					`
					date_of_birth,
					emergency_contact_name,
					emergency_contact_phone,
					emergency_contact_relationship,
					identity_verified
				`
				)
				.eq('user_id', user_id)
				.single()

			if (tenant) {
				profile.tenant_profile = {
					date_of_birth: tenant.date_of_birth,
					emergency_contact_name: tenant.emergency_contact_name,
					emergency_contact_phone: tenant.emergency_contact_phone,
					emergency_contact_relationship: tenant.emergency_contact_relationship,
					identity_verified: tenant.identity_verified
				}
			}
		} else {
			// Owner profile - count properties and units
			const { count: propertiesCount } = await client
				.from('properties')
				.select('id', { count: 'exact', head: true })

			const { count: unitsCount } = await client
				.from('units')
				.select('id', { count: 'exact', head: true })

			// Check Stripe connection
			const { data: stripeAccount } = await client
				.from('stripe_connected_accounts')
				.select('id')
				.eq('user_id', user_id)
				.maybeSingle()

			profile.owner_profile = {
				stripe_connected: !!stripeAccount,
				properties_count: propertiesCount ?? 0,
				units_count: unitsCount ?? 0
			}
		}

		return profile
	}

	/**
	 * Update user avatar
	 */
	async uploadAvatar(
		token: string,
		user_id: string,
		file: Express.Multer.File
	): Promise<{ avatar_url: string }> {
		const client = this.supabase.getUserClient(token)

		// Validate file
		if (!file) {
			throw new BadRequestException('No file provided')
		}

		const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
		if (!allowedTypes.includes(file.mimetype)) {
			throw new BadRequestException(
				'Invalid file type. Allowed types: JPEG, PNG, GIF, WebP'
			)
		}

		const maxSize = 5 * 1024 * 1024 // 5MB
		if (file.size > maxSize) {
			throw new BadRequestException('File size exceeds 5MB limit')
		}

		// Generate file path: avatars/{user_id}/avatar.{ext}
		const ext = file.originalname.split('.').pop() || 'jpg'
		const filePath = `${user_id}/avatar.${ext}`

		// Delete existing avatar first (if any)
		const { data: existingFiles } = await client.storage
			.from('avatars')
			.list(user_id)

		if (existingFiles && existingFiles.length > 0) {
			const filesToDelete = existingFiles.map(f => `${user_id}/${f.name}`)
			await client.storage.from('avatars').remove(filesToDelete)
		}

		// Upload new avatar
		const { error: uploadError } = await client.storage
			.from('avatars')
			.upload(filePath, file.buffer, {
				contentType: file.mimetype,
				upsert: true
			})

		if (uploadError) {
			this.logger.error('Failed to upload avatar', {
				action: 'upload_avatar',
				metadata: { user_id, error: uploadError.message }
			})
			throw new InternalServerErrorException('Failed to upload avatar')
		}

		// Get public URL
		const {
			data: { publicUrl }
		} = client.storage.from('avatars').getPublicUrl(filePath)

		// Add cache-busting query param
		const avatarUrl = `${publicUrl}?t=${Date.now()}`

		// Update user record with new avatar URL
		const { error: updateError } = await client
			.from('users')
			.update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
			.eq('id', user_id)

		if (updateError) {
			this.logger.error('Failed to update user avatar_url', {
				action: 'upload_avatar',
				metadata: { user_id, error: updateError.message }
			})
			throw new InternalServerErrorException('Failed to update profile')
		}

		this.logger.log('Avatar uploaded successfully', {
			action: 'upload_avatar',
			metadata: { user_id }
		})

		return { avatar_url: avatarUrl }
	}

	/**
	 * Remove user avatar
	 */
	async removeAvatar(token: string, user_id: string): Promise<void> {
		const client = this.supabase.getUserClient(token)

		// List and delete all files in user's avatar folder
		const { data: existingFiles } = await client.storage
			.from('avatars')
			.list(user_id)

		if (existingFiles && existingFiles.length > 0) {
			const filesToDelete = existingFiles.map(f => `${user_id}/${f.name}`)
			const { error: deleteError } = await client.storage
				.from('avatars')
				.remove(filesToDelete)

			if (deleteError) {
				this.logger.error('Failed to delete avatar files', {
					action: 'remove_avatar',
					metadata: { user_id, error: deleteError.message }
				})
				throw new InternalServerErrorException('Failed to remove avatar')
			}
		}

		// Clear avatar_url in user record
		const { error: updateError } = await client
			.from('users')
			.update({ avatar_url: null, updated_at: new Date().toISOString() })
			.eq('id', user_id)

		if (updateError) {
			this.logger.error('Failed to clear user avatar_url', {
				action: 'remove_avatar',
				metadata: { user_id, error: updateError.message }
			})
			throw new InternalServerErrorException('Failed to update profile')
		}

		this.logger.log('Avatar removed successfully', {
			action: 'remove_avatar',
			metadata: { user_id }
		})
	}

	/**
	 * Update phone number with validation
	 */
	async updatePhone(
		token: string,
		user_id: string,
		phone: string | null
	): Promise<{ phone: string | null }> {
		const client = this.supabase.getUserClient(token)

		// Validate phone format if provided
		if (phone) {
			const phoneRegex = /^\+?[\d\s\-()]+$/
			const digitsOnly = phone.replace(/\D/g, '')

			if (!phoneRegex.test(phone) || digitsOnly.length < 10) {
				throw new BadRequestException(
					'Invalid phone number format. Must be at least 10 digits.'
				)
			}
		}

		const { error } = await client
			.from('users')
			.update({ phone, updated_at: new Date().toISOString() })
			.eq('id', user_id)

		if (error) {
			this.logger.error('Failed to update phone number', {
				action: 'update_phone',
				metadata: { user_id, error: error.message }
			})
			throw new InternalServerErrorException('Failed to update phone number')
		}

		this.logger.log('Phone number updated', {
			action: 'update_phone',
			metadata: { user_id }
		})

		return { phone }
	}

	/**
	 * Update tenant emergency contact
	 */
	async updateEmergencyContact(
		token: string,
		user_id: string,
		data: {
			name: string
			phone: string
			relationship: string
		}
	): Promise<void> {
		const client = this.supabase.getUserClient(token)

		// Get tenant record for this user
		const { data: tenant, error: fetchError } = await client
			.from('tenants')
			.select('id')
			.eq('user_id', user_id)
			.single()

		if (fetchError || !tenant) {
			throw new NotFoundException('Tenant profile not found')
		}

		// Update emergency contact
		const { error } = await client
			.from('tenants')
			.update({
				emergency_contact_name: data.name,
				emergency_contact_phone: data.phone,
				emergency_contact_relationship: data.relationship,
				updated_at: new Date().toISOString()
			})
			.eq('id', tenant.id)

		if (error) {
			this.logger.error('Failed to update emergency contact', {
				action: 'update_emergency_contact',
				metadata: { user_id, error: error.message }
			})
			throw new InternalServerErrorException(
				'Failed to update emergency contact'
			)
		}

		this.logger.log('Emergency contact updated', {
			action: 'update_emergency_contact',
			metadata: { user_id }
		})
	}

	/**
	 * Clear tenant emergency contact
	 */
	async clearEmergencyContact(token: string, user_id: string): Promise<void> {
		const client = this.supabase.getUserClient(token)

		// Get tenant record for this user
		const { data: tenant, error: fetchError } = await client
			.from('tenants')
			.select('id')
			.eq('user_id', user_id)
			.single()

		if (fetchError || !tenant) {
			throw new NotFoundException('Tenant profile not found')
		}

		// Clear emergency contact fields
		const { error } = await client
			.from('tenants')
			.update({
				emergency_contact_name: null,
				emergency_contact_phone: null,
				emergency_contact_relationship: null,
				updated_at: new Date().toISOString()
			})
			.eq('id', tenant.id)

		if (error) {
			this.logger.error('Failed to clear emergency contact', {
				action: 'clear_emergency_contact',
				metadata: { user_id, error: error.message }
			})
			throw new InternalServerErrorException(
				'Failed to clear emergency contact'
			)
		}

		this.logger.log('Emergency contact cleared', {
			action: 'clear_emergency_contact',
			metadata: { user_id }
		})
	}
}
