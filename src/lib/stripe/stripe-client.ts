/**
 * Stripe integration client using Supabase Edge Functions
 * CLAUDE.md compliant - Native platform integration
 *
 * Server-side flows only: checkout sessions and customer portal sessions
 * are created via Supabase Edge Functions and the browser is redirected
 * to checkout.stripe.com. No Stripe.js bundle is required.
 */

import { ERROR_MESSAGES } from "#lib/constants/error-messages";
import { createClient } from "#lib/supabase/client";

interface CreateCheckoutSessionRequest {
	priceId: string;
	planName: string;
	description?: string;
	customerEmail?: string;
	tenant_id?: string;
	/**
	 * Paywall attribution tag from the upgrade CTA that sent the user here
	 * (e.g. 'esign_gate', 'reports_gate'). Forwarded to Stripe Checkout as
	 * `metadata.source` so admin analytics can count conversions per gate.
	 * Derived from the current URL's ?source= query param by
	 * `startCheckoutFromUrl` — pass explicitly to override.
	 */
	source?: string;
}

interface CreateCheckoutSessionResponse {
	sessionId: string;
	url: string;
}

/**
 * Create a Stripe checkout session via Supabase Edge Function
 */
export async function createCheckoutSession(
	request: CreateCheckoutSessionRequest,
): Promise<CreateCheckoutSessionResponse> {
	const supabase = createClient();

	// getSession() reads from local cache (no network call).
	// The Edge Function validates the JWT server-side — no need for getUser() here.
	const {
		data: { session },
	} = await supabase.auth.getSession();

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};

	if (session?.access_token) {
		headers["Authorization"] = `Bearer ${session.access_token}`;
	}

	const user = session?.user;

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const response = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			priceId: request.priceId,
			price_id: request.priceId,
			productName: request.planName,
			tenant_id: request.tenant_id || user?.id || "pending_signup",
			domain: window.location.origin,
			description: request.description,
			isSubscription: true,
			customerEmail: request.customerEmail || user?.email || undefined,
			...(request.source ? { source: request.source } : {}),
		}),
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({
			error: `HTTP ${response.status}: ${response.statusText}`,
		}));
		throw new Error(errorData.error || "Failed to create checkout session");
	}

	const data = await response.json();
	return {
		sessionId: data.sessionId || data.id,
		url: data.url,
	};
}

/**
 * Create a Stripe Customer Portal session for subscription management
 * Official Stripe pattern: customer self-service portal
 */
export async function createCustomerPortalSession(
	returnUrl: string,
): Promise<{ url: string }> {
	const supabase = createClient();

	// getSession() reads from local cache (no network call).
	// The Edge Function validates the JWT server-side.
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session?.access_token) {
		throw new Error(ERROR_MESSAGES.SESSION_EXPIRED);
	}

	// Call stripe-billing-portal Edge Function
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const response = await fetch(
		`${supabaseUrl}/functions/v1/stripe-billing-portal`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${session.access_token}`,
			},
			body: JSON.stringify({
				returnUrl,
			}),
		},
	);

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({
			error: `HTTP ${response.status}: ${response.statusText}`,
		}));
		throw new Error(
			errorData.error || "Failed to create billing portal session",
		);
	}

	const data = await response.json();
	return { url: data.url };
}
