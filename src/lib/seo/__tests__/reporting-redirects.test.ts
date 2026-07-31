import { describe, expect, it } from "vitest";
import { PRIVATE_ROUTE_PREFIXES } from "#lib/routes/private-routes";
import { REPORTING_REDIRECTS } from "../reporting-redirects";

// Invariants for the Phase 56 reporting redirect map (RPTHUB-02).
//
// D-40 CAVEAT — read this before interpreting the Guard B block below. Guard B
// proves "no config redirect matched this path", NOT "these are seven live
// pages". Only THREE of the seven /analytics/* routes are real pages
// (/analytics/overview, /analytics/financial, /analytics/property-performance);
// the other four (/analytics, /analytics/leases, /analytics/maintenance,
// /analytics/occupancy) are in-app redirect shims. Do not let these assertions
// be misread as page-existence coverage for the /analytics section.

const sources = REPORTING_REDIRECTS.map((r) => r.source);

// Guard A — the three /reports paths that keep their exact current URL under
// the flat-slug hub IA. Emitting a redirect for any of them is a self-redirect,
// i.e. ERR_TOO_MANY_REDIRECTS on a route that works today.
const GUARD_A_IDENTITY_PATHS = [
	"/reports",
	"/reports/generate",
	"/reports/year-end",
] as const;

// Guard B — the /analytics routes that are not moving at all under D-29 full
// separation. /analytics/financial gets its own named test below, so it is
// deliberately absent from this list.
const GUARD_B_UNMOVED_ANALYTICS_PATHS = [
	"/analytics",
	"/analytics/leases",
	"/analytics/maintenance",
	"/analytics/occupancy",
	"/analytics/overview",
	"/analytics/property-performance",
] as const;

describe("REPORTING_REDIRECTS — map shape", () => {
	it("source array EQUALS the seven D-32 sources, in order", () => {
		// EQUALITY, never a subset check. A stale pre-2026-07-30 entry
		// { source: "/analytics/financial", destination: "/reports/analytics" }
		// passes every per-path .not.toContain() guard further down: it does not
		// loop, uses no wildcard and collides with nothing. This assertion is
		// the ONLY structural defence against it.
		expect(REPORTING_REDIRECTS.map((r) => r.source)).toEqual([
			"/financials",
			"/financials/balance-sheet",
			"/financials/cash-flow",
			"/financials/expenses",
			"/financials/income-statement",
			"/financials/tax-documents",
			"/reports/analytics",
		]);
	});

	it("maps every source to its exact D-32 destination", () => {
		expect(REPORTING_REDIRECTS.map((r) => [r.source, r.destination])).toEqual([
			["/financials", "/reports"],
			["/financials/balance-sheet", "/reports/balance-sheet"],
			["/financials/cash-flow", "/reports/cash-flow"],
			["/financials/expenses", "/reports/expenses"],
			["/financials/income-statement", "/reports/income-statement"],
			["/financials/tax-documents", "/reports/tax-documents"],
			["/reports/analytics", "/analytics/overview"],
		]);
	});

	it("holds exactly seven entries", () => {
		expect(REPORTING_REDIRECTS).toHaveLength(7);
	});
});

describe("REPORTING_REDIRECTS — Guard A (identity no-ops)", () => {
	it.each(GUARD_A_IDENTITY_PATHS)(
		"%s is never a source (a self-redirect is ERR_TOO_MANY_REDIRECTS)",
		(path) => {
			expect(sources).not.toContain(path);
		},
	);
});

describe("REPORTING_REDIRECTS — Guard B (routes that are not moving)", () => {
	it("/analytics/financial is NEVER a source — it stays live under D-29", () => {
		// Highest-risk entry in the whole map. The 2026-07-26 draft sent it to
		// /reports/analytics; under full separation that would 308 a live,
		// correct page into a URL this phase deletes, and map entry 7 would
		// then bounce it straight back out.
		const offenders = REPORTING_REDIRECTS.filter(
			(r) => r.source === "/analytics/financial",
		);
		expect(offenders).toEqual([]);
	});

	it.each(GUARD_B_UNMOVED_ANALYTICS_PATHS)(
		"%s is never a source (redirecting it would break a live route)",
		(path) => {
			expect(sources).not.toContain(path);
		},
	);
});

describe("REPORTING_REDIRECTS — the inversion (entry 7)", () => {
	it("exactly one entry points away from /reports, and it is /reports/analytics", () => {
		const outbound = REPORTING_REDIRECTS.filter(
			(r) => !r.destination.startsWith("/reports"),
		);
		expect(outbound).toEqual([
			{ source: "/reports/analytics", destination: "/analytics/overview" },
		]);
	});

	it("no destination is the bare /analytics path (308 -> 307 chain guard)", () => {
		// src/app/(owner)/analytics/page.tsx is a five-line
		// redirect("/analytics/overview"), so targeting bare /analytics would
		// chain a config 308 into a filesystem 307 on every legacy hit.
		const offenders = REPORTING_REDIRECTS.filter(
			(r) => r.destination === "/analytics",
		);
		expect(offenders).toEqual([]);
	});
});

describe("REPORTING_REDIRECTS — structural hygiene", () => {
	it("never redirects a path to itself", () => {
		const offenders = REPORTING_REDIRECTS.filter(
			(r) => r.source === r.destination,
		);
		expect(offenders).toEqual([]);
	});

	it("sources are unique (no duplicate redirect rules)", () => {
		expect(new Set(sources).size).toBe(sources.length);
	});

	it("every source is a plain literal path — no wildcard, param or regex char", () => {
		// Ordering-shadow hazards exist only under wildcards: literal sources
		// compile to both-ends-anchored regexes, so /analytics can never shadow
		// /analytics/financial. A parameterised source could also capture a
		// caller-controlled segment into a destination (open-redirect surface).
		const offenders = REPORTING_REDIRECTS.filter(
			(r) => !/^\/[a-z0-9/-]+$/.test(r.source) || /[:*(]/.test(r.source),
		);
		expect(offenders).toEqual([]);
	});
});

describe("REPORTING_REDIRECTS — proxy isolation (RPTHUB-02)", () => {
	it("PRIVATE_ROUTE_PREFIXES still gates both /analytics and /reports", () => {
		// RPTHUB-02 routes every redirect through next.config.ts ONLY; proxy.ts
		// is not involved (config redirects resolve at Next.js step 2, before
		// the proxy auth gate at step 3). This assertion pins the other half of
		// that contract: every destination in the map must still land on an
		// auth-gated prefix. Removing "/analytics" here would un-gate the
		// analytics routes in BOTH proxy.ts (auth) and robots.ts (crawler
		// disallow) — the highest-consequence line in this phase's diff.
		expect(PRIVATE_ROUTE_PREFIXES).toContain("/analytics");
		expect(PRIVATE_ROUTE_PREFIXES).toContain("/reports");
	});

	it("every destination sits under a gated prefix", () => {
		const gated: readonly string[] = PRIVATE_ROUTE_PREFIXES;
		const offenders = REPORTING_REDIRECTS.filter(
			(r) =>
				!gated.some(
					(prefix) =>
						r.destination === prefix || r.destination.startsWith(`${prefix}/`),
				),
		);
		expect(offenders).toEqual([]);
	});
});
