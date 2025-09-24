import Stripe from 'stripe'
export const runtime = 'nodejs'
import type { NextRequest } from 'next/server'
import { rateLimiter } from '@/lib/rate-limiter'
import { createLogger } from '@repo/shared'

const logger = createLogger({ component: 'StripeWebhook' })

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
			logger.error('Webhook signature verification failed', {
				action: 'webhook_signature_verification_failed',
				metadata: {
					error: err instanceof Error ? err.message : String(err),
					hasSignature: !!signature
				}
			})
			return new Response('Invalid signature', { status: 400 })
		}

		// Handle the event
		switch (event.type) {
			case 'checkout.session.completed': {
				const session = event.data.object as Stripe.Checkout.Session
				logger.info('Checkout session completed', {
					action: 'checkout_session_completed',
					metadata: {
						sessionId: session.id,
						customerId: session.customer
					}
				})
				// Handle successful payment
				break
			}

			case 'payment_intent.succeeded': {
				const paymentIntent = event.data.object as Stripe.PaymentIntent
				logger.info('Payment intent succeeded', {
					action: 'payment_intent_succeeded',
					metadata: {
						paymentIntentId: paymentIntent.id,
						amount: paymentIntent.amount,
						currency: paymentIntent.currency
					}
				})
				// Handle successful payment
				break
			}

			case 'invoice.payment_succeeded': {
				const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }
				logger.info('Invoice payment succeeded', {
					action: 'invoice_payment_succeeded',
					metadata: {
						invoiceId: invoice.id,
						subscriptionId: typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id || null,
						customerId: invoice.customer
					}
				})
				// Handle successful subscription payment
				break
			}

			default: {
				logger.info('Unhandled webhook event type', {
					action: 'webhook_unhandled_event_type',
					metadata: {
						eventType: event.type,
						eventId: event.id
					}
				})
			}
		}

		return new Response('OK', { status: 200 })
	} catch (error) {
		logger.error('Webhook processing error', {
			action: 'webhook_processing_error',
			metadata: {
				error: error instanceof Error ? error.message : String(error)
			}
		})
		return new Response('Webhook error', { status: 500 })
	}
}
