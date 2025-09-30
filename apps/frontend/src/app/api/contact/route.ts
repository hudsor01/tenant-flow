import type { ContactFormRequest } from '@repo/shared/types/domain'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
	try {
		const body: ContactFormRequest = await request.json()

		// Get the backend API URL from environment
		const backendUrl =
			process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.tenantflow.app'

		// Forward the request to the backend
		const response = await fetch(`${backendUrl}/contact`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		})

		const result = await response.json()

		if (!response.ok) {
			return NextResponse.json(
				{ error: result.message || 'Failed to submit contact form' },
				{ status: response.status }
			)
		}

		return NextResponse.json(result)
	} catch {
		// Log error - in production this would use structured logging
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		)
	}
}
