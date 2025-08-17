import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'

@Injectable()
export class SubscriptionEventListener {
	private readonly logger = new Logger(SubscriptionEventListener.name)

	constructor() {}

	@OnEvent('subscription.created')
	async handleSubscriptionCreated(payload: {
		userId: string
		subscriptionId: string
		planId: string
	}) {
		this.logger.log('Handling subscription created event', payload)
		// Handle subscription created event
	}

	@OnEvent('subscription.updated')
	async handleSubscriptionUpdated(payload: {
		userId: string
		subscriptionId: string
		planId: string
	}) {
		this.logger.log('Handling subscription updated event', payload)
		// Handle subscription updated event
	}

	@OnEvent('subscription.canceled')
	async handleSubscriptionCanceled(payload: {
		userId: string
		subscriptionId: string
	}) {
		this.logger.log('Handling subscription canceled event', payload)
		// Handle subscription canceled event
	}
}
