import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseUUIDPipe,
	Post,
	Put,
	Query,
	Req,
	UnauthorizedException
} from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'

const SAFE_NOTIFICATIONS_COLUMNS = `
	id,
	userId,
	tenantId,
	propertyId,
	leaseId,
	maintenanceRequestId,
	organizationId,
	title,
	content,
	type,
	priority,
	actionUrl,
	metadata,
	isRead,
	readAt,
	version,
	createdAt,
	updatedAt
`.trim()

/**
 * ULTRA-NATIVE Notifications Controller
 * Uses Supabase directly with native NestJS validation pipes
 * No service layer wrapper - direct database operations
 * Uses request-scoped CurrentUserProvider for auth (eliminates duplicate getUser calls)
 */
@Controller('notifications')
export class NotificationsController {
	constructor(private readonly supabase: SupabaseService) {}

	@Get()
	async getNotifications(
		@Req() req: AuthenticatedRequest,
		@Query('limit') limit = '10',
		@Query('offset') offset = '0'
	) {
		const userId = req.user?.id
		if (!userId) throw new UnauthorizedException()
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('notifications')
			.select(SAFE_NOTIFICATIONS_COLUMNS)
			.eq('userId', userId)
			.order('createdAt', { ascending: false })
			.range(
				parseInt(offset, 10),
				parseInt(offset, 10) + parseInt(limit, 10) - 1
			)

		if (error) throw new BadRequestException(error.message)
		return { notifications: data || [] }
	}

	@Post()
	async createNotification(
		@Body()
		body: {
			userId: string
			title: string
			content: string
			type: 'maintenance' | 'lease' | 'payment' | 'system'
			priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
			actionUrl?: string
		}
	) {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('notifications')
			.insert({
				userId: body.userId,
				title: body.title,
				content: body.content,
				type: body.type,
				priority: body.priority,
				actionUrl: body.actionUrl ?? null,
				isRead: false
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
		const userId = req.user?.id
		if (!userId) throw new UnauthorizedException()
		const { error } = await this.supabase
			.getAdminClient()
			.from('notifications')
			.update({ isRead: true })
			.eq('id', id)
			.eq('userId', userId)

		if (error) throw new BadRequestException(error.message)
		return { success: true }
	}

	@Delete(':id')
	async deleteNotification(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const userId = req.user?.id
		if (!userId) throw new UnauthorizedException()
		const { error } = await this.supabase
			.getAdminClient()
			.from('notifications')
			.delete()
			.eq('id', id)
			.eq('userId', userId)

		if (error) throw new BadRequestException(error.message)
		return { success: true }
	}

	@Post('maintenance')
	async createMaintenanceNotification(
		@Body()
		body: {
			userId: string
			maintenanceId: string
			propertyName: string
			unitNumber: string
		}
	) {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('notifications')
			.insert({
				userId: body.userId,
				title: 'Maintenance Request Update',
				content: `Your maintenance request for ${body.propertyName} Unit ${body.unitNumber} has been updated.`,
				type: 'maintenance',
				priority: 'MEDIUM',
				actionUrl: `/maintenance/${body.maintenanceId}`,
				isRead: false
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
