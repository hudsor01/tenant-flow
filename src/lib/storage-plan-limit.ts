/**
 * Storage plan-limit detection + pre-check helpers (METER-04 / D-03).
 *
 * Storage uploads go through `@supabase/storage-js`, so a quota rejection is a
 * `StorageApiError` that carries only `{ name, message, status, statusCode }` —
 * no `.hint`/`.detail`. The Plan 04 `enforce_storage_quota` trigger RAISEs a
 * message that BEGINS with the literal `plan_limit_exceeded:` prefix, and that
 * prefix is the ONLY quota signal that survives to `StorageApiError.message`.
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
	const message = (error as { message?: unknown }).message;
	return (
		typeof message === "string" && message.startsWith(STORAGE_PLAN_LIMIT_PREFIX)
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
