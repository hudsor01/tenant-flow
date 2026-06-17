// Supabase Edge Function: lease-signature
// Owner-authenticated lease e-signature actions (replaces the DocuSeal function).
// JWT-authenticated via Bearer token. No third-party vendor: the owner signs
// in-app and the tenant signs via a single-use magic link emailed from here.
//
// Actions:
//   preview     — render the unsigned lease PDF (pdf-lib, no StirlingPDF)
//   send        — move draft -> pending_signature, issue a tenant signing token,
//                 email the tenant the /sign/<token> link
//   resend      — revoke the prior token, issue + email a fresh one
//   cancel      — revoke tokens and reset the lease to draft
//   sign-owner  — record the owner's in-app signature; finalize if both signed

import { validateBearerAuth } from "../_shared/auth.ts";
import {
	getCorsHeaders,
	getJsonHeaders,
	handleCorsOptions,
} from "../_shared/cors.ts";
import { validateEnv } from "../_shared/env.ts";
import { errorResponse } from "../_shared/errors.ts";
import { escapeHtml } from "../_shared/escape-html.ts";
import { wrapEmailLayout } from "../_shared/email-layout.ts";
import {
	buildLeasePdfData,
	clientIp,
	clientUserAgent,
	EMAIL_RE,
	fetchLeaseSigningData,
	finalizeSignedLease,
	generateSigningToken,
} from "../_shared/lease-signing.ts";
import { renderLeasePdf } from "../_shared/lease-pdf.ts";
import { sendEmail } from "../_shared/resend.ts";
import { createAdminClient } from "../_shared/supabase-client.ts";
import {
	checkTierEntitlement,
	GROWTH_AND_MAX_PLANS,
} from "../_shared/tier-gate.ts";

const TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;

interface OwnedLease {
	id: string;
	owner_user_id: string;
	lease_status: string;
}

async function loadOwnedLease(
	supabase: ReturnType<typeof createAdminClient>,
	leaseId: string,
	userId: string,
): Promise<OwnedLease | null> {
	const { data, error } = await supabase
		.from("leases")
		.select("id, owner_user_id, lease_status")
		.eq("id", leaseId)
		.maybeSingle();
	if (error || !data || data.owner_user_id !== userId) return null;
	return data as OwnedLease;
}

function buildSigningEmail(params: {
	tenantName: string;
	ownerName: string;
	propertyLabel: string;
	signUrl: string;
	message?: string;
}): string {
	const message = params.message?.trim();
	const body = `
<h1 style="margin:0 0 16px;font-size:20px;color:#18181b;">Please sign your lease</h1>
<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6;">
  ${escapeHtml(params.ownerName)} has sent you a residential lease agreement for
  <strong>${escapeHtml(params.propertyLabel)}</strong> to review and sign.
</p>
${
	message
		? `<p style="margin:0 0 16px;padding:12px 16px;background:#f4f4f5;border-radius:6px;font-size:14px;color:#3f3f46;line-height:1.6;">${escapeHtml(message)}</p>`
		: ""
}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;">
  <tr><td style="border-radius:6px;background:#2563eb;">
    <a href="${params.signUrl}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Review &amp; Sign Lease</a>
  </td></tr>
</table>
<p style="margin:0 0 8px;font-size:13px;color:#71717a;line-height:1.6;">
  This is a secure, single-use link tied to your email. It expires in 14 days.
  If you did not expect this, you can ignore this message.
</p>`;
	return wrapEmailLayout(body);
}

