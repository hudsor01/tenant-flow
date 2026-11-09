/**
 * Standardized Error Handler for TanStack Query Mutations
 *
 * Provides consistent error handling across all mutations:
 * - Structured logging with context
 * - User-friendly toast notifications
 *
 * Usage:
 * ```typescript
 * useMutation({
 *   mutationFn: createTenant,
 *   onError: (error) => handleMutationError(error, 'Create tenant')
 * })
 * ```
 */

import * as Sentry from "@sentry/nextjs";
import { toast } from "sonner";
import { DiagnosticError } from "#lib/diagnostic-error";
import { createLogger } from "#lib/frontend-logger";
import { isStoragePlanLimitError } from "#lib/storage-plan-limit";
import { isApiError } from "#lib/utils/api-error";

const logger = createLogger({ component: "MutationErrorHandler" });

/**
 * Coerce an unknown error to an Error instance so `Sentry.captureException`
 * gets a real stack trace + exception type instead of falling through to
 * `captureMessage`. Plain Supabase / PostgREST objects look like
 * `{ message, code, hint, details }` — we wrap them as `Error` (with the
 * original shape on `cause`) so Sentry can inspect the underlying payload.
 */
function toError(error: unknown, fallback: string): Error {
	if (error instanceof Error) return error;
	if (typeof error === "string") return new Error(error);
	const obj = error as Record<string, unknown> | null;
	const message =
		(typeof obj?.message === "string" && obj.message) ||
		(typeof (obj?.payload as Record<string, unknown>)?.message === "string" &&
			((obj?.payload as Record<string, unknown>)?.message as string)) ||
		fallback;
	return obj ? new Error(message, { cause: obj }) : new Error(message);
}

/** The error's own message (an Error, a string, or a `{ message }` object). */
function rawErrorMessage(error: unknown): string | null {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;

	// Handle objects with message property (including nested payload.message)
	const obj = error as Record<string, unknown> | null;
	const message =
		obj?.message ?? (obj?.payload as Record<string, unknown>)?.message;
	return typeof message === "string" ? message : null;
}

/**
 * The error's message for logging (Sentry and the dev console), never shown.
 */
function extractErrorMessage(error: unknown): string {
	return rawErrorMessage(error) ?? "An unexpected error occurred";
}

/**
 * Get HTTP status code from error if available
 */
function getErrorStatus(error: unknown): number | undefined {
	const status = (error as Record<string, unknown>)?.status;
	return typeof status === "number" ? status : undefined;
}

/**
 * User-safe copy for known-leaky Postgres SQLSTATE codes. The raw DB message
 * (e.g. "duplicate key value violates unique constraint …") leaks schema
 * internals, so map the codes we recognise to product copy instead. Sentry
 * still captures the real error server-side.
 */
const POSTGRES_ERROR_MESSAGES: Record<string, string> = {
	"23505": "This record already exists.",
	"23514":
		"Some of the information entered isn't allowed. Please review and try again.",
	"23503": "This action references a record that no longer exists.",
	"23502": "A required field is missing.",
	"42501": "You don't have permission to perform this action.",
};

/**
 * Fallback shown for a leaky code we don't have specific copy for, so raw
 * Postgres internals never reach the toast.
 */
const GENERIC_MUTATION_ERROR = "Something went wrong. Please try again.";

/**
 * Detects a RAW Postgres/PostgREST system message — the auto-generated text that
 * leaks schema internals (table/column/constraint names). We genericize by
 * MESSAGE SHAPE, not by SQLSTATE alone, because this codebase deliberately
 * RAISEs user-facing product copy under constraint SQLSTATEs — e.g. `23514`
 * ("Cannot edit financial terms of a signed lease" term-lock trigger; document-
 * category validation) and `42501` ("Default categories cannot be deleted").
 * Those author-written messages must surface verbatim, so under those codes
 * only a message that actually matches this raw-internals shape is replaced
 * with friendly copy. Under a code no RAISE uses, `AUTHOR_SQLSTATES` below
 * replaces the message whatever its shape.
 */
