/**
 * @vitest-environment jsdom
 * A stat tile holds its figure (66.2-39 fix round 4, Part 8c, VD-171, VD-175).
 *
 * Measured on the served build with owner A's figures and with long figures
 * answered in the browser ($1,234,567.00, 100%, 1,234): the /properties tiles
 * left a figure 89px at 390 and the icon beside it shrank to 16x36 past the
 * tile; the Stat primitive's indicator spanned the label and value rows, so a
 * value had the tile less the indicator's column and ran past it; and every
 * row stepped its columns on the viewport, whose width does not say how wide
 * the row is once the rail takes 256px of it. The rendered proof is
 * `tests/e2e/tests/owner/app-shell-sidebar.spec.ts` (owner-axe, /properties
 * with long figures at every rail cell); jsdom lays nothing out, so this file
 * pins the mechanism the fix rests on:
 *   1. the Stat primitive gives the value the tile's width (it spans both
 *      columns under the label and its indicator) and never wraps it;
 *   2. a stat row steps its columns on its own named container, never on a
 *      viewport breakpoint, and every container variant names a container
 *      the same file declares;
 *   3. a stat row's icon with a declared size never shrinks (`shrink-0`).
 * The rows are every shipped file that imports the Stat primitive and the
 * custom stat rows listed below, so a new Stat row is checked without a list
 * edit.
 */
import { describe, expect, it } from "vitest";
import { Stat, StatIndicator, StatLabel, StatValue } from "#components/ui/stat";
import { classStrings } from "#test/utils/state-fill-pairs";
import { collectG7SourceTexts } from "#test/utils/tailwind-guards";
import { render } from "#test/utils/test-render";

const ROOT = process.cwd();

/** Stat rows that do not import the Stat primitive, with their skeletons. */
const CUSTOM_ROWS = [
	"src/components/properties/property-stats-section.tsx",
	"src/app/(owner)/properties/components/properties-loading-skeleton.tsx",
	"src/app/(owner)/leases/leases-stat-cards.tsx",
	"src/components/leases/table/leases-page-skeleton.tsx",
	"src/components/leases/detail/lease-details.client.tsx",
	"src/components/leases/detail/lease-details-skeleton.tsx",
	"src/components/ledger/ledger-balance-strip.tsx",
	"src/components/properties/property-performance-section.tsx",
	"src/app/(owner)/reports/tax-documents/page.tsx",
	"src/components/reports/sections/year-end-report-section.tsx",
	"src/components/dashboard/chart-area-interactive.tsx",
	"src/components/analytics/owner-payment-summary.tsx",
	"src/components/sections/hero-dashboard-mockup.tsx",
	"src/app/(owner)/analytics/financial/_components/financial-analytics-skeleton.tsx",
	"src/app/(owner)/analytics/property-performance/property-performance-skeleton.tsx",
	"src/app/(owner)/tenants/components/tenants-loading-skeleton.tsx",
	"src/app/(owner)/reports/balance-sheet/balance-sheet-skeleton.tsx",
	"src/app/(owner)/reports/cash-flow/cash-flow-loading.tsx",
	"src/app/(owner)/reports/income-statement/income-statement-page-loading.tsx",
	"src/app/(owner)/reports/expenses/page.tsx",
	"src/app/(owner)/analytics/overview/page.tsx",
	"src/app/(owner)/properties/units/page.tsx",
	"src/app/(owner)/loading.tsx",
];

/**
 * Grids in those files that are not stat rows, each with the reason a
 * viewport step cannot push a figure out of a tile there.
 */
