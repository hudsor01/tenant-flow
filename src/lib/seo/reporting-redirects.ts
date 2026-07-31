// Phase 56 reporting-hub redirect map (RPTHUB-02). Seven permanent (308) rules
// that collapse the duplicated financial-statement surfaces into one /reports
// hub. Consumed by next.config.ts redirects(), which applies `permanent: true`
// uniformly at the spread site — exactly how DELETED_BLOG_REDIRECTS is
// consumed — so no entry carries its own `permanent` field.
//
// Unlike the blog map there is no filterActiveRedirects equivalent here: that
// filter exists only because the blog map is build-time-filtered against a live
// Supabase slug set. This map is static and complete.
//
// READ BEFORE EDITING — this map is deliberately asymmetric.
//
// (a) THE INVERSION. Entry 7, /reports/analytics -> /analytics/overview, is the
//     ONE rule in this map that points AWAY from /reports; the other six point
//     into the hub. That is deliberate (56-CONTEXT D-29 "full separation":
//     /reports holds financial statements and exports only, and every chart —
//     operational and financial — lives under /analytics). Do NOT "correct" it
//     on the assumption that every arrow should point at the hub. Flipping it
//     would send a live page into /reports/analytics, a route this phase
//     deletes.
//
// (b) WHY /analytics/overview AND NOT BARE /analytics. src/app/(owner)/
//     analytics/page.tsx is a five-line `redirect("/analytics/overview")`.
//     Targeting /analytics would turn every legacy hit into a 308 -> 307 chain,
//     so entry 7 targets the concrete route (D-10 exact-equivalent targeting).
//
// (c) Guard A — IDENTITY NO-OPS, NEVER ADD THESE. The hub uses flat slugs, so
//     /reports, /reports/generate and /reports/year-end keep their current
//     paths. None of the three may ever appear as a source: a self-redirect is
//     ERR_TOO_MANY_REDIRECTS on a route that works today.
//
// (d) Guard B — ROUTES THAT ARE NOT MOVING, NEVER ADD THESE EITHER. None of the
//     seven analytics paths — /analytics, /analytics/financial,
//     /analytics/leases, /analytics/maintenance, /analytics/occupancy,
//     /analytics/overview, /analytics/property-performance — may ever appear as
//     a source. /analytics/financial is the highest-risk member of the set: a
//     stale pre-2026-07-30 draft of this map sent it to /reports/analytics.
//     That entry does not loop and uses no wildcard, so every per-path subset
//     check passes it — it would simply 308 a live, correct page into a URL
//     that will not exist, and entry 7 would then bounce it straight back out.
//     Only the source-array EQUALITY assertion in
//     __tests__/reporting-redirects.test.ts catches it.

export interface ReportingRedirect {
	readonly source: string;
	readonly destination: string;
}

export const REPORTING_REDIRECTS: readonly ReportingRedirect[] = [
	{
		source: "/financials",
		destination: "/reports",
	},
	{
		source: "/financials/balance-sheet",
		destination: "/reports/balance-sheet",
	},
	{
		source: "/financials/cash-flow",
		destination: "/reports/cash-flow",
	},
	{
		source: "/financials/expenses",
		destination: "/reports/expenses",
	},
	{
		source: "/financials/income-statement",
		destination: "/reports/income-statement",
	},
	{
		source: "/financials/tax-documents",
		destination: "/reports/tax-documents",
	},
	// Entry 7 — the inversion. See (a) and (b) above.
	{
		source: "/reports/analytics",
		destination: "/analytics/overview",
	},
];
