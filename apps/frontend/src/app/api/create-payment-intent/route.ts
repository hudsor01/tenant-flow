import { NextRequest } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: '2024-12-18.acacia'
})

export async function POST(req: NextRequest) {
	try {
		const { amount, currency = 'usd', metadata = {} } = await req.json()

		if (!amount || amount < 50) {
			return Response.json(
				{ error: 'Amount must be at least $0.50' },
				{ status: 400 }
			)
		}

		const paymentIntent = await stripe.paymentIntents.create({
			amount,
			currency,
			metadata,
			automatic_payment_methods: {
				enabled: true
			}
		})

		return Response.json({
			clientSecret: paymentIntent.client_secret
		})
	} catch (error) {
		console.error('Error creating payment intent:', error)
		return Response.json(
			{ error: 'Failed to create payment intent' },
			{ status: 500 }
		)
	}
}