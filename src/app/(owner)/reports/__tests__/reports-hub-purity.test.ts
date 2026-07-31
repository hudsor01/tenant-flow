/**
 * Static source-scan guard for `/reports` — the grep-checkable enforcement of
 * the zero-charts invariant (D-34), plus the three invariants that travel with
 * it (D-33, D-30, D-18).
 *
 * D-34 ZERO CHARTS — no `recharts` import, no `ChartContainer` and no
 * `ResponsiveContainer` anywhere under `src/app/(owner)/reports/**`. Reports is
 * statements and exports; every chart lives under `/analytics`, a peer section.
 * "Relocate the chart somewhere else inside the hub" is the failure mode this
 * scan exists to catch — it is a whole-subtree scan, not a single-file check.
 *
 * D-33 ABSENCE — `analytics-stats-row.tsx` and
 * `analytics-payment-methods-chart.tsx` are deleted, not relocated and not
 * repaired. They parsed snake_case keys off a `get_billing_insights` payload
 * that returns only camelCase, so every figure rendered a permanent 0 under
 * confident labels in production. Fixing the key casing would be worse than the
 * zero: it would surface TenantFlow subscription billing under rental-revenue
 * labels. The broken key names are pinned as forbidden so they cannot return.
 *
 * D-30 TILE-GRID PURITY — the hub index has exactly ONE data dependency, and it
 * lives inside `reports-summary-strip.tsx`. `page.tsx` itself is a Server
 * Component with no client directive, no hooks and no database client, so no
 * subscription or billing state can leak into server-rendered HTML.
 *
 * D-18 VOCABULARY — the permitted revenue vocabulary under `/reports/**` is
 * Scheduled (lease-derived), Collected (ledger receipts) and Outstanding
 * (scheduled minus collected, from that same payload). A bare user-facing
 * "Revenue" label is a third, undefined derivation wearing a locked name.
 *
 * D-18 SCOPE, narrowed by plan 56-05 and simultaneously made stricter. The
 * income statement is a GAAP financial statement whose revenue line is defined
 * on its own face — it itemises Rental Income, Late Fees and Other Income and
 * totals them from `get_income_statement`. That is not an undefined third
 * derivation hiding behind a locked name; it is the statement's own named
 * subtotal. Relabelling it "Collected" would be a NEW claims violation (it is
 * not ledger receipts) and "Scheduled" would be equally false. D-18's subject,
 * per the phase CONTEXT, is the hub's own revenue figures — "D-18 governs the
 * summary strip directly". 56-03 applied the scan subtree-wide because at that
 * point the subtree held only the index; the statement routes arrived in 56-05.
 *
 * So the label scan skips exactly one route directory, `/reports/income-statement/`,
 * and the JSX matcher is widened to span newlines in exchange. Outside that one
 * route D-18 is now enforced MORE strictly than before: the old one-line-only
 * matcher let a multi-line JSX text run through. The exemption is bounded by
 * three assertions below — it must resolve to a real directory, it must still
 * be flagging something (a stale exemption fails), and it can never cover the
 * hub index, the tile directory or the summary strip, which are the surfaces
 * D-18 actually governs.
 *
 * Two behaviours are carried over verbatim from the `rent-ledger-money.test.ts`
 * analog, and both are load-bearing: comments are stripped before matching, so
 * a source comment restating a rule cannot self-trigger the guard it documents;
 * and files under `__tests__` are skipped, so this file's own fixture strings
 * (which necessarily spell out every forbidden token) never scan themselves.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const cwd = process.cwd();
const REPORTS_ROOT = "src/app/(owner)/reports";
const HUB_INDEX = `${REPORTS_ROOT}/page.tsx`;

/** Files whose existence would mean D-33 was reverted rather than honoured. */
const DELETED_D33_FILES: readonly string[] = [
	`${REPORTS_ROOT}/analytics/analytics-stats-row.tsx`,
	`${REPORTS_ROOT}/analytics/analytics-payment-methods-chart.tsx`,
];

