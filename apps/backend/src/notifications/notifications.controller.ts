import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Put,
	Query,
	UseGuards,
	ParseUUIDPipe,
	BadRequestException
} from '@nestjs/common'
import { AuthGuard } from '../shared/guards/auth.guard'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import { SupabaseService } from '../database/supabase.service'
import type { ValidatedUser } from '@repo/shared'
import { AdminOnly } from '../shared/decorators/auth.decorators'

/**
 * ULTRA-NATIVE Notifications Controller
 * Uses Supabase directly with native NestJS validation pipes
 * No service layer wrapper - direct database operations
 */
@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
	constructor(
		private readonly supabase: SupabaseService
	) {}

	@Get()
	async getNotifications(
		@CurrentUser() user: ValidatedUser,
		@Query('limit') limit = '10',
		@Query('offset') offset = '0'
	) {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('InAppNotification')
			.select('*')
			.eq('userId', user.id)
			.order('createdAt', { ascending: false })
			.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

		if (error) throw new BadRequestException(error.message)
		return { notifications: data || [] }
	}

	@Post()
	@AdminOnly()
	async createNotification(
		@Body() body: {
			userId: string;
			title: string;
			content: string;
			type: 'maintenance' | 'lease' | 'payment' | 'system';
			priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
			actionUrl?: string;
		}
	) {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('InAppNotification')
			.insert({
				userId: body.userId,
				title: body.title,
				content: body.content,
				type: body.type,
				priority: body.priority,
				actionUrl: body.actionUrl,
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
		@CurrentUser() user: ValidatedUser
	) {
		const { error } = await this.supabase
			.getAdminClient()
			.from('InAppNotification')
			.update({ isRead: true })
			.eq('id', id)
			.eq('userId', user.id)

		if (error) throw new BadRequestException(error.message)
		return { success: true }
	}

	@Delete(':id')
	async deleteNotification(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user: ValidatedUser
	) {
		const { error } = await this.supabase
			.getAdminClient()
			.from('InAppNotification')
			.delete()
			.eq('id', id)
			.eq('userId', user.id)

		if (error) throw new BadRequestException(error.message)
		return { success: true }
	}

	@Post('maintenance')
	@AdminOnly()
	async createMaintenanceNotification(
		@Body() body: {
			userId: string;
			maintenanceId: string;
			propertyName: string;
			unitNumber: string;
		}
	) {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('InAppNotification')
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
		const priorities = {
			LOW: { color: '#6b7280', label: 'Low Priority' },
			MEDIUM: { color: '#f59e0b', label: 'Medium Priority' },
			HIGH: { color: '#ef4444', label: 'High Priority' },
			EMERGENCY: { color: '#dc2626', label: 'Emergency' }
		}

		const info = priorities[priority.toUpperCase() as keyof typeof priorities]
		if (!info) throw new BadRequestException('Invalid priority')

		return info
	}
}