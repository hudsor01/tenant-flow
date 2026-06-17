// DocuSeal Inbound Webhook Edge Function
// Processes DocuSeal signature events and updates lease status atomically.
// Server-to-server only — HMAC-SHA256 signature verification required.
// On failure: return 500 so DocuSeal retries.
// On duplicate: return 200 immediately (idempotent via existing timestamp checks).
//
// Events handled:
//   form.completed       — individual party has signed (updates owner_signed_at or tenant_signed_at)
//   submission.completed — all parties signed (flips lease_status to active + inserts notification)
//
// Payload shape (current DocuSeal): { event_type, timestamp, data: {...} }.
//   form.completed       -> data = the submitter: { role, external_id, completed_at,
//                            submission: { id, metadata, combined_document_url } }
//   submission.completed -> data = the submission: { id, status, metadata,
//                            combined_document_url, documents: [{ name, url }] }
//
// Signature (current DocuSeal): X-Docuseal-Signature: `<timestamp>.<hex_hmac>` where the
//   HMAC-SHA256 is computed over `<timestamp>.<raw_body>` with the raw `whsec_...` secret.
//   Legacy self-hosted builds sign plain hex of the raw body — both are accepted below.

import type { SupabaseClient } from "@supabase/supabase-js";
import { validateEnv } from "../_shared/env.ts";
import { errorResponse, logEvent } from "../_shared/errors.ts";
import { createAdminClient } from "../_shared/supabase-client.ts";

interface SubmissionRef {
	id?: number;
	status?: string;
	combined_document_url?: string;
	documents?: Array<{ name: string; url: string }>;
	// Create-time submission metadata re-surfaces under `variables` in current
	// DocuSeal webhook payloads; `metadata` is kept for older builds.
	variables?: { lease_id?: string };
	metadata?: { lease_id?: string };
}

interface FormCompletedData {
	id?: number;
	role?: string;
	external_id?: string | null;
	email?: string;
	completed_at?: string;
	variables?: { lease_id?: string };
	metadata?: { lease_id?: string };
	submission?: SubmissionRef;
}

type SubmissionCompletedData = SubmissionRef;

const leaseIdFrom = (
	s: { variables?: { lease_id?: string }; metadata?: { lease_id?: string } } | undefined,
): string | undefined => s?.variables?.lease_id ?? s?.metadata?.lease_id;

/**
 * Activate the lease + notify the owner, exactly once. The conditional UPDATE
 * (`.neq lease_status active`) makes activation idempotent, and the notification
 * is inserted only when this call is the one that flipped the row — so repeated
 * form.completed/submission.completed deliveries never double-notify.
 */
async function activateLease(
	supabase: SupabaseClient,
	leaseId: string,
	ownerUserId: string,
): Promise<void> {
	const { data: flipped, error } = await supabase
		.from("leases")
		.update({ lease_status: "active" })
		.eq("id", leaseId)
		.neq("lease_status", "active")
		.select("id");
	if (error) throw new Error(`Failed to activate lease: ${error.message}`);
	if (!flipped || flipped.length === 0) return; // already active — no duplicate notify

	// notification_type must be 'lease' per notifications_notification_type_check.
	const { error: notifError } = await supabase.from("notifications").insert({
		user_id: ownerUserId,
		title: "Lease fully signed",
		message: "Your lease has been signed by all parties and is now active.",
		notification_type: "lease",
	});
	if (notifError)
		throw new Error(`Failed to insert owner notification: ${notifError.message}`);
	logEvent("Lease activated + owner notified", { lease_id: leaseId });
}

async function lookupLease(
	supabase: SupabaseClient,
	columns: string,
	submissionId: number | undefined,
	leaseId: string | undefined,
): Promise<unknown> {
	if (submissionId != null) {
		const { data, error } = await supabase
			.from("leases")
			.select(columns)
			.eq("docuseal_submission_id", String(submissionId))
			.maybeSingle();
		if (error)
			throw new Error(
				`Database error querying lease by submission_id: ${error.message}`,
			);
		if (data) return data;
	}
	// Fall back to metadata.lease_id for submissions created without/before the id write.
	if (leaseId) {
		const { data, error } = await supabase
			.from("leases")
			.select(columns)
			.eq("id", leaseId)
			.maybeSingle();
		if (error)
			throw new Error(
				`Database error querying lease by metadata.lease_id: ${error.message}`,
			);
		if (data) return data;
	}
	return null;
}

