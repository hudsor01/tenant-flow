// Stripe Checkout Edge Function
// Creates a Stripe Checkout Session for new TenantFlow platform subscriptions.
// Returns { url } — frontend redirects to this URL.
// Authenticated: requires JWT Bearer token.

import { validateBearerAuth } from "../_shared/auth.ts";
import { getJsonHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { validateEnv } from "../_shared/env.ts";
import { errorResponse } from "../_shared/errors.ts";
import { ALLOWED_CHECKOUT_PRICE_IDS } from "../_shared/plan-tier.ts";
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
			optional: ["FRONTEND_URL"],
		});
	} catch (err) {
		return errorResponse(req, 500, err, { action: "env_validation" });
	}

	const stripeKey = env.STRIPE_SECRET_KEY;
	const supabaseUrl = env.SUPABASE_URL;
	const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;
	const frontendUrl = env.FRONTEND_URL ?? "http://localhost:3050";

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
		const body = await req.json();
		// Accept both snake_case (preferred) and camelCase (legacy frontend) forms
		const priceId: string = body.price_id ?? body.priceId ?? "";

		if (!priceId) {
			return new Response(JSON.stringify({ error: "price_id is required" }), {
				status: 400,
				headers: getJsonHeaders(req),
			});
		}

		// Refuse a price_id that isn't in our canonical set. Without this
		// guard a caller can pass any string and Stripe will accept it as
		// long as the price exists in our account — including coupon
		// prices, archived tiers, or test-mode-leaked prices. Combined
		// with `allow_promotion_codes: true` this is a known cheap-tier
		// bypass shape.
		if (!ALLOWED_CHECKOUT_PRICE_IDS.has(priceId)) {
			return new Response(JSON.stringify({ error: "price_id not allowed" }), {
				status: 400,
				headers: getJsonHeaders(req),
			});
		}

		// Attribution tag from the upgrade CTA that sent the user here (e.g.
		// 'esign_gate', 'reports_gate'). Stored on Stripe session + subscription
		// so admin analytics can count conversions per gate. Must match
		// ^[a-z_]+$, max 64 chars. Invalid input is silently dropped — not a
		// user-visible error since attribution is telemetry, not functionality.
		const rawSource = typeof body.source === "string" ? body.source : "";
		const source = /^[a-z_]{1,64}$/.test(rawSource) ? rawSource : "";

		const stripe = getStripeClient(stripeKey);

		// Get or create Stripe customer for this user
		const { data: userData } = await supabase
			.from("users")
			.select("stripe_customer_id, email, full_name")
			.eq("id", user.id)
			.single();

		let customerId = userData?.stripe_customer_id;

		if (!customerId) {
			const customer = await stripe.customers.create({
				email: user.email ?? userData?.email,
				name: userData?.full_name ?? undefined,
				metadata: { supabase_user_id: user.id },
			});
			customerId = customer.id;
			// Save customer ID
			await supabase
				.from("users")
				.update({ stripe_customer_id: customerId })
				.eq("id", user.id);
		}

		// Create Checkout Session (hosted checkout with Radar fraud detection).
		// subscription_data.metadata propagates to the resulting subscription so
		// customer.subscription.* webhooks can identify the owner without a lookup.
		const sessionMetadata: Record<string, string> = {
			supabase_user_id: user.id,
		};
		if (source) sessionMetadata.source = source;

		const session = await stripe.checkout.sessions.create({
			customer: customerId,
			payment_method_types: ["card"],
			line_items: [{ price: priceId, quantity: 1 }],
			mode: "subscription",
			success_url: `${frontendUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${frontendUrl}/settings/billing?checkout=cancelled`,
			metadata: sessionMetadata,
			subscription_data: { metadata: sessionMetadata },
			allow_promotion_codes: true,
		});

		return new Response(JSON.stringify({ url: session.url }), {
			status: 200,
			headers: getJsonHeaders(req),
		});
	} catch (err) {
		return errorResponse(req, 500, err, { action: "create_checkout_session" });
	}
});
