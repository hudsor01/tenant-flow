import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { rateLimiter, RATE_LIMITS } from '@/lib/rate-limiter'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4600'

export async function POST(request: NextRequest) {
	// Apply rate limiting for payment endpoints
	const rateLimitResult = await rateLimiter(request, RATE_LIMITS.PAYMENT)
	if (rateLimitResult instanceof NextResponse) {
		return rateLimitResult // Rate limit exceeded
	}
	try {
		const { priceId, planName, isYearly: _isYearly } = await request.json()

		// Validate required fields
		if (!priceId || !planName) {
			return NextResponse.json(
				{ error: 'Missing required fields: priceId and planName' },
				{ status: 400 }
			)
		}

		// Validate priceId format (should be Stripe price ID)
		if (!priceId.startsWith('price_')) {
			return NextResponse.json(
				{ error: 'Invalid priceId format. Expected Stripe price ID starting with "price_"' },
				{ status: 400 }
			)
		}

		// Get the origin for success/cancel URLs
		const headersList = await headers()
		const origin = headersList.get('origin') || 'http://localhost:3000'

		// Proxy request to our NestJS backend controller with real Stripe price ID
		const backendResponse = await fetch(`${BACKEND_URL}/api/v1/stripe/create-checkout-session`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				// Forward auth headers if present
				...(request.headers.get('authorization') && {
					'authorization': request.headers.get('authorization')!
				})
			},
			body: JSON.stringify({
				priceId: priceId, // Use actual Stripe price ID instead of hardcoded amounts
				productName: planName,
				description: `${planName} subscription for TenantFlow`,
				domain: origin,
				isSubscription: true,
				tenantId: 'frontend_user' // TODO: Get from auth context
			})
		})

		if (!backendResponse.ok) {
			const errorData = await backendResponse.json().catch(() => ({ error: 'Backend request failed' }))
			return NextResponse.json(
				{ error: errorData.message || errorData.error || 'Checkout session creation failed' },
				{ status: backendResponse.status }
			)
		}

		const result = await backendResponse.json()
		
		return NextResponse.json({
			sessionId: result.session_id,
			url: result.url
		})
	} catch (error: unknown) {
		console.error('Stripe checkout session creation error:', error)

		return NextResponse.json(
			{
				error: 'Failed to create checkout session',
				details:
					process.env.NODE_ENV === 'development' 
						? error instanceof Error ? error.message : String(error)
						: undefined
			},
			{ status: 500 }
		)
	}
}
