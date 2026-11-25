// Supabase Edge Function: trial-lifecycle
//
// Emails an owner on the database-managed 14-day trial at the points they
// otherwise heard nothing: a welcome at signup, a nudge if no property is in
// by day 2, a warning three days before the end, and a note when it ended.
// Which email (if any) an owner is due is the pure `dueTrialEmail`
// (`_shared/trial-lifecycle.ts`); the copy is `trialEmailCopy` there.
//
// Machine-invoked (verify_jwt=false): pg_cron calls `invoke_trial_lifecycle()`
// hourly, which POSTs here with `Bearer <app_config trial_lifecycle.secret>`.
// The secret is generated in the database and compared here against the same
// row, read with the service-role client, so it is never an Edge secret and
// never leaves Postgres except in this one request. While app_config
// `trial_lifecycle.enabled` != 'true' the function sends nothing.
//
// Exactly once: before sending, a row is claimed in `trial_lifecycle_emails`
// (unique on owner + kind); the send carries that row's id as Resend's
// Idempotency-Key. A failed send deletes the claim so the next run retries.
// Suppression fails closed, as in send-lease-reminders: the CI-synthetic list,
// hard bounces and complaints, and the owner's email or General toggle.

import type { SupabaseClient } from "@supabase/supabase-js";
import { getJsonHeaders, handleCorsOptions } from "../_shared/cors.ts";
import {
	emailButton,
	emailHeading,
	emailLinkFallback,
	emailNote,
	emailText,
	SUPPORT_EMAIL,
	wrapEmailLayout,
} from "../_shared/email-layout.ts";
import { validateEnv } from "../_shared/env.ts";
import { captureWebhookError, errorResponse, logEvent } from "../_shared/errors.ts";
import { escapeHtml } from "../_shared/escape-html.ts";
import { sendEmail } from "../_shared/resend.ts";
import { createAdminClient } from "../_shared/supabase-client.ts";
import { timingSafeEqualStr } from "../_shared/timing-safe.ts";
import { formatTrialEnd } from "../_shared/trial-end-text.ts";
import {
	campaignPath,
	dueTrialEmail,
	ENDED_WINDOW_MS,
	isUndeliverableTestAddress,
	TRIAL_EMAIL_KINDS,
	type TrialEmailKind,
	trialEmailCopy,
} from "../_shared/trial-lifecycle.ts";

/** Owners read per run; the hourly job takes the rest next hour. */
const BATCH = 200;

interface OwnerRow {
	id: string;
	email: string | null;
	first_name: string | null;
	subscription_status: string | null;
	subscription_id: string | null;
	trial_ends_at: string | null;
	created_at: string;
}

interface SentRow {
	owner_user_id: string;
	kind: string;
	created_at: string;
}

export interface TrialLifecycleDeps {
	createClient?: (url: string, key: string) => SupabaseClient;
	now?: () => number;
	send?: typeof sendEmail;
}

function json(req: Request, status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: getJsonHeaders(req),
	});
}

async function readConfig(
	supabase: SupabaseClient,
	key: string,
): Promise<string | null> {
	const { data, error } = await supabase
		.from("app_config")
		.select("value")
		.eq("key", key)
		.maybeSingle();
	if (error) throw error;
	return (data as { value: string } | null)?.value ?? null;
}

/**
 * Whether this owner may be emailed. Every check fails closed: an error is
 * treated as suppressed, never as a send.
 */
async function mayEmail(
	supabase: SupabaseClient,
	owner: OwnerRow & { email: string },
): Promise<boolean> {
	if (isUndeliverableTestAddress(owner.email)) return false;

	const { data: suppressed, error: suppressedError } = await supabase.rpc(
		"is_notification_suppressed",
		{ p_email: owner.email },
	);
	if (suppressedError) {
		captureWebhookError(suppressedError, {
			action: "trial_lifecycle_is_notification_suppressed",
			owner_id: owner.id,
		});
		return false;
	}
	if (suppressed === true) return false;

	const { data: bounced, error: bouncedError } = await supabase
		.from("email_suppressions")
		.select("email")
		.eq("email", owner.email)
		.maybeSingle();
	if (bouncedError) {
		captureWebhookError(bouncedError, {
			action: "trial_lifecycle_email_suppressions",
			owner_id: owner.id,
		});
		return false;
	}
	if (bounced) return false;

	const { data: settings, error: settingsError } = await supabase
		.from("notification_settings")
		.select("email, general")
		.eq("user_id", owner.id)
		.maybeSingle();
	if (settingsError) {
		captureWebhookError(settingsError, {
			action: "trial_lifecycle_notification_settings",
			owner_id: owner.id,
		});
		return false;
	}
	const ns = settings as { email: boolean; general: boolean } | null;
	return !(ns && (ns.email === false || ns.general === false));
}