async function handleFormCompleted(
	supabase: SupabaseClient,
	data: FormCompletedData,
): Promise<void> {
	const submissionId = data.submission?.id;
	const leaseId = leaseIdFrom(data.submission) ?? leaseIdFrom(data);
	const role = data.role ?? "";
	const externalId = data.external_id ?? "";
	const completed_at = data.completed_at;

	const lease = (await lookupLease(
		supabase,
		"id, lease_status, owner_signed_at, tenant_signed_at, owner_user_id",
		submissionId,
		leaseId,
	)) as {
		id: string;
		owner_signed_at: string | null;
		tenant_signed_at: string | null;
		owner_user_id: string;
	} | null;

	// Not our document; ignore gracefully (no 500 so DocuSeal stops retrying).
	if (!lease) {
		logEvent("Lease not found for form.completed event — ignoring", {
			submission_id: submissionId ?? null,
			metadata_lease_id: leaseId ?? null,
		});
		return;
	}

	// Prefer the stable external_id ('owner'/'tenant' set on submission create);
	// fall back to the role label for submissions created before external_id.
	const roleLower = role.toLowerCase();
	const isOwner = externalId === "owner" || roleLower.includes("owner");
	const isTenant = externalId === "tenant" || roleLower.includes("tenant");
	const signedAt = completed_at ?? new Date().toISOString();

	if (isOwner) {
		if (lease.owner_signed_at) {
			logEvent("owner_signed_at already set — duplicate delivery, skipping", {
				lease_id: lease.id,
			});
			return;
		}
		const { error: updateError } = await supabase
			.from("leases")
			.update({ owner_signed_at: signedAt, owner_signature_method: "docuseal" })
			.eq("id", lease.id);
		if (updateError)
			throw new Error(`Failed to update owner signature: ${updateError.message}`);
		logEvent("Owner signature recorded", { lease_id: lease.id });
		// If the tenant had already signed, both parties are done -> activate.
		// (submission.completed won't fire when the owner signs in-app, so order-
		// independent activation has to happen here too.)
		if (lease.tenant_signed_at) {
			await activateLease(supabase, lease.id, lease.owner_user_id);
		}
	} else if (isTenant) {
		if (lease.tenant_signed_at) {
			logEvent("tenant_signed_at already set — duplicate delivery, skipping", {
				lease_id: lease.id,
			});
			return;
		}
		const { error: updateError } = await supabase
			.from("leases")
			.update({
				tenant_signed_at: signedAt,
				tenant_signature_method: "docuseal",
			})
			.eq("id", lease.id);
		if (updateError)
			throw new Error(
				`Failed to update tenant signature: ${updateError.message}`,
			);
		logEvent("Tenant signature recorded", { lease_id: lease.id });
		if (lease.owner_signed_at) {
			await activateLease(supabase, lease.id, lease.owner_user_id);
		}
	} else {
		logEvent("Unrecognised role — no signature update performed", {
			role,
			external_id: externalId,
		});
	}
}

async function handleSubmissionCompleted(
	supabase: SupabaseClient,
	data: SubmissionCompletedData,
): Promise<void> {
	const submissionId = data.id;
	const leaseId = leaseIdFrom(data);

	const lease = (await lookupLease(
		supabase,
		"id, lease_status, owner_user_id, docuseal_document_url",
		submissionId,
		leaseId,
	)) as {
		id: string;
		lease_status: string;
		owner_user_id: string;
		docuseal_document_url: string | null;
	} | null;

	if (!lease) {
		logEvent("Lease not found for submission.completed event — ignoring", {
			submission_id: submissionId ?? null,
			metadata_lease_id: leaseId ?? null,
		});
		return;
	}

	// Persist the signed-document URL if missing (heals on redelivery). NOTE:
	// combined_document_url is a possibly short-lived DocuSeal blob URL — the
	// canonical reference is docuseal_submission_id; refresh via the API rather
	// than trusting this long-term.
	const signedDocUrl =
		(typeof data.combined_document_url === "string"
			? data.combined_document_url
			: null) ??
		(typeof data.documents?.[0]?.url === "string"
			? data.documents[0].url
			: null);
	if (signedDocUrl && !lease.docuseal_document_url) {
		const { error: urlError } = await supabase
			.from("leases")
			.update({ docuseal_document_url: signedDocUrl })
			.eq("id", lease.id);
		if (urlError)
			throw new Error(
				`Failed to persist signed document URL: ${urlError.message}`,
			);
	}

	// submission.completed means every DocuSeal submitter finished. Activate +
	// notify exactly once (idempotent on redelivery and vs the form.completed path).
	await activateLease(supabase, lease.id, lease.owner_user_id);
}

