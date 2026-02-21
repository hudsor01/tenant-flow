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
import {
	ApiBearerAuth,
	ApiBody,
	ApiOperation,
	ApiParam,
	ApiQuery,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import { SupabaseService } from '../../database/supabase.service'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'

/**
 * ULTRA-NATIVE Notifications Controller
 * Uses Supabase directly with native NestJS validation pipes
 * No service layer wrapper - direct database operations
 * Uses request-scoped CurrentUserProvider for auth (eliminates duplicate getUser calls)
 */
@ApiTags('Notifications')
@ApiBearerAuth('supabase-auth')
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

	@ApiOperation({ summary: 'Get notifications', description: 'Get paginated list of notifications for current user' })
	@ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
	@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Results per page (max 100)' })
	@ApiQuery({ name: 'unreadOnly', required: false, type: Boolean, description: 'Filter to unread only' })
	@ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
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
			.select('id, user_id, notification_type, title, message, is_read, read_at, action_url, entity_type, entity_id, created_at', { count: 'exact' })
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

	@ApiOperation({ summary: 'Mark all as read', description: 'Mark all notifications as read for current user' })
	@ApiResponse({ status: 200, description: 'Notifications marked as read' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
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

	@ApiOperation({ summary: 'Mark selected as read', description: 'Mark specific notifications as read' })
	@ApiBody({ schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } }, required: ['ids'] } })
	@ApiResponse({ status: 200, description: 'Notifications marked as read' })
	@ApiResponse({ status: 400, description: 'ids array is required' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
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

	@ApiOperation({ summary: 'Create notification', description: 'Create a new notification' })
	@ApiBody({ schema: { type: 'object', properties: { user_id: { type: 'string' }, title: { type: 'string' }, content: { type: 'string' }, type: { type: 'string', enum: ['maintenance', 'lease', 'payment', 'system'] }, priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] }, actionUrl: { type: 'string' } }, required: ['user_id', 'title', 'content', 'type', 'priority'] } })
	@ApiResponse({ status: 201, description: 'Notification created successfully' })
	@ApiResponse({ status: 400, description: 'Invalid input' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
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

	@ApiOperation({ summary: 'Mark as read', description: 'Mark a specific notification as read' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Notification ID' })
	@ApiResponse({ status: 200, description: 'Notification marked as read' })
	@ApiResponse({ status: 400, description: 'Invalid notification ID' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
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

	@ApiOperation({ summary: 'Delete notification', description: 'Delete a specific notification' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Notification ID' })
	@ApiResponse({ status: 200, description: 'Notification deleted successfully' })
	@ApiResponse({ status: 400, description: 'Invalid notification ID' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
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

	@ApiOperation({ summary: 'Create maintenance notification', description: 'Create a notification for maintenance request update' })
	@ApiBody({ schema: { type: 'object', properties: { user_id: { type: 'string' }, maintenanceId: { type: 'string' }, propertyName: { type: 'string' }, unit_number: { type: 'string' } }, required: ['user_id', 'maintenanceId', 'propertyName', 'unit_number'] } })
	@ApiResponse({ status: 201, description: 'Maintenance notification created successfully' })
	@ApiResponse({ status: 400, description: 'Invalid input' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
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

	@ApiOperation({ summary: 'Get priority info', description: 'Get color and label information for a priority level' })
	@ApiParam({ name: 'priority', type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'], description: 'Priority level' })
	@ApiResponse({ status: 200, description: 'Priority info retrieved successfully' })
	@ApiResponse({ status: 400, description: 'Invalid priority' })
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
