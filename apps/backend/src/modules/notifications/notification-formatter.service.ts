/**
 * Notification Formatter Service
 * Handles notification type mapping and priority formatting
 * Extracted from NotificationsService for SRP compliance
 */

import { Injectable } from '@nestjs/common'

type NotificationType = 'maintenance' | 'leases' | 'payment' | 'system'
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

@Injectable()
export class NotificationFormatterService {
	/**
	 * Get notification type based on maintenance priority and urgency
	 */
	getNotificationType(
		priority: Priority,
		isNewRequest = false
	): NotificationType | string {
		const baseType = isNewRequest
			? 'maintenance_request_created'
			: 'maintenance_update'

		switch (priority) {
			case 'URGENT':
				return `${baseType}_emergency`
			case 'HIGH':
				return `${baseType}_high`
			case 'MEDIUM':
				return `${baseType}_medium`
			case 'LOW':
				return `${baseType}_low`
			default:
				return baseType
		}
	}

	/**
	 * Get priority label for display
	 */
	getPriorityLabel(priority: Priority): string {
		const labels: Record<Priority, string> = {
			URGENT: 'Urgent',
			HIGH: 'High Priority',
			MEDIUM: 'Medium Priority',
			LOW: 'Low Priority'
		}
		return labels[priority] || priority
	}

	/**
	 * Get notification urgency for system processing
	 */
	getNotificationUrgency(priority: Priority): boolean {
		return priority === 'URGENT' || priority === 'HIGH'
	}

	/**
	 * Calculate notification timeout based on priority
	 */
	getNotificationTimeout(priority: Priority): number {
		switch (priority) {
			case 'URGENT':
				return 15000
			case 'HIGH':
				return 12000
			case 'MEDIUM':
				return 8000
			case 'LOW':
				return 5000
			default:
				return 8000
		}
	}

	/**
	 * Determine if notification should be sent immediately
	 */
	shouldSendImmediately(priority: Priority): boolean {
		return priority === 'URGENT' || priority === 'HIGH'
	}
}