const REVIEWED: { file: string; classString: string; reason: string }[] = [
	{
		file: "src/app/(owner)/reports/balance-sheet/page.tsx",
		classString: "grid grid-cols-1 lg:grid-cols-2 gap-6",
		reason:
			"the assets and liabilities sections, lists whose figures are text-lg line items, not tiles: 0 overflows in the rendered sweep",
	},
	{
		file: "src/components/leases/detail/lease-details.client.tsx",
		classString: "grid grid-cols-1 gap-6 lg:grid-cols-3",
		reason:
			"the page's two-thirds and one-third columns; the metrics inside step on their own container",
	},
	{
		file: "src/components/leases/detail/lease-details-skeleton.tsx",
		classString: "grid grid-cols-1 gap-6 lg:grid-cols-3",
		reason: "the skeleton of the page's two columns, not a stat row",
	},
	{
		file: "src/app/(owner)/analytics/financial/_components/financial-analytics-skeleton.tsx",
		classString: "grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6",
		reason: "the skeleton of the chart cards, not a stat row",
	},
	{
		file: "src/app/(owner)/analytics/property-performance/property-performance-skeleton.tsx",
		classString: "grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6",
		reason: "the skeleton of the chart cards, not a stat row",
	},
	{
		file: "src/app/(owner)/reports/balance-sheet/balance-sheet-skeleton.tsx",
		classString: "grid grid-cols-1 lg:grid-cols-2 gap-6",
		reason: "the skeleton of the two statement sections, not a stat row",
	},
	{
		file: "src/app/(owner)/reports/cash-flow/cash-flow-loading.tsx",
		classString: "grid grid-cols-1 lg:grid-cols-2 gap-6",
		reason: "the skeleton of the two breakdown panels, not a stat row",
	},
	{
		file: "src/app/(owner)/reports/income-statement/income-statement-page-loading.tsx",
		classString: "grid grid-cols-1 lg:grid-cols-2 gap-6",
		reason: "the skeleton of the two breakdown panels, not a stat row",
	},
	{
		file: "src/components/maintenance/maintenance-view.client.tsx",
		classString: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",
		reason: "the loading skeleton of the request cards, not a stat row",
	},
	{
		file: "src/app/(owner)/analytics/overview/page.tsx",
		classString: "grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6",
		reason: "the skeleton of the chart cards, not a stat row",
	},
	{
		file: "src/components/dashboard/chart-area-interactive.tsx",
		classString:
			"grid grid-cols-1 gap-4 p-6 pb-0 @min-[20.25rem]/chart-card:grid-cols-2 lg:@min-[38.5rem]/chart-card:grid-cols-4",
		reason:
			"four columns need the lg viewport AND a 38.5rem card (the overview places it in a narrow column, where four overflowed); the step below it is the card's own",
	},
];

const VIEWPORT = /^(?:sm|md|lg|xl|2xl|min-\[[^\]]+\]|max-[a-z0-9[\]-]+):/;
const CONTAINER_VARIANT = /^@[a-z0-9[\].-]*\/([a-z][a-z0-9-]*):/;
const DECLARED_CONTAINER = /^@container\/([a-z][a-z0-9-]*)$/;

function rowFiles(): { path: string; text: string }[] {
	return collectG7SourceTexts(ROOT).filter(
		({ path, text }) =>
			path.endsWith(".tsx") &&
			path !== "src/components/ui/stat.tsx" &&
			(CUSTOM_ROWS.includes(path) ||
				text.includes('from "#components/ui/stat"')),
	);
}

/** A grid-cols token a viewport variant applies, or null. */
function viewportColumns(classString: string): string | null {
	const tokens = classString.split(/\s+/).filter(Boolean);
	if (!tokens.some((t) => /(?:^|:)grid-cols-/.test(t))) return null;
	return (
		tokens.find((t) => VIEWPORT.test(t) && /:(?:@[^:]+:)?grid-cols-/.test(t)) ??
		null
	);
}

/**
 * An icon tile (a square box, w-N with h-N or size-N, that centres its icon)
 * that can shrink. A centred block (`mx-auto`, an empty state's medallion) or
 * an avatar (`rounded-full`) sits in no row beside a figure. The bare icons
 * beside a label are the rendered guard's: a class string cannot say whether
 * its element is a flex item.
 */
function shrinkableIcon(classString: string): boolean {
	const tokens = classString.split(/\s+/).filter(Boolean);
	const size = tokens.find((t) => /^size-\d+(?:\.\d+)?$/.test(t));
	const width = tokens.find((t) => /^w-\d+(?:\.\d+)?$/.test(t));
	const square =
		size !== undefined ||
		(width !== undefined && tokens.includes(`h-${width.slice(2)}`));
	const centres =
		tokens.includes("justify-center") || tokens.includes("flex-center");
	if (!square || !centres || tokens.includes("shrink-0")) return false;
	return !tokens.some((t) => ["mx-auto", "rounded-full"].includes(t));
}

