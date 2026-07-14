// Shared Resend email helper for Supabase Edge Functions
// Sends emails via Resend REST API using fetch().
// NEVER throws -- all errors returned as { success: false, error: string }.
// Logs errors via captureWebhookError (Sentry + structured console.error).

import { captureWebhookError } from "./errors.ts";

export interface SendEmailParams {
	to: string[];
	subject: string;
	html: string;
	tags?: Array<{ name: string; value: string }>;
	idempotencyKey?: string;
	/** Base64-encoded file attachments (e.g. a signed lease PDF). */
	attachments?: Array<{ filename: string; content: string }>;
}

export type SendEmailResult =
	| { success: true; id: string }
	| { success: false; error: string };

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_ADDRESS = "TenantFlow <noreply@tenantflow.app>";

/**
 * Base64-encode bytes in fixed-size chunks. `btoa(String.fromCharCode(...bytes))`
 * spreads the ENTIRE array onto the call stack and overflows on large buffers
 * (a signed lease PDF is tens of KB); accumulate the binary string in bounded
 * 32KB slices instead, which stays well under the argument-count limit.
 */
export function uint8ToBase64(bytes: Uint8Array): string {
	let binary = "";
	const CHUNK = 0x8000;
	for (let i = 0; i < bytes.length; i += CHUNK) {
		binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
	}
	return btoa(binary);
}

/**
 * Sends an email via the Resend REST API.
 * Returns a result object -- never throws.
 * Resend automatically checks its suppression list on every send;
 * suppressed recipients get a suppressed status, not an error.
 */
export async function sendEmail(
	params: SendEmailParams,
): Promise<SendEmailResult> {
	try {
		const apiKey = Deno.env.get("RESEND_API_KEY");

		if (!apiKey) {
			captureWebhookError(new Error("RESEND_API_KEY not configured"), {
				message: "[RESEND_ERROR] RESEND_API_KEY not configured",
			});
			return { success: false, error: "RESEND_API_KEY not configured" };
		}

		const body: Record<string, unknown> = {
			from: FROM_ADDRESS,
			to: params.to,
			subject: params.subject,
			html: params.html,
		};

		if (params.tags && params.tags.length > 0) {
			body.tags = params.tags;
		}

		if (params.attachments && params.attachments.length > 0) {
			body.attachments = params.attachments;
		}

		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		};

		if (params.idempotencyKey) {
			headers["Idempotency-Key"] = params.idempotencyKey;
		}

		const res = await fetch(RESEND_API_URL, {
			method: "POST",
			headers,
			body: JSON.stringify(body),
		});

		if (!res.ok) {
			const errBody = await res.text().catch(() => res.statusText);
			captureWebhookError(new Error(`Resend API error ${res.status}`), {
				message: "[RESEND_ERROR] Resend API non-OK response",
				status: res.status,
				err_body: errBody,
				recipients: params.to,
				subject: params.subject,
			});
			return {
				success: false,
				error: `Resend API error ${res.status}: ${errBody}`,
			};
		}

		const data = (await res.json()) as { id: string };
		return { success: true, id: data.id };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		captureWebhookError(err, {
			message: "[RESEND_ERROR] Unexpected error",
			recipients: params.to,
			subject: params.subject,
		});
		return { success: false, error: message };
	}
}
