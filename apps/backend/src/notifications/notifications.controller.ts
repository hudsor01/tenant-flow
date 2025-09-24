import {
	Body,
	Controller,
	Delete,
	Get,
	Logger,
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
	private readonly logger = new Logger(NotificationsController.name)

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