const RAW_DB_INTERNALS =
	/duplicate key value|violates (?:unique|check|foreign key|not-null|exclusion) constraint|null value in column|violates row-level security policy|invalid input syntax|value too long|out of range|permission denied for (?:table|relation|function|schema|sequence|view)|(?:relation|column) "[^"]+" (?:of relation "[^"]+" )?does not exist|function [\w.]+\([^)]*\) does not exist/i;

/**
 * The text a fetch that never reached the server carries, never product copy:
 * the browser's own (Chrome's "Failed to fetch", Firefox's "NetworkError when
 * attempting to fetch resource.", Safari's "Load failed", React Native's
 * "Network request failed"). It is matched on the message whatever the
 * error's class: a direct `fetch` throws a `TypeError` with it, auth-js and
 * storage-js rethrow it as their own errors (`AuthRetryableFetchError`,
 * `StorageUnknownError`), the login page rethrows auth's message as an
 * `Error`, and postgrest-js returns a plain object whose message puts the
 * error's name first ("TypeError: Failed to fetch", "FetchError: …" for an
 * error with no name).
 */
const NETWORK_FAILURE =
	/^(?:(?:TypeError|FetchError): )?(?:Failed to fetch|NetworkError when attempting to fetch resource\.?|Load failed|Network request failed)$/i;

const NETWORK_ERROR_MESSAGE =
	"Network error. Please check your connection and try again.";

/**
 * The SQLSTATEs this codebase's own RAISEs carry copy written for the owner
 * under: PL/pgSQL's default `P0001`, and every `errcode` the migrations
 * declare (`PLIM1` the plan limit; `22023`, `23514`, `28000`, `42501` and
 * `0A000` for validation, lock, ownership and append-only messages). Postgres
 * writes its own text under every other code ("canceling statement due to
 * statement timeout", "column properties.foo does not exist", "query
 * returned no rows"), so a message under another code is never shown.
 */
const AUTHOR_SQLSTATES: ReadonlySet<string> = new Set([
	"P0001",
	"PLIM1",
	"22023",
	"23514",
	"28000",
	"42501",
	"0A000",
]);

/** A Postgres SQLSTATE (five digits or capitals), not an auth or storage code. */
const SQLSTATE = /^[0-9A-Z]{5}$/;

/**
 * A response body that is an HTML page (a proxy's 502, a gateway error page),
 * which postgrest-js passes on as the error's message when it cannot parse it.
 */
const HTML_DOCUMENT = /<(?:!doctype|html|head|body)\b/i;

/**
 * A fault in the code rather than in anything the user did: a JavaScript
 * runtime error ("Cannot read properties of undefined (reading 'id')", a
 * JSON parse of an HTML body, "Invalid time value") or a DOM exception (an
 * aborted request). Its message names code. The browser's own network
 * failure is a `TypeError` too and is matched by `NETWORK_FAILURE` first.
 */
function isRuntimeFault(error: unknown): boolean {
	return (
		error instanceof TypeError ||
		error instanceof RangeError ||
		error instanceof SyntaxError ||
		error instanceof ReferenceError ||
		error instanceof EvalError ||
		error instanceof URIError ||
		(typeof DOMException !== "undefined" && error instanceof DOMException)
	);
}

