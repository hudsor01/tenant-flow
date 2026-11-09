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
	// It states what the code and Stripe's Revenue recovery settings decide
	// (owner, 2026-11-09, from the Stripe Dashboard: a failed renewal leaves
	// the subscription past due, card payments are retried, and when every
	// retry fails the subscription is canceled). While it is past due the
	// proxy admits the owner and the paid features pause at once: the tier
	// gates (`_shared/tier-gate.ts`, the reminder drainer) admit only `active`
	// and `trialing`, so a past-due owner on Growth or Max loses new
	// e-signature requests (lease-signature `send`), the Year-End, Tax
	// Documents and Financial Analytics exports (the premium report types) and
	// renewal reminder emails. Once canceled, the proxy closes every page but
	// Settings until a plan is chosen. The retry schedule is not known here,
	// so the email names no count or duration, and it says nothing of the
	// invoice. Changing those settings in Stripe means changing this copy
	// (66.2-39 fix round 4, Part 8o; Part 8n's copy left out the retries and
	// the cancellation).
	const frontendUrl =
		Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "https://app.tenantflow.app";
	await sendEmail({
		to: [owner.email as string],
		subject: "Action Required: Subscription Payment Failed",
		html: `<p>Hi ${escapeHtml((owner.first_name as string) || "there")},</p>
      <p>Your TenantFlow subscription payment failed. Update your payment method to keep access.</p>
      <p>We'll retry the payment. Until it goes through, Growth and Max plans can't send new e-signature requests, export the Year-End, Tax Documents or Financial Analytics reports, or send renewal reminder emails.</p>
      <p>If every retry fails, your subscription is canceled, and every page except Settings closes until you choose a plan again.</p>
      <p><a href="${escapeHtml(frontendUrl)}/settings?tab=billing">Update Payment Method</a></p>`,
		tags: [{ name: "category", value: "subscription_failure" }],
	});

	logEvent("[WEBHOOK] invoice.payment_failed processed", { user_id: owner.id });
}
