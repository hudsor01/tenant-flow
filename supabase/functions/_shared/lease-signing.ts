// Shared lease e-signature helpers: data fetch, single-use token hashing, the
// signed-PDF renderer inputs, and the finalize step (render -> upload -> atomic
// activation flip -> notify). Used by the lease-signature (owner) and
// sign-lease-token (tenant) Edge Functions.

import type { SupabaseClient } from "@supabase/supabase-js";
import { wrapEmailLayout } from "./email-layout.ts";
import { captureWebhookError } from "./errors.ts";
import { escapeHtml } from "./escape-html.ts";
import { type LeasePdfData, renderLeasePdf } from "./lease-pdf.ts";
import { sendEmail, uint8ToBase64 } from "./resend.ts";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Closest-hop client IP (mirrors _shared/rate-limit.ts getClientIp). The first
 *  x-forwarded-for segment is attacker-controlled, so the LAST is used. */
export function clientIp(req: Request): string {
	const cf = req.headers.get("cf-connecting-ip");
	if (cf) return cf;
	const xff = req.headers.get("x-forwarded-for");
	if (xff) {
		const parts = xff
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		if (parts.length > 0) return parts[parts.length - 1];
	}
	return "unknown";
}

export function clientUserAgent(req: Request): string {
	return (req.headers.get("user-agent") ?? "").slice(0, 512) || "unknown";
}

/** Storage bucket + path convention for the finalized signed lease PDF. */
export const SIGNED_LEASE_BUCKET = "tenant-documents";
export function signedLeasePath(leaseId: string): string {
	return `lease/${leaseId}/signed-lease.pdf`;
}

/** Generate a 256-bit single-use token and its SHA-256 hex hash. */
export async function generateSigningToken(): Promise<{
	raw: string;
	hash: string;
}> {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	const raw = base64Url(bytes);
	return { raw, hash: await sha256Hex(raw) };
}