/**
 * The text a user may see for `error`, wherever it is shown (a toast, a form,
 * a row of results). The ONE sanitizer: `handleMutationError` uses it for its
 * toast, and an inline error display calls it directly instead of reading
 * `error.message`.
 *
 *   - an `ApiError` (a failed Edge Function or API response) shows its
 *     product copy, `getUserMessage()`, never the HTTP status text;
 *   - a `DiagnosticError` (a mapper's shape check, an RPC contract, an
 *     invariant), or supabase-js's `FunctionsHttpError` /
 *     `FunctionsRelayError` ("Edge Function returned a non-2xx status
 *     code"), shows `fallback`; its `FunctionsFetchError` shows the network
 *     copy;
 *   - the browser's network failure shows the network copy;
 *   - a runtime fault (`isRuntimeFault`) or an HTML page passed on as the
 *     message shows `fallback`;
 *   - a raw Postgres/PostgREST message (`RAW_DB_INTERNALS`, a `PGRST*` code,
 *     or a SQLSTATE outside `AUTHOR_SQLSTATES`) shows the copy for its
 *     SQLSTATE, else the generic copy;
 *   - any other message (author-written RAISE copy, a client-side validation
 *     message, Supabase Auth's user-facing text) shows verbatim;
 *   - no message at all shows `fallback`.
 */
export function userFacingErrorMessage(
	error: unknown,
	fallback: string = GENERIC_MUTATION_ERROR,
): string {
	if (isApiError(error)) return error.getUserMessage();
	if (error instanceof DiagnosticError) return fallback;
	// supabase-js's own Edge Function errors carry library text, not copy.
	const name = error instanceof Error ? error.name : undefined;
	if (name === "FunctionsFetchError") return NETWORK_ERROR_MESSAGE;
	if (name === "FunctionsHttpError" || name === "FunctionsRelayError") {
		return fallback;
	}
	const message = rawErrorMessage(error);
	if (message === null || message.trim() === "") return fallback;
	if (NETWORK_FAILURE.test(message)) return NETWORK_ERROR_MESSAGE;
	if (isRuntimeFault(error) || HTML_DOCUMENT.test(message)) return fallback;
	const errObj = error as Record<string, unknown> | null;
	const pgCode = typeof errObj?.code === "string" ? errObj.code : undefined;
	if (
		RAW_DB_INTERNALS.test(message) ||
		(!!pgCode && /^PGRST/.test(pgCode)) ||
		(!!pgCode && SQLSTATE.test(pgCode) && !AUTHOR_SQLSTATES.has(pgCode))
	) {
		return (
			(pgCode && POSTGRES_ERROR_MESSAGES[pgCode]) || GENERIC_MUTATION_ERROR
		);
	}
	return message;
}

/**
 * Stable sonner toast id for the storage-quota Upgrade prompt (METER-04 / D-03).
 * The PROACTIVE pre-check (before `.upload()`) and the REACTIVE detector
 * (`handleMutationError` on a `StorageApiError` whose message begins with the
 * `plan_limit_exceeded:` prefix) both render under this id, so a batch upload
 * shows a SINGLE 'Plan limit reached' toast rather than one per rejected file.
 */
const STORAGE_QUOTA_TOAST_ID = "storage-quota-upgrade";

/**
 * Render the shared 'Plan limit reached' Upgrade toast. When `toastId` is
 * provided the toast dedupes against prior renders under the same id (storage
 * quota); the PostgREST hint path passes no id, preserving prior behaviour.
 */
function showPlanLimitUpgradeToast(
	description: string,
	upgradeSource: string,
	toastId?: string,
): void {
	const options = {
		description,
		action: {
			label: "Upgrade",
			onClick: () => {
				window.location.href = `/billing/plans?source=${encodeURIComponent(upgradeSource)}`;
			},
		},
	};
	toast.error(
		"Plan limit reached",
		toastId ? { ...options, id: toastId } : options,
	);
}

/**
 * PROACTIVE storage-quota Upgrade prompt for the client-side pre-check at each
 * upload site. NON-destructive: callers surface this BEFORE `.upload()` when the
 * owner is at/over a finite quota WITHOUT aborting the upload (the DB trigger is
 * authoritative and exempts grandfathered / Max / flag-off owners). Shares
 * `STORAGE_QUOTA_TOAST_ID` with the reactive detector so the two dedupe, and
 * does NOT report to Sentry (a UX gate, not an error).
 */
const STORAGE_LIMIT_COPY =
	"You've reached your plan's storage limit. Upgrade for more space.";

