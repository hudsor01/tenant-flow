// Shared error/observability utility for Supabase Edge Functions, and the one
// place the Sentry client gets bound for every function that imports it.
//
// WHY THE BINDING LIVES HERE (RATE-04 / T-66.1-13). Until 66.1-03, `Sentry.init`
// appeared exactly ONCE in all of supabase/functions -- stripe-webhooks/index.ts.
// SEVENTEEN functions import this module and call Sentry through it: apply-token,
// auth-email-send, download-documents-zip, export-report, export-user-data,
// generate-pdf, lease-signature, n8n-blog-ingest, newsletter-subscribe,
// resend-webhook, send-contact-email, send-lease-reminders, sign-lease-token,
// stripe-billing-portal, stripe-cancel-subscription, stripe-checkout,
// stripe-webhooks. So in SIXTEEN of them every handled error was captured into a
// client that had never been constructed, and transmitted nowhere, since this
// module was written.
//
// WHAT MADE THAT DURABLE WAS THIS FILE'S OWN PROSE. The header used to assert
// that it logged full error details to Sentry, and the line above the capture
// call used to assert that the capture coped with an unset DSN on its own. Both
// statements are TRUE of a client that was initialised without a DSN, and FALSE
// of a client that was never initialised at all -- the difference nobody had
// reason to look for, because the comment had already answered the question.
// Those comments are deleted, not amended: a repaired mechanism sitting under
// prose that already claimed success is exactly how this recurs.
//
// WHAT IS STILL NOT PROVEN BY THE CODE ALONE: that an event reaches Sentry's
// servers. That needs SENTRY_DSN set as a Supabase function secret, network
// egress from the isolate, and a look at the Sentry project. The local test
// (tests/rate-limit-sentry-test.ts) proves the client is BOUND, which is the
// property that was actually missing; transmission is 66.1-05's live check.
//
// Also includes CORS headers via getCorsHeaders() -- returns empty headers for
// non-browser requests (webhooks), so the dependency is harmless for all callers.

import * as Sentry from "@sentry/deno";
import { getCorsHeaders } from "./cors.ts";

/**
 * Once-per-isolate latch. Set BEFORE any work, so a throw inside the binding
 * cannot turn into a retry on every subsequent capture.
 */
let sentryInitAttempted = false;

/**
 * Bind a Sentry client, at most once per isolate, on the first capture.
 *
 * LAZY, NOT MODULE-LEVEL. CLAUDE.md requires env reads inside the request path
 * rather than at import, because a module-level throw kills the isolate before
 * it can serve anything. This runs on the first capture, which is inside a
 * request. It satisfies that rule literally, not by exception.
 *
 * READS Deno.env.get DIRECTLY, NOT validateEnv, AND THAT IS REQUIRED. `env.ts`
 * caches on its first call across the whole isolate (`cachedEnv`, keyed on
 * nothing), so the FIRST caller wins and every later caller gets that map back
 * regardless of what it asked for. A validateEnv call from this shared module
 * would either hand back some other caller's map or -- if it ran first -- poison
 * the cache for the function's own call and take the isolate down on a required
 * var this module never asked about. `Deno.env.get` has no cache and cannot
 * throw.
 *
 * NOTHING IN HERE MAY THROW. An edge function must not 500 because monitoring is
 * unconfigured; unset DSN is a silent no-op plus one warning.
 */
function ensureSentryClient(): void {
	if (sentryInitAttempted) return;
	sentryInitAttempted = true;

	try {
		// ALREADY-BOUND GUARD. stripe-webhooks/index.ts inits at module scope and
		// is the one function whose Sentry reporting already worked. Re-initing a
		// warm isolate of it on its first errorResponse would clobber that config
		// -- fixing sixteen functions by breaking the seventeenth.
		if (Sentry.getClient()) return;

		const dsn = Deno.env.get("SENTRY_DSN");
		if (typeof dsn === "string" && dsn.length > 0) {
			Sentry.init({ dsn });
			return;
		}

		console.warn(
			JSON.stringify({
				level: "warning",
				event: "sentry_unconfigured",
				message:
					"SENTRY_DSN not set - Sentry captures are no-ops; structured console logging only",
			}),
		);
	} catch (err) {
		console.warn(
			JSON.stringify({
				level: "warning",
				event: "sentry_init_failed",
				message: err instanceof Error ? err.message : String(err),
			}),
		);
	}
}

/**
 * Create a JSON error response with generic message.
 * Logs full error details to structured console.error, and to Sentry when
 * SENTRY_DSN is set on this function (ensureSentryClient binds the client).
 * Never exposes internal error details to the client.
 */
export function errorResponse(
	req: Request,
	status: number,
	error: unknown,
	context?: Record<string, unknown>,
): Response {
	ensureSentryClient();

	const message = error instanceof Error ? error.message : String(error);

	// Structured console logging for observability
	console.error(
		JSON.stringify({
			level: "error",
			status,
			message,
			url: req.url,
			method: req.method,
			...context,
		}),
	);

	Sentry.captureException(error, {
		extra: {
			url: req.url,
			method: req.method,
			status,
			...context,
		},
	});

	return new Response(JSON.stringify({ error: "An error occurred" }), {
		status,
		headers: {
			"Content-Type": "application/json",
			...getCorsHeaders(req),
		},
	});
}

/**
 * Log a webhook handler error to Sentry + structured console.error.
 * For use inside webhook handler modules where there is no req object.
 * Does NOT create a Response -- callers handle control flow themselves.
 */
export function captureWebhookError(
	error: unknown,
	extra: Record<string, unknown>,
	// TAGS, NOT `extra`, ARE WHAT AN ISSUE-ALERT CONDITION CAN MATCH.
	// Sentry does not index additional data: an alert rule can match tags[...]
	// and a fixed attribute list, and nothing else. RATE-04's whole purpose is an
	// alert that fires when the limiter starts failing, so the marker it keys on
	// has to be a tag. Optional and additive, so the sixteen existing call sites
	// are unchanged.
	tags?: Record<string, string>,
): void {
	ensureSentryClient();

	const message = error instanceof Error ? error.message : String(error);

	console.error(
		JSON.stringify({
			level: "error",
			message,
			...extra,
		}),
	);

	Sentry.captureException(error, {
		extra,
		...(tags ? { tags } : {}),
	});
}

/**
 * Log a non-error warning event to Sentry + structured console.warn.
 * Use for: missing optional data, fallback paths, recoverable degradation.
 * Lower-volume than info — fires a discrete Sentry event (counts toward quota).
 */
export function captureWebhookWarning(
	message: string,
	extra?: Record<string, unknown>,
): void {
	ensureSentryClient();

	console.warn(JSON.stringify({ level: "warning", message, ...(extra ?? {}) }));
	Sentry.captureMessage(message, { level: "warning", extra });
}

/**
 * Add a Sentry breadcrumb for operational/info events.
 * Breadcrumbs are FREE — they attach to the next captureException event,
 * giving you a trail of context without firing standalone Sentry events.
 * Use for: flow tracking ("Created PaymentIntent X"), idempotency notes,
 * email send confirmations. Replaces most ad-hoc console.log calls.
 */
export function logEvent(
	message: string,
	data?: Record<string, unknown>,
): void {
	ensureSentryClient();

	console.log(JSON.stringify({ level: "info", message, ...(data ?? {}) }));
	Sentry.addBreadcrumb({
		category: "edge-function",
		level: "info",
		message,
		data,
	});
}
