/**
 * Tenant Notification Preferences Service
 * 
 * Handles notification preference management for tenants
 * Manages: Get, Update notification preferences
 */

import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException
} from '@nestjs/common'
import type { TenantNotificationPreferences } from '@repo/shared/types/core'
import { SupabaseService } from '../../database/supabase.service'

/**
 * Default notification preferences for new tenants
 */
export const DEFAULT_NOTIFICATION_PREFERENCES = {
	pushNotifications: true,
	emailNotifications: true,
	smsNotifications: false,
	leaseNotifications: true,
	maintenanceNotifications: true,
	paymentReminders: true,
	rentalApplications: true,
	propertyNotices: true
} as const

@Injectable()
export class TenantNotificationPreferencesService {
	constructor(
		private readonly logger: Logger,
		private readonly supabase: SupabaseService
	) {}

	/**
	 * Get notification preferences for a tenant
	 * Returns default preferences if none are set
	 */
	async getPreferences(
		user_id: string,
		tenant_id: string
	): Promise<TenantNotificationPreferences | null> {
		try {
			// TODO: Implement when notification_preferences table is created
			// For now, return default preferences
			this.logger.debug('Fetching notification preferences for tenant', {
				tenant_id,
				user_id
			})

			// Verify tenant exists and user has access
			const client = this.supabase.getAdminClient()
			const { error } = await client
				.from('tenants')
				.select('id', { count: 'exact', head: true })
				.eq('id', tenant_id)
				.eq('user_id', user_id)
				.single()

			if (error) {
				// Tenant not found or no access
				if (error.code === 'PGRST116') {
					throw new NotFoundException('Tenant not found')
				}
				this.logger.error(
					'Failed to verify tenant access for notification preferences',
					{ error: error.message, tenant_id }
				)
				throw new BadRequestException('Failed to retrieve preferences')
			}

			// Return default preferences (notification_preferences column doesn't exist yet)
			return DEFAULT_NOTIFICATION_PREFERENCES
		} catch (error) {
			if (error instanceof NotFoundException ||
				error instanceof BadRequestException) {
				throw error
			}
			this.logger.error('Error getting notification preferences', {
				error: error instanceof Error ? error.message : String(error),
				tenant_id
			})
			throw error
		}
	}

	/**
	 * Update notification preferences for a tenant
	 * Performs partial update - only specified fields are changed
	 */
	async updatePreferences(
		user_id: string,
		tenant_id: string,
		preferences: Partial<TenantNotificationPreferences>
	): Promise<TenantNotificationPreferences | null> {
		try {
			// TODO: Implement when notification_preferences table is created
			// For now, just validate input and verify access, but don't persist

			// Validate input
			if (!preferences || Object.keys(preferences).length === 0) {
				throw new BadRequestException(
					'No preferences provided for update'
				)
			}

			// Verify tenant exists and user has access
			const client = this.supabase.getAdminClient()
			const { error } = await client
				.from('tenants')
				.select('id', { count: 'exact', head: true })
				.eq('id', tenant_id)
				.eq('user_id', user_id)
				.single()

			if (error) {
				if (error.code === 'PGRST116') {
					throw new NotFoundException('Tenant not found')
				}
				throw new BadRequestException('Failed to retrieve tenant')
			}

			this.logger.debug('Notification preferences update requested but not persisted', {
				tenant_id,
				user_id,
				preferencesKeys: Object.keys(preferences)
			})

			// Merge preferences with defaults
			const mergedPreferences = {
				...DEFAULT_NOTIFICATION_PREFERENCES,
				...preferences
			}

			// Return merged preferences (not persisted - notification_preferences column doesn't exist)
			return mergedPreferences
		} catch (error) {
			if (error instanceof NotFoundException ||
				error instanceof BadRequestException) {
				throw error
			}
			this.logger.error('Error updating notification preferences', {
				error: error instanceof Error ? error.message : String(error),
				tenant_id
			})
			throw error
		}
	}

	/**
	 * Reset preferences to defaults for a tenant
	 */
	async resetPreferences(
		user_id: string,
		tenant_id: string
	): Promise<TenantNotificationPreferences | null> {
		return this.updatePreferences(
			user_id,
			tenant_id,
			DEFAULT_NOTIFICATION_PREFERENCES
		)
	}
}
