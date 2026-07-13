import Stripe from "stripe";
import { captureWebhookWarning, logEvent } from "../../_shared/errors.ts";
import type { SupabaseAdmin } from "./types.ts";

/**
 * Handle customer.subscription.deleted event.
 * Landlord-only (v2.1): marks users.subscription_status = 'canceled' so the
 * proxy gate revokes dashboard access on the next request. The tenant-rent
 * lease path was removed with the landlord-only refactor (the
 * leases.stripe_subscription_* columns were dropped in
 * 20260418170000_drop_dead_lease_subscription_cols.sql).
 */
export async function handleCustomerSubscriptionDeleted(
	supabase: SupabaseAdmin,
	_stripe: Stripe,
	event: Stripe.Event,
): Promise<void> {
	const sub = event.data.object as Stripe.Subscription;
	const customerId =
		typeof sub.customer === "string" ? sub.customer : sub.customer.id;

	// Owner SaaS subscription — revoke dashboard access.
	const { data: user } = await supabase
		.from("users")
		.select("id")
		.eq("stripe_customer_id", customerId)
		.maybeSingle();

	if (!user) {
		captureWebhookWarning("[WEBHOOK] deleted subscription matches no user", {
			sub_id: sub.id,
			customer_id: customerId,
		});
		return;
	}

	// BILL-14: order by event time, not processing time. Stripe does not
	// guarantee delivery order and the router re-processes previously-failed
	// events, so a stale updated(active) retried AFTER this deleted must not
	// resurrect access. Stamp the watermark at event.created and apply the
	// cancel only when this event is not older than the persisted watermark —
	// atomically, via a PostgREST filter (no read-modify-write race).
	const eventCreatedIso = new Date(event.created * 1000).toISOString();
	const { data: updated, error: userUpdateError } = await supabase
		.from("users")
		.update({
			subscription_status: "canceled",
			subscription_cancel_at_period_end: false,
			subscription_updated_at: eventCreatedIso,
		})
		.eq("id", user.id)
		.or(
			`subscription_updated_at.is.null,subscription_updated_at.lte.${eventCreatedIso}`,
		)
		.select("id");

	if (userUpdateError) throw userUpdateError;

	if (!updated || updated.length === 0) {
		logEvent("[WEBHOOK] Skipped stale subscription.deleted event", {
			user_id: user.id,
			sub_id: sub.id,
			event_created: eventCreatedIso,
		});
		return;
	}

	logEvent("[WEBHOOK] Canceled owner subscription — dashboard access revoked", {
		user_id: user.id,
		sub_id: sub.id,
	});
}
