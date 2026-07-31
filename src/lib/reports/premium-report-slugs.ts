/**
 * Frontend mirror of the `PREMIUM_REPORT_TYPES` set declared in
 * `supabase/functions/export-report/index.ts` and
 * `supabase/functions/generate-pdf/index.ts`.
 *
 * The two Deno sets are the ENFORCEMENT POINT — they return the 402 that
 * actually gates a premium export. This constant is PRESENTATION-ONLY: it
 * decides which hub tiles carry a `Growth` badge and nothing else. It must
 * never drive an authorization branch, a disabled control, or a route guard
 * (RPTHUB-03, D-13).
 *
 * `supabase/functions/__tests__/premium-report-gate.test.ts` (plan 56-04)
 * asserts all three sets stay set-equal, so the badge cannot drift into a
 * false claim about what is gated.
 */
export const PREMIUM_REPORT_SLUGS: ReadonlySet<string> = new Set([
	"year-end",
	"1099",
	"financial",
	"income-statement",
	"cash-flow",
]);
