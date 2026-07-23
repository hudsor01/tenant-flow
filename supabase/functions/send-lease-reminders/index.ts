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
	users: OwnerRow | null;
	// Property is reached via units.property_id — `leases` has NO property_id
	// column (its FKs are owner_user_id, primary_tenant_id, unit_id). Mirrors the
	// units:unit_id(properties:property_id(name)) embed used in the lookup below.
	units: { properties: { name: string | null } | null } | null;
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
    <a href="${escapeHtml(params.ctaUrl)}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Review lease and renewal options</a>
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
	//     only; never call the per-request tier-gate helper. Pure in-memory check
	//     with no error path.
	const entitled =
		ACTIVE_SUB_STATUSES.has(owner.subscription_status ?? "") &&
		GROWTH_AND_MAX_PLANS.has(owner.subscription_plan ?? "");
	if (!entitled) return false;

	// Every DB/RPC suppression layer below FAILS CLOSED (Pitfall 1): a suppression
	// check that errors must never let an email through. If we cannot prove the
	// address is safe, we treat the unknown state as suppressed (return false) and
	// capture the error for observability (never a raw err.message to a client).
	// The in-app notification (A1) is created upstream and is NOT gated by this.

	// (2) CI-synthetic-owner guard (re-ported from notify_n8n_lease_reminder).
	const { data: suppressed, error: suppressedError } = await supabase.rpc(
		"is_notification_suppressed",
		{ p_email: owner.email },
	);
	if (suppressedError) {
		captureWebhookError(suppressedError, {
			action: "should_email_is_notification_suppressed",
			owner_id: owner.id,
		});
		return false;
	}
	if (suppressed === true) return false;

	// (3) hard bounce / complaint.
	const { data: bounced, error: bouncedError } = await supabase
		.from("email_suppressions")
		.select("email")
		.eq("email", owner.email)
		.maybeSingle();
	if (bouncedError) {
		captureWebhookError(bouncedError, {
			action: "should_email_email_suppressions",
			owner_id: owner.id,
		});
		return false;
	}
	if (bounced) return false;

	// (4) per-owner opt-out. An absent row = defaults true = send.
	const { data: settings, error: settingsError } = await supabase
		.from("notification_settings")
		.select("email, leases")
		.eq("user_id", owner.id)
		.maybeSingle();
	if (settingsError) {
		captureWebhookError(settingsError, {
			action: "should_email_notification_settings",
			owner_id: owner.id,
		});
		return false;
	}
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
				const { data: leaseData, error: leaseError } = await supabase
					.from("leases")
					.select(
						"id, end_date, owner_user_id, users:owner_user_id(id, email, full_name, subscription_status, subscription_plan), units:unit_id(properties:property_id(name))",
					)
					.eq("id", row.lease_id)
					.maybeSingle();
				const lease = leaseData as LeaseJoinRow | null;
				const owner = lease?.users ?? null;

				// A TRANSIENT lookup error (network blip, PostgREST hiccup) must NOT be
				// mistaken for a deleted lease: stamping 'failed' would drop the reminder
				// permanently (claim_lease_reminders never reclaims 'failed'). Leave the
				// row 'claimed' so the >1h stale-claim reaper (WR-02) retries it.
				if (leaseError) {
					captureWebhookError(leaseError, {
						action: "drain_lookup_error",
						reminder_id: row.id,
						lease_id: row.lease_id,
					});
					continue;
				}

				// The lease or owner genuinely vanished (deleted between queue + drain):
				// can neither notify nor email. Stamp failed and move on.
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
				const propertyName = lease.units?.properties?.name ?? null;

				// 4a. ALWAYS create the in-app notification (A1, all tiers) — the free
				//     expiry-awareness channel is created before (and regardless of)
				//     the email gate. action_url stays app-relative (open-redirect guard).
				//     Existence-guard first (F3): the WR-02 reaper reclaims rows stuck
				//     'claimed' > 1h, and create_notification is a plain INSERT with no
				//     dedup — a run that crashed after create_notification but before the
				//     terminal stamp would otherwise duplicate this notification on
				//     reclaim. Skip creation only when a matching row already exists; on an
				//     existence-check error we fall through and create (fail open toward
				//     the A1 guarantee).
				//
				//     TIME-BOUND the guard to the reclaim window ONLY (F1). All three
				//     reminders in a lease's 30/7/1-day series share (user_id,
				//     entity_id=lease_id, notification_type), and notifications persist
				//     90d+ (the retention cron). An UNBOUNDED existence check would treat
				//     the later 7_days (~23d after 30_days) and 1_day (~29d after) reminders
				//     as duplicates of the first notification and collapse the whole series
				//     into ONE stale "ends in 30 days" notice — violating REMIND-05 (each
				//     delivered reminder creates its own in-app notification) and worst for
				//     in-app-only Starter/trial owners (D-02). A 3-day window dedups only a
				//     reclaim of the SAME reminder row (reaper threshold 1h, daily cron ->
				//     reclaim ~24h) while staying well below the 6-day minimum gap between
				//     distinct series reminders (7_days vs 1_day), so each distinct reminder
				//     still creates its own notification.
				const dedupSince = new Date(
					Date.now() - 3 * 24 * 60 * 60 * 1000,
				).toISOString();
				const { data: existingNotification, error: existingNotifyError } =
					await supabase
						.from("notifications")
						.select("id")
						.eq("user_id", owner.id)
						.eq("entity_id", row.lease_id)
						.eq("notification_type", "lease_renewal_reminder")
						.gt("created_at", dedupSince)
						.limit(1)
						.maybeSingle();
				if (existingNotifyError) {
					captureWebhookError(existingNotifyError, {
						action: "notification_existence_check",
						reminder_id: row.id,
					});
				}
				if (!existingNotification) {
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
				//     At-least-once residual (ACCEPTED): if the isolate is torn down in
				//     the ms window between Resend accepting this send and the 4d stamp
				//     below, the row stays 'claimed', the WR-02 reaper reclaims it, and
				//     the next run re-sends. The Resend Idempotency-Key = row.id collapses
				//     that duplicate inside Resend's 24h idempotency window, so the owner
				//     still receives at most one email. Documented rather than guarded with
				//     a two-phase send (over-engineering for a sub-second crash window).
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
