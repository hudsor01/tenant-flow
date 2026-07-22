// Supabase Edge Function: send-lease-reminders
//
// In-house renewal-reminder drainer. Replaces the dead n8n hop
// (trg_lease_reminders_notify_n8n -> wf-lease-reminder): pg_cron invokes this
// function, which drains the lease_reminders queue and delivers the sold
// Growth/Max renewal reminders directly through Resend.
//
// Machine-invoked (verify_jwt=false): the cron caller is authenticated by a
// constant-time shared-secret Bearer compare (REMINDERS_INVOKE_SECRET, mirrored
// into app_config.reminders.drain_secret). While app_config.reminders_delivery_enabled
// != 'true' the function early-returns and sends nothing (D-07 physical gate),
// so deploying it before the go-flip (Plan 04) is a safe no-op.
//
// Per claimed row it ALWAYS creates the in-app notification (create_notification,
// all tiers, A1) and then conditionally sends exactly one email through the
// ordered suppression stack (tier -> is_notification_suppressed -> email_suppressions
// -> notification_settings). Sends carry Resend Idempotency-Key = lease_reminders.id
// and stamp delivery_status so a re-drain never re-sends (REMIND-01..03, REMIND-05).

import type { SupabaseClient } from "@supabase/supabase-js";
import { getJsonHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { validateEnv } from "../_shared/env.ts";
import { captureWebhookError, errorResponse, logEvent } from "../_shared/errors.ts";
import { escapeHtml } from "../_shared/escape-html.ts";
import { wrapEmailLayout } from "../_shared/email-layout.ts";
import { sendEmail } from "../_shared/resend.ts";
import { createAdminClient } from "../_shared/supabase-client.ts";
import { GROWTH_AND_MAX_PLANS } from "../_shared/tier-gate.ts";
import { timingSafeEqualStr } from "../_shared/timing-safe.ts";

// Active-sub statuses that count toward the email tier gate (mirrors the
// ACTIVE_SUB_STATUSES set inlined in tier-gate.ts; the batch drainer reuses the
// GROWTH_AND_MAX_PLANS export but must NOT call the per-request tier-gate helper,
// which needs a req and writes a gate_events row).
const ACTIVE_SUB_STATUSES: ReadonlySet<string> = new Set(["active", "trialing"]);

/** A row returned by the claim_lease_reminders RPC (subset used by the drainer). */
interface ClaimedReminder {
	id: string;
	lease_id: string;
	reminder_type: string;
	attempt_count: number;
}

interface OwnerRow {
	id: string;
	email: string;
	full_name: string | null;
	subscription_status: string | null;
	subscription_plan: string | null;
}

interface LeaseJoinRow {
	id: string;
	end_date: string | null;
	owner_user_id: string;
	property_id: string | null;
	users: OwnerRow | null;
	properties: { name: string | null } | null;
}

/** Dependency seam so the unit test can inject a fake SupabaseClient. */
export interface DrainDeps {
	createClient?: (url: string, key: string) => SupabaseClient;
}

/** Human-facing days-remaining label derived from the queued reminder_type — NOT
 *  from now() (Pitfall 5: the drainer never recomputes thresholds, it drains what
 *  queue_lease_reminders already enqueued at the 30/7/1 cadence). */
function reminderDaysLabel(reminderType: string): string {
	switch (reminderType) {
		case "30_days":
			return "30 days";
		case "7_days":
			return "7 days";
		case "1_day":
			return "1 day";
		default:
			return reminderType.replace(/_/g, " ");
	}
}

/** The NEW reminder-specific email template (D-05): own subject/copy, built on
 *  the shared rail — escapeHtml on every user value + a table-CTA button that
 *  deep-links the absolute lease URL — wrapped in wrapEmailLayout. No emojis. */
function buildReminderEmail(params: {
	ownerName: string;
	propertyLabel: string;
	daysLabel: string;
	ctaUrl: string;
}): string {
	const body = `
<h1 style="margin:0 0 16px;font-size:20px;color:#18181b;">Your lease is coming up for renewal</h1>
<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6;">
  Hi ${escapeHtml(params.ownerName)}, the lease for
  <strong>${escapeHtml(params.propertyLabel)}</strong> ends in
  <strong>${escapeHtml(params.daysLabel)}</strong>. Now is a good time to review
  the terms and decide whether to renew, adjust, or let it expire.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;">
  <tr><td style="border-radius:6px;background:#2563eb;">
    <a href="${params.ctaUrl}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Review lease and renewal options</a>
  </td></tr>
</table>
<p style="margin:0 0 8px;font-size:13px;color:#71717a;line-height:1.6;">
  You are receiving this because lease reminders are enabled for your account.
  Manage reminder emails anytime from your notification settings.
</p>`;
	return wrapEmailLayout(body);
}

/** Ordered email suppression gate (REMIND-03). Cheap -> expensive. Any false
 *  suppresses the EMAIL only; the in-app notification is created regardless (A1).
 *  Layer 2 (is_notification_suppressed) is the CI-synthetic-owner guard re-ported
 *  from the notify_n8n_lease_reminder trigger being dropped in Plan 04 — it MUST
 *  be live here before the flag flips (Pitfall 1). */
async function shouldEmail(
	supabase: SupabaseClient,
	owner: OwnerRow,
): Promise<boolean> {
	// (1) tier: active/trialing AND Growth/Max (D-02). Reuse GROWTH_AND_MAX_PLANS
	//     only; never call the per-request tier-gate helper.
	const entitled =
		ACTIVE_SUB_STATUSES.has(owner.subscription_status ?? "") &&
		GROWTH_AND_MAX_PLANS.has(owner.subscription_plan ?? "");
	if (!entitled) return false;

	// (2) CI-synthetic-owner guard (re-ported from notify_n8n_lease_reminder).
	const { data: suppressed } = await supabase.rpc("is_notification_suppressed", {
		p_email: owner.email,
	});
	if (suppressed === true) return false;

	// (3) hard bounce / complaint.
	const { data: bounced } = await supabase
		.from("email_suppressions")
		.select("email")
		.eq("email", owner.email)
		.maybeSingle();
	if (bounced) return false;

	// (4) per-owner opt-out. An absent row = defaults true = send.
	const { data: settings } = await supabase
		.from("notification_settings")
		.select("email, leases")
		.eq("user_id", owner.id)
		.maybeSingle();
	const ns = settings as { email: boolean; leases: boolean } | null;
	if (ns && (ns.email === false || ns.leases === false)) return false;

	return true;
}

/** Core request handler. Exported so the unit test can drive it with a fake
 *  Request + injected client without binding a real HTTP listener. */
export async function handleRequest(
	req: Request,
	deps: DrainDeps = {},
): Promise<Response> {
	const optionsResponse = handleCorsOptions(req);
	if (optionsResponse) return optionsResponse;

	try {
		const env = validateEnv({
			required: [
				"SUPABASE_URL",
				"SUPABASE_SERVICE_ROLE_KEY",
				"NEXT_PUBLIC_APP_URL",
				"RESEND_API_KEY",
				"REMINDERS_INVOKE_SECRET",
			],
		});

		// 1. Machine-caller auth (verify_jwt=false -> self-check the shared secret).
		//    Constant-time compare of the full Authorization header. FIRST after env.
		const authHeader = req.headers.get("Authorization") ?? "";
		const expected = `Bearer ${env["REMINDERS_INVOKE_SECRET"]}`;
		if (!timingSafeEqualStr(authHeader, expected)) {
			return new Response(JSON.stringify({ error: "unauthorized" }), {
				status: 401,
				headers: getJsonHeaders(req),
			});
		}

		const appUrl = env["NEXT_PUBLIC_APP_URL"].replace(/\/$/, "");
		const makeClient = deps.createClient ?? createAdminClient;
		const supabase = makeClient(
			env["SUPABASE_URL"],
			env["SUPABASE_SERVICE_ROLE_KEY"],
		);

		// 2. D-07 physical kill-switch — early-return while delivery is disabled.
		//    Nothing below (claim, notify, send) runs until Plan 04 flips the flag.
		const { data: flag } = await supabase
			.from("app_config")
			.select("value")
			.eq("key", "reminders_delivery_enabled")
			.maybeSingle();
		if ((flag as { value: string } | null)?.value !== "true") {
			return new Response(JSON.stringify({ ok: true, skipped: "disabled" }), {
				status: 200,
				headers: getJsonHeaders(req),
			});
		}

		// 3. Claim a batch exactly-once (REMIND-02). The RPC flips pending -> claimed
		//    FOR UPDATE SKIP LOCKED and increments attempt_count server-side, so
		//    overlapping drain runs never double-claim and a 'sent' row is never
		//    re-claimed.
		const { data: claimed, error: claimError } = await supabase.rpc(
			"claim_lease_reminders",
			{ p_limit: 100 },
		);
		if (claimError) {
			return errorResponse(req, 500, claimError, { action: "claim" });
		}
		const rows = (claimed ?? []) as ClaimedReminder[];

		let sent = 0;
		for (const row of rows) {
			// Per-row try/catch: one bad row never aborts the batch.
			try {
				const { data: leaseData } = await supabase
					.from("leases")
					.select(
						"id, end_date, owner_user_id, property_id, users:owner_user_id(id, email, full_name, subscription_status, subscription_plan), properties:property_id(name)",
					)
					.eq("id", row.lease_id)
					.maybeSingle();
				const lease = leaseData as LeaseJoinRow | null;
				const owner = lease?.users ?? null;

				// The lease or owner vanished (deleted between queue + drain): can
				// neither notify nor email. Stamp failed and move on.
				if (!lease || !owner) {
					await supabase
						.from("lease_reminders")
						.update({ delivery_status: "failed" })
						.eq("id", row.id);
					captureWebhookError(new Error("lease or owner not found for reminder"), {
						action: "drain_lookup",
						reminder_id: row.id,
						lease_id: row.lease_id,
					});
					continue;
				}

				const daysLabel = reminderDaysLabel(row.reminder_type);
				const propertyName = lease.properties?.name ?? null;

				// 4a. ALWAYS create the in-app notification (A1, all tiers) — the free
				//     expiry-awareness channel is created before (and regardless of)
				//     the email gate. action_url stays app-relative (open-redirect guard).
				const { error: notifyError } = await supabase.rpc("create_notification", {
					p_user_id: owner.id,
					p_type: "lease_renewal_reminder",
					p_title: "Lease renewal reminder",
					p_message: `${propertyName ?? "A property"} — lease ends in ${daysLabel}`,
					p_entity_type: "lease",
					p_entity_id: row.lease_id,
					p_action_url: "/leases/" + row.lease_id,
				});
				if (notifyError) {
					captureWebhookError(notifyError, {
						action: "create_notification",
						reminder_id: row.id,
					});
				}

				// 4b. Email gate (REMIND-03). Any suppression -> stamp suppressed;
				//     the in-app notification above is already recorded.
				const emailAllowed = await shouldEmail(supabase, owner);
				if (!emailAllowed) {
					await supabase
						.from("lease_reminders")
						.update({ delivery_status: "suppressed" })
						.eq("id", row.id);
					continue;
				}

				// 4c. Build + send the reminder email (D-04/D-05). CTA is absolute.
				const plainPropertyLabel = propertyName ?? "your property";
				const result = await sendEmail({
					to: [owner.email],
					subject: `Renewal reminder: ${plainPropertyLabel} lease ends in ${daysLabel}`,
					html: buildReminderEmail({
						ownerName: owner.full_name ?? "there",
						propertyLabel: plainPropertyLabel,
						daysLabel,
						ctaUrl: `${appUrl}/leases/${row.lease_id}`,
					}),
					idempotencyKey: row.id, // === lease_reminders.id (exactly-once anchor)
					tags: [{ name: "type", value: "lease_renewal_reminder" }],
				});

				// 4d. Stamp the terminal delivery state.
				if (result.success) {
					await supabase
						.from("lease_reminders")
						.update({
							delivery_status: "sent",
							delivered_at: new Date().toISOString(),
							resend_message_id: result.id,
						})
						.eq("id", row.id);
					sent++;
				} else {
					await supabase
						.from("lease_reminders")
						.update({ delivery_status: "failed" })
						.eq("id", row.id);
					captureWebhookError(new Error(result.error), {
						action: "send_reminder",
						reminder_id: row.id,
					});
				}
			} catch (rowErr) {
				captureWebhookError(rowErr, {
					action: "drain_row",
					reminder_id: row.id,
				});
			}
		}

		logEvent("send-lease-reminders drain complete", {
			processed: rows.length,
			sent,
		});
		return new Response(
			JSON.stringify({ ok: true, processed: rows.length, sent }),
			{ status: 200, headers: getJsonHeaders(req) },
		);
	} catch (err) {
		return errorResponse(req, 500, err, { fn: "send-lease-reminders" });
	}
}

// Register the HTTP handler as a module side-effect (matches every other edge fn
// in this repo). The unit test sets DENO_TEST_NO_SERVE=1 and dynamic-imports this
// module, driving handleRequest() directly — so no real listener binds during
// `deno test`. In prod the var is never set, so Deno.serve always runs.
if (!Deno.env.get("DENO_TEST_NO_SERVE")) {
	Deno.serve((req: Request) => handleRequest(req));
}
