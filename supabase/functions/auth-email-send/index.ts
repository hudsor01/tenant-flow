// Auth Email Send: the Supabase Auth "Send Email" hook.
//
// When this function is registered as the project's Send Email hook
// (Dashboard -> Authentication -> Auth Hooks -> Send Email, HTTPS, this
// function's URL), Supabase Auth POSTs every auth email here instead of
// sending its own templates, and we send the branded templates in
// _shared/auth-email-templates.ts through the Resend API.
//
// Supabase signs each request with Standard Webhooks headers using the hook
// secret it generates (`v1,whsec_...`). That value must be stored as this
// function's SEND_EMAIL_HOOK_SECRET; a request whose signature does not
// match is refused with 401 before anything is read from it.
//
// Answering with an error makes Supabase fail the auth action (the user sees
// that the email could not be sent), so a send that fails is never reported
// as a success.

import {
	planAuthEmails,
	type AuthEmailMessage,
} from "../_shared/auth-email-routing.ts";
import {
	emailChangedEmail,
	emailChangeEmail,
	identityLinkedEmail,
	identityUnlinkedEmail,
	invitationEmail,
	magicLinkEmail,
	mfaFactorEnrolledEmail,
	mfaFactorUnenrolledEmail,
	passwordChangedEmail,
	passwordResetEmail,
	phoneChangedEmail,
	reauthenticationEmail,
	signupConfirmationEmail,
} from "../_shared/auth-email-templates.ts";
import { validateEnv } from "../_shared/env.ts";
import { captureWebhookError, logEvent } from "../_shared/errors.ts";
import { sendEmail } from "../_shared/resend.ts";
import { verifyStandardWebhook } from "../_shared/standard-webhooks.ts";

const JSON_HEADERS = { "Content-Type": "application/json" };

/** The error shape Supabase Auth reads from a failed hook response. */
function hookError(status: number, message: string): Response {
	return new Response(
		JSON.stringify({ error: { http_code: status, message } }),
		{ status, headers: JSON_HEADERS },
	);
}

function render(message: AuthEmailMessage): { subject: string; html: string } {
	switch (message.kind) {
		case "signup":
			return signupConfirmationEmail({
				confirmUrl: message.url,
				email: message.to,
			});
		case "invite":
			return invitationEmail({
				inviteUrl: message.url,
				email: message.to,
				...(message.inviterName ? { inviterName: message.inviterName } : {}),
			});
		case "magiclink":
			return magicLinkEmail({ magicLinkUrl: message.url, email: message.to });
		case "recovery":
			return passwordResetEmail({ resetUrl: message.url, email: message.to });
		case "email_change":
			return emailChangeEmail({
				confirmUrl: message.url,
				email: message.email,
				newEmail: message.newEmail,
			});
		case "reauthentication":
			return reauthenticationEmail({ code: message.code, email: message.to });
		case "password_changed":
			return passwordChangedEmail({
				email: message.to,
				signInUrl: message.signInUrl,
			});
		case "email_changed":
			return emailChangedEmail({
				email: message.to,
				oldEmail: message.oldEmail,
				signInUrl: message.signInUrl,
			});
		case "phone_changed":
			return phoneChangedEmail({
				email: message.to,
				phone: message.phone,
				oldPhone: message.oldPhone,
				signInUrl: message.signInUrl,
			});
		case "identity_linked":
			return identityLinkedEmail({
				email: message.to,
				provider: message.provider,
				signInUrl: message.signInUrl,
			});
		case "identity_unlinked":
			return identityUnlinkedEmail({
				email: message.to,
				provider: message.provider,
				signInUrl: message.signInUrl,
			});
		case "mfa_enrolled":
			return mfaFactorEnrolledEmail({
				email: message.to,
				factorType: message.factorType,
				signInUrl: message.signInUrl,
			});
		case "mfa_unenrolled":
			return mfaFactorUnenrolledEmail({
				email: message.to,
				factorType: message.factorType,
				signInUrl: message.signInUrl,
			});
	}
}

Deno.serve(async (req: Request) => {
	if (req.method !== "POST") return hookError(405, "Method not allowed");

	let env: Record<string, string>;
	try {
		env = validateEnv({
			required: [
				"RESEND_API_KEY",
				"SEND_EMAIL_HOOK_SECRET",
				"NEXT_PUBLIC_APP_URL",
			],
		});
	} catch (err) {
		captureWebhookError(err, { message: "[AUTH_EMAIL] Missing environment" });
		return hookError(500, "Email hook is not configured");
	}

	// Verify against the raw body before parsing anything from it.
	const body = await req.text();
	const verdict = await verifyStandardWebhook({
		body,
		headers: {
			id: req.headers.get("webhook-id"),
			timestamp: req.headers.get("webhook-timestamp"),
			signature: req.headers.get("webhook-signature"),
		},
		secrets: env.SEND_EMAIL_HOOK_SECRET,
		nowSeconds: Math.floor(Date.now() / 1000),
	});
	if (!verdict.ok) {
		captureWebhookError(new Error("Unauthorized auth email hook request"), {
			message: "[AUTH_EMAIL] Signature check failed",
			reason: verdict.reason,
		});
		return hookError(401, "Unauthorized");
	}

	let payload: unknown;
	try {
		payload = JSON.parse(body);
	} catch {
		return hookError(400, "Invalid JSON");
	}

	const plan = planAuthEmails(payload, env.NEXT_PUBLIC_APP_URL);
	if (!plan.ok) {
		captureWebhookError(new Error("Unsendable auth email hook payload"), {
			message: "[AUTH_EMAIL] Payload rejected",
			reason: plan.reason,
		});
		return hookError(400, "Unsupported email request");
	}

	// The webhook id is stable across Supabase's retries of one request, so it
	// keys Resend's idempotency and a retry never sends the same email twice.
	const webhookId = req.headers.get("webhook-id") ?? "";
	for (const [index, message] of plan.messages.entries()) {
		const { subject, html } = render(message);
		const result = await sendEmail({
			to: [message.to],
			subject,
			html,
			tags: [
				{ name: "category", value: "auth" },
				{ name: "type", value: message.kind },
			],
			idempotencyKey: `auth-email/${webhookId}/${index}`,
		});
		if (!result.success) {
			captureWebhookError(new Error(result.error), {
				message: "[AUTH_EMAIL] Failed to send email",
				email_action_type: plan.actionType,
				kind: message.kind,
			});
			return hookError(500, "Failed to send email");
		}
		logEvent("[AUTH_EMAIL] Sent auth email", {
			email_action_type: plan.actionType,
			kind: message.kind,
			resend_id: result.id,
		});
	}

	return new Response(JSON.stringify({}), {
		status: 200,
		headers: JSON_HEADERS,
	});
});
