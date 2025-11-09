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
import { SupabaseService } from '../../../database/supabase.service'
import { TenantAuthGuard } from '../guards/tenant-auth.guard'
import { TenantContextInterceptor } from '../interceptors/tenant-context.interceptor'

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

		return {
			profile: {
				id: tenant.id,
				firstName: tenant.firstName,
				lastName: tenant.lastName,
				email: tenant.email,
				phone: tenant.phone,
				status: tenant.status
			},
			preferences: {
				// TODO: Add preferences table when implementing notification settings
				notifications: true,
				emailReminders: true
			}
		}
	}

	private async fetchTenantProfile(token: string, authUserId: string) {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('tenant')
			.select('id, auth_user_id, firstName, lastName, email, phone, status')
			.eq('auth_user_id', authUserId)
			.single()

		if (error) {
			this.logger.error('Failed to load tenant profile', {
				authUserId,
				error: error.message
			})
			throw new Error('Failed to load profile')
		}

		return data
	}
}
