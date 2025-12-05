/**
 * Tenant Notification Preferences Service
 *
 * Handles notification preference management for tenants
 * Manages: Get, Update notification preferences
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { TenantNotificationPreferences } from '@repo/shared/types/core'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'

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
		private readonly logger: AppLogger,
		private readonly supabase: SupabaseService
	) {}

	/**
	 * Get notification preferences for a tenant
	 * Returns default preferences if none are set
	 *
	 * NOTE: The notification_preferences column does not exist in the database yet.
	 * This service returns defaults until the migration is applied.
	 */
	async getPreferences(
		user_id: string,
		tenant_id: string
	): Promise<TenantNotificationPreferences | null> {
		try {
			this.logger.debug('Fetching notification preferences for tenant', {
				tenant_id,
				user_id
			})

			// Query tenant to verify access (without notification_preferences column)
			const client = this.supabase.getAdminClient()
			const { error } = await client
				.from('tenants')
				.select('id')
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

			// Return defaults (notification_preferences column not yet in database)
			return DEFAULT_NOTIFICATION_PREFERENCES as TenantNotificationPreferences
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
	 *
	 * NOTE: The notification_preferences column does not exist in the database yet.
	 * This method returns merged preferences without persisting until the migration is applied.
	 */
	async updatePreferences(
		user_id: string,
		tenant_id: string,
		preferences: Partial<TenantNotificationPreferences>
	): Promise<TenantNotificationPreferences | null> {
		try {
			// Validate input
			if (!preferences || Object.keys(preferences).length === 0) {
				throw new BadRequestException(
					'No preferences provided for update'
				)
			}

			// Get current preferences first (validates tenant access)
			const currentPreferences = await this.getPreferences(user_id, tenant_id)

			// Merge preferences with current (or defaults)
			const mergedPreferences = {
				...currentPreferences,
				...preferences
			}

			// NOTE: notification_preferences column not yet in database
			// Just log and return merged preferences for now
			this.logger.debug('Notification preferences would be updated (column not yet available)', {
				tenant_id,
				user_id,
				preferencesKeys: Object.keys(preferences)
			})

			return mergedPreferences as TenantNotificationPreferences
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
