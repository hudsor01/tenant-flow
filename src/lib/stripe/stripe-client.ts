/**
 * Stripe integration client using Supabase Edge Functions
 * CLAUDE.md compliant - Native platform integration
 */
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { createClient } from '#lib/supabase/client'
import { ERROR_MESSAGES } from '#lib/constants/error-messages'
import { createLogger } from '#lib/frontend-logger'

const logger = createLogger({ component: 'StripeClient' })

// Cache the Stripe instance to avoid re-initializing
let stripePromise: Promise<Stripe | null> | null = null

/**
 * Get Stripe.js instance (lazily loaded and cached)
 * Required for Stripe Elements and Identity verification
 *
 * Uses process.env directly for client-side access (NEXT_PUBLIC_ prefix).
 * T3 Env cannot be imported in client components as it contains server-side vars.
 */
export function getStripe(): Promise<Stripe | null> {
	if (!stripePromise) {
		const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
		if (!publishableKey) {
			logger.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set')
			return Promise.resolve(null)
		}
		stripePromise = loadStripe(publishableKey)
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
 * Create a Stripe checkout session via Supabase Edge Function
 */
export async function createCheckoutSession(
	request: CreateCheckoutSessionRequest
): Promise<CreateCheckoutSessionResponse> {
	const supabase = createClient()

	// getSession() reads from local cache (no network call).
	// The Edge Function validates the JWT server-side — no need for getUser() here.
	const { data: { session } } = await supabase.auth.getSession()

	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	}

	if (session?.access_token) {
		headers['Authorization'] = `Bearer ${session.access_token}`
	}

	const user = session?.user

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const response = await fetch(
		`${supabaseUrl}/functions/v1/stripe-checkout`,
		{
			method: 'POST',
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
 * Create a Stripe Customer Portal session for subscription management
 * Official Stripe pattern: customer self-service portal
 */
export async function createCustomerPortalSession(
	returnUrl: string
): Promise<{ url: string }> {
	const supabase = createClient()

	// getSession() reads from local cache (no network call).
	// The Edge Function validates the JWT server-side.
	const { data: { session } } = await supabase.auth.getSession()

	if (!session?.access_token) {
		throw new Error(ERROR_MESSAGES.SESSION_EXPIRED)
	}

	// Call stripe-billing-portal Edge Function
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const response = await fetch(
		`${supabaseUrl}/functions/v1/stripe-billing-portal`,
		{
			method: 'POST',
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
