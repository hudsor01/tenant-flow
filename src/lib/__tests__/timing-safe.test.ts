/**
 * CISEC-03 — Constant-time hook-secret compare contract gate.
 *
 * Pins the behavior of the shared `timingSafeEqualStr` helper at
 * `supabase/functions/_shared/timing-safe.ts`, used by `send-lease-reminders`
 * to compare the Authorization Bearer token against `REMINDERS_INVOKE_SECRET`
 * in constant time (closing the timing side-channel CISEC-03), and by
 * `_shared/rate-limit.ts` for `CLIENT_IP_FORWARD_SECRET`.
 *
 * The helper is pure TS — it depends only on `TextEncoder` + `crypto.subtle`,
 * both available in node/jsdom — so it runs in the `checks`/`unit` gate with no
 * server, no Deno runtime, and no prod secret.
 */
import { describe, expect, it } from "vitest";

import { timingSafeEqualStr } from "../../../supabase/functions/_shared/timing-safe";

describe("timingSafeEqualStr", () => {
	it("returns true for equal strings", () => {
		expect(timingSafeEqualStr("abc", "abc")).toBe(true);
	});

	it("returns false for unequal strings of the same length", () => {
		expect(timingSafeEqualStr("abc", "abd")).toBe(false);
	});

	it("returns false for strings of different length", () => {
		expect(timingSafeEqualStr("abc", "abcd")).toBe(false);
	});

	it("returns true for two empty strings", () => {
		expect(timingSafeEqualStr("", "")).toBe(true);
	});

	it("returns true for a longer secret comparing equal", () => {
		const secret = "super-secret-hook-token-0123456789";
		expect(timingSafeEqualStr(secret, secret)).toBe(true);
	});

	it("returns false when only the final byte differs", () => {
		expect(timingSafeEqualStr("hook-secret-value", "hook-secret-valuf")).toBe(
			false,
		);
	});
});