describe("stat tiles hold their figures", () => {
	it("give a Stat value the tile's width, under its label and indicator, unwrapped", () => {
		render(
			<Stat>
				<StatLabel>Scheduled</StatLabel>
				<StatValue>$1,234,567</StatValue>
				<StatIndicator variant="icon">i</StatIndicator>
			</Stat>,
		);
		const stat = document.querySelector("[data-slot=stat]");
		const tokens = stat?.className.split(/\s+/) ?? [];
		expect(tokens).toContain("grid-cols-[minmax(0,1fr)_auto]");
		expect(tokens).toContain("**:data-[slot=stat-value]:col-span-2");
		expect(tokens).toContain("**:data-[slot=stat-indicator]:row-start-1");
		expect(tokens).not.toContain("**:data-[slot=stat-indicator]:row-span-2");
		expect(tokens).not.toContain("**:data-[slot=stat-value]:col-span-1");
		const value = document.querySelector("[data-slot=stat-value]");
		expect(value?.className.split(/\s+/)).toContain("whitespace-nowrap");
	});

	it("step every stat row's columns on its own container, never the viewport", () => {
		const files = rowFiles();
		// Controls: the scan reaches the Stat rows and the custom rows.
		expect(files.map((f) => f.path)).toEqual(
			expect.arrayContaining([
				"src/components/tenants/tenant-stats.tsx",
				"src/components/properties/property-stats-section.tsx",
				"src/app/(owner)/analytics/financial/_components/financial-overview-stats.tsx",
			]),
		);
		for (const path of CUSTOM_ROWS) {
			expect(
				files.map((f) => f.path),
				`${path} is shipped`,
			).toContain(path);
		}
		const unreviewed: string[] = [];
		const undeclared: string[] = [];
		for (const { path, text } of files) {
			const declared = new Set<string>();
			const used: { name: string; line: number }[] = [];
			for (const literal of classStrings(text)) {
				for (const token of literal.text.split(/\s+/)) {
					const d = DECLARED_CONTAINER.exec(token);
					if (d?.[1]) declared.add(d[1]);
					const u = CONTAINER_VARIANT.exec(token);
					if (u?.[1]) used.push({ name: u[1], line: literal.line });
				}
				const step = viewportColumns(literal.text);
				if (
					step !== null &&
					!REVIEWED.some(
						(r) => r.file === path && r.classString === literal.text,
					)
				) {
					unreviewed.push(`${path}:${literal.line} ${step}`);
				}
			}
			for (const { name, line } of used) {
				// `chart-card` is the Card's own container (chart-area-interactive).
				if (!declared.has(name) && name !== "card-header") {
					undeclared.push(`${path}:${line} @…/${name}`);
				}
			}
		}
		expect(unreviewed).toEqual([]);
		expect(undeclared).toEqual([]);
	});

	it("keeps every reviewed grid live", () => {
		const files = rowFiles();
		const stale = REVIEWED.filter(
			(r) =>
				!files.some(
					(f) =>
						f.path === r.file &&
						classStrings(f.text).some((l) => l.text === r.classString),
				),
		).map((r) => `${r.file}: ${r.classString}`);
		expect(stale).toEqual([]);
	});

	it("never lets a stat row's sized icon shrink", () => {
		const shrinkable: string[] = [];
		for (const { path, text } of rowFiles()) {
			for (const literal of classStrings(text)) {
				if (shrinkableIcon(literal.text)) {
					shrinkable.push(`${path}:${literal.line} "${literal.text}"`);
				}
			}
		}
		expect(shrinkable).toEqual([]);
	});

	it("reads a viewport step and a shrinkable icon the way a class string writes them (fixtures)", () => {
		expect(viewportColumns("grid grid-cols-2 lg:grid-cols-4")).toBe(
			"lg:grid-cols-4",
		);
		expect(
			viewportColumns("grid grid-cols-1 @min-[25rem]/rows:grid-cols-2"),
		).toBeNull();
		expect(viewportColumns("grid grid-cols-1 lg:@xl/card:grid-cols-4")).toBe(
			"lg:@xl/card:grid-cols-4",
		);
		expect(
			shrinkableIcon("w-9 h-9 rounded-sm flex items-center justify-center"),
		).toBe(true);
		expect(
			shrinkableIcon(
				"w-9 h-9 shrink-0 rounded-sm flex items-center justify-center",
			),
		).toBe(false);
		expect(shrinkableIcon("size-8 rounded-lg flex-center")).toBe(true);
		expect(shrinkableIcon("size-4 text-primary")).toBe(false);
		expect(shrinkableIcon("h-8 w-12 flex justify-center")).toBe(false);
		expect(
			shrinkableIcon("w-16 h-16 flex items-center justify-center mx-auto"),
		).toBe(false);
	});
});