export function showStorageQuotaUpgradeToast(): void {
	showPlanLimitUpgradeToast(
		STORAGE_LIMIT_COPY,
		"storage_quota_gate",
		STORAGE_QUOTA_TOAST_ID,
	);
}

/**
 * The paywall toast's title and action for a tier gate's refusal whose reason
 * is `subscription_inactive` (`_shared/tier-gate-decision.ts`): the owner's
 * plan includes the feature, and the subscription is not active (past due, in
 * the app). The action opens Billing Settings, the refusal's `upgrade_url`;
 * telling this owner to upgrade a plan they have misstated it (66.2-39 fix
 * round 4, Part 8n). The reports and e-sign handlers both show it.
 */
export const PAYWALL_BILLING_TOAST = {
	title: "Billing needs attention",
	action: "Billing Settings",
} as const;

/** The noun for a plan-limited resource the trigger's DETAIL names. */
const PLAN_LIMIT_NOUNS: Record<string, [string, string]> = {
	properties: ["property", "properties"],
	units: ["unit", "units"],
};

/**
 * The Upgrade toast's copy for a plan-limit rejection, built from the
 * trigger's DETAIL (`{ resource, used, limit }`). The trigger's MESSAGE
 * ("plan_limit_exceeded: properties (1 / 1 used)") is a machine prefix for
 * detection and is never shown (66.2-39 fix round 4, Part 5d).
 */
function planLimitCopy(resource: unknown, limit: unknown): string {
	if (resource === "storage") return STORAGE_LIMIT_COPY;
	const nouns =
		typeof resource === "string" ? PLAN_LIMIT_NOUNS[resource] : undefined;
	if (
		nouns &&
		typeof limit === "number" &&
		Number.isInteger(limit) &&
		limit >= 0
	) {
		return `You've reached your plan's limit of ${limit} ${limit === 1 ? nouns[0] : nouns[1]}. Upgrade to add more.`;
	}
	if (nouns) {
		return `You've reached your plan's limit of ${nouns[1]}. Upgrade to add more.`;
	}
	return "You've reached a limit of your current plan. Upgrade to add more.";
}

/**
 * Handle mutation errors with consistent logging and user feedback
 *
 * @param error - The error from mutation onError callback
 * @param context - Human-readable context (e.g., "Create tenant", "Update property")
 * @param customMessage - Optional custom message to show to user instead of error message
 */
