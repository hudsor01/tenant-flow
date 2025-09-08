import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: '2025-08-27.basil', // Use the latest API version
	typescript: true // Enable TypeScript support
})

export async function POST(request: NextRequest) {
	try {
		const { priceId, planName, isYearly } = await request.json()

		// Validate required fields
		if (!priceId || !planName) {
			return NextResponse.json(
				{ error: 'Missing required fields: priceId and planName' },
				{ status: 400 }
			)
		}

		// Get the origin for success/cancel URLs
		const headersList = await headers()
		const origin = headersList.get('origin') || 'http://localhost:3000'

		// Create checkout session with proper Stripe types
		const session: Stripe.Checkout.Session =
			await stripe.checkout.sessions.create({
				payment_method_types: ['card'],
				line_items: [
					{
						price: priceId,
						quantity: 1
					}
				],
				mode: 'subscription', // Use subscription mode for recurring payments
				success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
				cancel_url: `${origin}/pricing`,
				allow_promotion_codes: true, // Allow discount codes
				billing_address_collection: 'required',
				customer_email: undefined, // Let Stripe collect email if not provided
				metadata: {
					planName,
					isYearly: isYearly.toString()
				},
				// Add subscription data for better tracking
				subscription_data: {
					metadata: {
						planName,
						isYearly: isYearly.toString()
					},
					trial_period_days: 14 // 14-day free trial
				}
			})

		return NextResponse.json({
			sessionId: session.id,
			url: session.url // Stripe hosted checkout URL
		})
	} catch (error: any) {
		console.error('Stripe checkout session creation error:', error)

		return NextResponse.json(
			{
				error: 'Failed to create checkout session',
				details:
					process.env.NODE_ENV === 'development' ? error.message : undefined
			},
			{ status: 500 }
		)
	}
}

// Handle GET requests for session retrieval (optional)
export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url)
	const sessionId = searchParams.get('session_id')

	if (!sessionId) {
		return NextResponse.json(
			{ error: 'Missing session_id parameter' },
			{ status: 400 }
		)
	}

	try {
		// Retrieve the session with proper typing
		const session: Stripe.Checkout.Session =
			await stripe.checkout.sessions.retrieve(sessionId, {
				expand: ['subscription', 'payment_intent']
			})

		return NextResponse.json({
			session: {
				id: session.id,
				payment_status: session.payment_status,
				subscription: session.subscription,
				customer_email: session.customer_details?.email,
				amount_total: session.amount_total,
				currency: session.currency
			}
		})
	} catch (error: any) {
		console.error('Session retrieval error:', error)

		return NextResponse.json(
			{ error: 'Failed to retrieve session' },
			{ status: 500 }
		)
	}
}
