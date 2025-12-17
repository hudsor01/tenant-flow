import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common'
import { JwtToken } from '../../../shared/decorators/jwt-token.decorator'
import { User } from '../../../shared/decorators/user.decorator'
import type { AuthUser } from '@repo/shared/types/auth'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../../database/supabase.service'
import { TenantAuthGuard } from '../guards/tenant-auth.guard'
import { TenantContextInterceptor } from '../interceptors/tenant-context.interceptor'
import { AppLogger } from '../../../logger/app-logger.service'

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
@UseGuards(TenantAuthGuard)
@UseInterceptors(TenantContextInterceptor)
export class TenantSettingsController {

	constructor(private readonly supabase: SupabaseService, private readonly logger: AppLogger) {}

	/**
	 * Get tenant profile and settings
	 *
	 * @returns Tenant profile information
	 */
	@Get()
	async getSettings(@JwtToken() token: string, @User() user: AuthUser) {
		const [tenant, userResult] = await Promise.all([
			this.fetchTenantProfile(token, user.id),
			this.supabase
				.getUserClient(token)
				.from('users')
				.select('first_name, last_name, email, phone')
				.eq('id', user.id)
				.single()
		])

		if (userResult.error) {
			this.logger.error('Failed to load user settings profile', {
				user_id: user.id,
				error: userResult.error.message
			})
			throw new Error('Failed to load profile')
		}

		return {
			profile: {
				id: tenant.id,
				first_name: userResult.data?.first_name ?? null,
				last_name: userResult.data?.last_name ?? null,
				email: userResult.data?.email ?? user.email ?? null,
				phone: userResult.data?.phone ?? null,

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
