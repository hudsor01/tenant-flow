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
	UseGuards
} from '@nestjs/common'
import { UnifiedAuthGuard } from '../shared/guards/auth.guard'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import type { ValidatedUser } from '../auth/auth.service'
import { AdminOnly, Public } from '../shared/decorators/auth.decorators'
import { NotificationsService } from './notifications.service'
// Ultra-native: Define inline types instead of DTOs
interface GetNotificationOptions {
	unreadOnly?: boolean
	limit?: number
	offset?: number
}

interface CreateNotificationRequest {
	recipientId: string
	title: string
	message: string
	priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'
	actionUrl?: string
	data?: Record<string, any>
}

@Controller('notifications')
@UseGuards(UnifiedAuthGuard)
export class NotificationsController {
	private readonly logger = new Logger(NotificationsController.name)

	constructor(private readonly notificationsService: NotificationsService) {}

	@Get()
	async getNotifications(
		@Query() query: GetNotificationOptions,
		@CurrentUser() user: ValidatedUser
	) {
		this.logger.log(`Getting notifications for user ${user.id}`, {
			userId: user.id,
			unreadOnly: query.unreadOnly
		})

		// For now, only support unread notifications - can be extended later
		const notifications =
			await this.notificationsService.getUnreadNotifications(user.id)
		this.logger.log(
			`Retrieved ${notifications.length} notifications for user ${user.id}`
		)
		return notifications
	}

	@Post()
	@AdminOnly()
	async createNotification(
		@Body() createNotificationDto: CreateNotificationRequest,
		@CurrentUser() user: ValidatedUser
	) {
		const { recipientId, title, message, priority, actionUrl, data } =
			createNotificationDto

		this.logger.log(
			`Admin ${user.id} creating notification for user ${recipientId}`,
			{
				adminId: user.id,
				recipientId,
				title,
				priority,
				hasActionUrl: !!actionUrl
			}
		)

		try {
			// For now, we'll create a generic notification
			// In the future, this could be expanded to handle different types
			const notification =
				await this.notificationsService.createMaintenanceNotification(
					recipientId,
					title,
					message,
					priority,
					(data!.propertyName as string) || '',
					(data!.unitNumber as string) || '',
					data!.maintenanceId as string,
					actionUrl
				)

			this.logger.log(`Notification created successfully`, {
				recipientId,
				priority,
				title
			})

			return notification
		} catch (error) {
			this.logger.error(
				`Failed to create notification for user ${recipientId}`,
				error
			)
			throw error
		}
	}

	@Put(':id/read')
	async markAsRead(
		@Param('id') notificationId: string,
		@CurrentUser() user: ValidatedUser
	) {
		this.logger.log(
			`User ${user.id} marking notification ${notificationId} as read`
		)

		try {
			const result = await this.notificationsService.markAsRead(
				notificationId,
				user.id
			)
			this.logger.log(
				`Notification ${notificationId} marked as read by user ${user.id}`
			)
			return result
		} catch (error) {
			this.logger.error(
				`Failed to mark notification ${notificationId} as read for user ${user.id}`,
				error
			)
			throw error
		}
	}

	@Delete(':id')
	async cancelNotification(
		@Param('id') notificationId: string,
		@CurrentUser() user: ValidatedUser
	) {
		this.logger.log(
			`User ${user.id} cancelling notification ${notificationId}`
		)

		try {
			const result = await this.notificationsService.cancelNotification(
				notificationId,
				user.id
			)
			this.logger.log(
				`Notification ${notificationId} cancelled by user ${user.id}`
			)
			return result
		} catch (error) {
			this.logger.error(
				`Failed to cancel notification ${notificationId} for user ${user.id}`,
				error
			)
			throw error
		}
	}

	@Get('priority-info/:priority')
	@Public()
	getPriorityInfo(@Param('priority') priority: string) {
		const priorityEnum = priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'
		return {
			label: this.notificationsService.getPriorityLabel(priorityEnum),
			urgent: this.notificationsService.getNotificationUrgency(
				priorityEnum
			),
			timeout:
				this.notificationsService.getNotificationTimeout(priorityEnum),
			sendImmediately:
				this.notificationsService.shouldSendImmediately(priorityEnum)
		}
	}
}