export async function sha256Hex(input: string | Uint8Array): Promise<string> {
	const data =
		typeof input === "string" ? new TextEncoder().encode(input) : input;
	const digest = await crypto.subtle.digest("SHA-256", data);
	return [...new Uint8Array(digest)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function base64Url(bytes: Uint8Array): string {
	let binary = "";
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export interface LeaseSigningRecord {
	leaseId: string;
	ownerUserId: string;
	ownerName: string;
	ownerEmail: string;
	tenantName: string;
	tenantEmail: string;
	propertyLabel: string;
	unitNumber: string;
	startDate: string;
	endDate: string;
	rent: string;
	securityDeposit: string;
	governingState: string | null;
	landlordNoticeAddress: string | null;
	immediateFamilyMembers: string | null;
	leaseStatus: string;
	signedDocumentPath: string | null;
	ownerSignedAt: string | null;
	ownerSignatureIp: string | null;
	ownerSignatureUserAgent: string | null;
	ownerSignatureMethod: string | null;
	tenantSignedAt: string | null;
	tenantSignatureIp: string | null;
	tenantSignatureUserAgent: string | null;
	tenantSignatureMethod: string | null;
	tenantSignatureName: string | null;
}

function formatDate(value: unknown): string {
	if (typeof value !== "string" || !value) return "N/A";
	const d = new Date(`${value}T00:00:00Z`);
	if (Number.isNaN(d.getTime())) return "N/A";
	return d.toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
		timeZone: "UTC",
	});
}

// Exported for unit testing. Formats a dollar value as 2-decimal USD to match
// the signing page's formatCurrency (e.g. 1500 -> "$1,500.00", 1500.5 ->
// "$1,500.50"). Values are already dollars — no cents conversion.
export function formatMoney(value: unknown): string {
	if (value == null || value === "") return "N/A";
	const n = Number(value);
	if (Number.isNaN(n)) return "N/A";
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(n);
}

/**
 * Fetch everything needed to render the lease PDF and email the parties.
 * Returns null when the lease does not exist.
 */
export async function fetchLeaseSigningData(
	supabase: SupabaseClient,
	leaseId: string,
): Promise<LeaseSigningRecord | null> {
	const { data: lease, error } = await supabase
		.from("leases")
		.select(
			`
      id, owner_user_id, primary_tenant_id, unit_id,
      start_date, end_date, rent_amount, security_deposit, governing_state,
      landlord_notice_address, immediate_family_members, lease_status, signed_document_path,
      owner_signed_at, owner_signature_ip, owner_signature_user_agent, owner_signature_method,
      tenant_signed_at, tenant_signature_ip, tenant_signature_user_agent, tenant_signature_method,
      tenant_signature_name,
      units ( unit_number, properties ( name, address_line1, city, state, postal_code ) ),
      tenants:primary_tenant_id ( first_name, last_name, name, email )
    `,
		)
		.eq("id", leaseId)
		.maybeSingle();

	if (error || !lease) return null;

	const { data: owner } = await supabase
		.from("users")
		.select("full_name, email")
		.eq("id", lease.owner_user_id)
		.maybeSingle();

	const unit = Array.isArray(lease.units) ? lease.units[0] : lease.units;
	const property =
		unit && (Array.isArray(unit.properties) ? unit.properties[0] : unit.properties);
	const tenant = Array.isArray(lease.tenants) ? lease.tenants[0] : lease.tenants;

	const propertyLabel =
		[
			property?.name,
			property?.address_line1,
			[property?.city, property?.state, property?.postal_code]
				.filter(Boolean)
				.join(", "),
		]
			.filter(Boolean)
			.join(" - ") || "Property";

	const tenantName =
		(tenant?.name as string | null) ||
		`${tenant?.first_name ?? ""} ${tenant?.last_name ?? ""}`.trim() ||
		"Tenant";

	return {
		leaseId: lease.id,
		ownerUserId: lease.owner_user_id,
		ownerName: (owner?.full_name as string | null) ?? "Property Owner",
		ownerEmail: (owner?.email as string | null) ?? "",
		tenantName,
		tenantEmail: (tenant?.email as string | null) ?? "",
		propertyLabel,
		unitNumber: (unit?.unit_number as string | null) ?? "",
		startDate: formatDate(lease.start_date),
		endDate: formatDate(lease.end_date),
		rent: formatMoney(lease.rent_amount),
		securityDeposit: formatMoney(lease.security_deposit),
		governingState: (lease.governing_state as string | null) ?? null,
		landlordNoticeAddress: (lease.landlord_notice_address as string | null) ?? null,
		immediateFamilyMembers:
			(lease.immediate_family_members as string | null) ?? null,
		leaseStatus: lease.lease_status,
		signedDocumentPath: lease.signed_document_path,
		ownerSignedAt: lease.owner_signed_at,
		ownerSignatureIp: lease.owner_signature_ip,
		ownerSignatureUserAgent: lease.owner_signature_user_agent,
		ownerSignatureMethod: lease.owner_signature_method,
		tenantSignedAt: lease.tenant_signed_at,
		tenantSignatureIp: lease.tenant_signature_ip,
		tenantSignatureUserAgent: lease.tenant_signature_user_agent,
		tenantSignatureMethod: lease.tenant_signature_method,
		tenantSignatureName: lease.tenant_signature_name,
	};
}

/** Map a lease record to the PDF renderer input. `signed=false` forces an
 *  unsigned preview regardless of stored signature state. */
export function buildLeasePdfData(
	record: LeaseSigningRecord,
	opts: { signed: boolean },
): LeasePdfData {
	return {
		leaseId: record.leaseId,
		propertyLabel: record.propertyLabel,
		unitNumber: record.unitNumber,
		startDate: record.startDate,
		endDate: record.endDate,
		rent: record.rent,
		securityDeposit: record.securityDeposit,
		governingState: record.governingState,
		landlordNoticeAddress: record.landlordNoticeAddress,
		immediateFamilyMembers: record.immediateFamilyMembers,
		owner: {
			label: "Property Owner",
			name: record.ownerName,
			email: record.ownerEmail,
			signedAt: opts.signed ? record.ownerSignedAt : null,
			ip: record.ownerSignatureIp,
			userAgent: record.ownerSignatureUserAgent,
			method: record.ownerSignatureMethod,
		},
		tenant: {
			label: "Tenant",
			// The tenant's typed legal name IS their signature; prefer it over the
			// landlord-entered record name when present.
			name: record.tenantSignatureName ?? record.tenantName,
			email: record.tenantEmail,
			signedAt: opts.signed ? record.tenantSignedAt : null,
			ip: record.tenantSignatureIp,
			userAgent: record.tenantSignatureUserAgent,
			method: record.tenantSignatureMethod,
		},
	};
}

function buildSignedLeaseEmail(record: LeaseSigningRecord): string {
	const body = `
<h1 style="margin:0 0 16px;font-size:20px;color:#18181b;">Your lease is fully signed</h1>
<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6;">
  Hi ${escapeHtml(record.tenantName)}, all parties have signed the residential lease
  agreement for <strong>${escapeHtml(record.propertyLabel)}</strong>. A copy of the
  fully executed lease is attached to this email for your records.
</p>
<p style="margin:0 0 8px;font-size:13px;color:#71717a;line-height:1.6;">
  Please keep this copy for your records. If you have any questions about the lease,
  contact your landlord directly.
</p>`;
	return wrapEmailLayout(body);
}

/** Reset the one-time email claim so a later finalize retry re-attempts the
 *  send. Called only after a claimed send fails (or its bytes can't be read). */
async function releaseSignedLeaseEmailClaim(
	supabase: SupabaseClient,
	leaseId: string,
): Promise<void> {
	await supabase
		.from("leases")
		.update({ signed_lease_emailed_at: null })
		.eq("id", leaseId);
}

/**
 * Ensure-email step: email the tenant the executed PDF exactly once. Atomically
 * claims the send (null -> now() on signed_lease_emailed_at) so concurrent
 * finalizes never double-email; on send failure the claim is released so a
 * later retry re-attempts. `renderedBytes` is the just-rendered buffer when the
 * PDF was produced in this call; otherwise the finalized PDF is pulled back from
 * storage (the retry path).
 */
async function ensureSignedLeaseEmail(
	supabase: SupabaseClient,
	leaseId: string,
	record: LeaseSigningRecord,
	signedPath: string,
	renderedBytes: Uint8Array | null,
): Promise<void> {
	if (!EMAIL_RE.test(record.tenantEmail)) return;

	// Atomic single-claim: only the updater that flips signed_lease_emailed_at
	// from null proceeds. A concurrent finalize (sign-time + owner retry) that
	// loses the race matches zero rows and returns without emailing.
	const { data: claimed, error: claimError } = await supabase
		.from("leases")
		.update({ signed_lease_emailed_at: new Date().toISOString() })
		.eq("id", leaseId)
		.is("signed_lease_emailed_at", null)
		.select("id");
	if (claimError) {
		captureWebhookError(claimError, {
			action: "finalize_email_claim",
			lease_id: leaseId,
		});
		return;
	}
	if (!claimed || claimed.length === 0) return;

	let pdfBytes = renderedBytes;
	if (!pdfBytes) {
		const { data: blob, error: downloadError } = await supabase.storage
			.from(SIGNED_LEASE_BUCKET)
			.download(signedPath);
		if (downloadError || !blob) {
			await releaseSignedLeaseEmailClaim(supabase, leaseId);
			captureWebhookError(
				downloadError ??
					new Error("Signed lease PDF download returned no data"),
				{ action: "finalize_email_download", lease_id: leaseId },
			);
			return;
		}
		pdfBytes = new Uint8Array(await blob.arrayBuffer());
	}

	const emailResult = await sendEmail({
		to: [record.tenantEmail],
		subject: "Your signed lease agreement",
		html: buildSignedLeaseEmail(record),
		attachments: [
			{
				filename: `lease-${leaseId}-signed.pdf`,
				content: uint8ToBase64(pdfBytes),
			},
		],
		tags: [{ name: "type", value: "lease_signed_copy" }],
		idempotencyKey: `signed-lease-email-${leaseId}`,
	});
	if (!emailResult.success) {
		// Release the claim so a later finalize retry (SIGN-02) re-sends.
		await releaseSignedLeaseEmailClaim(supabase, leaseId);
		captureWebhookError(new Error("Signed lease email send failed"), {
			message: emailResult.error,
			action: "finalize_email_send",
			lease_id: leaseId,
		});
	}
}

/**
 * Finalize a fully-signed lease. Two idempotent steps, safe to re-run:
 *   1. ensure-PDF   — render the signed PDF -> upload -> write the pointer
 *                     (guarded by `.is('signed_document_path', null)`), once.
 *   2. ensure-email — email the tenant the executed PDF exactly once (claim-
 *                     guarded on signed_lease_emailed_at).
 * Activation (lease_status -> active) and the owner notification happen
 * atomically INSIDE the signing RPCs, so this whole step is best-effort: a
 * failure here never affects the already-durable activation, and any later
 * finalize (sign-time callers, or the owner-triggered `finalize` action) heals
 * a transient render/upload/email outage. The PDF is fully determined by the
 * lease data + signatures, so re-rendering is deterministic.
 */
export async function finalizeSignedLease(
	supabase: SupabaseClient,
	leaseId: string,
): Promise<void> {
	const record = await fetchLeaseSigningData(supabase, leaseId);
	if (!record || !record.ownerSignedAt || !record.tenantSignedAt) {
		return;
	}

	// Step 1 — ensure the signed PDF exists. Keep the freshly-rendered bytes so
	// the email step can attach them without a storage round-trip on first pass.
	let renderedBytes: Uint8Array | null = null;
	let signedPath = record.signedDocumentPath;
	if (!signedPath) {
		try {
			const bytes = await renderLeasePdf(
				buildLeasePdfData(record, { signed: true }),
			);
			const hash = await sha256Hex(bytes);
			const path = signedLeasePath(leaseId);
			const { error: uploadError } = await supabase.storage
				.from(SIGNED_LEASE_BUCKET)
				.upload(path, bytes, { contentType: "application/pdf", upsert: true });
			if (uploadError) {
				captureWebhookError(new Error("Signed lease PDF upload failed"), {
					message: uploadError.message,
					action: "finalize_upload",
					lease_id: leaseId,
				});
				return;
			}
			// Only the first finalize writes the pointer (idempotent under retries).
			await supabase
				.from("leases")
				.update({ signed_document_path: path, signed_document_hash: hash })
				.eq("id", leaseId)
				.is("signed_document_path", null);
			renderedBytes = bytes;
			signedPath = path;
		} catch (err) {
			captureWebhookError(err, {
				action: "finalize_render",
				lease_id: leaseId,
			});
			return;
		}
	}

	// Step 2 — ensure the tenant has been emailed the executed copy exactly once.
	await ensureSignedLeaseEmail(
		supabase,
		leaseId,
		record,
		signedPath,
		renderedBytes,
	);
}
