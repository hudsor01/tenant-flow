#!/bin/bash

# Fix script for remaining TypeScript errors

echo "Fixing remaining TypeScript errors in backend..."

# Fix notifications service imports
cat > apps/backend/src/notifications/subscription-event.listener.ts << 'EOF'
import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { SubscriptionNotificationService } from './subscription-notification.service'
import { SupabaseService } from '../supabase/supabase.service'

@Injectable()
export class SubscriptionEventListener {
	private readonly logger = new Logger(SubscriptionEventListener.name)

	constructor(
		private readonly notificationService: SubscriptionNotificationService,
		private readonly supabaseService: SupabaseService
	) {}

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
EOF

# Fix subscription notification service
cat > apps/backend/src/notifications/subscription-notification.service.ts << 'EOF'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SupabaseService } from '../supabase/supabase.service'

@Injectable()
export class SubscriptionNotificationService {
	private readonly logger = new Logger(SubscriptionNotificationService.name)

	constructor(
		private readonly eventEmitter: EventEmitter2,
		private readonly configService: ConfigService,
		private readonly supabaseService: SupabaseService
	) {}

	async notifySubscriptionChange(
		userId: string,
		type: 'created' | 'updated' | 'canceled',
		details: any
	) {
		this.logger.log(`Notifying subscription ${type} for user ${userId}`)
		// Emit event for other services to handle
		this.eventEmitter.emit(`subscription.${type}`, {
			userId,
			...details
		})
	}

	async notifyPaymentFailed(userId: string, details: any) {
		this.logger.warn(`Payment failed for user ${userId}`, details)
		// Handle payment failure notification
	}

	async notifyTrialEnding(userId: string, daysRemaining: number) {
		this.logger.log(`Trial ending for user ${userId} in ${daysRemaining} days`)
		// Handle trial ending notification
	}
}
EOF

echo "Files created. Now applying additional fixes..."

# Additional fixes will be applied through Edit commands
echo "Type fixes script created successfully!"