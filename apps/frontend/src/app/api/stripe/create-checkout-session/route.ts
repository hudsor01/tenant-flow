import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

// Force Node.js runtime for Stripe SDK
export const runtime = 'nodejs'

// Lazily initialize Stripe to avoid build-time failures
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is required')
  }
  const apiVersion = process.env.STRIPE_API_VERSION as Stripe.StripeConfig['apiVersion'] | undefined
  return new Stripe(key, apiVersion ? { apiVersion } : {})
}

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
    const stripe = getStripe()
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
