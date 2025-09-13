import Stripe from 'stripe'
export const runtime = 'nodejs'
import type { NextRequest } from 'next/server'
import { rateLimiter } from '@/lib/rate-limiter'

// Initialize Stripe lazily to avoid build-time errors
function getStripe() {
	if (!process.env.STRIPE_SECRET_KEY) {
		throw new Error('STRIPE_SECRET_KEY is required')
	}
	const apiVersion = process.env.STRIPE_API_VERSION as Stripe.StripeConfig['apiVersion'] | undefined
	return new Stripe(process.env.STRIPE_SECRET_KEY, apiVersion ? { apiVersion } : {})
}

export async function POST(req: NextRequest) {
	// Apply rate limiting for webhook endpoints (more lenient as they come from Stripe)
	const rateLimitResult = await rateLimiter(req, { maxRequests: 500, windowMs: 15 * 60 * 1000 })
	if (rateLimitResult instanceof Response) {
		return rateLimitResult // Rate limit exceeded
	}
	
	try {
		const stripe = getStripe()
		const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
		
		if (!webhookSecret) {
			return new Response('Webhook secret not configured', { status: 500 })
		}

		const body = await req.text()
		const signature = req.headers.get('stripe-signature')!

		let event: Stripe.Event

		try {
			event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
		} catch (err) {
			console.error('Webhook signature verification failed:', err)
			return new Response('Invalid signature', { status: 400 })
		}

		// Handle the event
		switch (event.type) {
			case 'checkout.session.completed': {
				const session = event.data.object as Stripe.Checkout.Session
				console.info('Checkout completed:', session.id)
				// Handle successful payment
				break
			}

			case 'payment_intent.succeeded': {
				const paymentIntent = event.data.object as Stripe.PaymentIntent
				console.info('Payment succeeded:', paymentIntent.id)
				// Handle successful payment
				break
			}

			case 'invoice.payment_succeeded': {
				const invoice = event.data.object as Stripe.Invoice
				console.info('Invoice payment succeeded:', invoice.id)
				// Handle successful subscription payment
				break
			}

			default: {
				console.info(`Unhandled event type: ${event.type}`)
			}
		}

		return new Response('OK', { status: 200 })
	} catch (error) {
		console.error('Webhook error:', error)
		return new Response('Webhook error', { status: 500 })
	}
}
