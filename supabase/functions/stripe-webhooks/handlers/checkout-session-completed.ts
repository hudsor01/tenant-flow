import Stripe from "stripe";
import { captureWebhookError, logEvent } from "../../_shared/errors.ts";
import { priceIdToTier } from "../../_shared/plan-tier.ts";
import type { SupabaseAdmin } from "./types.ts";

/**
 * Handle checkout.session.completed event.
 * Writes landlord SaaS subscription state to users table so the proxy gate
 * flips immediately on checkout completion (before subscription.created is
 * processed). Tenant-rent subscription and autopay-payment-method paths were
 * removed with the landlord-only refactor.
 */
export async function handleCheckoutSessionCompleted(
	supabase: SupabaseAdmin,
	stripe: Stripe,
	event: Stripe.Event,
): Promise<void> {
	const session = event.data.object as Stripe.Checkout.Session;

	// Landlord SaaS subscription — write subscription state for proxy gate.
	if (!session.subscription || !session.metadata?.["supabase_user_id"]) {
		return;
	}

	const subId =
		typeof session.subscription === "string"
			? session.subscription
			: session.subscription.id;

	try {
		const sub = await stripe.subscriptions.retrieve(subId);
		const priceId = sub.items.data[0]?.price.id ?? null;
		const planLookup = sub.items.data[0]?.price.lookup_key ?? null;
		// Resolve to a canonical tier slug ('starter' / 'growth' / 'max') so
		// public.enforce_property_plan_limit / enforce_unit_plan_limit triggers
		// see a value they recognize. Live Stripe prices have no lookup_key
		// configured, so `planLookup ?? priceId` previously persisted the raw
		// price ID and silently dropped paying customers to the trial cap.
		const tier = priceIdToTier(planLookup) ?? priceIdToTier(priceId);
		// Capture the upgrade attribution tag from session metadata so admin
		// analytics can compute per-gate conversion (v2.1 Phase 49). The tag
		// flows through from /billing/plans?source=<x> via stripe-checkout.
		const source =
			typeof session.metadata["source"] === "string"
				? session.metadata["source"]
				: null;

		// Session 11 P1 #3 + cycle-2 review: preserve Stripe-native trial
		// end timestamp; clear only the pre-Stripe signup-trial deadline.
		// Mirrors customer-subscription-updated.ts.
		const trialEndsAtForPayload: string | null =
			sub.status === "trialing"
				? sub.trial_end
					? new Date(sub.trial_end * 1000).toISOString()
					: null
				: null;

		const updatePayload: Record<string, unknown> = {
			subscription_id: sub.id,
			subscription_status: sub.status,
			subscription_plan: tier ?? planLookup ?? priceId,
			subscription_current_period_end: sub.current_period_end
				? new Date(sub.current_period_end * 1000).toISOString()
				: null,
			subscription_cancel_at_period_end: sub.cancel_at_period_end ?? false,
			subscription_updated_at: new Date().toISOString(),
			trial_ends_at: trialEndsAtForPayload,
		};
		if (source) updatePayload.subscription_source = source;

		const { error } = await supabase
			.from("users")
			.update(updatePayload)
			.eq("id", session.metadata["supabase_user_id"]);
		if (error) {
			captureWebhookError(error, {
				message: "[CHECKOUT] Failed to update user subscription state",
				user_id: session.metadata["supabase_user_id"],
				sub_id: sub.id,
			});
		} else {
			logEvent("[CHECKOUT] Granted dashboard access to user", {
				user_id: session.metadata["supabase_user_id"],
				sub_id: sub.id,
				status: sub.status,
			});
		}
	} catch (subErr) {
		captureWebhookError(subErr, {
			message: "[CHECKOUT] Failed to retrieve subscription for user gate",
			sub_id: subId,
		});
	}
}
