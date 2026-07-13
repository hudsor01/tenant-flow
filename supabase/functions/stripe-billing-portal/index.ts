// Stripe Billing Portal Edge Function
// Creates a Stripe Customer Portal Session for existing subscribers.
// Returns { url } — frontend redirects to this URL.
// Authenticated: requires JWT Bearer token.

import { validateBearerAuth } from "../_shared/auth.ts";
import { getJsonHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { validateEnv } from "../_shared/env.ts";
import { errorResponse } from "../_shared/errors.ts";
import { getStripeClient } from "../_shared/stripe-client.ts";
import { createAdminClient } from "../_shared/supabase-client.ts";

Deno.serve(async (req: Request) => {
	const optionsResponse = handleCorsOptions(req);
	if (optionsResponse) return optionsResponse;

	let env: Record<string, string>;
	try {
		env = validateEnv({
			required: [
				"SUPABASE_URL",
				"SUPABASE_SERVICE_ROLE_KEY",
				"STRIPE_SECRET_KEY",
			],
			optional: ["NEXT_PUBLIC_APP_URL"],
		});
	} catch (err) {
		return errorResponse(req, 500, err, { action: "env_validation" });
	}

	const stripeKey = env.STRIPE_SECRET_KEY;
	const supabaseUrl = env.SUPABASE_URL;
	const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;
	const frontendUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3050";

	// Authenticate
	const supabase = createAdminClient(supabaseUrl, supabaseServiceKey);
	const auth = await validateBearerAuth(req, supabase);
	if ("error" in auth) {
		return new Response(JSON.stringify({ error: auth.error }), {
			status: auth.status,
			headers: getJsonHeaders(req),
		});
	}
	const { user } = auth;

	try {
		const stripe = getStripeClient(stripeKey);

		// Get Stripe customer ID for this user
		const { data: userData } = await supabase
			.from("users")
			.select("stripe_customer_id")
			.eq("id", user.id)
			.single();

		if (!userData?.stripe_customer_id) {
			return new Response(
				JSON.stringify({
					error: "No Stripe customer found. Subscribe to a plan first.",
				}),
				{ status: 404, headers: getJsonHeaders(req) },
			);
		}

		// AUTH-13: honor the client's `returnUrl` (the /billing/plans callers post
		// one so the portal returns to /billing/plans, also allowlisted — avoiding
		// the lapsed-user /pricing bounce). Origin is validated against
		// NEXT_PUBLIC_APP_URL to block an open redirect via an attacker-supplied
		// returnUrl; an empty/malformed/foreign body silently keeps the default
		// (`useBillingPortalMutation` posts `{}` → the /dashboard?billing=updated
		// toast flow stays byte-identical).
		let returnUrl = `${frontendUrl}/dashboard?billing=updated`;
		try {
			const body = await req.json();
			if (typeof body?.returnUrl === "string") {
				const candidate = new URL(body.returnUrl);
				if (candidate.origin === new URL(frontendUrl).origin) {
					returnUrl = candidate.toString();
				}
			}
		} catch {
			// empty/malformed body → keep default
		}

		// Create Customer Portal Session
		// Proration behavior: Stripe Customer Portal default (per user decision)
		const session = await stripe.billingPortal.sessions.create({
			customer: userData.stripe_customer_id,
			return_url: returnUrl,
		});

		return new Response(JSON.stringify({ url: session.url }), {
			status: 200,
			headers: getJsonHeaders(req),
		});
	} catch (err) {
		return errorResponse(req, 500, err, {
			action: "create_billing_portal_session",
		});
	}
});