export function handleMutationError(
	error: unknown,
	context: string,
	customMessage?: string,
): void {
	const message = extractErrorMessage(error);
	const status = getErrorStatus(error);
	const action = context.toLowerCase().replace(/\s+/g, "_");

	// Route the real error (with stack + class) to Sentry. Using
	// `captureException` here is intentional — `logger.error` would
	// fall through to `captureMessage` and ship a duplicate event for
	// the same failure.
	Sentry.captureException(toError(error, `${context} failed`), {
		tags: { mutation: action },
		extra: { context, status, message },
	});

	// Breadcrumb trail for the next captured event (free — does not fire
	// its own Sentry event). Replaces the prior `logger.error` call which
	// emitted a duplicate `captureMessage` for every mutation error.
	Sentry.addBreadcrumb({
		category: "mutation",
		level: "error",
		message: `${context} failed`,
		data: {
			action,
			error: message,
			status,
			errorType: error instanceof Error ? error.constructor.name : typeof error,
		},
	});
	if (process.env.NODE_ENV !== "production") {
		console.error(`[mutation] ${context} failed`, {
			action,
			error: message,
			status,
		});
	}

	// The toast's copy: the caller's, else the sanitized message, else the
	// branch's own copy (`fallback`) when the error carries no message.
	const displayMessage = (fallback?: string) =>
		customMessage || userFacingErrorMessage(error, fallback);

	// Plan-limit detection — fired by the BEFORE-INSERT triggers
	// `enforce_property_plan_limit` / `enforce_unit_plan_limit`. The PG
	// exception surfaces here as a `PostgrestError` with top-level fields
	// `hint = 'plan_limit_exceeded'` and `details` as a JSON string carrying
	// `{ resource, used, limit, upgrade_source }`. Edge Function tier gates
	// (`_shared/tier-gate.ts`) return a 402 response with `upgrade_url` in
	// the body and are surfaced through their own per-feature handlers — they
	// do NOT pass through this function.
	const errObj = error as Record<string, unknown> | null;
	const pgHint = typeof errObj?.hint === "string" ? errObj.hint : undefined;
	const pgDetails =
		typeof errObj?.details === "string" ? errObj.details : undefined;
	// Storage uploads go through `@supabase/storage-js`, so a quota rejection is
	// a `StorageApiError` that strips `.hint`/`.detail` — the only quota signal
	// is the Plan 04 trigger's `plan_limit_exceeded:` MESSAGE prefix. A PostgREST
	// plan-limit error carries the SAME prefix but ALSO a `hint` + DETAIL JSON, so
	// a genuine STORAGE rejection is "prefix matches AND no plan-limit hint". Both
	// route through the same Upgrade toast; only the storage path uses the shared
	// dedupe id + `storage_quota_gate` default source.
	const hasPlanLimitHint = pgHint === "plan_limit_exceeded";
	const isStorageQuota = isStoragePlanLimitError(error) && !hasPlanLimitHint;
	const isPlanLimit = hasPlanLimitHint || isStorageQuota;

	// Source attribution for analytics — DETAIL is JSON-encoded by the
	// trigger's `format(...)` call. Treat parse failures as a soft default
	// rather than blocking the toast. A storage rejection never carries a
	// DETAIL, so it defaults to `storage_quota_gate`.
	let upgradeSource = isStorageQuota ? "storage_quota_gate" : "plan_limit_gate";
	let limitResource: unknown = isStorageQuota ? "storage" : undefined;
	let limitCount: unknown;
	if (pgDetails) {
		try {
			const parsed = JSON.parse(pgDetails) as Record<string, unknown>;
			if (typeof parsed.upgrade_source === "string") {
				upgradeSource = parsed.upgrade_source;
			}
			limitResource = parsed.resource ?? limitResource;
			limitCount = parsed.limit;
		} catch {
			/* DETAIL wasn't JSON; keep default tag */
		}
	}

	// Customize toast based on status code
	if (status === 409) {
		toast.error("Conflict", {
			description: displayMessage(
				"This item already exists or has been modified",
			),
		});
	} else if (isPlanLimit) {
		showPlanLimitUpgradeToast(
			customMessage || planLimitCopy(limitResource, limitCount),
			upgradeSource,
			isStorageQuota ? STORAGE_QUOTA_TOAST_ID : undefined,
		);
	} else if (status === 403) {
		toast.error("Access Denied", {
			description: displayMessage(
				"You do not have permission to perform this action",
			),
		});
	} else if (status === 404) {
		toast.error("Not Found", {
			description: displayMessage("The requested item could not be found"),
		});
	} else if (status && status >= 500) {
		toast.error("Server Error", {
			description: "Our servers encountered an issue. Please try again later.",
		});
	} else {
		// Caller-supplied copy always wins; otherwise `userFacingErrorMessage`
		// replaces only a raw internal (an HTTP status text, the browser's
		// network failure, a diagnostic, a RAW Postgres/PostgREST message), so
		// author-written RAISE EXCEPTION copy under one of `AUTHOR_SQLSTATES`
		// (P0001, or a constraint SQLSTATE like 23514/42501) surfaces verbatim.
		toast.error(displayMessage());
	}
}

/**
 * Handle mutation success with consistent logging and user feedback
 *
 * @param context - Human-readable context (e.g., "Create tenant", "Update property")
 * @param message - Optional custom success message
 */
export function handleMutationSuccess(context: string, message?: string): void {
	logger.info(`${context} succeeded`, {
		action: context.toLowerCase().replace(/\s+/g, "_"),
		metadata: { success: true },
	});

	toast.success(message || `${context} completed successfully`);
}
