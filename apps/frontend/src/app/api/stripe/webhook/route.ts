import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

// Initialize Stripe lazily to avoid build-time errors
function getStripe() {
	if (!process.env.STRIPE_SECRET_KEY) {
		throw new Error('STRIPE_SECRET_KEY is required')
	}
	return new Stripe(process.env.STRIPE_SECRET_KEY, {
		apiVersion: '2025-08-27.basil'
	})
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
			console.error('Webhook signature verification failed:', err)
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
				console.warn(`Unhandled event type: ${event.type}`)
		}

		return NextResponse.json({ received: true })
	} catch (error) {
		console.error('Webhook error:', error)
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
	console.info('Checkout session completed:', session.id)

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

		console.info('Subscription created:', subscription.id)
	}
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
	console.info('Invoice payment succeeded:', invoice.id)

	// Here you would typically:
	// 1. Update user's billing status
	// 2. Extend access period
	// 3. Send receipt email
	// 4. Update usage limits
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
	console.info('Invoice payment failed:', invoice.id)

	// Here you would typically:
	// 1. Notify user of payment failure
	// 2. Update billing status
	// 3. Send payment retry email
	// 4. Potentially suspend access
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
	console.info('Subscription created:', subscription.id)

	// Provision access based on plan
	const planId = subscription.items.data[0]?.price.id
	console.info('Plan ID:', planId)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
	console.info('Subscription updated:', subscription.id)

	// Handle plan changes, pauses, resumes, etc.
	console.info('Status:', subscription.status)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
	console.info('Subscription cancelled:', subscription.id)

	// Here you would typically:
	// 1. Revoke user access
	// 2. Update billing status
	// 3. Send cancellation email
	// 4. Schedule data cleanup
}
