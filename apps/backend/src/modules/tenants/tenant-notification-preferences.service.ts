/**
 * Tenant Notification Preferences Service
 *
 * Handles notification preference management for tenants
 * Manages: Get, Update notification preferences
 *
 * Database: Uses the existing public.notification_settings table
 * The notification_settings table is linked to users via user_id
 */

import {
	BadRequestException,
	Injectable,
	NotFoundException,
	UnauthorizedException
} from '@nestjs/common'
import type { TenantNotificationPreferences } from '@repo/shared/types/core'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'

/**
 * Maps API interface fields to DB columns (notification_settings)
 */
const API_TO_DB_MAPPING = {
	pushNotifications: 'push',
	emailNotifications: 'email',
	smsNotifications: 'sms',
	leaseNotifications: 'leases',
	maintenanceNotifications: 'maintenance',
	propertyNotices: 'general',
	// These don't have direct DB columns, will be ignored
	paymentReminders: null,
	rentalApplications: null
} as const

/**
 * Default notification preferences for new tenants
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: TenantNotificationPreferences = {
	pushNotifications: true,
	emailNotifications: true,
	smsNotifications: false,
	leaseNotifications: true,
	maintenanceNotifications: true,
	paymentReminders: true,
	rentalApplications: true,
	propertyNotices: true
}

@Injectable()
export class TenantNotificationPreferencesService {
	constructor(
		private readonly logger: AppLogger,
		private readonly supabase: SupabaseService
	) {}

	private requireUserClient(token?: string) {
		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}
		return this.supabase.getUserClient(token)
	}

	/**
	 * Get notification preferences for a tenant
	 * Queries notification_settings by user_id
	 * Returns default preferences if none are set
	 */
	async getPreferences(
		user_id: string,
		tenant_id: string,
		token: string
	): Promise<TenantNotificationPreferences | null> {
		try {
			this.logger.debug('Fetching notification preferences for tenant', {
				tenant_id,
				user_id
			})

			// First verify the tenant exists and belongs to this user
			const client = this.requireUserClient(token)
			const { data: tenant, error: tenantError } = await client
				.from('tenants')
				.select('id, user_id')
				.eq('id', tenant_id)
				.eq('user_id', user_id)
				.single()

			if (tenantError || !tenant) {
				if (tenantError?.code === 'PGRST116') {
					throw new NotFoundException('Tenant not found')
				}
				this.logger.error('Failed to verify tenant', {
					error: tenantError?.message,
					tenant_id
				})
				throw new BadRequestException('Failed to verify tenant')
			}

			// Query notification_settings by user_id
			const { data, error } = await client
				.from('notification_settings')
				.select('email, sms, push, in_app, maintenance, leases, general')
				.eq('user_id', user_id)
				.single()

			if (error) {
				// No settings found - return defaults
				if (error.code === 'PGRST116') {
					this.logger.debug(
						'No notification settings found, returning defaults',
						{ user_id }
					)
					return { ...DEFAULT_NOTIFICATION_PREFERENCES }
				}
				this.logger.error('Failed to fetch notification preferences', {
					error: error.message,
					user_id
				})
				throw new BadRequestException('Failed to retrieve preferences')
			}

			// Map DB columns to API interface
			const preferences: TenantNotificationPreferences = {
				pushNotifications: data.push ?? true,
				emailNotifications: data.email ?? true,
				smsNotifications: data.sms ?? false,
				leaseNotifications: data.leases ?? true,
				maintenanceNotifications: data.maintenance ?? true,
				paymentReminders: true, // No DB column, default to true
				rentalApplications: true, // No DB column, default to true
				propertyNotices: data.general ?? true
			}

			return preferences
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof BadRequestException
			) {
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
	 * Performs upsert to notification_settings table
	 */
	async updatePreferences(
		user_id: string,
		tenant_id: string,
		preferences: Partial<TenantNotificationPreferences>,
		token: string
	): Promise<TenantNotificationPreferences | null> {
		try {
			// Validate input
			if (!preferences || Object.keys(preferences).length === 0) {
				throw new BadRequestException('No preferences provided for update')
			}

			// Get current preferences first (validates tenant access)
			const currentPreferences = await this.getPreferences(
				user_id,
				tenant_id,
				token
			)

			// Build DB update object from API preferences
			const dbUpdate: Record<string, boolean> = {}

			for (const [apiKey, value] of Object.entries(preferences)) {
				if (typeof value !== 'boolean') continue

				const dbColumn =
					API_TO_DB_MAPPING[apiKey as keyof typeof API_TO_DB_MAPPING]
				if (dbColumn) {
					dbUpdate[dbColumn] = value
				}
			}

			// If no mappable fields, just return current (fields like paymentReminders have no DB column)
			if (Object.keys(dbUpdate).length === 0) {
				this.logger.debug('No DB-mappable preferences to update', {
					preferences
				})
				return {
					...currentPreferences,
					...preferences
				} as TenantNotificationPreferences
			}

			// Upsert to notification_settings
			const client = this.requireUserClient(token)
			const { data, error } = await client
				.from('notification_settings')
				.upsert({ user_id, ...dbUpdate }, { onConflict: 'user_id' })
				.select('email, sms, push, in_app, maintenance, leases, general')
				.single()

			if (error) {
				this.logger.error('Failed to update notification preferences', {
					error: error.message,
					user_id
				})
				throw new BadRequestException('Failed to update preferences')
			}

			this.logger.log('Notification preferences updated', {
				tenant_id,
				user_id,
				preferencesKeys: Object.keys(preferences)
			})

			// Return merged preferences (DB values + non-DB fields)
			return {
				pushNotifications: data.push ?? true,
				emailNotifications: data.email ?? true,
				smsNotifications: data.sms ?? false,
				leaseNotifications: data.leases ?? true,
				maintenanceNotifications: data.maintenance ?? true,
				paymentReminders:
					preferences.paymentReminders ??
					currentPreferences?.paymentReminders ??
					true,
				rentalApplications:
					preferences.rentalApplications ??
					currentPreferences?.rentalApplications ??
					true,
				propertyNotices: data.general ?? true
			}
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof BadRequestException
			) {
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
		tenant_id: string,
		token: string
	): Promise<TenantNotificationPreferences | null> {
		return this.updatePreferences(
			user_id,
			tenant_id,
			DEFAULT_NOTIFICATION_PREFERENCES,
			token
		)
	}
}
