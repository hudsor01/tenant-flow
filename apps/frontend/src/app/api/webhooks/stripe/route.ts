import { headers } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: '2024-12-18.acacia'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
	try {
		const body = await req.text()
		const signature = headers().get('stripe-signature')!

		let event: Stripe.Event

		try {
			event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
		} catch (err) {
			console.error('Webhook signature verification failed:', err)
			return new Response('Invalid signature', { status: 400 })
		}

		// Handle the event
		switch (event.type) {
			case 'checkout.session.completed':
				const session = event.data.object as Stripe.Checkout.Session
				console.log('Checkout completed:', session.id)
				// Handle successful payment
				break

			case 'payment_intent.succeeded':
				const paymentIntent = event.data.object as Stripe.PaymentIntent
				console.log('Payment succeeded:', paymentIntent.id)
				// Handle successful payment
				break

			case 'invoice.payment_succeeded':
				const invoice = event.data.object as Stripe.Invoice
				console.log('Invoice payment succeeded:', invoice.id)
				// Handle successful subscription payment
				break

			default:
				console.log(`Unhandled event type: ${event.type}`)
		}

		return new Response('OK', { status: 200 })
	} catch (error) {
		console.error('Webhook error:', error)
		return new Response('Webhook error', { status: 500 })
	}
}