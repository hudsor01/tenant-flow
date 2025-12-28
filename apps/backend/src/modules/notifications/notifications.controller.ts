import {
	BadRequestException,
	Body,
	Controller,
	DefaultValuePipe,
	Delete,
	Get,
	Param,
	ParseBoolPipe,
	ParseIntPipe,
	ParseUUIDPipe,
	Post,
	Put,
	Query,
	Req,
	UnauthorizedException
} from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'

/**
 * ULTRA-NATIVE Notifications Controller
 * Uses Supabase directly with native NestJS validation pipes
 * No service layer wrapper - direct database operations
 * Uses request-scoped CurrentUserProvider for auth (eliminates duplicate getUser calls)
 */
@Controller('notifications')
export class NotificationsController {
	constructor(private readonly supabase: SupabaseService) {}

	/**
	 * Get user-scoped Supabase client with RLS enforcement
	 * Extracts token from request authorization header
	 */
	private getUserClientFromRequest(req: AuthenticatedRequest) {
		const authHeader = req.headers.authorization
		if (!authHeader?.startsWith('Bearer ')) {
			throw new UnauthorizedException('Missing or invalid authorization header')
		}
		const token = authHeader.slice(7)
		return this.supabase.getUserClient(token)
	}

	@Get()
	async getNotifications(
		@Req() req: AuthenticatedRequest,
		@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
		@Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
		@Query('unreadOnly', new DefaultValuePipe(false), ParseBoolPipe)
		unreadOnly: boolean = false
	) {
		const user_id = req.user?.id
		if (!user_id) throw new UnauthorizedException()
		const currentPage = Math.max(page, 1)
		const pageSize = Math.min(Math.max(limit, 1), 100)
		const from = (currentPage - 1) * pageSize
		const to = from + pageSize - 1

		const client = this.getUserClientFromRequest(req)
		let query = client
			.from('notifications')
			.select('*', { count: 'exact' })
			.eq('user_id', user_id)
			.order('created_at', { ascending: false })

		if (unreadOnly) {
			query = query.eq('is_read', false)
		}

		const { data, error, count } = await query.range(from, to)

		if (error) throw new BadRequestException(error.message)
		return {
			data: data ?? [],
			total: count ?? 0,
			page: currentPage,
			limit: pageSize
		}
	}

	@Put('read-all')
	async markAllRead(@Req() req: AuthenticatedRequest) {
		const user_id = req.user?.id
		if (!user_id) throw new UnauthorizedException()

		const client = this.getUserClientFromRequest(req)
		const { data, error } = await client
			.from('notifications')
			.update({ is_read: true, read_at: new Date().toISOString() })
			.eq('user_id', user_id)
			.eq('is_read', false)
			.select('id')

		if (error) throw new BadRequestException(error.message)
		return { updated: data?.length ?? 0 }
	}

	@Put('bulk-read')
	async markSelectedRead(
		@Req() req: AuthenticatedRequest,
		@Body() body: { ids?: string[] }
	) {
		const user_id = req.user?.id
		if (!user_id) throw new UnauthorizedException()

		const ids = Array.isArray(body.ids)
			? [...new Set(body.ids.filter(id => typeof id === 'string' && id.trim()))]
			: []

		if (ids.length === 0) {
			throw new BadRequestException('ids array is required')
		}

		const client = this.getUserClientFromRequest(req)
		const { data, error } = await client
			.from('notifications')
			.update({ is_read: true, read_at: new Date().toISOString() })
			.eq('user_id', user_id)
			.in('id', ids)
			.select('id')

		if (error) throw new BadRequestException(error.message)
		return { updated: data?.length ?? 0 }
	}

	@Post()
	async createNotification(
		@Req() req: AuthenticatedRequest,
		@Body()
		body: {
			user_id: string
			title: string
			content: string
			type: 'maintenance' | 'lease' | 'payment' | 'system'
			priority: 'low' | 'medium' | 'high' | 'urgent'
			actionUrl?: string
		}
	) {
		const client = this.getUserClientFromRequest(req)
		const { data, error } = await client
			.from('notifications')
			.insert({
				user_id: body.user_id,
				title: body.title,
				message: body.content,
				notification_type: body.type,
				action_url: body.actionUrl ?? null,
				is_read: false
			})
			.select()
			.single()

		if (error) throw new BadRequestException(error.message)
		return { notification: data }
	}

	@Put(':id/read')
	async markAsRead(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const user_id = req.user?.id
		if (!user_id) throw new UnauthorizedException()

		const client = this.getUserClientFromRequest(req)
		const { error } = await client
			.from('notifications')
			.update({ is_read: true })
			.eq('id', id)
			.eq('user_id', user_id)

		if (error) throw new BadRequestException(error.message)
		return { success: true }
	}

	@Delete(':id')
	async deleteNotification(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const user_id = req.user?.id
		if (!user_id) throw new UnauthorizedException()

		const client = this.getUserClientFromRequest(req)
		const { error } = await client
			.from('notifications')
			.delete()
			.eq('id', id)
			.eq('user_id', user_id)

		if (error) throw new BadRequestException(error.message)
		return { success: true }
	}

	@Post('maintenance')
	async createMaintenanceNotification(
		@Req() req: AuthenticatedRequest,
		@Body()
		body: {
			user_id: string
			maintenanceId: string
			propertyName: string
			unit_number: string
		}
	) {
		const client = this.getUserClientFromRequest(req)
		const { data, error } = await client
			.from('notifications')
			.insert({
				user_id: body.user_id,
				title: 'Maintenance Request Update',
				message: `Your maintenance request for ${body.propertyName} Unit ${body.unit_number} has been updated.`,
				notification_type: 'maintenance',
				entity_id: body.maintenanceId,
				entity_type: 'maintenance',
				action_url: `/maintenance/${body.maintenanceId}`,
				is_read: false
			})
			.select()
			.single()

		if (error) throw new BadRequestException(error.message)
		return { notification: data }
	}

	@Get('priority-info/:priority')
	async getPriorityInfo(@Param('priority') priority: string) {
		// Use semantic color references from design system
		const priorities = {
			LOW: { color: 'hsl(var(--muted-foreground))', label: 'Low Priority' },
			MEDIUM: { color: '#FF9500', label: 'Medium Priority' }, // Apple systemOrange
			HIGH: { color: 'hsl(var(--destructive))', label: 'High Priority' },
			EMERGENCY: { color: '#FF3B30', label: 'Emergency' } // Apple systemRed
		}

		const info = priorities[priority.toUpperCase() as keyof typeof priorities]
		if (!info) throw new BadRequestException('Invalid priority')

		return info
	}
}
