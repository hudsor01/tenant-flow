/**
 * Storage plan-limit detection + pre-check helpers (METER-04 / D-03).
 *
 * Storage uploads go through `@supabase/storage-js`, so a quota rejection is a
 * `StorageApiError` that carries only `{ name, message, status, statusCode }` —
 * no `.hint`/`.detail`.
 *
 * TWO SIGNALS, BECAUSE ONE PATH KEEPS THE MESSAGE AND THE OTHER DOES NOT.
 * This file used to state that the `plan_limit_exceeded:` prefix "is the ONLY
 * quota signal that survives to StorageApiError.message". That was false for the
 * upload path: a real blocked upload against production returns
 * `database error, code: PLIM1` with message, hint and detail all stripped. The
 * prefix survives the PostgREST path (documents inserts and similar) and nothing
 * else, so both are checked — the SQLSTATE for uploads, the prefix for the rest.
 *
 * The unit tests here passed throughout, because they fabricate an error
 * carrying the prefix. Only the RLS integration test drove a real upload, and it
 * had never run.
 *
 * `isStoragePlanLimitError` parses that prefix (type-guarded on `unknown`, with
 * no unsafe assertions). `wouldExceedStorageQuota` is a pure, NON-destructive
 * pre-check the real upload sites use to surface the Upgrade prompt BEFORE
 * calling `.upload()` — it never hard-blocks (grandfathered / Max / flag-off
 * owners get -1/unlimited or are under quota); the DB trigger stays authoritative.
 */

import type { StorageUsage } from "#hooks/api/query-keys/usage-keys";

/**
 * The literal message prefix the Plan 04 storage-quota trigger RAISEs. This is
 * the client contract — the only quota signal that survives `StorageApiError`
 * (hint/detail are stripped by the Storage API).
 */
export const STORAGE_PLAN_LIMIT_PREFIX = "plan_limit_exceeded:";

/**
 * The SQLSTATE `enforce_storage_quota` raises. Distinct from PL/pgSQL's default
 * `P0001` precisely so it identifies a quota block on its own — the Storage API
 * strips everything except this code, and every other trigger exception on that
 * path also reports P0001.
 */
export const STORAGE_PLAN_LIMIT_SQLSTATE = "PLIM1";

const BYTES_PER_GB = 1024 ** 3;

/**
 * Type-guarded predicate: `true` iff `error` is an object carrying a string
 * `message` that begins with the Plan 04 trigger's `plan_limit_exceeded:`
 * prefix. Narrows `unknown` via safe property reads (no unsafe assertions), and
 * returns `false` for `null`/`undefined`/bare strings/non-string messages
 * (never throws).
 */
export function isStoragePlanLimitError(error: unknown): boolean {
	if (typeof error !== "object" || error === null) return false;

	// The SQLSTATE first: it is the only field that survives a Storage API
	// upload rejection, and it is unambiguous on its own.
	const code = (error as { code?: unknown }).code;
	if (code === STORAGE_PLAN_LIMIT_SQLSTATE) return true;

	// Then the message prefix, which survives the PostgREST path. Some clients
	// surface the SQLSTATE only inside the message ("database error, code: PLIM1"),
	// so that shape counts too.
	const message = (error as { message?: unknown }).message;
	if (typeof message !== "string") return false;
	return (
		message.startsWith(STORAGE_PLAN_LIMIT_PREFIX) ||
		message.includes(STORAGE_PLAN_LIMIT_SQLSTATE)
	);
}

/**
 * Pure, NON-destructive pre-check: would adding `incomingBytes` push the owner's
 * current usage at/over a FINITE quota? Returns `false` for unlimited (Max) and
 * a negative limit — a grandfathered / Max / flag-off owner must never be
 * client-blocked (the DB trigger is authoritative). `>=` matches the trigger,
 * which enforces on the pre-existing SUM.
 */
export function wouldExceedStorageQuota(
	usage: StorageUsage,
	incomingBytes: number,
): boolean {
	if (usage.unlimited || usage.limitGb < 0) return false;
	const limitBytes = usage.limitGb * BYTES_PER_GB;
	return usage.usedBytes + Math.max(0, incomingBytes) >= limitBytes;
}
