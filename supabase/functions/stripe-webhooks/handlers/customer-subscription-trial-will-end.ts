import Stripe from "stripe";
import { captureWebhookWarning, logEvent } from "../../_shared/errors.ts";
import { escapeHtml } from "../../_shared/escape-html.ts";
import { sendEmail } from "../../_shared/resend.ts";
import type { SupabaseAdmin } from "./types.ts";

/**
 * Handle customer.subscription.trial_will_end — Stripe fires this ~3 days
 * before a trial ends. For the carry-over no-card trials that stripe-checkout
 * creates (trial_settings.end_behavior.missing_payment_method: "cancel"), the
 * subscription auto-cancels at trial end, so this event is the only reminder
 * window. Emails the owner a nudge to add a payment method.
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

	const frontendUrl =
		Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "https://app.tenantflow.app";
	const trialEndDate = sub.trial_end
		? new Date(sub.trial_end * 1000).toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			})
		: "in 3 days";

	await sendEmail({
		to: [owner.email as string],
		subject: "Your TenantFlow trial ends in 3 days",
		html: `<p>Hi ${escapeHtml((owner.first_name as string) || "there")},</p>
      <p>Your TenantFlow trial ends on ${escapeHtml(trialEndDate)}. Add a payment method now to keep uninterrupted access — otherwise your subscription will be canceled when the trial ends.</p>
      <p><a href="${escapeHtml(frontendUrl)}/settings?tab=billing">Add a payment method</a></p>`,
		tags: [{ name: "category", value: "trial_will_end" }],
	});

	logEvent("[WEBHOOK] trial_will_end processed", { user_id: owner.id });
}
