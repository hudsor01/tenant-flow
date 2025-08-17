import { Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'

@Injectable()
export class SubscriptionNotificationService {
	private readonly logger = new Logger(SubscriptionNotificationService.name)

	constructor(
		private readonly eventEmitter: EventEmitter2
	) {}

	async notifySubscriptionChange(
		userId: string,
		type: 'created' | 'updated' | 'canceled',
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		details: any
	) {
		this.logger.log(`Notifying subscription ${type} for user ${userId}`)
		// Emit event for other services to handle
		this.eventEmitter.emit(`subscription.${type}`, {
			userId,
			...details
		})
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async notifyPaymentFailed(userId: string, details: any) {
		this.logger.warn(`Payment failed for user ${userId}`, details)
		// Handle payment failure notification
	}

	async notifyTrialEnding(userId: string, daysRemaining: number) {
		this.logger.log(`Trial ending for user ${userId} in ${daysRemaining} days`)
		// Handle trial ending notification
	}
}
