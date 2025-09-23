/**
 * Stripe integration client using Supabase Edge Functions
 * CLAUDE.md compliant - Native platform integration
 */
import type { Database } from '@repo/shared'
import { createBrowserClient } from '@supabase/ssr'

/**
 * Get the API URL for Stripe endpoints
 * In production, requires environment variables to be set
 * In development, falls back to local backend
 */
function getStripeApiUrl(): string {
	// Check for explicit environment variables first
	if (process.env.NEXT_PUBLIC_API_BASE_URL) {
		return process.env.NEXT_PUBLIC_API_BASE_URL
	}
	if (process.env.NEXT_PUBLIC_BACKEND_URL) {
		return process.env.NEXT_PUBLIC_BACKEND_URL
	}

	// In production, require environment variables
	if (process.env.NODE_ENV === 'production') {
		console.error(
			'Missing required environment variable: NEXT_PUBLIC_API_BASE_URL or NEXT_PUBLIC_BACKEND_URL'
		)
		// Return empty string to make the error obvious in production
		return ''
	}

	// Only use localhost as fallback in development
	return 'http://localhost:4600'
}

interface CreateCheckoutSessionRequest {
	priceId: string
	planName: string
	description?: string
}

interface CreateCheckoutSessionResponse {
	sessionId: string
	url: string
}

/**
 * Create a Stripe checkout session via NestJS backend
 */
export async function createCheckoutSession(
	request: CreateCheckoutSessionRequest
): Promise<CreateCheckoutSessionResponse> {
	const supabase = createBrowserClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
	)

	// Get current session for authentication (optional for unauthenticated checkout)
	const {
		data: { session }
	} = await supabase.auth.getSession()

	// Get API URL from environment or development fallback
	const apiUrl = getStripeApiUrl()

	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	}

	// Add auth header if user is authenticated
	if (session?.access_token) {
		headers['Authorization'] = `Bearer ${session.access_token}`
	}

	const response = await fetch(
		`${apiUrl}/api/v1/stripe/create-checkout-session`,
		{
			method: 'POST',
			headers,
			body: JSON.stringify({
				priceId: request.priceId,
				productName: request.planName,
				tenantId: session?.user?.id || 'pending_signup',
				domain: window.location.origin,
				description: request.description,
				isSubscription: true,
				customerEmail: session?.user?.email || undefined
			})
		}
	)

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({
			error: `HTTP ${response.status}: ${response.statusText}`
		}))
		throw new Error(errorData.error || 'Failed to create checkout session')
	}

	const data = await response.json()
	return {
		sessionId: data.sessionId || data.id,
		url: data.url
	}
}

/**
 * Check if user is authenticated with Supabase
 */
export async function isUserAuthenticated(): Promise<boolean> {
	const supabase = createBrowserClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
	)

	const {
		data: { session }
	} = await supabase.auth.getSession()
	return !!session?.access_token
}

/**
 * Get authenticated user info
 */
export async function getCurrentUser() {
	const supabase = createBrowserClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
	)

	const {
		data: { user },
		error
	} = await supabase.auth.getUser()

	if (error || !user) {
		throw new Error('User not authenticated')
	}

	return user
}

/**
 * Create a payment intent for direct Stripe Elements integration
 */
export async function createPaymentIntent({
	amount,
	currency = 'usd',
	metadata = {},
	customerEmail
}: {
	amount: number
	currency?: string
	metadata?: Record<string, string>
	customerEmail?: string
}) {
	const supabase = createBrowserClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
	)

	const {
		data: { session }
	} = await supabase.auth.getSession()

	// Get API URL from environment or development fallback
	const apiUrl = getStripeApiUrl()
	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	}

	// Add auth header if user is authenticated
	if (session?.access_token) {
		headers['Authorization'] = `Bearer ${session.access_token}`
	}

	const response = await fetch(
		`${apiUrl}/api/v1/stripe/create-payment-intent`,
		{
			method: 'POST',
			headers,
			body: JSON.stringify({
				amount,
				currency,
				metadata,
				customerEmail
			})
		}
	)

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({
			error: `HTTP ${response.status}: ${response.statusText}`
		}))
		throw new Error(errorData.error || 'Failed to create payment intent')
	}

	return response.json()
}
