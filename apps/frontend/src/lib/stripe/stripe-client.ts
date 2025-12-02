/**
 * Stripe integration client using Supabase Edge Functions
 * CLAUDE.md compliant - Native platform integration
 */
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { API_BASE_URL } from '#lib/api-config'
import { createClient } from '#utils/supabase/client'
import { ERROR_MESSAGES } from '#lib/constants/error-messages'
import { env } from '#config/env'

// Cache the Stripe instance to avoid re-initializing
let stripePromise: Promise<Stripe | null> | null = null

/**
 * Get Stripe.js instance (lazily loaded and cached)
 * Required for Stripe Elements and Identity verification
 */
export function getStripe(): Promise<Stripe | null> {
	if (!stripePromise) {
		// T3 Env validates this at build time - no runtime check needed
		stripePromise = loadStripe(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
	}
	return stripePromise
}

interface CreateCheckoutSessionRequest {
	priceId: string
	planName: string
	description?: string
	customerEmail?: string
	tenant_id?: string
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

	// SECURITY FIX: Validate user with getUser() before extracting data
	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser()

	// Get session for access token (only after user validation)
	const {
		data: { session }
	} = await supabase.auth.getSession()

	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	}

	// Add auth header if user is authenticated
	if (!userError && user && session?.access_token) {
		headers['Authorization'] = `Bearer ${session.access_token}`
	}

	const response = await fetch(
		`${API_BASE_URL}/api/v1/stripe/create-checkout-session`,
		{
			method: 'POST',
			credentials: 'include',
			headers,
			body: JSON.stringify({
				priceId: request.priceId,
				productName: request.planName,
				tenant_id: request.tenant_id || user?.id || 'pending_signup',
				domain: window.location.origin,
				description: request.description,
				isSubscription: true,
				customerEmail: request.customerEmail || user?.email || undefined
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
 * SECURITY: Uses getUser() to validate authentication
 */
export async function isUserAuthenticated(): Promise<boolean> {
	const supabase = createClient()

	const {
		data: { user },
		error
	} = await supabase.auth.getUser()
	return !error && !!user
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
		throw new Error(ERROR_MESSAGES.USER_NOT_AUTHENTICATED)
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

	// Validate user with getUser() before extracting token
	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser()

	// Get session for access token (only after user validation)
	const {
		data: { session }
	} = await supabase.auth.getSession()

	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	}

	// Add auth header if user is authenticated
	if (!userError && user && session?.access_token) {
		headers['Authorization'] = `Bearer ${session.access_token}`
	}

	const response = await fetch(
		`${API_BASE_URL}/api/v1/stripe/create-payment-intent`,
		{
			method: 'POST',
			credentials: 'include',
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

	// SECURITY FIX: Validate user with getUser() before extracting data
	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser()

	if (userError || !user) {
		throw new Error('User not authenticated')
	}

	// Get session for access token (only after user validation)
	const {
		data: { session }
	} = await supabase.auth.getSession()

	if (!session?.access_token) {
		throw new Error(ERROR_MESSAGES.SESSION_EXPIRED)
	}

	// Call backend API - it will fetch stripe_customer_id server-side
	// This avoids client-side database queries and 403 errors
	const response = await fetch(
		`${API_BASE_URL}/api/v1/stripe/create-billing-portal`,
		{
			method: 'POST',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${session.access_token}`
			},
			body: JSON.stringify({
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
