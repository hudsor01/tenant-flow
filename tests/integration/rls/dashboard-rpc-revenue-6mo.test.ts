/**
 * Integration tests for `get_dashboard_data_v2` — pins the Phase 4 CHART-01
 * contract (D-01) for the new `time_series.monthly_revenue_6mo` JSONB key
 * introduced by migration `20260526203003_phase4_revenue_trend_6mo.sql`
 * (applied to prod 2026-05-26, see 04-01a-SUMMARY).
 *
 * Contracts pinned by this file:
 *
 * 1. Own-owner happy path: caller passing their own user_id receives a
 *    6-entry array of `{ month: "YYYY-MM", value: number >= 0 }` rows
 *    sorted ascending by month. Shape only — NEVER dollar-value fixturing
 *    (RESEARCH.md Q5: 6mo revenue is non-deterministic against prod, so
 *    asserting specific values is fragile and tells us nothing the shape
 *    check doesn't already cover).
 *
 * 2. Cross-owner rejection (A → B): `auth.uid() != p_user_id` guard
 *    preserved by Plan 04-01a's migration; rejection message matches
 *    `/access denied/i` per the SHIPPED Phase 2 cycle-10 contract
 *    (migration `20260524012602` aligned this RPC to project convention).
 *    This is NOT the older empty-result contract from the cycle-1
 *    Phase 2 plan — RESEARCH.md Pitfall 1.
 *
 * 3. Cross-owner rejection (B → A): symmetric coverage proves the guard
 *    is not one-directional.
 *
 * Pattern matches `tests/integration/rls/dashboard-rpc-open-maintenance.test.ts`
 * (canonical Phase 2 RLS pattern). No fixtures created — the 6mo series
 * materializes against whatever active leases each owner already has;
 * if zero leases exist, every entry's `value` is 0 and the shape check
 * still pins the contract.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";

interface MonthlyRevenueRpcEntry {
	month: string;
	value: number;
}

describe("get_dashboard_data_v2 — monthly_revenue_6mo (Phase 4 CHART-01) RLS isolation", () => {
	let clientA: SupabaseClient;
	let clientB: SupabaseClient;
	let ownerAId: string;
	let ownerBId: string;

	beforeAll(async () => {
		const { ownerA, ownerB } = getTestCredentials();
		clientA = await createTestClient(ownerA.email, ownerA.password);
		clientB = await createTestClient(ownerB.email, ownerB.password);

		const {
			data: { user: userA },
		} = await clientA.auth.getUser();
		const {
			data: { user: userB },
		} = await clientB.auth.getUser();
		ownerAId = userA!.id;
		ownerBId = userB!.id;
	});

	// -------------------------------------------------------------------------
	// HAPPY PATH — ownerA passing their own user_id receives a 6-bucket series
	// -------------------------------------------------------------------------

	it("returns a 6-entry monthly_revenue_6mo array sorted ascending by month", async () => {
		const { data, error } = await clientA.rpc("get_dashboard_data_v2", {
			p_user_id: ownerAId,
		});
		expect(error).toBeNull();
		expect(data).toBeDefined();

		// Narrow via a typed boundary cast — Supabase's generated types
		// emit `unknown` for this dynamic-shape JSONB-returning RPC, so
		// a single direct cast through the expected object shape is the
		// project-idiomatic mapper-boundary entry point (CLAUDE.md
		// RPC/PostgREST). The shape assertions below validate every
		// field the test actually depends on; no double-cast pattern.
		const payload = data as {
			time_series?: { monthly_revenue_6mo?: MonthlyRevenueRpcEntry[] };
		};

		expect(payload).toBeDefined();
		expect(payload.time_series).toBeDefined();
		const series = payload.time_series?.monthly_revenue_6mo;
		expect(series).toBeDefined();
		expect(Array.isArray(series)).toBe(true);
		// Server always emits exactly 6 buckets: last 6 calendar months
		// inclusive of the current (possibly partial) month per Q1
		// resolution in 04-RESEARCH.md. Pin this — drift below 6 would
		// break the chart's 6mo toggle; drift above 6 would silently
		// regress the bucket-count contract.
		expect(series).toHaveLength(6);

		// Shape-only assertions per RESEARCH.md Q5 — no dollar values.
		// Owner A on prod has zero active leases (see 04-01a-SUMMARY
		// smoke test result), so values may be 0 across all buckets;
		// that's an honest empty state, not a fabrication. The shape
		// check still pins the contract.
		const months: string[] = [];
		for (const entry of series ?? []) {
			expect(entry).toBeDefined();
			// YYYY-MM format — first day of month projected to "YYYY-MM"
			// by the server's `to_char(month_start, 'YYYY-MM')` cast in
			// the `ts_revenue_6mo` CTE.
			expect(entry.month).toMatch(/^\d{4}-\d{2}$/);
			// `value` is dollars (per CLAUDE.md "numeric(10,2) stores
			// dollars"); never null, never negative — coalesced to 0
			// on the server.
			expect(typeof entry.value).toBe("number");
			expect(Number.isFinite(entry.value)).toBe(true);
			expect(entry.value).toBeGreaterThanOrEqual(0);
			months.push(entry.month);
		}

		// Each month string must be unique (no duplicate buckets).
		const uniqueMonths = new Set(months);
		expect(uniqueMonths.size).toBe(months.length);

		// Ascending order by YYYY-MM (lexicographic compare matches
		// chronological order for the YYYY-MM format). The chart UI
		// relies on this order — if the server returned buckets in an
		// arbitrary order, the line chart's x-axis would render with
		// time running backwards or scrambled.
		for (let i = 1; i < months.length; i++) {
			const previous = months[i - 1] ?? "";
			const current = months[i] ?? "";
			expect(current.localeCompare(previous)).toBeGreaterThan(0);
		}

		// Last bucket must be at most the current calendar month and at
		// least the previous calendar month — partial-month inclusion is
		// Q1's resolution. Allowing previous-month is the midnight-UTC
		// boundary tolerance: if the test fires just after the server
		// rolled over but the client clock hasn't, last bucket lags by
		// one month. If a future migration accidentally drops to a
		// stale window (e.g. -2 or more months behind), this pins the
		// regression.
		const now = new Date();
		const currentYearMonth = `${now.getUTCFullYear()}-${String(
			now.getUTCMonth() + 1,
		).padStart(2, "0")}`;
		const previousDate = new Date(
			Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
		);
		const previousYearMonth = `${previousDate.getUTCFullYear()}-${String(
			previousDate.getUTCMonth() + 1,
		).padStart(2, "0")}`;
		const lastBucket = months[months.length - 1];
		expect([currentYearMonth, previousYearMonth]).toContain(lastBucket);
	});

	// -------------------------------------------------------------------------
	// ISOLATION — ownerA passing ownerB's user_id is rejected with Access denied
	// -------------------------------------------------------------------------

	it("rejects cross-owner call A→B with /access denied/ (auth.uid() guard preserved)", async () => {
		const { data, error } = await clientA.rpc("get_dashboard_data_v2", {
			p_user_id: ownerBId,
		});
		// SECURITY DEFINER bypasses RLS — the per-CTE `where owner_user_id =
		// p_user_id` is NOT enough. Plan 04-01a's migration preserved the
		// explicit `auth.uid() != p_user_id → raise exception 'Access denied:
		// cannot request data for another user'` guard from Phase 2 cycle-10
		// (migration `20260524012602`). This test pins the guard against
		// future drift. If the guard were removed, `data` would carry
		// ownerB's full dashboard payload (the original P0 leak the cycle-4
		// migration `20260524001408` was added to prevent).
		expect(data).toBeNull();
		expect(error).not.toBeNull();
		// PRIMARY pin: SQLSTATE. The guard is a bare `raise exception` (no
		// `using errcode`, migration 20260524012602) → PostgreSQL default
		// 'P0001' (raise_exception). Asserting the code insulates this test
		// from chai-6 / message-string drift. NOT '42501' — that is only for
		// EXECUTE-revoke / grant denials, which this is not.
		expect(error?.code).toBe("P0001");
		// Defense-in-depth: the message lines remain a semantic-change canary.
		// Regex matches the SHIPPED project-standard message — used by 20+
		// other stats RPCs and asserted by `rpc-auth.test.ts`. Do NOT use
		// the older empty-array contract from the pre-cycle-10 Phase 2
		// plan (RESEARCH.md Pitfall 1).
		expect(error?.message).toMatch(/access denied/i);
		// Pin the full cycle-10 message phrasing so a future refactor that
		// swaps the wording to a different "access denied" phrase still passes
		// the regex but flags here that something semantic changed.
		expect(error?.message).toContain("cannot request data for another user");
	});

	// -------------------------------------------------------------------------
	// SYMMETRIC ISOLATION — ownerB passing ownerA's user_id is also rejected
	// -------------------------------------------------------------------------

	it("rejects cross-owner call B→A with /access denied/ (guard is symmetric)", async () => {
		const { data, error } = await clientB.rpc("get_dashboard_data_v2", {
			p_user_id: ownerAId,
		});
		// Symmetric coverage — proves the guard isn't accidentally
		// one-directional. Same contract as the A→B test above; if a
		// future refactor accidentally only checks one direction, this
		// test fails immediately.
		expect(data).toBeNull();
		expect(error).not.toBeNull();
		// PRIMARY pin: SQLSTATE 'P0001' (bare `raise exception`, no `using
		// errcode`). Same drift-insulated contract as the A→B block above.
		expect(error?.code).toBe("P0001");
		// Defense-in-depth: message lines as semantic-change canary.
		expect(error?.message).toMatch(/access denied/i);
		expect(error?.message).toContain("cannot request data for another user");
	});
});
