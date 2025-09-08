import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: '2025-08-27.basil' // Use the latest API version
})

export async function POST(request: NextRequest) {
	try {
		const { priceId, planName, isYearly, successUrl, cancelUrl } =
			await request.json()

		// Validate required fields
		if (!priceId || !successUrl || !cancelUrl) {
			return NextResponse.json(
				{ error: { message: 'Missing required fields' } },
				{ status: 400 }
			)
		}

		// Create checkout session using Stripe's official API
		const session = await stripe.checkout.sessions.create({
			mode: 'subscription',
			payment_method_types: ['card'],
			line_items: [
				{
					price: priceId,
					quantity: 1
				}
			],
			success_url: successUrl,
			cancel_url: cancelUrl,
			allow_promotion_codes: true,
			billing_address_collection: 'required',
			metadata: {
				planName,
				isYearly: isYearly.toString()
			},
			subscription_data: {
				metadata: {
					planName,
					isYearly: isYearly.toString()
				}
			}
		})

		return NextResponse.json({
			sessionId: session.id,
			url: session.url
		})
	} catch (error) {
		console.error('Error creating checkout session:', error)

		return NextResponse.json(
			{
				error: {
					message:
						error instanceof Error
							? error.message
							: 'An unexpected error occurred'
				}
			},
			{ status: 500 }
		)
	}
}
