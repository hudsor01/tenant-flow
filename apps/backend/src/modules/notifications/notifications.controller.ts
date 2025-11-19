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
		const user_id = req.user?.id
		if (!user_id) throw new UnauthorizedException()
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('notifications')
			.select('*')
			.eq('user_id', user_id)
			.order('created_at', { ascending: false })
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
			user_id: string
			title: string
			content: string
			type: 'maintenance' | 'leases' | 'payment' | 'system'
			priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
			actionUrl?: string
		}
	) {
		const { data, error } = await this.supabase
			.getAdminClient()
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
		const { error } = await this.supabase
			.getAdminClient()
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
		const { error } = await this.supabase
			.getAdminClient()
			.from('notifications')
			.delete()
			.eq('id', id)
			.eq('user_id', user_id)

		if (error) throw new BadRequestException(error.message)
		return { success: true }
	}

	@Post('maintenance')
	async createMaintenanceNotification(
		@Body()
		body: {
			user_id: string
			maintenanceId: string
			propertyName: string
			unit_number: string
		}
	) {
		const { data, error } = await this.supabase
			.getAdminClient()
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
