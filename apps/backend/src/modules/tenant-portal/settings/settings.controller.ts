import {
	Body,
	Controller,
	Delete,
	Get,
	InternalServerErrorException,
	NotFoundException,
	Put,
	Request,
	UnauthorizedException,
	UseGuards,
	UseInterceptors
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../../database/supabase.service'
import { TenantAuthGuard } from '../guards/tenant-auth.guard'
import { TenantContextInterceptor } from '../interceptors/tenant-context.interceptor'
import { AppLogger } from '../../../logger/app-logger.service'
import { UpdateNotificationPreferencesDto } from '../../tenants/dto/notification-preferences.dto'

type TenantRow = Pick<
	Database['public']['Tables']['tenants']['Row'],
	'id' | 'user_id'
>

/**
 * DTO for updating emergency contact
 */
class UpdateEmergencyContactDto {
	name?: string | null
	phone?: string | null
	relationship?: string | null
}

/**
 * Tenant Settings Controller
 *
 * Manages tenant profile, preferences, and account settings.
 * Enforces TENANT user_type via TenantAuthGuard.
 *
 * Routes: /tenant/settings/*
 */
@ApiTags('Tenant Portal - Settings')
@ApiBearerAuth('supabase-auth')
@Controller()
@UseGuards(TenantAuthGuard)
@UseInterceptors(TenantContextInterceptor)
export class TenantSettingsController {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Get tenant profile and settings
	 *
	 * @returns Tenant profile information
	 */
	@ApiOperation({ summary: 'Get settings', description: 'Get tenant profile and account settings' })
	@ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized - tenant authentication required' })
	@ApiResponse({ status: 500, description: 'Internal server error' })
	@Get()
	async getSettings(@Request() req: AuthenticatedRequest) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const user = req.user
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
			throw new InternalServerErrorException('Failed to load profile')
		}

		return {
			profile: {
				id: tenant.id,
				first_name: userResult.data?.first_name ?? null,
				last_name: userResult.data?.last_name ?? null,
				email: userResult.data?.email ?? user.email ?? null,
				phone: userResult.data?.phone ?? null
			}
		}
	}

	/**
	 * Get notification preferences for authenticated tenant
	 */
	@ApiOperation({ summary: 'Get notification preferences', description: 'Get notification settings for the authenticated tenant' })
	@ApiResponse({ status: 200, description: 'Notification preferences retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('notification-preferences')
	async getNotificationPreferences(@Request() req: AuthenticatedRequest) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}

		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('notification_settings')
			.select('*')
			.eq('user_id', req.user.id)
			.maybeSingle()

		if (error) {
			this.logger.error('Failed to load notification preferences', {
				user_id: req.user.id,
				error: error.message
			})
			throw new InternalServerErrorException('Failed to load notification preferences')
		}

		// Return default preferences if none exist
		if (!data) {
			return {
				email: true,
				sms: false,
				push: true,
				in_app: true,
				general: true,
				maintenance: true,
				leases: true
			}
		}

		return data
	}

	/**
	 * Update notification preferences for authenticated tenant
	 */
	@ApiOperation({ summary: 'Update notification preferences', description: 'Update notification settings for the authenticated tenant' })
	@ApiResponse({ status: 200, description: 'Notification preferences updated successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Put('notification-preferences')
	async updateNotificationPreferences(
		@Request() req: AuthenticatedRequest,
		@Body() preferences: UpdateNotificationPreferencesDto
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}

		// Upsert the notification settings
		// Build upsert data, only including defined preference values
		const upsertData: Database['public']['Tables']['notification_settings']['Insert'] = {
			user_id: req.user.id,
			updated_at: new Date().toISOString()
		}
		if (preferences.email !== undefined) upsertData.email = preferences.email
		if (preferences.sms !== undefined) upsertData.sms = preferences.sms
		if (preferences.push !== undefined) upsertData.push = preferences.push
		if (preferences.in_app !== undefined) upsertData.in_app = preferences.in_app
		if (preferences.general !== undefined) upsertData.general = preferences.general
		if (preferences.maintenance !== undefined) upsertData.maintenance = preferences.maintenance
		if (preferences.leases !== undefined) upsertData.leases = preferences.leases

		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('notification_settings')
			.upsert(upsertData, { onConflict: 'user_id' })
			.select()
			.single()

		if (error) {
			this.logger.error('Failed to update notification preferences', {
				user_id: req.user.id,
				error: error.message
			})
			throw new InternalServerErrorException('Failed to update notification preferences')
		}

		return data
	}

	/**
	 * Get emergency contact for authenticated tenant
	 */
	@ApiOperation({ summary: 'Get emergency contact', description: 'Get emergency contact for the authenticated tenant' })
	@ApiResponse({ status: 200, description: 'Emergency contact retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('emergency-contact')
	async getEmergencyContact(@Request() req: AuthenticatedRequest) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}

		const tenant_id = req.tenantContext?.tenant_id
		if (!tenant_id) {
			throw new UnauthorizedException('Tenant context required')
		}

		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('tenants')
			.select('emergency_contact_name, emergency_contact_phone, emergency_contact_relationship')
			.eq('id', tenant_id)
			.single()

		if (error) {
			this.logger.error('Failed to load emergency contact', {
				tenant_id,
				error: error.message
			})
			throw new InternalServerErrorException('Failed to load emergency contact')
		}

		// Return null if no emergency contact exists
		if (!data.emergency_contact_name && !data.emergency_contact_phone) {
			return null
		}

		return {
			name: data.emergency_contact_name,
			phone: data.emergency_contact_phone,
			relationship: data.emergency_contact_relationship
		}
	}

	/**
	 * Update emergency contact for authenticated tenant
	 */
	@ApiOperation({ summary: 'Update emergency contact', description: 'Update emergency contact for the authenticated tenant' })
	@ApiResponse({ status: 200, description: 'Emergency contact updated successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Put('emergency-contact')
	async updateEmergencyContact(
		@Request() req: AuthenticatedRequest,
		@Body() emergencyContact: UpdateEmergencyContactDto
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}

		const tenant_id = req.tenantContext?.tenant_id
		if (!tenant_id) {
			throw new UnauthorizedException('Tenant context required')
		}

		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('tenants')
			.update({
				emergency_contact_name: emergencyContact.name ?? null,
				emergency_contact_phone: emergencyContact.phone ?? null,
				emergency_contact_relationship: emergencyContact.relationship ?? null,
				updated_at: new Date().toISOString()
			})
			.eq('id', tenant_id)
			.select('emergency_contact_name, emergency_contact_phone, emergency_contact_relationship')
			.single()

		if (error) {
			this.logger.error('Failed to update emergency contact', {
				tenant_id,
				error: error.message
			})
			throw new InternalServerErrorException('Failed to update emergency contact')
		}

		return {
			name: data.emergency_contact_name,
			phone: data.emergency_contact_phone,
			relationship: data.emergency_contact_relationship
		}
	}

	/**
	 * Delete emergency contact for authenticated tenant
	 */
	@ApiOperation({ summary: 'Delete emergency contact', description: 'Delete emergency contact for the authenticated tenant' })
	@ApiResponse({ status: 200, description: 'Emergency contact deleted successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Delete('emergency-contact')
	async deleteEmergencyContact(@Request() req: AuthenticatedRequest) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}

		const tenant_id = req.tenantContext?.tenant_id
		if (!tenant_id) {
			throw new UnauthorizedException('Tenant context required')
		}

		const { error } = await this.supabase
			.getUserClient(token)
			.from('tenants')
			.update({
				emergency_contact_name: null,
				emergency_contact_phone: null,
				emergency_contact_relationship: null,
				updated_at: new Date().toISOString()
			})
			.eq('id', tenant_id)

		if (error) {
			this.logger.error('Failed to delete emergency contact', {
				tenant_id,
				error: error.message
			})
			throw new InternalServerErrorException('Failed to delete emergency contact')
		}

		return { success: true }
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
			throw new NotFoundException('Tenant profile not found')
		}

		return data as TenantRow
	}
}
