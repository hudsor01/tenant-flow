import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Put,
	Query,
	UseGuards
} from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'
import { AuthGuard } from '../shared/guards/auth.guard'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import type { ValidatedUser } from '@repo/shared/types/auth'
import { AdminOnly, Public } from '../shared/decorators/auth.decorators'
import { NotificationsService } from './notifications.service'
// Ultra-native: Define inline types instead of DTOs
// Use shared types instead of local interfaces
import type { GetNotificationOptions, CreateNotificationRequest } from '@repo/shared/types/notifications'

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
	constructor(
		private readonly notificationsService: NotificationsService,
		private readonly logger: PinoLogger
	) {
		// PinoLogger context handled automatically via app-level configuration
	}

	@Get()
	async getNotifications(
		@Query() query: GetNotificationOptions,
		@CurrentUser() user: ValidatedUser
	) {
		this.logger.info(`Getting notifications for user ${user.id}`, {
			userId: user.id,
			unreadOnly: query.unreadOnly
		})

		// For now, only support unread notifications - can be extended later
		const notifications =
			await this.notificationsService.getUnreadNotifications(user.id)
		this.logger.info(
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

		this.logger.info(
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

			this.logger.info(`Notification created successfully`, {
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
		this.logger.info(
			`User ${user.id} marking notification ${notificationId} as read`
		)

		try {
			const result = await this.notificationsService.markAsRead(
				notificationId,
				user.id
			)
			this.logger.info(
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
		this.logger.info(
			`User ${user.id} cancelling notification ${notificationId}`
		)

		try {
			const result = await this.notificationsService.cancelNotification(
				notificationId,
				user.id
			)
			this.logger.info(
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
