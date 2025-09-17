import type { NextRequest } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'https://api.tenantflow.app'

export async function POST(req: NextRequest) {
	try {
		const body = await req.json()
		const { 
			amount, 
			currency = 'usd', 
			metadata = {}, 
			customerEmail,
			tenantId,
			propertyId,
			subscriptionType
		} = body

		if (!amount || amount < 50) {
			return Response.json(
				{ error: 'Amount must be at least $0.50' },
				{ status: 400 }
			)
		}

		// Proxy request to backend Stripe controller
		const backendResponse = await fetch(`${BACKEND_URL}/api/v1/stripe/create-payment-intent`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				// Forward auth headers if present
				...(req.headers.get('authorization') && {
					'authorization': req.headers.get('authorization')!
				})
			},
			body: JSON.stringify({
				amount: Math.round(amount),
				currency,
				metadata: {
					...metadata,
					source: 'tenantflow_frontend',
					customerEmail: customerEmail || 'unknown'
				},
				tenantId,
				propertyId,
				subscriptionType
			})
		})

		if (!backendResponse.ok) {
			const errorData = await backendResponse.json().catch(() => ({ error: 'Backend request failed' }))
			return Response.json(
				{ error: errorData.message || errorData.error || 'Payment initialization failed' },
				{ status: backendResponse.status }
			)
		}

		const result = await backendResponse.json()
		
		// Map backend response to frontend expected format
		return Response.json({
			clientSecret: result.client_secret,
			paymentIntentId: result.payment_intent_id,
			status: result.status
		})
	} catch (error) {
		console.error('Payment Intent proxy failed:', error)
		
		return Response.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		)
	}
}
