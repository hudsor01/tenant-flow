import {
	Controller,
	Get,
	Logger,
	UseGuards,
	UseInterceptors
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard'
import { JwtToken } from '../../../shared/decorators/jwt-token.decorator'
import { User } from '../../../shared/decorators/user.decorator'
import type { authUser } from '@repo/shared/types/auth'
import type { Database } from '@repo/shared/types/supabase-generated'
import { SupabaseService } from '../../../database/supabase.service'
import { TenantAuthGuard } from '../guards/tenant-auth.guard'
import { TenantContextInterceptor } from '../interceptors/tenant-context.interceptor'

type TenantRow = Pick<
	Database['public']['Tables']['tenant']['Row'],
	| 'id'
	| 'auth_user_id'
	| 'firstName'
	| 'lastName'
	| 'email'
	| 'phone'
	| 'status'
	| 'notification_preferences'
>

const DEFAULT_NOTIFICATION_PREFERENCES = {
	rentReminders: true,
	maintenanceUpdates: true,
	propertyNotices: true,
	emailNotifications: true,
	smsNotifications: false
} as const

/**
 * Tenant Settings Controller
 *
 * Manages tenant profile, preferences, and account settings.
 * Enforces TENANT role via TenantAuthGuard.
 *
 * Routes: /tenant/settings/*
 */
@Controller()
@UseGuards(JwtAuthGuard, TenantAuthGuard)
@UseInterceptors(TenantContextInterceptor)
export class TenantSettingsController {
	private readonly logger = new Logger(TenantSettingsController.name)

	constructor(private readonly supabase: SupabaseService) {}

	/**
	 * Get tenant profile and settings
	 *
	 * @returns Tenant profile information
	 */
	@Get()
	async getSettings(@JwtToken() token: string, @User() user: authUser) {
		const tenant = await this.fetchTenantProfile(token, user.id)
		const preferences = this.normalizeNotificationPreferences(
			tenant.notification_preferences
		)

		return {
			profile: {
				id: tenant.id,
				firstName: tenant.firstName,
				lastName: tenant.lastName,
				email: tenant.email,
				phone: tenant.phone,
				status: tenant.status
			},
			preferences
		}
	}

	private async fetchTenantProfile(
		token: string,
		authUserId: string
	): Promise<TenantRow> {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('tenant')
			.select(
				'id, auth_user_id, firstName, lastName, email, phone, status, notification_preferences'
			)
			.eq('auth_user_id', authUserId)
			.single()

		if (error) {
			this.logger.error('Failed to load tenant profile', {
				authUserId,
				error: error.message
			})
			throw new Error('Failed to load profile')
		}

		return data as TenantRow
	}

	private normalizeNotificationPreferences(
		preferences: TenantRow['notification_preferences']
	): typeof DEFAULT_NOTIFICATION_PREFERENCES {
		if (
			!preferences ||
			Array.isArray(preferences) ||
			typeof preferences !== 'object'
		) {
			return { ...DEFAULT_NOTIFICATION_PREFERENCES }
		}

		const record = preferences as Partial<
			typeof DEFAULT_NOTIFICATION_PREFERENCES
		>

		return {
			rentReminders:
				typeof record.rentReminders === 'boolean'
					? record.rentReminders
					: DEFAULT_NOTIFICATION_PREFERENCES.rentReminders,
			maintenanceUpdates:
				typeof record.maintenanceUpdates === 'boolean'
					? record.maintenanceUpdates
					: DEFAULT_NOTIFICATION_PREFERENCES.maintenanceUpdates,
			propertyNotices:
				typeof record.propertyNotices === 'boolean'
					? record.propertyNotices
					: DEFAULT_NOTIFICATION_PREFERENCES.propertyNotices,
			emailNotifications:
				typeof record.emailNotifications === 'boolean'
					? record.emailNotifications
					: DEFAULT_NOTIFICATION_PREFERENCES.emailNotifications,
			smsNotifications:
				typeof record.smsNotifications === 'boolean'
					? record.smsNotifications
					: DEFAULT_NOTIFICATION_PREFERENCES.smsNotifications
		}
	}
}
