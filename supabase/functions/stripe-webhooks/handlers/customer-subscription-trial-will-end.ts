import Stripe from "stripe";
import { captureWebhookWarning, logEvent } from "../../_shared/errors.ts";
import { escapeHtml } from "../../_shared/escape-html.ts";
import { sendEmail } from "../../_shared/resend.ts";
import {
	trialEndCopy,
	trialIsStillRunning,
} from "../../_shared/trial-end-text.ts";
import type { SupabaseAdmin } from "./types.ts";

/**
 * Handle customer.subscription.trial_will_end — Stripe fires this ~3 days
 * before a trial ends. For the carry-over no-card trials that stripe-checkout
 * creates (trial_settings.end_behavior.missing_payment_method: "cancel"), the
 * subscription auto-cancels at trial end, so this event is the only reminder
 * window. Emails the owner a nudge to add a payment method.
 *
 * Stripe sends it whether or not a payment method is on file (an owner can add
 * one in the billing portal during the trial), and the event carries the
 * customer as an id only: a card set as the customer's default is not in the
 * payload. So the copy states both outcomes rather than branching on the
 * payload or calling Stripe; it told every owner to add a payment method
 * (66.2-39 fix round 4, Part 8n).
 *
 * The subject said "ends in 3 days" and the line "ends on" a UTC date, or
 * "ends on in 3 days" with no `trial_end`. Stripe also sends this event at
 * once when less time is left or when a trial is ended early, so the subject
 * and line now name the end as a date and time in UTC, read "is ending" with
 * no date, and a trial that is already over gets no email
 * (`_shared/trial-end-text.ts`, 66.2-39 fix round 4, Part 8o).
 *
 * DB-managed trials (no Stripe subscription) do NOT emit this event — the
 * expire_trials() reminder is a separate, out-of-scope feature.
 */
export async function handleCustomerSubscriptionTrialWillEnd(
	supabase: SupabaseAdmin,
	_stripe: Stripe,
	event: Stripe.Event,
): Promise<void> {
	const sub = event.data.object as Stripe.Subscription;
	const customerId =
		typeof sub.customer === "string" ? sub.customer : sub.customer.id;

	const { data: owner } = await supabase
		.from("users")
		.select("id, email, first_name, stripe_customer_id")
		.eq("stripe_customer_id", customerId)
		.maybeSingle();

	if (!owner) {
		captureWebhookWarning("[WEBHOOK] trial_will_end: no user found for customer", {
			sub_id: sub.id,
			customer_id: customerId,
		});
		return;
	}

	if (!trialIsStillRunning(sub.status, sub.trial_end ?? null, Date.now())) {
		logEvent("[WEBHOOK] trial_will_end: the trial is over; no email", {
			user_id: owner.id,
			sub_id: sub.id,
			status: sub.status,
		});
		return;
	}

	const frontendUrl =
		Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "https://app.tenantflow.app";
	const copy = trialEndCopy(sub.trial_end ?? null);

	await sendEmail({
		to: [owner.email as string],
		subject: copy.subject,
		html: `<p>Hi ${escapeHtml((owner.first_name as string) || "there")},</p>
      <p>${escapeHtml(copy.lead)}</p>
      <p>If you've added a payment method, your plan continues when the trial ends and is billed to it.</p>
      <p>If you haven't, add one in Billing Settings before then. Without one, your subscription is canceled when the trial ends, and every page except Settings closes until you choose a plan.</p>
      <p><a href="${escapeHtml(frontendUrl)}/settings?tab=billing">Open Billing Settings</a></p>`,
		tags: [{ name: "category", value: "trial_will_end" }],
	});

	logEvent("[WEBHOOK] trial_will_end processed", { user_id: owner.id });
}
