// Supabase Edge Function: sign-lease-token
// PUBLIC (verify_jwt = false) — the tenant has no account. The single-use token
// in the /sign/<token> URL IS the credential. Three actions:
//   context  — read-only render context for the signing page (does not consume)
//   document — render the unsigned lease PDF (tenant PII) for a CURRENTLY-VALID
//              token only (same validity gate as context); rate-limited
//   sign     — record the tenant signature; finalize the lease if both signed
//
// Auth model: the token is high-entropy (256-bit) and stored only as a SHA-256
// hash; this function looks the lease up BY that hash via SECURITY DEFINER RPCs.
// Rate-limited per IP. No raw error details are leaked to the client.

import {
	getCorsHeaders,
	getJsonHeaders,
	handleCorsOptions,
} from "../_shared/cors.ts";
import { validateEnv } from "../_shared/env.ts";
import { errorResponse } from "../_shared/errors.ts";
import { renderLeasePdf } from "../_shared/lease-pdf.ts";
import {
	buildLeasePdfData,
	clientIp,
	clientUserAgent,
	fetchLeaseSigningData,
	finalizeSignedLease,
	sha256Hex,
} from "../_shared/lease-signing.ts";
import { rateLimit } from "../_shared/rate-limit.ts";
import { createAdminClient } from "../_shared/supabase-client.ts";

interface SigningContextRow {
	valid: boolean;
	reason: string | null;
	lease_id: string | null;
	lease_status: string | null;
	tenant_signed: boolean;
	owner_signed: boolean;
	tenant_name: string | null;
	owner_name: string | null;
	property_label: string | null;
	unit_number: string | null;
	start_date: string | null;
	end_date: string | null;
	rent_amount: number | null;
}

