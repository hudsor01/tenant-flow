import Stripe from "stripe";
import { captureWebhookWarning, logEvent } from "../../_shared/errors.ts";
import { priceIdToTier } from "../../_shared/plan-tier.ts";
import type { SupabaseAdmin } from "./types.ts";

/**
 * Handle customer.subscription.created and customer.subscription.updated.
 * Landlord-only (v2.1): updates users.subscription_* columns that gate
 * dashboard access via proxy.ts. The tenant-rent-subscription lease path
 * (pre-PR #596) is gone — the leases table no longer has Stripe columns.
 */
export async function handleCustomerSubscriptionUpdated(
	supabase: SupabaseAdmin,
	_stripe: Stripe,
	event: Stripe.Event,
): Promise<void> {
	const sub = event.data.object as Stripe.Subscription;
	const customerId =
		typeof sub.customer === "string" ? sub.customer : sub.customer.id;

	const { data: user } = await supabase
		.from("users")
		.select("id")
		.eq("stripe_customer_id", customerId)
		.maybeSingle();

	if (!user) {
		captureWebhookWarning("[WEBHOOK] subscription matches no user", {
			sub_id: sub.id,
			customer_id: customerId,
		});
		return;
	}

	const priceId = sub.items.data[0]?.price.id ?? null;
	const planLookup = sub.items.data[0]?.price.lookup_key ?? null;
	// Resolve to a canonical tier slug so the plan-limit triggers see a value
	// they recognize. See checkout-session-completed.ts for the rationale.
	const tier = priceIdToTier(planLookup) ?? priceIdToTier(priceId);

	// Capture metadata.source for admin analytics if present on the subscription
	// (subscription_data.metadata propagates from checkout; also set directly
	// here so late-arriving subscription.updated events still fill it in).
	const source =
		typeof sub.metadata?.["source"] === "string"
			? sub.metadata["source"]
			: null;

	// Session 11 P1 #3 + cycle-2 review:
	// - For non-trialing statuses, clear trial_ends_at (the pre-Stripe
	//   14-day signup-trial deadline; meaningless once Stripe is in
	//   control). Matches the predicate in the cycle-5 backfill
	//   migration: `subscription_status <> 'trialing'`.
	// - For status === 'trialing' (Stripe-native trial window), persist
	//   sub.trial_end so the Billing UI can render a real countdown.
	//   Previously the unconditional null cleared the deadline and
	//   SubscriptionStatusBanner fell back to "free trial — no end".
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

	const { error: userUpdateError } = await supabase
		.from("users")
		.update(updatePayload)
		.eq("id", user.id);

	if (userUpdateError) throw userUpdateError;

	logEvent("[WEBHOOK] Updated owner subscription", {
		user_id: user.id,
		status: sub.status,
		sub_id: sub.id,
	});
}
