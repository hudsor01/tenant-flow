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
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../../database/supabase.service'
import { TenantAuthGuard } from '../guards/tenant-auth.guard'
import { TenantContextInterceptor } from '../interceptors/tenant-context.interceptor'

type TenantRow = Pick<
	Database['public']['Tables']['tenants']['Row'],
	| 'id'
	| 'user_id'
>

/**
 * Tenant Settings Controller
 *
 * Manages tenant profile, preferences, and account settings.
 * Enforces TENANT user_type via TenantAuthGuard.
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
		const [tenant, userData] = await Promise.all([
			this.fetchTenantProfile(token, user.id),
			this.supabase
				.getUserClient(token)
				.from('users')
				.select('first_name, last_name, email, phone')
				.eq('id', user.id)
				.single()
		])

		return {
			profile: {
				id: tenant.id,
				first_name: userData.data?.first_name,
				last_name: userData.data?.last_name,
				email: userData.data?.email,
				phone: userData.data?.phone,

			}
		}
	}

	private async fetchTenantProfile(
		token: string,
		authuser_id: string
	): Promise<TenantRow> {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('tenants')
			.select('id, user_id')
			.eq('user_id', authuser_id)
			.single()

		if (error) {
			this.logger.error('Failed to load tenant profile', {
				authuser_id,
				error: error.message
			})
			throw new Error('Failed to load profile')
		}

			return data as TenantRow
	}
}
