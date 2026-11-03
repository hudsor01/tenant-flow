/**
 * Drift guard (66.2-39 fix round 1, part Q): no owner surface calls rent that
 * was only scheduled, or a unit's listed rent, "revenue".
 *
 * CLAUDE.md, Domain model: "Revenue"/"income" here is SCHEDULED rent (the
 * active leases' rent), and cash exists only in the rent ledger. Part N and
 * part P named the charts of scheduled rent so; the sweep of everything else
 * found five more labels: the analytics overview's "Monthly Revenue" tile and
 * its top properties "Ranked by monthly revenue" (get_dashboard_data_v2's
 * scheduled rent), the dashboard chart's tooltip ("Revenue"), and the
 * properties page's "Monthly Revenue" column and stat and its cards' "Revenue"
 * (the occupied units' rent as listed on each unit, units.rent_amount: no lease
 * is read), and the financial analytics page's subtitle ("Track revenue,
 * profitability, and portfolio cash flow in real time" over scheduled rent,
 * rent collected and expenses, fetched every two minutes). They read
 * "Scheduled Monthly Rent", "Ranked by scheduled monthly rent", "Scheduled
 * Rent", "Occupied Rent" and "Scheduled rent, rent collected and expenses
 * across your portfolio".
 *
 * What stays, each a statement's own word for a figure on its stated basis:
 * the income statement's revenue (what the rent ledger CHARGED, which its page
 * says), on its page, in its CSV and in the executive and financial-performance
 * exports built from it.
 *
 * Read from the source text of every non-test .ts/.tsx file under the owner
 * surfaces (src/app/(owner), src/components less the marketing, blog and ui
 * folders, src/lib/reports, src/hooks): a string literal or JSX text that says
 * "revenue" fails unless it is listed below.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const ROOTS = [
	"src/app/(owner)",
	"src/components",
	"src/lib/reports",
	"src/hooks",
];
const SKIPPED = [
	"src/components/landing/",
	"src/components/sections/",
	"src/components/marketing/",
	"src/components/blog/",
	"src/components/pricing/",
	"src/components/ui/",
];

/** The charged basis: the income statement's own word, as its page states. */
const ALLOWED: Readonly<Record<string, readonly string[]>> = {
	"src/app/(owner)/reports/income-statement/income-statement-csv.ts": [
		"Total Revenue",
		"Revenue Breakdown",
	],
	"src/app/(owner)/reports/income-statement/income-statement-page-breakdowns.tsx":
		["Revenue Breakdown", "Total Revenue"],
	"src/app/(owner)/reports/income-statement/income-statement-page-header.tsx": [
		"Revenue, expenses, and profitability analysis.",
	],
	"src/app/(owner)/reports/income-statement/income-statement-page-net-summary.tsx":
		["Total Revenue"],
	"src/app/(owner)/reports/income-statement/income-statement-page-stats.tsx": [
		"Total Revenue",
	],
	"src/app/(owner)/reports/income-statement/page.tsx": [
		"Revenue on this statement is what your rent ledger charged.",
	],
	"src/lib/reports/report-data.ts": [
		"Total Revenue",
		"Revenue, net income and cash flow come from your rent ledger, and its totals aren't available yet, so none is shown.",
		"Revenue · expenses · net income · cash flow",
		"Revenue (charged)",
	],
};

function collect(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
		const rel = `${dir}/${entry.name}`;
		if (entry.isDirectory()) {
			if (entry.name === "__tests__") continue;
			out.push(...collect(rel));
		} else if (
			/\.tsx?$/.test(entry.name) &&
			!/\.(test|spec)\./.test(entry.name)
		) {
			out.push(rel);
		}
	}
	return out;
}

const SOURCES = ROOTS.flatMap(collect).filter(
	(file) => !SKIPPED.some((prefix) => file.startsWith(prefix)),
);

/**
 * Visible text in a line: string literals, JSX text between tags, and a line
 * that is words alone (JSX text on its own line).
 */
