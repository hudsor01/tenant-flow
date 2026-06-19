// Shared lease e-signature helpers: data fetch, single-use token hashing, the
// signed-PDF renderer inputs, and the finalize step (render -> upload -> atomic
// activation flip -> notify). Used by the lease-signature (owner) and
// sign-lease-token (tenant) Edge Functions.

import type { SupabaseClient } from "@supabase/supabase-js";
import { captureWebhookError } from "./errors.ts";
import { type LeasePdfData, renderLeasePdf } from "./lease-pdf.ts";

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

function formatMoney(value: unknown): string {
	if (value == null || value === "") return "N/A";
	const n = Number(value);
	if (Number.isNaN(n)) return "N/A";
	return `$${n.toLocaleString("en-US")}`;
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

/**
 * Render + store the finalized signed PDF. Activation (lease_status -> active)
 * and the owner notification happen atomically INSIDE the signing RPCs, so this
 * step is best-effort and idempotent: it is a no-op once the PDF pointer is set,
 * and a failure here never affects the already-durable activation. The PDF can
 * be regenerated later (the lease data + signatures fully determine it).
 */
export async function finalizeSignedLease(
	supabase: SupabaseClient,
	leaseId: string,
): Promise<void> {
	const record = await fetchLeaseSigningData(supabase, leaseId);
	if (
		!record ||
		!record.ownerSignedAt ||
		!record.tenantSignedAt ||
		record.signedDocumentPath
	) {
		return;
	}

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
	} catch (err) {
		captureWebhookError(err, { action: "finalize_render", lease_id: leaseId });
	}
}
