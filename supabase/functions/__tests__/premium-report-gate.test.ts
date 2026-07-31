/**
 * RPTHUB-03 — premium-report tier-gate drift guard.
 *
 * WHAT ENFORCES THE GATE: the server-side 402 returned by `checkTierEntitlement`
 * inside `supabase/functions/export-report/index.ts` and
 * `supabase/functions/generate-pdf/index.ts`. This file does NOT and CANNOT
 * enforce that gate — it runs in Node, has no request context and never reaches
 * an edge function. All it proves is that the three places the gated set is
 * written down have not drifted apart, and that both edge functions still
 * consult their set rather than merely declaring it.
 *
 * THE THREE SOURCES:
 *   1. supabase/functions/export-report/index.ts  — PREMIUM_REPORT_TYPES (gate)
 *   2. supabase/functions/generate-pdf/index.ts   — PREMIUM_REPORT_TYPES (gate,
 *      Mode 1 only; it bypasses export-report entirely, so the same set is
 *      duplicated there)
 *   3. src/lib/reports/premium-report-slugs.ts    — PREMIUM_REPORT_SLUGS, a
 *      presentation-only mirror that decides which `/reports` hub tiles carry a
 *      `Growth` badge (D-13: never an authorization branch)
 *
 * WHY THE DUPLICATION SURVIVES: consolidating the two Deno sets into
 * `supabase/functions/_shared/` is deliberately DEFERRED (D-12). It would
 * require redeploying both edge functions, which is a change of a different
 * kind from "verify intact". Phase 56's job is to make the drift impossible to
 * merge silently, not to remove the duplication.
 *
 * WHY THE SOURCES ARE READ FROM DISK: the two edge functions are Deno modules —
 * they import `../_shared/*.ts` with explicit extensions and call `Deno.serve`,
 * so Vitest cannot import them. Reading the text and extracting the `new Set([
 * ... ])` literal is the only way to compare the deployed sets from a Node test.
 * A consequence worth stating plainly: this is a Vitest unit test, not a Deno
 * test. It does NOT require `supabase functions serve` and runs in CI with the
 * rest of the unit suite.
 *
 * WHY COMPARE THE SOURCES TO EACH OTHER RATHER THAN TO A LITERAL: a test that
 * asserted the current five members against a hardcoded list would pass today
 * and still let the three sources diverge tomorrow — editing any one of them
 * would leave the other two, and the test, untouched. Every equality assertion
 * below is source-against-source, so editing any single source fails the suite.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	hasGrowthBadge,
	REPORTS_HUB_ENTRIES,
} from "#app/(owner)/reports/reports-hub-entries";
import { PREMIUM_REPORT_SLUGS } from "#lib/reports/premium-report-slugs";

function readRepoSource(relativePath: string): string {
	return readFileSync(
		fileURLToPath(new URL(relativePath, import.meta.url)),
		"utf8",
	);
}

const EXPORT_REPORT_SOURCE = readRepoSource("../export-report/index.ts");
const GENERATE_PDF_SOURCE = readRepoSource("../generate-pdf/index.ts");

/**
 * Matches `const PREMIUM_REPORT_TYPES<any annotation> = new Set([ ... ])`.
 * The `const` keyword is required so the comment above `generate-pdf`'s mirror
 * (which names the constant) cannot be mistaken for the declaration. The
 * annotation is left open so a `ReadonlySet<string>` -> `Set<string>` change
 * does not produce a spurious parse failure.
 */
const DECLARATION_PATTERN =
	/const\s+PREMIUM_REPORT_TYPES\b[^=]*=\s*new Set\(\s*\[([\s\S]*?)\]\s*\)/;

