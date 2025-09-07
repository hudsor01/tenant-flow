/**
 * Stripe RPC Function Response Types
 *
 * TypeScript interfaces for the JSONB responses from Stripe RPC functions
 * These match the return types defined in supabase/migrations/20250903_stripe_ultra_native_rpc.sql
 */

// ============================================================================
// STRIPE CHECKOUT RPC RESPONSE
// ============================================================================

export interface StripeCheckoutResponse {
	/** Stripe checkout session ID */
	sessionId: string
	/** Checkout session URL for redirect */
	url: string
}

// ============================================================================
// STRIPE PORTAL RPC RESPONSE
// ============================================================================

export interface StripePortalResponse {
	/** Customer portal session URL */
	url: string
}

// ============================================================================
// STRIPE SETUP INTENT RPC RESPONSE
// ============================================================================

export interface StripeSetupIntentResponse {
	/** Client secret for confirming the setup intent */
	clientSecret: string
}

// ============================================================================
// STRIPE CUSTOMER WITH TRIAL RPC RESPONSE
// ============================================================================

export interface StripeCustomerTrialResponse {
	/** Created Stripe customer ID */
	customerId: string
	/** Created subscription ID */
	subscriptionId: string
	/** Subscription status */
	status?: string
	/** Trial end timestamp */
	trialEnd?: string
}

// ============================================================================
// STRIPE WEBHOOK VERIFICATION RPC RESPONSE
// ============================================================================

export interface StripeWebhookVerificationResponse {
	/** Webhook verification status */
	verified: boolean
	/** Parsed webhook event data - using official Stripe Event structure */
	event?: {
		id: string
		object: 'event'
		type: string
		data: {
			object: Record<string, unknown>
		}
		created: number
		livemode: boolean
	}
	/** Error details if verification failed */
	error?: string
}

// ============================================================================
// GENERIC RPC ERROR RESPONSE
// ============================================================================

export interface RpcErrorResponse {
	/** Error message */
	message: string
	/** Error details */
	details?: string
	/** HTTP status code */
	statusCode?: number
}

// ============================================================================
// TYPE GUARDS FOR RUNTIME VALIDATION
// ============================================================================

export function isStripeCheckoutResponse(
	data: unknown
): data is StripeCheckoutResponse {
	if (!data || typeof data !== 'object') return false

	const obj = data as Record<string, unknown>
	return (
		'sessionId' in obj &&
		typeof obj.sessionId === 'string' &&
		'url' in obj &&
		typeof obj.url === 'string'
	)
}

export function isStripePortalResponse(
	data: unknown
): data is StripePortalResponse {
	if (!data || typeof data !== 'object') return false

	const obj = data as Record<string, unknown>
	return 'url' in obj && typeof obj.url === 'string'
}

export function isStripeSetupIntentResponse(
	data: unknown
): data is StripeSetupIntentResponse {
	if (!data || typeof data !== 'object') return false

	const obj = data as Record<string, unknown>
	return 'clientSecret' in obj && typeof obj.clientSecret === 'string'
}

export function isStripeCustomerTrialResponse(
	data: unknown
): data is StripeCustomerTrialResponse {
	if (!data || typeof data !== 'object') return false

	const obj = data as Record<string, unknown>
	return (
		'customerId' in obj &&
		typeof obj.customerId === 'string' &&
		'subscriptionId' in obj &&
		typeof obj.subscriptionId === 'string'
	)
}
