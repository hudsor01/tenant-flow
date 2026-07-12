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

// A live Stripe subscription still exists on the customer even in
// past_due/unpaid/paused/incomplete — such an owner must be routed to the
// billing portal, never into a second checkout (double billing + webhook
// thrash). Mirrors LIVE_SUBSCRIPTION_STATUSES in
// src/app/(owner)/billing/plans/page.tsx (BILL-01) — keep the two sets in
// lockstep.
const LIVE_SUBSCRIPTION_STATUSES = new Set([
	"active",
	"trialing",
	"past_due",
	"unpaid",
	"paused",
	"incomplete",
]);

// Stripe rejects a `trial_end` less than 48h in the future.
const MIN_TRIAL_CARRYOVER_MS = 48 * 60 * 60 * 1000;

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
			.select(
				"stripe_customer_id, email, full_name, subscription_status, trial_ends_at",
			)
			.eq("id", user.id)
			.single();

		let customerId = userData?.stripe_customer_id;
		// Only a pre-existing customer can carry a live subscription; a
		// just-created customer never does, so skip the guard round-trip below.
		const customerAlreadyExisted = Boolean(customerId);

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

		// BILL-05: an already-subscribed owner must never mint a second
		// concurrent subscription (double billing + webhook thrash). If a live
		// subscription exists on the customer, return a billing-portal URL (the
		// correct plan-change surface) instead of a checkout session. Every
		// frontend caller redirects to the returned `url`, so no client change
		// is needed — the subscriber lands in the portal.
		if (customerAlreadyExisted) {
			const existingSubs = await stripe.subscriptions.list({
				customer: customerId,
				status: "all",
				limit: 10,
			});
			const hasLiveSubscription = existingSubs.data.some((sub) =>
				LIVE_SUBSCRIPTION_STATUSES.has(sub.status),
			);
			if (hasLiveSubscription) {
				const portalSession = await stripe.billingPortal.sessions.create({
					customer: customerId,
					return_url: `${frontendUrl}/settings?tab=billing`,
				});
				return new Response(JSON.stringify({ url: portalSession.url }), {
					status: 200,
					headers: getJsonHeaders(req),
				});
			}
		}

		// Create Checkout Session (hosted checkout with Radar fraud detection).
		// subscription_data.metadata propagates to the resulting subscription so
		// customer.subscription.* webhooks can identify the owner without a lookup.
		const sessionMetadata: Record<string, string> = {
			supabase_user_id: user.id,
		};
		if (source) sessionMetadata.source = source;

		// BILL-06: carry over the remaining DB-managed trial rather than minting
		// a fresh 14-day no-card trial (which enabled infinite serial free
		// trials: expired → checkout → 14 more free days → auto-cancel →
		// repeat). An 'expired' user has remainingTrialMs = 0, so checkout
		// collects a card and charges immediately; a mid-trial converter keeps
		// exactly their remaining days. Stripe rejects trial_end < 48h out.
		const remainingTrialMs =
			userData?.subscription_status === "trialing" && userData?.trial_ends_at
				? Date.parse(userData.trial_ends_at) - Date.now()
				: 0;
		const trialEndUnix =
			remainingTrialMs > MIN_TRIAL_CARRYOVER_MS && userData?.trial_ends_at
				? Math.floor(Date.parse(userData.trial_ends_at) / 1000)
				: null;

		const session = await stripe.checkout.sessions.create({
			customer: customerId,
			payment_method_types: ["card"],
			line_items: [{ price: priceId, quantity: 1 }],
			mode: "subscription",
			success_url: `${frontendUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${frontendUrl}/billing/checkout/cancel`,
			metadata: sessionMetadata,
			// Carry-over trial only. When trialEndUnix is set, `if_required`
			// skips card collection (a pure trial owes nothing at checkout) and
			// `trial_settings` cancels the sub if no card is added by trial end
			// (the proxy gates dashboard access on subscription_status IN
			// ('active','trialing')). Otherwise the hosted page collects a card
			// and charges immediately (no free-trial-farming path).
			subscription_data: {
				metadata: sessionMetadata,
				...(trialEndUnix
					? {
							trial_end: trialEndUnix,
							trial_settings: {
								end_behavior: { missing_payment_method: "cancel" as const },
							},
						}
					: {}),
			},
			...(trialEndUnix
				? { payment_method_collection: "if_required" as const }
				: {}),
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
