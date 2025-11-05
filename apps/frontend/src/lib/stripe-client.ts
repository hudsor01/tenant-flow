/**
 * Stripe integration client using Supabase Edge Functions
 * CLAUDE.md compliant - Native platform integration
 */
import { API_BASE_URL } from '#lib/api-config'
import { createClient } from '#lib/supabase/client'

interface CreateCheckoutSessionRequest {
	priceId: string
	planName: string
	description?: string
	customerEmail?: string
	tenantId?: string
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
	const supabase = createClient()

	// Get current session for authentication (optional for unauthenticated checkout)
	const {
		data: { session }
	} = await supabase.auth.getSession()

	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	}

	// Add auth header if user is authenticated
	if (session?.access_token) {
		headers['Authorization'] = `Bearer ${session.access_token}`
	}

	const response = await fetch(
		`${API_BASE_URL}/api/v1/stripe/create-checkout-session`,
		{
			method: 'POST',
			headers,
			body: JSON.stringify({
				priceId: request.priceId,
				productName: request.planName,
				tenantId: request.tenantId || session?.user?.id || 'pending_signup',
				domain: window.location.origin,
				description: request.description,
				isSubscription: true,
				customerEmail:
					request.customerEmail || session?.user?.email || undefined
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
	const supabase = createClient()

	const {
		data: { session }
	} = await supabase.auth.getSession()
	return !!session?.access_token
}

/**
 * Get authenticated user info
 */
export async function getCurrentUser() {
	const supabase = createClient()

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
	const supabase = createClient()

	const {
		data: { session }
	} = await supabase.auth.getSession()

	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	}

	// Add auth header if user is authenticated
	if (session?.access_token) {
		headers['Authorization'] = `Bearer ${session.access_token}`
	}

	const response = await fetch(
		`${API_BASE_URL}/api/v1/stripe/create-payment-intent`,
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

/**
 * Create a Stripe Customer Portal session for subscription management
 * Official Stripe pattern: customer self-service portal
 */
export async function createCustomerPortalSession(
	returnUrl: string
): Promise<{ url: string }> {
	const supabase = createClient()

	const {
		data: { session }
	} = await supabase.auth.getSession()

	if (!session?.access_token) {
		throw new Error('User not authenticated')
	}

	// Get user's Stripe customer ID
	const { data: userData, error: userError } = await supabase
		.from('users')
		.select('stripeCustomerId')
		.eq('id', session.user.id)
		.single()

	if (userError || !userData?.stripeCustomerId) {
		throw new Error('No Stripe customer found. Please contact support.')
	}

	const response = await fetch(
		`${API_BASE_URL}/api/v1/stripe/create-billing-portal`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${session.access_token}`
			},
			body: JSON.stringify({
				customerId: userData.stripeCustomerId,
				returnUrl
			})
		}
	)

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({
			error: `HTTP ${response.status}: ${response.statusText}`
		}))
		throw new Error(
			errorData.error || 'Failed to create billing portal session'
		)
	}

	const data = await response.json()
	return { url: data.url }
}
