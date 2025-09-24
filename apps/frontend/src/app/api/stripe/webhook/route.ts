import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createLogger } from '@repo/shared'

// Ensure Node.js runtime for Stripe SDK
export const runtime = 'nodejs'

const logger = createLogger({ component: 'StripeWebhookAPI' })

// Initialize Stripe lazily to avoid build-time errors
function getStripe() {
	if (!process.env.STRIPE_SECRET_KEY) {
		throw new Error('STRIPE_SECRET_KEY is required')
	}
	const apiVersion = process.env.STRIPE_API_VERSION as Stripe.StripeConfig['apiVersion'] | undefined
	return new Stripe(process.env.STRIPE_SECRET_KEY, apiVersion ? { apiVersion } : {})
}

export async function POST(request: NextRequest) {
	try {
		const stripe = getStripe()
		const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
		
		if (!webhookSecret) {
			return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
		}

		const body = await request.text()
		const headersList = await headers()
		const sig = headersList.get('stripe-signature')

		let event: Stripe.Event

		try {
			// Verify webhook signature using Stripe's official method
			event = stripe.webhooks.constructEvent(body, sig!, webhookSecret)
		} catch (err) {
			logger.error('Webhook signature verification failed', {
				action: 'webhook_signature_verification_failed',
				metadata: { error: err instanceof Error ? err.message : String(err) }
			})
			return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
		}

		// Handle different event types using Stripe's official event types
		switch (event.type) {
			case 'checkout.session.completed':
				await handleCheckoutSessionCompleted(
					event.data.object as Stripe.Checkout.Session
				)
				break

			case 'invoice.payment_succeeded':
				await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
				break

			case 'invoice.payment_failed':
				await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
				break

			case 'customer.subscription.created':
				await handleSubscriptionCreated(
					event.data.object as Stripe.Subscription
				)
				break

			case 'customer.subscription.updated':
				await handleSubscriptionUpdated(
					event.data.object as Stripe.Subscription
				)
				break

			case 'customer.subscription.deleted':
				await handleSubscriptionDeleted(
					event.data.object as Stripe.Subscription
				)
				break

			default:
				logger.warn('Unhandled Stripe webhook event type', {
					action: 'unhandled_webhook_event',
					metadata: { eventType: event.type, eventId: event.id }
				})
		}

		return NextResponse.json({ received: true })
	} catch (error) {
		logger.error('Webhook processing failed', {
			action: 'webhook_processing_error',
			metadata: { error: error instanceof Error ? error.message : String(error) }
		})
		return NextResponse.json(
			{ error: 'Webhook handler failed' },
			{ status: 500 }
		)
	}
}

// Handler functions using Stripe's official types
async function handleCheckoutSessionCompleted(
	session: Stripe.Checkout.Session
) {
	logger.info('Checkout session completed', {
		action: 'checkout_session_completed',
		metadata: { sessionId: session.id }
	})

	// Retrieve the subscription using Stripe's official API
	if (session.subscription) {
		const stripe = getStripe()
		const subscription = await stripe.subscriptions.retrieve(
			session.subscription as string
		)

		// Here you would typically:
		// 1. Create/update user account
		// 2. Provision access to features
		// 3. Send welcome email
		// 4. Update database with subscription details

		logger.info('Subscription created from checkout', {
			action: 'subscription_created_from_checkout',
			metadata: { subscriptionId: subscription.id }
		})
	}
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
	logger.info('Invoice payment succeeded', {
		action: 'invoice_payment_succeeded',
		metadata: { invoiceId: invoice.id }
	})

	// Here you would typically:
	// 1. Update user's billing status
	// 2. Extend access period
	// 3. Send receipt email
	// 4. Update usage limits
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
	logger.warn('Invoice payment failed', {
		action: 'invoice_payment_failed',
		metadata: { invoiceId: invoice.id }
	})

	// Here you would typically:
	// 1. Notify user of payment failure
	// 2. Update billing status
	// 3. Send payment retry email
	// 4. Potentially suspend access
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
	logger.info('Subscription created', {
		action: 'subscription_created',
		metadata: { subscriptionId: subscription.id }
	})

	// Provision access based on plan
	const planId = subscription.items.data[0]?.price.id
	logger.info('Plan provisioning initiated', {
		action: 'plan_provisioning',
		metadata: { planId, subscriptionId: subscription.id }
	})
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
	logger.info('Subscription updated', {
		action: 'subscription_updated',
		metadata: { subscriptionId: subscription.id, status: subscription.status }
	})

	// Handle plan changes, pauses, resumes, etc.
	logger.info('Subscription status changed', {
		action: 'subscription_status_changed',
		metadata: { subscriptionId: subscription.id, newStatus: subscription.status }
	})
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
	logger.info('Subscription cancelled', {
		action: 'subscription_cancelled',
		metadata: { subscriptionId: subscription.id }
	})

	// Here you would typically:
	// 1. Revoke user access
	// 2. Update billing status
	// 3. Send cancellation email
	// 4. Schedule data cleanup
}