/** D-34: charting must not exist under the hub in any form. */
const CHART_PATTERNS: readonly { name: string; pattern: RegExp }[] = [
	{ name: "recharts import", pattern: /from\s+["']recharts["']/ },
	{ name: "recharts require/dynamic import", pattern: /["']recharts["']/ },
	{ name: "ChartContainer identifier", pattern: /\bChartContainer\b/ },
	{
		name: "ResponsiveContainer identifier",
		pattern: /\bResponsiveContainer\b/,
	},
];

/** D-33: the snake_case keys the live RPC has never returned. */
const BROKEN_BILLING_KEYS: readonly string[] = [
	"total_payments",
	"successful_payments",
	"payments_by_method",
	"payments_by_status",
];

/**
 * D-18: a user-facing `Revenue` label — whole word, inside a string literal or
 * a JSX text run. Deliberately NOT a bare `/Revenue/`, which would flag the
 * identifiers `totalRevenue` / `revenue` that legitimately name RPC fields.
 * `\b` already excludes `totalRevenue` (no word boundary after `l`).
 *
 * The JSX matcher spans newlines on purpose: a label written as its own
 * indented line between the tags is the commonest shape in this codebase and
 * the one-line-only form of this pattern missed every one of them.
 *
 * It also tolerates `{}` inside the text run. Excluding them let any label
 * carrying an interpolation slip through — `<CardTitle>Revenue {year}</...>`,
 * `<CardTitle>{scope} Revenue</...>` and the `<h3>… for {taxYear}</h3>` shape
 * already used at `tax-documents/page.tsx` all evaded it. Only `<` and `>`
 * terminate the run now. `\b` still keeps `totalRevenue` and lowercase
 * `revenue` from matching, so widening adds no false positives.
 */
const REVENUE_LABEL_PATTERNS: readonly { name: string; pattern: RegExp }[] = [
	{
		name: "quoted Revenue label",
		pattern: /(["'`])[^"'`\n]*\bRevenue\b[^"'`\n]*\1/,
	},
	{
		name: "JSX text Revenue label",
		pattern: />[^<>]*\bRevenue\b[^<>]*</,
	},
];

/**
 * The one D-18 label exemption: the GAAP income statement (see the header).
 * Trailing slash so it can only ever match the route directory, never a
 * sibling file whose name merely starts with the same characters.
 */
const D18_EXEMPT_DIRS: readonly string[] = [
	`${REPORTS_ROOT}/income-statement/`,
];

function isD18Exempt(relPath: string): boolean {
	return D18_EXEMPT_DIRS.some((dir) => relPath.startsWith(dir));
}

/** D-30: the hub index must stay a data-free Server Component. */
const HUB_INDEX_FORBIDDEN: readonly { name: string; pattern: RegExp }[] = [
	{ name: 'client directive ("use client")', pattern: /["']use client["']/ },
	{ name: "useQuery", pattern: /\buseQuery\b/ },
	{ name: "useState", pattern: /\buseState\b/ },
	{ name: "createClient", pattern: /\bcreateClient\b/ },
	{ name: "supabase import", pattern: /from\s+["'][^"']*supabase[^"']*["']/ },
];

function isTestPath(relPath: string): boolean {
	return (
		relPath.includes("/__tests__/") ||
		relPath.includes(".test.") ||
		relPath.includes(".spec.") ||
		relPath.endsWith(".d.ts")
	);
}

/** Strip block and line comments so documentation cannot trip the guard. */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, "");
}

function matchNames(
	source: string,
	patterns: readonly { name: string; pattern: RegExp }[],
): string[] {
	const code = stripComments(source);
	return patterns
		.filter(({ pattern }) => pattern.test(code))
		.map(({ name }) => name);
}

function findChartViolations(source: string): string[] {
	return matchNames(source, CHART_PATTERNS);
}

function findRevenueLabelViolations(source: string): string[] {
	return matchNames(source, REVENUE_LABEL_PATTERNS);
}

function findBrokenBillingKeys(source: string): string[] {
	const code = stripComments(source);
	return BROKEN_BILLING_KEYS.filter((key) => code.includes(key));
}

/** Every non-test .ts/.tsx file under `src/app/(owner)/reports`. */
function collectReportsSourceFiles(): string[] {
	const abs = join(cwd, REPORTS_ROOT);
	if (!existsSync(abs)) return [];

	const files: string[] = [];
	for (const entry of readdirSync(abs, {
		recursive: true,
		withFileTypes: true,
	})) {
		if (!entry.isFile()) continue;
		if (!/\.(ts|tsx)$/.test(entry.name)) continue;
		const parentPath =
			(entry as { parentPath?: string; path?: string }).parentPath ??
			(entry as { path?: string }).path ??
			abs;
		files.push(join(parentPath, entry.name));
	}

	return files.filter((file) => !isTestPath(file.replace(/\\/g, "/")));
}

const reportsFiles = collectReportsSourceFiles();
const relPaths = reportsFiles.map((abs) =>
	relative(cwd, abs).replace(/\\/g, "/"),
);

describe("reports hub purity: the scan itself", () => {
	it("actually finds the hub source files", () => {
		// Guards against a silently-empty scan, which would make every assertion
		// below pass vacuously.
		expect(reportsFiles.length).toBeGreaterThan(0);
		expect(relPaths).toContain(HUB_INDEX);
	});

	it("excludes test files from the scan", () => {
		expect(relPaths.filter((rel) => rel.includes("__tests__"))).toEqual([]);
	});
});

describe("D-34 zero charts under /reports", () => {
	it("imports no charting library or chart primitive anywhere in the subtree", () => {
		const offenders = reportsFiles
			.map((abs, index) => ({
				path: relPaths[index] ?? abs,
				violations: findChartViolations(readFileSync(abs, "utf8")),
			}))
			.filter(({ violations }) => violations.length > 0)
			.map(({ path, violations }) => `${path}: ${violations.join(", ")}`);
		expect(offenders).toEqual([]);
	});
});

describe("D-30 hub index is a data-free Server Component", () => {
	it("carries no client directive, no hooks and no database client", () => {
		const source = readFileSync(join(cwd, HUB_INDEX), "utf8");
		expect(matchNames(source, HUB_INDEX_FORBIDDEN)).toEqual([]);
	});

	it("composes the strip, which owns the index's one data dependency", () => {
		const source = readFileSync(join(cwd, HUB_INDEX), "utf8");
		expect(source).toContain("ReportsSummaryStrip");
	});
});

describe("D-33 the permanently-zero analytics cards stay deleted", () => {
	it.each(DELETED_D33_FILES)("%s does not exist", (relPath) => {
		expect(existsSync(join(cwd, relPath))).toBe(false);
	});

	it("has no hub route directory named analytics", () => {
		expect(existsSync(join(cwd, `${REPORTS_ROOT}/analytics`))).toBe(false);
	});

	it("reads none of the broken get_billing_insights snake_case keys", () => {
		const offenders = reportsFiles
			.map((abs, index) => ({
				path: relPaths[index] ?? abs,
				keys: findBrokenBillingKeys(readFileSync(abs, "utf8")),
			}))
			.filter(({ keys }) => keys.length > 0)
			.map(({ path, keys }) => `${path}: ${keys.join(", ")}`);
		expect(offenders).toEqual([]);
	});
});

describe("D-18 revenue vocabulary under /reports", () => {
	it("renders no bare user-facing Revenue label", () => {
		// Permitted vocabulary under /reports/** is Scheduled, Collected and
		// Outstanding. Scheduled is lease-derived, Collected is ledger receipts,
		// Outstanding is their difference within one period. Nothing sums the
		// first two, and no third derivation may wear either name.
		const offenders = reportsFiles
			.map((abs, index) => ({
				path: relPaths[index] ?? abs,
				violations: findRevenueLabelViolations(readFileSync(abs, "utf8")),
			}))
			.filter(
				({ path, violations }) => violations.length > 0 && !isD18Exempt(path),
			)
			.map(({ path, violations }) => `${path}: ${violations.join(", ")}`);
		expect(offenders).toEqual([]);
	});
});

describe("D-18 the accounting exemption stays bounded", () => {
	it("can never excuse the surfaces D-18 actually governs", () => {
		// The hub index, the tile data module and the summary strip are the
		// Scheduled/Collected surfaces. No exemption may ever reach them.
		expect(isD18Exempt(HUB_INDEX)).toBe(false);
		expect(isD18Exempt(`${REPORTS_ROOT}/reports-summary-strip.tsx`)).toBe(
			false,
		);
		expect(isD18Exempt(`${REPORTS_ROOT}/reports-hub-entries.ts`)).toBe(false);
		expect(isD18Exempt(`${REPORTS_ROOT}/report-hub-tile.tsx`)).toBe(false);
	});

	it.each(D18_EXEMPT_DIRS)("%s is a real route directory", (dir) => {
		expect(existsSync(join(cwd, dir))).toBe(true);
	});

	it("is not stale — the exempt route still carries a label the scan would flag", () => {
		// If this fails the exemption has outlived its cause and must be deleted,
		// not kept "just in case".
		const flagged = relPaths.filter(
			(rel, index) =>
				isD18Exempt(rel) &&
				findRevenueLabelViolations(
					readFileSync(reportsFiles[index] ?? "", "utf8"),
				).length > 0,
		);
		expect(flagged.length).toBeGreaterThan(0);
	});
});

describe("reports hub purity detector", () => {
	it.each([
		["named import", 'import { AreaChart } from "recharts";'],
		["dynamic import", 'const m = await import("recharts");'],
		["chart container primitive", "return <ChartContainer config={cfg} />;"],
		["responsive container", "return <ResponsiveContainer width='100%' />;"],
	])("flags %s", (_label, source) => {
		expect(findChartViolations(source).length).toBeGreaterThan(0);
	});

	it("does not flag a comment that merely documents the chart ban", () => {
		const source = [
			"// No recharts import, no ChartContainer, no ResponsiveContainer here.",
			"/* Charts belong under /analytics, never in this subtree. */",
			"export const entries = [];",
		].join("\n");
		expect(findChartViolations(source)).toEqual([]);
	});

	it("flags the broken billing keys but not a comment naming them", () => {
		expect(
			findBrokenBillingKeys("const n = insights?.payments_by_method ?? 0;"),
		).toEqual(["payments_by_method"]);
		expect(
			findBrokenBillingKeys(
				"// never read total_payments or payments_by_status",
			),
		).toEqual([]);
	});

	it.each([
		["quoted label", 'const label = "Total Revenue";'],
		["JSX text", "return <StatLabel>Revenue</StatLabel>;"],
		["chart series name", 'const series = { name: "Revenue" };'],
		[
			"JSX text broken across lines",
			["<CardTitle>", "\tTotal Revenue", "</CardTitle>"].join("\n"),
		],
		[
			"JSX text with a trailing interpolation",
			"<CardTitle>Revenue {year}</CardTitle>",
		],
		[
			"JSX text with a leading interpolation",
			"<CardTitle>{scope} Revenue</CardTitle>",
		],
		[
			"JSX heading with an interpolation",
			'<h3 className="text-lg font-medium">Revenue for {taxYear}</h3>',
		],
	])("flags a user-facing Revenue label: %s", (_label, source) => {
		expect(findRevenueLabelViolations(source).length).toBeGreaterThan(0);
	});

	it.each([
		["camelCase field read", "const total = data.totalRevenue ?? 0;"],
		["lowercase identifier", "const revenue = payload.revenue;"],
		["permitted vocabulary", 'const label = "Collected";'],
	])("does not flag %s", (_label, source) => {
		expect(findRevenueLabelViolations(source)).toEqual([]);
	});

	it.each([
		["client directive", '"use client";'],
		["query hook", "const { data } = useQuery(opts);"],
		["local state", "const [x, setX] = useState(0);"],
		["database client", "const supabase = createClient();"],
		[
			"supabase import",
			'import { createBrowserClient } from "#lib/supabase/client";',
		],
	])("flags %s on the hub index", (_label, source) => {
		expect(matchNames(source, HUB_INDEX_FORBIDDEN).length).toBeGreaterThan(0);
	});
});