/** The email's HTML in the shared branded layout. */
export function renderEmail(
	kind: TrialEmailKind,
	owner: OwnerRow,
	trialEndsAtMs: number,
	appUrl: string,
): { subject: string; html: string } {
	const copy = trialEmailCopy(
		kind,
		owner.first_name,
		formatTrialEnd(Math.floor(trialEndsAtMs / 1000)),
	);
	const ctaUrl = `${appUrl}${campaignPath(copy.ctaPath, kind)}`;
	const settingsUrl = `${appUrl}/settings?tab=notifications`;
	const body = [
		emailHeading(copy.heading),
		...copy.paragraphs.map((p) => emailText(escapeHtml(p))),
		emailButton(ctaUrl, copy.ctaLabel),
		...(copy.note ? [emailNote(escapeHtml(copy.note))] : []),
		emailLinkFallback(ctaUrl),
		emailNote(
			`You get this email because you started a TenantFlow trial. To stop these emails, turn off General notifications in <a href="${escapeHtml(settingsUrl)}" style="color:inherit;text-decoration:underline;">Settings</a>.`,
		),
	].join("\n");
	return {
		subject: copy.subject,
		html: wrapEmailLayout(body, {
			preheader: copy.preheader,
			title: copy.subject,
		}),
	};
}