const toHex = (buf: ArrayBuffer): string =>
	Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

/**
 * Verify the DocuSeal webhook HMAC. Current DocuSeal sends
 * `X-Docuseal-Signature: <timestamp>.<hex>` and signs `<timestamp>.<raw_body>`
 * with the raw `whsec_...` secret. Older self-hosted builds sign plain hex of
 * the raw body. Both schemes are accepted (the signed payload differs only by
 * the `<timestamp>.` prefix). Returns true on a valid signature.
 */
async function verifySignature(
	header: string,
	rawBody: string,
	secret: string,
): Promise<boolean> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const dotIdx = header.indexOf(".");
	if (dotIdx > 0) {
		// New scheme: reject a stale/non-numeric timestamp (±5 min) BEFORE the HMAC
		// check — replay hardening per the DocuSeal webhook spec. A non-finite ts
		// fails closed (Math.abs(NaN) > 300 is false, so guard it explicitly).
		const ts = Number(header.slice(0, dotIdx));
		if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
			return false;
		}
	}
	// New scheme: `<timestamp>.<signature>` — sign `<timestamp>.<raw_body>`.
	// Legacy scheme: header is plain hex of the raw body.
	const candidates: Array<{ provided: string; signed: string }> =
		dotIdx > 0
			? [
					{
						provided: header.slice(dotIdx + 1),
						signed: `${header.slice(0, dotIdx)}.${rawBody}`,
					},
				]
			: [{ provided: header, signed: rawBody }];

	for (const { provided, signed } of candidates) {
		const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(signed));
		const expected = toHex(sig);
		const providedBytes = encoder.encode(provided);
		const expectedBytes = encoder.encode(expected);
		if (
			providedBytes.byteLength === expectedBytes.byteLength &&
			crypto.subtle.timingSafeEqual(providedBytes, expectedBytes)
		) {
			return true;
		}
	}
	return false;
}

Deno.serve(async (req: Request) => {
	try {
		const env = validateEnv({
			required: [
				"SUPABASE_URL",
				"SUPABASE_SERVICE_ROLE_KEY",
				"DOCUSEAL_WEBHOOK_SECRET",
			],
		});

		const webhookSecret = env["DOCUSEAL_WEBHOOK_SECRET"];

		// Require X-DocuSeal-Signature header
		const signature = req.headers.get("x-docuseal-signature");
		if (!signature) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Read raw body for HMAC verification (must read as text before JSON parse)
		let rawBody: string;
		try {
			rawBody = await req.text();
		} catch {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		if (!(await verifySignature(signature, rawBody, webhookSecret))) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		const supabase = createAdminClient(
			env["SUPABASE_URL"],
			env["SUPABASE_SERVICE_ROLE_KEY"],
		);

		let body: { event_type?: string; data?: Record<string, unknown> };
		try {
			body = JSON.parse(rawBody) as {
				event_type?: string;
				data?: Record<string, unknown>;
			};
		} catch {
			return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const eventType = body.event_type;
		const data = body.data ?? {};

		if (eventType === "form.completed") {
			await handleFormCompleted(supabase, data as FormCompletedData);
		} else if (eventType === "submission.completed") {
			await handleSubmissionCompleted(supabase, data as SubmissionCompletedData);
		} else {
			logEvent("Unhandled DocuSeal event", { event_type: eventType });
		}

		return new Response(JSON.stringify({ received: true }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (err) {
		// 500 signals DocuSeal to retry; errorResponse masks details + logs to Sentry.
		return errorResponse(req, 500, err, { action: "docuseal_webhook" });
	}
});
