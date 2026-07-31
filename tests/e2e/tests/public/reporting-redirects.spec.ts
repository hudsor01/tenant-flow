import { expect, test } from "@playwright/test";

test.describe("Reporting hub redirects — Phase 56 (RPTHUB-02)", () => {
	// Each positive rule is asserted with two checks:
	//  1. status code is 301 or 308 (Next.js `permanent: true` emits 308; we
	//     accept either to avoid lock-in to one specific code if a future
	//     maintainer ever swaps to statusCode: 301)
	//  2. Location header matches the canonical destination exactly
	//
	// maxRedirects: 0 stops Playwright from auto-following — we want to
	// inspect the redirect response itself, not the final destination.
	//
	// This spec lands in the `public` project and needs no auth: config
	// redirects resolve at Next.js step 2, before the proxy auth gate at
	// step 3. That ordering is also why RPTHUB-02's "no proxy involvement"
	// holds structurally rather than by convention.
	//
	// TRAILING-SLASH GOTCHA: Next auto-injects a `/:path+/` -> `/:path+` 308
	// as the FIRST entry in the compiled redirect table, so a trailing-slash
	// form takes two hops. Every assertion below uses the slash-less form only.
	//
	// THE `/financials/*` STRINGS IN THIS FILE ARE URLs UNDER TEST — they are
	// redirect SOURCES, not live links. They are expected to survive Phase 56's
	// `/financials` sweep, along with `src/lib/seo/reporting-redirects.ts` and
	// its unit test; all three basenames carry `reporting-redirects`, which is
	// exactly how that sweep filters them. Do NOT "finish the migration" by
	// deleting them — a redirect map that cannot name its own legacy sources is
	// useless.
	//
	// All 17 assertions are written out literally rather than generated from a
	// loop, matching the sibling routing-aliases.spec.ts, so each path is
	// independently named in the CI report and greppable in this file.

	// ─────────────────────────────────────────
	// 7 POSITIVE — the map's entries, served
	// ─────────────────────────────────────────

	test("RPTHUB-02: /financials 301/308s to /reports", async ({ page }) => {
		const response = await page.request.get("/financials", {
			maxRedirects: 0,
		});
		expect([301, 308]).toContain(response.status());
		expect(response.headers().location).toBe("/reports");
	});

	test("RPTHUB-02: /financials/balance-sheet 301/308s to /reports/balance-sheet", async ({
		page,
	}) => {
		const response = await page.request.get("/financials/balance-sheet", {
			maxRedirects: 0,
		});
		expect([301, 308]).toContain(response.status());
		expect(response.headers().location).toBe("/reports/balance-sheet");
	});

	test("RPTHUB-02: /financials/cash-flow 301/308s to /reports/cash-flow", async ({
		page,
	}) => {
		const response = await page.request.get("/financials/cash-flow", {
			maxRedirects: 0,
		});
		expect([301, 308]).toContain(response.status());
		expect(response.headers().location).toBe("/reports/cash-flow");
	});

	test("RPTHUB-02: /financials/expenses 301/308s to /reports/expenses", async ({
		page,
	}) => {
		const response = await page.request.get("/financials/expenses", {
			maxRedirects: 0,
		});
		expect([301, 308]).toContain(response.status());
		expect(response.headers().location).toBe("/reports/expenses");
	});

	test("RPTHUB-02: /financials/income-statement 301/308s to /reports/income-statement", async ({
		page,
	}) => {
		const response = await page.request.get("/financials/income-statement", {
			maxRedirects: 0,
		});
		expect([301, 308]).toContain(response.status());
		expect(response.headers().location).toBe("/reports/income-statement");
	});

	test("RPTHUB-02: /financials/tax-documents 301/308s to /reports/tax-documents", async ({
		page,
	}) => {
		const response = await page.request.get("/financials/tax-documents", {
			maxRedirects: 0,
		});
		expect([301, 308]).toContain(response.status());
		expect(response.headers().location).toBe("/reports/tax-documents");
	});

	test("RPTHUB-02: THE INVERSION — /reports/analytics is the ONE redirect pointing AWAY from the hub, and it targets the concrete /analytics/overview", async ({
		page,
	}) => {
		// Entry 7 of the map. The other six point INTO /reports; this one points
		// out of it, because D-29 full separation puts every chart — operational
		// and financial — under /analytics. Do not "correct" it.
		const response = await page.request.get("/reports/analytics", {
			maxRedirects: 0,
		});
		expect([301, 308]).toContain(response.status());
		expect(response.headers().location).toBe("/analytics/overview");
		// Chain guard: targeting bare /analytics would produce a 308 -> 307 chain,
		// because src/app/(owner)/analytics/page.tsx in-page-redirects to
		// /analytics/overview. The destination must be the concrete route.
		expect(response.headers().location).not.toBe("/analytics");
	});

	// ─────────────────────────────────────────
	// GUARD A — 3 identity no-ops
	// ─────────────────────────────────────────
	//
	// The hub uses flat slugs, so these three keep their exact current paths.
	// Emitting a redirect for any of them is a self-redirect, i.e.
	// ERR_TOO_MANY_REDIRECTS on a route that works today.
	//
	// Both guard blocks assert "the status is NOT a permanent redirect" rather
	// than asserting 200 or 404. These routes are auth-gated, so an anonymous
	// request legitimately receives a 307 to /login. Only a 301/308 proves a
	// config redirect matched, which is exactly the defect being guarded. No
	// Location assertion is made on a guard: the point is the ABSENCE of a
	// permanent redirect, not what a 307 points at.

	test("RPTHUB-02: Guard A — /reports emits no permanent redirect", async ({
		page,
	}) => {
		const response = await page.request.get("/reports", { maxRedirects: 0 });
		expect([301, 308]).not.toContain(response.status());
	});

	test("RPTHUB-02: Guard A — /reports/generate emits no permanent redirect", async ({
		page,
	}) => {
		const response = await page.request.get("/reports/generate", {
			maxRedirects: 0,
		});
		expect([301, 308]).not.toContain(response.status());
	});

	test("RPTHUB-02: Guard A — /reports/year-end emits no permanent redirect", async ({
		page,
	}) => {
		const response = await page.request.get("/reports/year-end", {
			maxRedirects: 0,
		});
		expect([301, 308]).not.toContain(response.status());
	});

	// ─────────────────────────────────────────
	// GUARD B — 7 analytics routes that are not moving
	// ─────────────────────────────────────────
	//
	// D-40 CAVEAT: these assertions prove "no config redirect matched" — they do
	// NOT prove "these are 7 live pages". Only 3 of the 7 are real pages
	// (/analytics/overview, /analytics/financial, /analytics/property-performance);
	// the other 4 are in-app redirect shims to `?tab=insights` surfaces, and
	// /analytics itself in-page-redirects to /analytics/overview. Do not misread
	// this block as page-existence coverage.

	test("RPTHUB-02: Guard B — /analytics/financial emits no permanent redirect (the highest-risk guard)", async ({
		page,
	}) => {
		// A stale pre-2026-07-30 map entry sent /analytics/financial to
		// /reports/analytics. It does not loop and uses no wildcard, so every
		// per-path subset check passes it — it would simply 308 a live, correct
		// page into a URL that no longer exists, and map entry 7 would then bounce
		// it straight back out to /analytics/overview.
		const response = await page.request.get("/analytics/financial", {
			maxRedirects: 0,
		});
		expect([301, 308]).not.toContain(response.status());
	});

	test("RPTHUB-02: Guard B — /analytics emits no permanent redirect", async ({
		page,
	}) => {
		const response = await page.request.get("/analytics", { maxRedirects: 0 });
		expect([301, 308]).not.toContain(response.status());
	});

	test("RPTHUB-02: Guard B — /analytics/leases emits no permanent redirect", async ({
		page,
	}) => {
		const response = await page.request.get("/analytics/leases", {
			maxRedirects: 0,
		});
		expect([301, 308]).not.toContain(response.status());
	});

	test("RPTHUB-02: Guard B — /analytics/maintenance emits no permanent redirect", async ({
		page,
	}) => {
		const response = await page.request.get("/analytics/maintenance", {
			maxRedirects: 0,
		});
		expect([301, 308]).not.toContain(response.status());
	});

	test("RPTHUB-02: Guard B — /analytics/occupancy emits no permanent redirect", async ({
		page,
	}) => {
		const response = await page.request.get("/analytics/occupancy", {
			maxRedirects: 0,
		});
		expect([301, 308]).not.toContain(response.status());
	});

	test("RPTHUB-02: Guard B — /analytics/overview emits no permanent redirect", async ({
		page,
	}) => {
		const response = await page.request.get("/analytics/overview", {
			maxRedirects: 0,
		});
		expect([301, 308]).not.toContain(response.status());
	});

	test("RPTHUB-02: Guard B — /analytics/property-performance emits no permanent redirect", async ({
		page,
	}) => {
		const response = await page.request.get("/analytics/property-performance", {
			maxRedirects: 0,
		});
		expect([301, 308]).not.toContain(response.status());
	});
});
