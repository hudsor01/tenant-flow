import type { PlanType, SubStatus } from '@prisma/client'
import type Stripe from 'stripe'

export interface CreateCheckoutSessionParams {
	userId: string
	planType: PlanType
	billingInterval: 'monthly' | 'annual'
	collectPaymentMethod?: boolean
	successUrl: string
	cancelUrl: string
	uiMode?: 'embedded' | 'hosted'
}

export interface CreatePortalSessionParams {
	customerId: string
	returnUrl: string
}

export interface SubscriptionData {
	userId: string
	stripeCustomerId: string
	stripeSubscriptionId: string
	planType: PlanType
	status: SubStatus
	trialEndsAt?: Date
	currentPeriodEnd: Date
	cancelAtPeriodEnd: boolean
}

export interface WebhookEventHandler {
	'customer.subscription.created': (event: Stripe.Event) => Promise<void>
	'customer.subscription.updated': (event: Stripe.Event) => Promise<void>
	'customer.subscription.deleted': (event: Stripe.Event) => Promise<void>
	'customer.subscription.trial_will_end': (event: Stripe.Event) => Promise<void>
	'invoice.payment_succeeded': (event: Stripe.Event) => Promise<void>
	'invoice.payment_failed': (event: Stripe.Event) => Promise<void>
	'invoice.upcoming': (event: Stripe.Event) => Promise<void>
	'checkout.session.completed': (event: Stripe.Event) => Promise<void>
}

export type WebhookEventType = keyof WebhookEventHandler

export const STRIPE_ERRORS = {
	CUSTOMER_NOT_FOUND: 'Customer not found',
	SUBSCRIPTION_NOT_FOUND: 'Subscription not found',
	INVALID_PRICE_ID: 'Invalid price ID',
	WEBHOOK_SIGNATURE_INVALID: 'Invalid webhook signature',
	CONFIGURATION_ERROR: 'Stripe configuration error',
	RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
	PAYMENT_DECLINED: 'Payment declined',
	AUTHENTICATION_FAILED: 'Authentication failed',
	INVALID_REQUEST: 'Invalid request parameters',
	API_CONNECTION_ERROR: 'API connection error',
	CARD_DECLINED: 'Card declined',
	PROCESSING_ERROR: 'Processing error'
} as const

export interface PreviewInvoiceParams {
	userId: string
	newPriceId: string
	prorationDate?: Date
}

export interface UpdateSubscriptionParams {
	userId: string
	newPriceId: string
	prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
	prorationDate?: Date
}