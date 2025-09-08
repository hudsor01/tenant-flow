import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: '2025-08-27.basil'
})

export async function POST(request: NextRequest) {
	try {
		const { sessionId } = await request.json()

		if (!sessionId) {
			return NextResponse.json(
				{ error: 'Session ID is required' },
				{ status: 400 }
			)
		}

		// Retrieve the checkout session using Stripe's official API
		const session = await stripe.checkout.sessions.retrieve(sessionId, {
			expand: ['subscription', 'customer']
		})

		if (!session) {
			return NextResponse.json({ error: 'Session not found' }, { status: 404 })
		}

		// Check if payment was successful
		if (session.payment_status !== 'paid') {
			return NextResponse.json(
				{ error: 'Payment not completed' },
				{ status: 400 }
			)
		}

		// Get subscription details if it exists
		let subscription = null
		if (session.subscription) {
			const subData: Stripe.Subscription = await stripe.subscriptions.retrieve(
				session.subscription as string,
				{
					expand: ['items.data.price.product']
				}
			)
			subscription = {
				id: subData.id,
				status: subData.status,
				// Normalize period start/end which may be present as nested object or top-level numeric fields
				current_period_start: (() => {
					const val =
						(subData as any).current_period_start ??
						(subData as any).current_period?.start
					if (typeof val === 'number') return val
					if (val && typeof val === 'object' && typeof val.start === 'number')
						return val.start
					return null
				})(),
				current_period_end: (() => {
					const val =
						(subData as any).current_period_end ??
						(subData as any).current_period?.end
					if (typeof val === 'number') return val
					if (val && typeof val === 'object' && typeof val.end === 'number')
						return val.end
					return null
				})(),
				cancel_at_period_end: subData.cancel_at_period_end,
				items: subData.items.data.map(item => ({
					id: item.id,
					price: {
						id: item.price.id,
						nickname: item.price.nickname,
						unit_amount: item.price.unit_amount,
						currency: item.price.currency,
						interval: item.price.recurring?.interval,
						product: {
							name: (item.price.product as Stripe.Product).name
						}
					}
				}))
			}
		}

		// Return session and subscription data
		return NextResponse.json({
			session: {
				id: session.id,
				payment_status: session.payment_status,
				customer_email: session.customer_details?.email,
				amount_total: session.amount_total,
				currency: session.currency
			},
			subscription
		})
	} catch (error) {
		console.error('Session verification error:', error)
		return NextResponse.json(
			{ error: 'Failed to verify session' },
			{ status: 500 }
		)
	}
}
