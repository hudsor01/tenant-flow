import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'
import type { EnvironmentVariables } from '../config/config.schema'

@Injectable()
export class StripeService {
	private readonly logger = new Logger(StripeService.name)
	private stripe: Stripe

	constructor(private configService: ConfigService<EnvironmentVariables>) {
		const secretKey = this.configService.get('STRIPE_SECRET_KEY', {
			infer: true
		})
		if (!secretKey) {
			throw new Error('STRIPE_SECRET_KEY is required')
		}
		this.stripe = new Stripe(secretKey, {
			apiVersion: '2025-07-30.basil'
		})
	}

	// Expose client for direct access when needed
	get client() {
		return this.stripe
	}

	async createCustomer(email: string, name?: string) {
		return this.stripe.customers.create({ email, name })
	}

	async createSubscription(customerId: string, priceId: string) {
		return this.stripe.subscriptions.create({
			customer: customerId,
			items: [{ price: priceId }],
			expand: ['latest_invoice.payment_intent']
		})
	}

	async cancelSubscription(subscriptionId: string) {
		return this.stripe.subscriptions.cancel(subscriptionId)
	}

	async handleWebhook(payload: Buffer, signature: string) {
		const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET', {
			infer: true
		})
		if (!webhookSecret) {
			throw new Error('STRIPE_WEBHOOK_SECRET is required')
		}
		const event = this.stripe.webhooks.constructEvent(
			payload,
			signature,
			webhookSecret
		)

		// Handle subscription events
		switch (event.type) {
			case 'customer.subscription.created':
			case 'customer.subscription.updated':
			case 'customer.subscription.deleted':
				// Update user subscription status in Supabase
				this.logger.log('Subscription event:', event.type)
				break
		}

		return event
	}

	async createOrUpdateSubscription(subscriptionData: {
		userId: string
		stripeCustomerId: string
		stripeSubscriptionId: string
		stripePriceId: string
		planId: string
		status: string
		currentPeriodStart: Date
		currentPeriodEnd: Date
		trialStart?: Date | null
		trialEnd?: Date | null
		cancelAtPeriodEnd: boolean
		billingInterval: 'monthly' | 'annual'
	}) {
		this.logger.log('Creating/updating subscription:', subscriptionData)
		// TODO: Implement database update logic via Supabase
		return { success: true, ...subscriptionData }
	}

	async recordPayment(paymentData: {
		userId: string
		subscriptionId?: string
		stripeInvoiceId?: string
		stripeSubscriptionId?: string
		stripeCustomerId?: string | null
		amount: number
		currency: string
		status: string
		paidAt: Date | null
		invoiceUrl?: string | null
		invoicePdf?: string | null
		failureReason?: string
		attemptCount?: number
	}) {
		this.logger.log('Recording payment:', paymentData)
		// TODO: Implement payment recording logic
		return { success: true, ...paymentData }
	}
}
