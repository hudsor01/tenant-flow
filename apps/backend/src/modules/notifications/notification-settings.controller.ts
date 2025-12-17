import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Put,
	Req,
	UnauthorizedException
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { NotificationPreferences } from '@repo/shared/types/notifications'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'

type NotificationSettingsRow = Database['public']['Tables']['notification_settings']['Row']

const DEFAULT_SETTINGS: NotificationPreferences = {
	email: true,
	sms: false,
	push: true,
	inApp: true,
	categories: {
		maintenance: true,
		leases: true,
		general: true
	}
}

@Controller('notification-settings')
export class NotificationSettingsController {
	constructor(private readonly supabase: SupabaseService) {}

	private getUserClientFromRequest(req: AuthenticatedRequest): SupabaseClient {
		const authHeader = req.headers.authorization
		if (!authHeader?.startsWith('Bearer ')) {
			throw new UnauthorizedException('Missing or invalid authorization header')
		}
		const token = authHeader.slice(7)
		// Cast to any to avoid compile-time coupling to generated Supabase types for new table
		return this.supabase.getUserClient(token) as unknown as SupabaseClient
	}

	private mapRowToPreferences(row: NotificationSettingsRow): NotificationPreferences {
		return {
			email: row.email ?? DEFAULT_SETTINGS.email,
			sms: row.sms ?? DEFAULT_SETTINGS.sms,
			push: row.push ?? DEFAULT_SETTINGS.push,
			inApp: row.in_app ?? DEFAULT_SETTINGS.inApp,
			categories: {
				maintenance: row.maintenance ?? DEFAULT_SETTINGS.categories.maintenance,
				leases: row.leases ?? DEFAULT_SETTINGS.categories.leases,
				general: row.general ?? DEFAULT_SETTINGS.categories.general
			}
		}
	}

	private buildUpdatePayload(
		payload: Partial<NotificationPreferences>
	): Record<string, boolean | string> {
		const update: Record<string, boolean | string> = {
			updated_at: new Date().toISOString()
		}

		if (typeof payload.email === 'boolean') update.email = payload.email
		if (typeof payload.sms === 'boolean') update.sms = payload.sms
		if (typeof payload.push === 'boolean') update.push = payload.push
		if (typeof payload.inApp === 'boolean') update.in_app = payload.inApp

		const categories = payload.categories as { maintenance?: boolean; leases?: boolean; general?: boolean } | undefined
		if (categories?.maintenance !== undefined && typeof categories.maintenance === 'boolean') {
			update.maintenance = categories.maintenance
		}
		if (categories?.leases !== undefined && typeof categories.leases === 'boolean') {
			update.leases = categories.leases
		}
		if (categories?.general !== undefined && typeof categories.general === 'boolean') {
			update.general = categories.general
		}

		return update
	}

	private async ensureSettingsRow(
		userId: string,
		client: SupabaseClient
	): Promise<NotificationSettingsRow> {
		const { data, error } = await client
			.from('notification_settings')
			.select('*')
			.eq('user_id', userId)
			.limit(1)

		if (error) {
			throw new BadRequestException(error.message)
		}

		const existing = data?.[0] as NotificationSettingsRow | undefined
		if (existing) return existing

		const defaults = {
			user_id: userId,
			email: DEFAULT_SETTINGS.email,
			sms: DEFAULT_SETTINGS.sms,
			push: DEFAULT_SETTINGS.push,
			in_app: DEFAULT_SETTINGS.inApp,
			maintenance: DEFAULT_SETTINGS.categories.maintenance,
			leases: DEFAULT_SETTINGS.categories.leases,
			general: DEFAULT_SETTINGS.categories.general,
			version: 1
		}

		const { data: inserted, error: insertError } = await client
			.from('notification_settings')
			.insert(defaults)
			.select()
			.limit(1)

		if (insertError) {
			throw new BadRequestException(insertError.message)
		}

		return (inserted?.[0] as NotificationSettingsRow) ?? {
			id: '',
			user_id: userId,
			email: DEFAULT_SETTINGS.email,
			sms: DEFAULT_SETTINGS.sms,
			push: DEFAULT_SETTINGS.push,
			in_app: DEFAULT_SETTINGS.inApp,
			maintenance: DEFAULT_SETTINGS.categories.maintenance,
			leases: DEFAULT_SETTINGS.categories.leases,
			general: DEFAULT_SETTINGS.categories.general
		}
	}

	@Get()
	async getSettings(@Req() req: AuthenticatedRequest) {
		const userId = req.user?.id
		if (!userId) throw new UnauthorizedException()

		const client = this.getUserClientFromRequest(req)
		const row = await this.ensureSettingsRow(userId, client)
		return this.mapRowToPreferences(row)
	}

	@Put()
	async updateSettings(
		@Body() body: Partial<NotificationPreferences>,
		@Req() req: AuthenticatedRequest
	) {
		const userId = req.user?.id
		if (!userId) throw new UnauthorizedException()

		const client = this.getUserClientFromRequest(req)
		await this.ensureSettingsRow(userId, client)

		const updatePayload = this.buildUpdatePayload(body)
		const hasChanges = Object.keys(updatePayload).some(
			key => key !== 'updated_at'
		)
		if (!hasChanges) {
			throw new BadRequestException('No valid notification settings provided')
		}

		const { data, error } = await client
			.from('notification_settings')
			.update(updatePayload)
			.eq('user_id', userId)
			.select()
			.limit(1)

		if (error) {
			throw new BadRequestException(error.message)
		}

		const updatedRow = (data?.[0] as NotificationSettingsRow | undefined) ?? null
		if (!updatedRow) {
			throw new BadRequestException('Unable to update notification settings')
		}

		return this.mapRowToPreferences(updatedRow)
	}
}