Deno.serve(async (req: Request) => {
	const optionsResponse = handleCorsOptions(req);
	if (optionsResponse) return optionsResponse;

	try {
		const env = validateEnv({
			required: [
				"SUPABASE_URL",
				"SUPABASE_SERVICE_ROLE_KEY",
				"NEXT_PUBLIC_APP_URL",
			],
		});
		const appUrl = env["NEXT_PUBLIC_APP_URL"].replace(/\/$/, "");
		const supabase = createAdminClient(
			env["SUPABASE_URL"],
			env["SUPABASE_SERVICE_ROLE_KEY"],
		);

		const auth = await validateBearerAuth(req, supabase);
		if ("error" in auth) {
			return new Response(JSON.stringify({ error: auth.error }), {
				status: auth.status,
				headers: getJsonHeaders(req),
			});
		}
		const { user } = auth;

		const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
		const action = body.action as string;
		const leaseId = body.leaseId as string;

		if (!leaseId || typeof leaseId !== "string") {
			return new Response(JSON.stringify({ error: "leaseId is required" }), {
				status: 400,
				headers: getJsonHeaders(req),
			});
		}

		// The e-sign tier gate is a feature gate (not lease-specific), so it runs
		// BEFORE the ownership check on send — a non-entitled owner gets the
		// upgrade prompt regardless of which lease they targeted.
		if (action === "send") {
			const entitlementBlock = await checkTierEntitlement(
				req,
				supabase,
				user.id,
				{
					feature: "esign",
					upgrade_source: "esign_gate",
					entitled_plans: GROWTH_AND_MAX_PLANS,
				},
			);
			if (entitlementBlock) return entitlementBlock;
		}

		const lease = await loadOwnedLease(supabase, leaseId, user.id);
		if (!lease) {
			return new Response(JSON.stringify({ error: "Forbidden" }), {
				status: 403,
				headers: getJsonHeaders(req),
			});
		}

		// ── preview ────────────────────────────────────────────────────────────
		if (action === "preview") {
			const record = await fetchLeaseSigningData(supabase, leaseId);
			if (!record) {
				return new Response(JSON.stringify({ error: "Lease not found" }), {
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
					"Content-Disposition": `attachment; filename="lease-preview-${leaseId}.pdf"`,
				},
			});
		}

		// ── send ─────────────────────────────────────────────────────────────────
		if (action === "send") {
			if (lease.lease_status !== "draft") {
				return new Response(
					JSON.stringify({
						error: "Only draft leases can be sent for signature",
					}),
					{ status: 400, headers: getJsonHeaders(req) },
				);
			}

			const missingFields = body.missingFields as
				| {
						immediate_family_members?: string;
						landlord_notice_address?: string;
				  }
				| undefined;
			const noticeAddress = missingFields?.landlord_notice_address?.trim() ?? "";
			if (!noticeAddress) {
				return new Response(
					JSON.stringify({ error: "Landlord notice address is required" }),
					{ status: 400, headers: getJsonHeaders(req) },
				);
			}

			const record = await fetchLeaseSigningData(supabase, leaseId);
			if (!record) {
				return new Response(JSON.stringify({ error: "Lease not found" }), {
					status: 404,
					headers: getJsonHeaders(req),
				});
			}
			if (!EMAIL_RE.test(record.tenantEmail)) {
				return new Response(
					JSON.stringify({
						error: "Tenant email is required to send for signature",
					}),
					{ status: 400, headers: getJsonHeaders(req) },
				);
			}

			// Persist the additional terms + move to pending_signature.
			const familyMembers =
				missingFields?.immediate_family_members?.trim() || null;
			const { error: updateError } = await supabase
				.from("leases")
				.update({
					landlord_notice_address: noticeAddress,
					immediate_family_members: familyMembers,
					lease_status: "pending_signature",
					sent_for_signature_at: new Date().toISOString(),
				})
				.eq("id", leaseId);
			if (updateError) {
				return errorResponse(req, 500, updateError, { action: "send_update" });
			}

			// Defensive: revoke any prior live tokens before issuing a fresh one.
			await supabase
				.from("lease_signing_tokens")
				.update({ revoked_at: new Date().toISOString() })
				.eq("lease_id", leaseId)
				.is("used_at", null)
				.is("revoked_at", null);

			const { raw, hash } = await generateSigningToken();
			const { error: tokenError } = await supabase
				.from("lease_signing_tokens")
				.insert({
					lease_id: leaseId,
					tenant_email: record.tenantEmail,
					token_hash: hash,
					expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
					created_by: user.id,
				});
			if (tokenError) {
				return errorResponse(req, 500, tokenError, { action: "send_token" });
			}

			const message = (body.message as string | undefined)?.trim();
			const emailResult = await sendEmail({
				to: [record.tenantEmail],
				subject: "Please sign your lease agreement",
				html: buildSigningEmail({
					tenantName: record.tenantName,
					ownerName: record.ownerName,
					propertyLabel: record.propertyLabel,
					signUrl: `${appUrl}/sign/${raw}`,
					...(message ? { message } : {}),
				}),
				tags: [{ name: "type", value: "lease_signature" }],
			});
			if (!emailResult.success) {
				return errorResponse(
					req,
					502,
					new Error("Failed to email the signing link"),
					{ action: "send_email" },
				);
			}

			return new Response(JSON.stringify({ success: true }), {
				status: 200,
				headers: getJsonHeaders(req),
			});
		}

		// ── resend ─────────────────────────────────────────────────────────────
		if (action === "resend") {
			if (lease.lease_status !== "pending_signature") {
				return new Response(
					JSON.stringify({
						error: "Only leases pending signature can be resent",
					}),
					{ status: 400, headers: getJsonHeaders(req) },
				);
			}
			const record = await fetchLeaseSigningData(supabase, leaseId);
			if (!record || !EMAIL_RE.test(record.tenantEmail)) {
				return new Response(
					JSON.stringify({ error: "Tenant email is required to resend" }),
					{ status: 400, headers: getJsonHeaders(req) },
				);
			}

			await supabase
				.from("lease_signing_tokens")
				.update({ revoked_at: new Date().toISOString() })
				.eq("lease_id", leaseId)
				.is("used_at", null)
				.is("revoked_at", null);

			const { raw, hash } = await generateSigningToken();
			const { error: tokenError } = await supabase
				.from("lease_signing_tokens")
				.insert({
					lease_id: leaseId,
					tenant_email: record.tenantEmail,
					token_hash: hash,
					expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
					created_by: user.id,
				});
			if (tokenError) {
				return errorResponse(req, 500, tokenError, { action: "resend_token" });
			}

			const message = (body.message as string | undefined)?.trim();
			const emailResult = await sendEmail({
				to: [record.tenantEmail],
				subject: "Reminder: please sign your lease agreement",
				html: buildSigningEmail({
					tenantName: record.tenantName,
					ownerName: record.ownerName,
					propertyLabel: record.propertyLabel,
					signUrl: `${appUrl}/sign/${raw}`,
					...(message ? { message } : {}),
				}),
				tags: [{ name: "type", value: "lease_signature_resend" }],
			});
			if (!emailResult.success) {
				return errorResponse(
					req,
					502,
					new Error("Failed to email the signing link"),
					{ action: "resend_email" },
				);
			}

			return new Response(JSON.stringify({ success: true }), {
				status: 200,
				headers: getJsonHeaders(req),
			});
		}

		// ── cancel ─────────────────────────────────────────────────────────────
		if (action === "cancel") {
			// Only a lease still awaiting signature may be cancelled. Never allow an
			// already-active (legally executed) lease to be reset to draft — that
			// would destroy its signature audit trail. Active leases use terminate.
			if (lease.lease_status !== "pending_signature") {
				return new Response(
					JSON.stringify({
						error: "Only leases pending signature can be cancelled",
					}),
					{ status: 400, headers: getJsonHeaders(req) },
				);
			}

			await supabase
				.from("lease_signing_tokens")
				.update({ revoked_at: new Date().toISOString() })
				.eq("lease_id", leaseId)
				.is("used_at", null)
				.is("revoked_at", null);

			const { error: updateError } = await supabase
				.from("leases")
				.update({
					lease_status: "draft",
					sent_for_signature_at: null,
					owner_signed_at: null,
					owner_signature_ip: null,
					owner_signature_user_agent: null,
					owner_signature_method: null,
					owner_signature_consent_at: null,
					tenant_signed_at: null,
					tenant_signature_ip: null,
					tenant_signature_user_agent: null,
					tenant_signature_method: null,
					tenant_signature_name: null,
					tenant_signature_consent_at: null,
					signed_document_path: null,
					signed_document_hash: null,
				})
				.eq("id", leaseId);
			if (updateError) {
				return errorResponse(req, 500, updateError, { action: "cancel_reset" });
			}

			return new Response(JSON.stringify({ success: true }), {
				status: 200,
				headers: getJsonHeaders(req),
			});
		}

		// ── sign-owner ─────────────────────────────────────────────────────────
		if (action === "sign-owner") {
			// Enforce affirmative ESIGN consent server-side (mirrors the tenant
			// path), so the persisted owner_signature_consent_at is real.
			if (body.consent !== true) {
				return new Response(
					JSON.stringify({ error: "Consent is required to sign" }),
					{ status: 400, headers: getJsonHeaders(req) },
				);
			}
			// Only sign a lease that has been sent (pending_signature), so the
			// owner's signature is bound to the same finalized terms the tenant
			// signs — never a still-editable draft.
			if (lease.lease_status !== "pending_signature") {
				return new Response(
					JSON.stringify({
						error: "Lease must be sent for signature before signing",
					}),
					{ status: 400, headers: getJsonHeaders(req) },
				);
			}

			const { data: rpcRows, error: rpcError } = await supabase.rpc(
				"record_lease_signature",
				{
					p_lease_id: leaseId,
					p_signature_ip: clientIp(req),
					p_signature_user_agent: clientUserAgent(req),
					p_signed_at: new Date().toISOString(),
					p_method: "in_app",
				},
			);
			if (rpcError) {
				return errorResponse(req, 500, rpcError, { action: "sign_owner" });
			}

			const result = (rpcRows as Array<{
				success: boolean;
				both_signed: boolean;
				error_message: string | null;
			}> | null)?.[0];

			if (!result?.success) {
				// Already-signed is an idempotent no-op success.
				if (result?.error_message === "Owner has already signed this lease") {
					return new Response(JSON.stringify({ success: true }), {
						status: 200,
						headers: getJsonHeaders(req),
					});
				}
				return new Response(
					JSON.stringify({
						error: result?.error_message ?? "Failed to sign lease",
					}),
					{ status: 400, headers: getJsonHeaders(req) },
				);
			}

			if (result.both_signed) {
				await finalizeSignedLease(supabase, leaseId);
			}

			return new Response(JSON.stringify({ success: true }), {
				status: 200,
				headers: getJsonHeaders(req),
			});
		}

		return new Response(JSON.stringify({ error: "Unknown action" }), {
			status: 400,
			headers: getJsonHeaders(req),
		});
	} catch (err) {
		return errorResponse(req, 500, err, { action: "lease-signature" });
	}
});
