import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.BACKEND_URL || 'https://api.tenantflow.app'

export async function POST(request: NextRequest) {
	try {
		const { sessionId } = await request.json()

		if (!sessionId) {
			return NextResponse.json(
				{ error: 'Session ID is required' },
				{ status: 400 }
			)
		}

		// Proxy request to backend for session verification
		const backendResponse = await fetch(`${BACKEND_URL}/api/v1/stripe/verify-checkout-session`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				// Forward auth headers if present
				...(request.headers.get('authorization') && {
					'authorization': request.headers.get('authorization')!
				})
			},
			body: JSON.stringify({ sessionId })
		})

		if (!backendResponse.ok) {
			const errorData = await backendResponse.json().catch(() => ({ error: 'Backend verification failed' }))
			return NextResponse.json(
				{ error: errorData.message || errorData.error || 'Session verification failed' },
				{ status: backendResponse.status }
			)
		}

		const result = await backendResponse.json()
		
		// Return the backend response directly since it already has the correct format
		return NextResponse.json(result)
	} catch (error) {
		console.error('Session verification proxy failed:', error)
		return NextResponse.json(
			{ error: 'Failed to verify session' },
			{ status: 500 }
		)
	}
}