/** Core request handler, exported so a Deno test can drive it without a listener. */
export async function handleRequest(
	req: Request,
	deps: TrialLifecycleDeps = {},
): Promise<Response> {
	const optionsResponse = handleCorsOptions(req);
	if (optionsResponse) return optionsResponse;

	try {
		const env = validateEnv({
			required: ["SUPABASE_URL", "NEXT_PUBLIC_APP_URL", "RESEND_API_KEY"],
		});
		const dbKey =
			Deno.env.get("SUPABASE_SECRET_KEY") ??
			Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
		if (!dbKey) {
			captureWebhookError(new Error("trial-lifecycle: no database key"), {
				fn: "trial-lifecycle",
			});
			return json(req, 500, { error: "An error occurred" });
		}
		const supabase = (deps.createClient ?? createAdminClient)(
			env["SUPABASE_URL"],
			dbKey,
		);

		// 1. Machine-caller auth, first: constant-time compare against the
		//    database's secret. An unset secret admits nobody.
		const secret = await readConfig(supabase, "trial_lifecycle.secret");
		const authHeader = req.headers.get("Authorization") ?? "";
		if (!secret || !timingSafeEqualStr(authHeader, `Bearer ${secret}`)) {
			return json(req, 401, { error: "unauthorized" });
		}

		// 2. Kill switch: nothing is read or sent until it is 'true'.
		if ((await readConfig(supabase, "trial_lifecycle.enabled")) !== "true") {
			return json(req, 200, { ok: true, skipped: "disabled" });
		}
		const launchAtRaw = await readConfig(supabase, "trial_lifecycle.launch_at");
		const launchAtMs = launchAtRaw ? Date.parse(launchAtRaw) : Number.NaN;
		if (!Number.isFinite(launchAtMs)) {
			captureWebhookError(new Error("trial_lifecycle.launch_at is not a date"), {
				fn: "trial-lifecycle",
			});
			return json(req, 500, { error: "An error occurred" });
		}

		const nowMs = (deps.now ?? Date.now)();
		const appUrl = env["NEXT_PUBLIC_APP_URL"].replace(/\/$/, "");

		// 3. Candidates: database-managed trials that are running, or ended
		//    recently enough to be owed the trial-ended email.
		const { data: owners, error: ownersError } = await supabase
			.from("users")
			.select(
				"id, email, first_name, subscription_status, subscription_id, trial_ends_at, created_at",
			)
			.is("subscription_id", null)
			.in("subscription_status", ["trialing", "expired"])
			.eq("is_admin", false)
			.is("deletion_requested_at", null)
			.gte("trial_ends_at", new Date(nowMs - ENDED_WINDOW_MS).toISOString())
			.order("trial_ends_at", { ascending: true })
			.limit(BATCH);
		if (ownersError) {
			return errorResponse(req, 500, ownersError, { action: "candidates" });
		}
		const rows = (owners ?? []) as OwnerRow[];
		if (rows.length === 0) return json(req, 200, { ok: true, sent: 0 });
		const ids = rows.map((o) => o.id);

		const [{ data: sentRows, error: sentError }, { data: propRows, error: propError }] =
			await Promise.all([
				supabase
					.from("trial_lifecycle_emails")
					.select("owner_user_id, kind, created_at")
					.in("owner_user_id", ids)
					.limit(ids.length * TRIAL_EMAIL_KINDS.length),
				supabase
					.from("properties")
					.select("owner_user_id")
					.in("owner_user_id", ids)
					.neq("status", "inactive")
					.limit(ids.length * 50),
			]);
		if (sentError) return errorResponse(req, 500, sentError, { action: "sent_log" });
		if (propError) return errorResponse(req, 500, propError, { action: "properties" });

		const withProperty = new Set(
			((propRows ?? []) as { owner_user_id: string }[]).map((r) => r.owner_user_id),
		);
		const sentBy = new Map<string, { kinds: Set<TrialEmailKind>; last: number }>();
		for (const r of (sentRows ?? []) as SentRow[]) {
			const entry = sentBy.get(r.owner_user_id) ?? { kinds: new Set(), last: 0 };
			entry.kinds.add(r.kind as TrialEmailKind);
			entry.last = Math.max(entry.last, Date.parse(r.created_at));
			sentBy.set(r.owner_user_id, entry);
		}

		const send = deps.send ?? sendEmail;
		let sent = 0;
		for (const owner of rows) {
			try {
				if (!owner.email || !owner.trial_ends_at) continue;
				const trialEndsAtMs = Date.parse(owner.trial_ends_at);
				const history = sentBy.get(owner.id);
				const kind = dueTrialEmail(
					{
						status: owner.subscription_status,
						subscriptionId: owner.subscription_id,
						createdAtMs: Date.parse(owner.created_at),
						trialEndsAtMs,
						hasProperty: withProperty.has(owner.id),
						sent: history?.kinds ?? new Set(),
						lastSentAtMs: history?.last || null,
					},
					nowMs,
					launchAtMs,
				);
				if (!kind) continue;
				if (!(await mayEmail(supabase, { ...owner, email: owner.email }))) continue;

				// Claim exactly once; a concurrent run's claim wins the unique key.
				const { data: claim, error: claimError } = await supabase
					.from("trial_lifecycle_emails")
					.insert({ owner_user_id: owner.id, kind })
					.select("id")
					.maybeSingle();
				if (claimError || !claim) {
					if (claimError && claimError.code !== "23505") {
						captureWebhookError(claimError, {
							action: "trial_lifecycle_claim",
							owner_id: owner.id,
							kind,
						});
					}
					continue;
				}
				const claimId = (claim as { id: string }).id;

				const { subject, html } = renderEmail(kind, owner, trialEndsAtMs, appUrl);
				const result = await send({
					to: [owner.email],
					subject,
					html,
					tags: [
						{ name: "category", value: "trial_lifecycle" },
						{ name: "kind", value: kind },
					],
					idempotencyKey: `trial-lifecycle-${claimId}`,
					// A reply reaches a person, not the noreply sender.
					replyTo: SUPPORT_EMAIL,
				});
				if (result.success) {
					await supabase
						.from("trial_lifecycle_emails")
						.update({
							status: "sent",
							resend_message_id: result.id,
							sent_at: new Date(nowMs).toISOString(),
						})
						.eq("id", claimId);
					sent++;
				} else {
					// Release the claim so the next hourly run retries this email.
					await supabase.from("trial_lifecycle_emails").delete().eq("id", claimId);
					captureWebhookError(new Error("Trial lifecycle email send failed"), {
						action: "trial_lifecycle_send",
						owner_id: owner.id,
						kind,
						message: result.error,
					});
				}
			} catch (rowErr) {
				captureWebhookError(rowErr, {
					action: "trial_lifecycle_owner",
					owner_id: owner.id,
				});
			}
		}

		logEvent("trial-lifecycle run complete", { candidates: rows.length, sent });
		return json(req, 200, { ok: true, candidates: rows.length, sent });
	} catch (err) {
		return errorResponse(req, 500, err, { fn: "trial-lifecycle" });
	}
}

if (!Deno.env.get("DENO_TEST_NO_SERVE")) {
	Deno.serve((req: Request) => handleRequest(req));
}