Deno.serve(async (req: Request) => {
	const optionsResponse = handleCorsOptions(req);
	if (optionsResponse) return optionsResponse;

	try {
		const env = validateEnv({
			required: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
		});
		const supabase = createAdminClient(
			env["SUPABASE_URL"],
			env["SUPABASE_SERVICE_ROLE_KEY"],
		);

		const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
		const action = body.action as string;
		const token = body.token as string;

		if (!token || typeof token !== "string") {
			return new Response(JSON.stringify({ error: "Missing token" }), {
				status: 400,
				headers: getJsonHeaders(req),
			});
		}
		const tokenHash = await sha256Hex(token);

		// ── context ──────────────────────────────────────────────────────────────
		if (action === "context") {
			// Keyed by the token hash, not IP: legitimate context fetches come from
			// the Next.js server (one shared egress IP), so one tenant's loads must
			// not exhaust another's bucket. Per-session 60/min still bounds repeated
			// hits on any single token against the multi-table-join RPC.
			const limited = await rateLimit(req, {
				maxRequests: 60,
				windowMs: 60_000,
				prefix: "lease-context",
				identifier: tokenHash,
			});
			if (limited) return limited;

			const { data, error } = await supabase.rpc("get_lease_signing_context", {
				p_token_hash: tokenHash,
			});
			if (error) {
				return errorResponse(req, 500, error, { action: "context" });
			}
			const row = (data as SigningContextRow[] | null)?.[0];
			if (!row) {
				return new Response(
					JSON.stringify({ valid: false, reason: "invalid_token" }),
					{ status: 200, headers: getJsonHeaders(req) },
				);
			}
			// Only expose lease details for a usable token; otherwise return the
			// reason alone so an invalid/used token can't enumerate lease data.
			if (!row.valid) {
				return new Response(
					JSON.stringify({ valid: false, reason: row.reason }),
					{ status: 200, headers: getJsonHeaders(req) },
				);
			}
			return new Response(
				JSON.stringify({
					valid: true,
					reason: null,
					lease: {
						tenant_name: row.tenant_name,
						owner_name: row.owner_name,
						property_label: row.property_label,
						unit_number: row.unit_number,
						start_date: row.start_date,
						end_date: row.end_date,
						rent_amount: row.rent_amount,
					},
				}),
				{ status: 200, headers: getJsonHeaders(req) },
			);
		}

		// ── document ─────────────────────────────────────────────────────────────
		// Renders the unsigned lease PDF so the tenant can READ the full terms
		// before consenting. Token-authenticated, read-only, rate-limited.
		if (action === "document") {
			const limited = await rateLimit(req, {
				maxRequests: 30,
				windowMs: 60_000,
				prefix: "lease-document",
			});
			if (limited) return limited;

			const { data, error } = await supabase.rpc("get_lease_signing_context", {
				p_token_hash: tokenHash,
			});
			if (error) {
				return errorResponse(req, 500, error, { action: "document" });
			}
			const row = (data as SigningContextRow[] | null)?.[0];
			// Render only for a currently-valid signing token (mirrors `context`):
			// a used / expired / revoked / already-signed link must not keep
			// serving the lease PDF (tenant PII) to a direct caller.
			if (!row || !row.valid || !row.lease_id) {
				return new Response(JSON.stringify({ error: "Not found" }), {
					status: 404,
					headers: getJsonHeaders(req),
				});
			}
			const record = await fetchLeaseSigningData(supabase, row.lease_id);
			if (!record) {
				return new Response(JSON.stringify({ error: "Not found" }), {
					status: 404,
					headers: getJsonHeaders(req),
				});
			}
			const bytes = await renderLeasePdf(
				buildLeasePdfData(record, { signed: false }),
			);
			return new Response(bytes, {
				status: 200,
				headers: {
					...getCorsHeaders(req),
					"Content-Type": "application/pdf",
					"Content-Disposition": `inline; filename="lease-${row.lease_id}.pdf"`,
				},
			});
		}

		// ── sign ───────────────────────────────────────────────────────────────
		if (action === "sign") {
			// Rate-limit only the write action: it is called from the tenant's
			// browser (real per-IP), unlike `context` which is fetched server-side
			// from a shared egress IP and must not share one bucket across tenants.
			const limited = await rateLimit(req, {
				maxRequests: 10,
				windowMs: 60_000,
				prefix: "lease-sign",
			});
			if (limited) return limited;

			const consent = body.consent === true;
			// Cap the public-endpoint name (mirrors clientUserAgent's slice) so an
			// arbitrarily large string can't be persisted + re-rendered into the PDF.
			const signerName =
				typeof body.signerName === "string"
					? body.signerName.trim().slice(0, 200)
					: "";
			if (!consent || !signerName) {
				return new Response(
					JSON.stringify({
						success: false,
						reason: "consent_and_name_required",
					}),
					{ status: 400, headers: getJsonHeaders(req) },
				);
			}

			const { data, error } = await supabase.rpc("sign_lease_with_token", {
				p_token_hash: tokenHash,
				p_signature_ip: clientIp(req),
				p_signature_user_agent: clientUserAgent(req),
				p_signed_at: new Date().toISOString(),
				p_signer_name: signerName,
			});
			if (error) {
				return errorResponse(req, 500, error, { action: "sign" });
			}

			const result = (data as Array<{
				success: boolean;
				both_signed: boolean;
				lease_id: string | null;
				error_message: string | null;
			}> | null)?.[0];

			if (!result?.success) {
				return new Response(
					JSON.stringify({
						success: false,
						reason: result?.error_message ?? "invalid_token",
					}),
					{ status: 200, headers: getJsonHeaders(req) },
				);
			}

			if (result.both_signed && result.lease_id) {
				await finalizeSignedLease(supabase, result.lease_id);
			}

			return new Response(
				JSON.stringify({ success: true, both_signed: result.both_signed }),
				{ status: 200, headers: getJsonHeaders(req) },
			);
		}

		return new Response(JSON.stringify({ error: "Unknown action" }), {
			status: 400,
			headers: getJsonHeaders(req),
		});
	} catch (err) {
		return errorResponse(req, 500, err, { action: "sign-lease-token" });
	}
});