const GATE_CALL_PATTERN = /if\s*\(\s*PREMIUM_REPORT_TYPES\.has\(/;

/**
 * A gate is only real if the `if` actually leads to the entitlement check.
 * Assert `checkTierEntitlement` appears inside this window of the conditional
 * rather than merely somewhere in the file, so deleting the call while leaving
 * an unrelated reference behind still fails.
 */
const GATE_BODY_WINDOW = 400;

function parsePremiumReportTypes(source: string, label: string): string[] {
	const match = DECLARATION_PATTERN.exec(source);
	if (match === null) {
		throw new Error(
			`${label}: no \`const PREMIUM_REPORT_TYPES ... = new Set([...])\` declaration found. ` +
				"The tier gate may have been renamed, removed or restructured. Inspect the " +
				"edge function before changing this parser — a parser loosened to make this " +
				"pass would disable the drift guard.",
		);
	}
	const body = match[1];
	if (body === undefined) {
		throw new Error(
			`${label}: matched the declaration but captured no set body.`,
		);
	}
	const withoutComments = body.replace(/\/\/[^\n]*/g, "");
	const members: string[] = [];
	for (const member of withoutComments.matchAll(/["']([^"']+)["']/g)) {
		const value = member[1];
		if (value !== undefined) members.push(value);
	}
	return members;
}

function sorted(values: Iterable<string>): string[] {
	return [...values].sort();
}

function assertGateWiring(source: string, label: string): void {
	const gateMatch = GATE_CALL_PATTERN.exec(source);
	expect(
		gateMatch,
		`${label}: no \`if (PREMIUM_REPORT_TYPES.has(...))\` conditional found — the set is declared but no longer consulted`,
	).not.toBeNull();
	const gateIndex = gateMatch?.index ?? -1;
	const gateBody = source.slice(gateIndex, gateIndex + GATE_BODY_WINDOW);
	expect(
		gateBody,
		`${label}: the PREMIUM_REPORT_TYPES conditional no longer calls checkTierEntitlement`,
	).toContain("checkTierEntitlement");
}

const EXPORT_REPORT_TYPES = parsePremiumReportTypes(
	EXPORT_REPORT_SOURCE,
	"export-report",
);
const GENERATE_PDF_TYPES = parsePremiumReportTypes(
	GENERATE_PDF_SOURCE,
	"generate-pdf",
);

describe("PREMIUM_REPORT_TYPES extraction", () => {
	it("yields a non-empty, duplicate-free member list from both edge functions", () => {
		// Guards against a vacuous pass: a parser that silently returned []
		// would make every set-equality assertion below trivially true.
		expect(
			EXPORT_REPORT_TYPES.length,
			"export-report: parsed an empty PREMIUM_REPORT_TYPES set",
		).toBeGreaterThan(0);
		expect(
			GENERATE_PDF_TYPES.length,
			"generate-pdf: parsed an empty PREMIUM_REPORT_TYPES set",
		).toBeGreaterThan(0);

		expect(sorted(new Set(EXPORT_REPORT_TYPES))).toEqual(
			sorted(EXPORT_REPORT_TYPES),
		);
		expect(sorted(new Set(GENERATE_PDF_TYPES))).toEqual(
			sorted(GENERATE_PDF_TYPES),
		);

		for (const member of [...EXPORT_REPORT_TYPES, ...GENERATE_PDF_TYPES]) {
			expect(member.trim()).not.toBe("");
		}
	});
});

describe("D-12 cross-source set equality", () => {
	it("the two Deno PREMIUM_REPORT_TYPES sets are set-equal", () => {
		// T-56-12: if these drift, a report type gated in export-report can be
		// ungated in generate-pdf, and a free-tier owner reaches the paid export
		// through generate-pdf Mode 1. Sorted arrays so a failure prints both sides.
		expect(sorted(GENERATE_PDF_TYPES)).toEqual(sorted(EXPORT_REPORT_TYPES));
	});

	it("the frontend PREMIUM_REPORT_SLUGS mirror is set-equal to the edge-function sets", () => {
		// The mirror is presentation-only, so a divergence does not open the gate —
		// it produces a `Growth` badge that lies about what is gated, which is a
		// claims-integrity failure in its own right. Equality against export-report
		// plus the assertion above makes all three sets mutually equal.
		expect(sorted(PREMIUM_REPORT_SLUGS)).toEqual(sorted(EXPORT_REPORT_TYPES));
	});
});

describe("gate wiring", () => {
	it("export-report still consults PREMIUM_REPORT_TYPES before exporting", () => {
		assertGateWiring(EXPORT_REPORT_SOURCE, "export-report");
	});

	it("generate-pdf Mode 1 still consults PREMIUM_REPORT_TYPES before rendering", () => {
		assertGateWiring(GENERATE_PDF_SOURCE, "generate-pdf");
	});
});

describe("T-56-14 hub badge fidelity", () => {
	it("every hub entry with a gatedReportType maps to a genuinely gated report type", () => {
		const gatedEntries = REPORTS_HUB_ENTRIES.filter(
			(entry) => entry.gatedReportType !== null,
		);
		expect(gatedEntries.length).toBeGreaterThan(0);
		for (const entry of gatedEntries) {
			expect(
				entry.gatedReportType === null ||
					PREMIUM_REPORT_SLUGS.has(entry.gatedReportType),
				`hub entry "${entry.id}" claims gatedReportType "${entry.gatedReportType}", which is not in the gated set`,
			).toBe(true);
		}
	});

	it("exactly the tax-documents and year-end entries carry the Growth badge", () => {
		// The hub must not advertise a paywall on an ungated report, nor hide one
		// on a gated report. `executive-monthly` is deliberately NOT premium — it
		// reaches every tier — which is why no export tile other than Year-End is
		// badged.
		const badgedIds = REPORTS_HUB_ENTRIES.filter(hasGrowthBadge).map(
			(entry) => entry.id,
		);
		expect(sorted(badgedIds)).toEqual(["tax-documents", "year-end"]);
	});
});

describe("D-13 export call-site values survive the route consolidation", () => {
	it("the reportType values reachable from the hub's badged routes are still gated", () => {
		// Phase 56 moves URLs, not payloads: no route rewrite in this phase changes
		// any `reportType` string. `/reports/tax-documents` still sends "financial"
		// and `/reports/year-end` still sends "year-end" — the same two values those
		// CTAs sent before the consolidation. Both are checked against the PARSED
		// export-report set, not against a copy of it, so removing either from the
		// edge function fails here (T-56-13).
		const badgedReportTypes = REPORTS_HUB_ENTRIES.filter(hasGrowthBadge).map(
			(entry) => entry.gatedReportType,
		);
		expect(sorted(badgedReportTypes.filter((v) => v !== null))).toEqual([
			"financial",
			"year-end",
		]);

		expect(EXPORT_REPORT_TYPES).toContain("financial");
		expect(EXPORT_REPORT_TYPES).toContain("year-end");
	});
});
