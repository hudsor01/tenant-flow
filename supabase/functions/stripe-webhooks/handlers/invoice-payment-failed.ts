import Stripe from "stripe";
import { captureWebhookError, logEvent } from "../../_shared/errors.ts";
import { escapeHtml } from "../../_shared/escape-html.ts";
import { sendEmail } from "../../_shared/resend.ts";
import type { SupabaseAdmin } from "./types.ts";

/**
 * Handle invoice.payment_failed event (platform subscription failure).
 * Looks up owner by stripe_customer_id and sends failure notification email.
 */
export async function handleInvoicePaymentFailed(
	supabase: SupabaseAdmin,
	_stripe: Stripe,
	event: Stripe.Event,
): Promise<void> {
	const invoice = event.data.object as Stripe.Invoice;
	const customerId =
		typeof invoice.customer === "string"
			? invoice.customer
			: (invoice.customer as { id: string } | null)?.id;

	if (!customerId) {
		captureWebhookError(new Error("No customer ID on invoice"), {
			message: "[WEBHOOK] invoice.payment_failed: no customer ID on invoice",
			invoice_id: invoice.id,
		});
		return;
	}

	// Look up owner by stripe_customer_id
	const { data: owner } = await supabase
		.from("users")
		.select("id, email, first_name, stripe_customer_id")
		.eq("stripe_customer_id", customerId)
		.single();

	if (!owner) {
		captureWebhookError(new Error("No user found for customer"), {
			message: "[WEBHOOK] invoice.payment_failed: no user found for customer",
			customer_id: customerId,
		});
		return;
	}

	// Send owner notification email about subscription payment failure.
	// What it says is true whether Stripe's retries end in `unpaid` or
	// `canceled` (its failed-payment setting, which this repo cannot read): the
	// proxy closes every page but Settings for both. The paid features stop
	// now, not then: the tier gates (`_shared/tier-gate.ts`, the reminder
	// drainer) admit only `active` and `trialing`, so a past-due owner on
	// Growth or Max loses new e-signature requests (lease-signature `send`),
	// the Year-End, Tax Documents and Financial Analytics exports (the premium
	// report types) and renewal reminder emails. It said the subscription would
	// be canceled and premium features disabled after the retries (66.2-39 fix
	// round 4, Part 8n; the in-app past_due banner says the same first line).
	const frontendUrl =
		Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "https://app.tenantflow.app";
	await sendEmail({
		to: [owner.email as string],
		subject: "Action Required: Subscription Payment Failed",
		html: `<p>Hi ${escapeHtml((owner.first_name as string) || "there")},</p>
      <p>Your TenantFlow subscription payment failed. Update your payment method to keep access.</p>
      <p>Until the payment goes through, Growth and Max plans can't send new e-signature requests, export the Year-End, Tax Documents or Financial Analytics reports, or send renewal reminder emails. If the payment isn't made, every page except Settings closes until your subscription is active again.</p>
      <p><a href="${escapeHtml(frontendUrl)}/settings?tab=billing">Update Payment Method</a></p>`,
		tags: [{ name: "category", value: "subscription_failure" }],
	});

	logEvent("[WEBHOOK] invoice.payment_failed processed", { user_id: owner.id });
}