function visibleTexts(line: string): string[] {
	const out: string[] = [];
	const trimmed = line.trim();
	if (
		/^[A-Za-z][^=;:?|&(){}<>"'`[\]]*$/.test(trimmed) &&
		/\s/.test(trimmed) &&
		!/\w\.\w/.test(trimmed)
	) {
		if (/revenue/i.test(trimmed)) out.push(trimmed);
		return out;
	}
	for (const m of line.matchAll(
		/"([^"]*)"|'([^']*)'|`([^`]*)`|>([^<>{}]+)</g,
	)) {
		const text = m.slice(1).find((g) => g !== undefined) ?? "";
		const words = /\s/.test(text) || /^[A-Z]/.test(text);
		// A lowercase key ("revenue"), a camelCase id ("fillRevenue"), a
		// hyphenated or snake_case name ("chart-revenue"), a template or a path.
		const identifier =
			/^[a-z_]+$/.test(text) ||
			/^[a-z][A-Za-z]*$/.test(text) ||
			/[_-]revenue|revenue[_-]|\$\{|#|\//i.test(text);
		if (/revenue/i.test(text) && words && !identifier) out.push(text);
	}
	return out;
}

function revenueLabels(files: readonly string[]): string[] {
	const out: string[] = [];
	for (const file of files) {
		const allowed = ALLOWED[file] ?? [];
		let inBlockComment = false;
		readFileSync(join(ROOT, file), "utf8")
			.split("\n")
			.forEach((line, index) => {
				const trimmed = line.trim();
				// A block comment (JS or JSX) is no visible text, its inner lines
				// included.
				if (inBlockComment) {
					if (trimmed.includes("*/")) inBlockComment = false;
					return;
				}
				if (/^(\{?\/\*)/.test(trimmed)) {
					if (!trimmed.includes("*/")) inBlockComment = true;
					return;
				}
				if (/^(\/\/|\*)/.test(trimmed)) return;
				for (const text of visibleTexts(line)) {
					if (!allowed.includes(text.trim())) {
						out.push(`${file}:${index + 1} → ${text.trim()}`);
					}
				}
			});
	}
	return out;
}

describe("scheduled rent is never labelled revenue", () => {
	it("scans the owner surfaces (the sweep is not vacuous)", () => {
		expect(SOURCES.length).toBeGreaterThan(500);
		expect(SOURCES).toContain(
			"src/app/(owner)/analytics/overview/analytics-stat-cards.tsx",
		);
		expect(SOURCES).toContain(
			"src/components/properties/property-table-types.ts",
		);
	});

	it("labels no figure revenue outside the income statement's charged basis", () => {
		expect(revenueLabels(SOURCES)).toEqual([]);
	});

	it("catches the shapes it names (positive controls)", () => {
		expect(visibleTexts("\t<StatLabel>Monthly Revenue</StatLabel>")).toEqual([
			"Monthly Revenue",
		]);
		expect(
			visibleTexts('{ id: "revenue", label: "Monthly Revenue" },'),
		).toEqual(["Monthly Revenue"]);
		expect(visibleTexts("\t\t\tRanked by monthly revenue")).toEqual([
			"Ranked by monthly revenue",
		]);
		expect(visibleTexts("\t\t\tRanked by scheduled monthly rent")).toEqual([]);
		expect(visibleTexts('\t\t"Revenue",')).toEqual(["Revenue"]);
		expect(visibleTexts('<linearGradient id="fillRevenue">')).toEqual([]);
		expect(visibleTexts('case "revenue":')).toEqual([]);
	});

	it("reads JSX text on its own line", () => {
		const file = "src/app/(owner)/analytics/overview/page.tsx";
		const text = readFileSync(join(ROOT, file), "utf8");
		expect(text).toContain("Ranked by scheduled monthly rent");
		expect(text).not.toMatch(/Ranked by monthly revenue/i);
	});
});
