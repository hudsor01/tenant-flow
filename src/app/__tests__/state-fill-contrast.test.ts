/**
 * Every interactive state keeps its label legible (WCAG 1.4.3 in each state;
 * 66.2-39 fix round 1, part F, status-colors.md section 7).
 *
 * For each class string in shipped `src/` (no tests, `src/test/`), every state
 * chain that sets a fill or a label (`hover`, `focus`, `focus-visible`,
 * `active`, `data-[state=…]`, `data-highlighted`, `data-[selected=true]`,
 * `aria-*`, `group-hover`, under a compound selector too) is paired as the
 * cascade pairs it (`state-fill-pairs.ts`) and measured from the globals.css
 * token values over the page, card and popover surfaces, in both themes. A
 * label must clear 4.5:1. An inherited label is read as both `foreground` and
 * `muted-foreground`.
 *
 * A class string cannot show what its element carries, so three reviewed lists
 * name the states the string alone mis-reads. Each entry must still match, and
 * an icon-only entry must clear its own 3:1 (WCAG 1.4.11):
 * - ICON_ONLY: the state's label is an icon, the control's only content;
 * - LABEL_ELSEWHERE: the label color is set in another class string of the
 *   same element, given here and measured;
 * - NO_LABEL: the fill carries no text (a switch track, a carousel dot), or
 *   the state can never match (a Radix part that sets no `data-state`).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
	classStrings,
	type Paint,
	type StatePair,
	statePairs,
	worstStateContrast,
} from "#test/utils/state-fill-pairs";
import { collectG7SourceTexts } from "#test/utils/tailwind-guards";

const ROOT = process.cwd();
const CSS = readFileSync(resolve(ROOT, "src/app/globals.css"), "utf8");
const COLORS = new Set(
	[...CSS.matchAll(/--color-([a-z0-9-]+):/g)].map((m) => m[1] ?? ""),
);

/** A reviewed state: the file and one source token that identifies it. */
interface Reviewed {
	file: string;
	token: string;
	reason: string;
}

const ICON_ONLY: Reviewed[] = [
	...[
		"src/app/(owner)/properties/property-details.client.tsx",
		"src/components/settings/sections/active-sessions-section.tsx",
		"src/components/tenants/tenant-grid.tsx",
		"src/components/tenants/tenant-table-row.tsx",
		"src/components/inspections/inspection-room-card.tsx",
		"src/components/maintenance/table/columns.tsx",
		"src/components/maintenance/vendors-page.client.tsx",
		"src/components/properties/property-table-row.tsx",
	].map((file) => ({
		file,
		token: "hover:text-destructive",
		reason: "a Trash2 icon button named by aria-label or sr-only text",
	})),
	{
		file: "src/components/leases/table/leases-table-columns.tsx",
		token: "hover:text-primary",
		reason: "the RefreshCw Renew icon button, named by aria-label",
	},
	{
		file: "src/components/bulk-import/bulk-import-upload-step.tsx",
		token: "group-hover:bg-primary/15",
		reason: "the Upload icon tile above the dropzone's own text",
	},
];

const LABEL_ELSEWHERE: (Reviewed & { label: Paint })[] = [
	{
		file: "src/components/properties/image-lightbox.tsx",
		token: "hover:bg-black/70",
		label: { token: "white", alpha: 1 },
		reason: "the close button's X icon is text-white",
	},
	{
		file: "src/components/properties/property-image-gallery.tsx",
		token: "group-hover:bg-black/70",
		label: { token: "white", alpha: 1 },
		reason: 'the "+N" overlay text is text-white',
	},
	{
		file: "src/components/ui/stepper-header.tsx",
		token: "data-[state=active]:bg-primary",
		label: { token: "primary-foreground", alpha: 1 },
		reason: "the indicator's number and icon are text-primary-foreground",
	},
];

const NO_LABEL: Reviewed[] = [
	{
		file: "src/components/ui/switch.tsx",
		token: "data-[state=checked]:bg-primary",
		reason: "the switch track; the bg-background thumb is the mark",
	},
	{
		file: "src/components/pricing/bento-pricing-section.tsx",
		token: "data-[state=checked]:bg-primary",
		reason: "the billing-period Switch track override",
	},
	{
		file: "src/components/sections/testimonials-section.tsx",
		token: "hover:bg-muted-foreground/50",
		reason: "a carousel dot button, no text",
	},
	{
		file: "src/components/ui/dialog.tsx",
		token: "data-[state=open]:bg-accent",
		reason:
			"Radix DialogClose sets no data-state, so the upstream class never matches",
	},
];

interface Finding {
	file: string;
	line: number;
	pair: StatePair;
	ratio: number;
	at: string;
}

function matches(entry: Reviewed, finding: Finding): boolean {
	return (
		finding.file === entry.file && finding.pair.source.includes(entry.token)
	);
}

function stateFindings(): { checked: number; under: Finding[] } {
	let checked = 0;
	const under: Finding[] = [];
	for (const { path, text } of collectG7SourceTexts(ROOT)) {
		for (const literal of classStrings(text)) {
			for (const pair of statePairs(literal.text, COLORS)) {
				checked += 1;
				const { ratio, at } = worstStateContrast(CSS, pair);
				if (ratio < 4.5) {
					under.push({ file: path, line: literal.line, pair, ratio, at });
				}
			}
		}
	}
	return { checked, under };
}

describe("state fills keep their labels at 4.5:1 (66.2-39 fix round 1, part F)", () => {
	const { checked, under } = stateFindings();

	it("measures every state pair in shipped src", () => {
		expect(checked).toBeGreaterThan(400);
	});

	it("leaves no label under 4.5:1 in any state, either theme", () => {
		const unexplained = under
			.filter(
				(f) =>
					![...ICON_ONLY, ...LABEL_ELSEWHERE, ...NO_LABEL].some((entry) =>
						matches(entry, f),
					),
			)
			.map(
				(f) =>
					`${f.file}:${f.line} ${f.pair.state} ${f.ratio.toFixed(2)} ${f.at} [${f.pair.source.join(" ")}]`,
			);
		expect(unexplained).toEqual([]);
	});

	it("holds an icon-only state at 3:1 and a label set elsewhere at 4.5:1", () => {
		const failures: string[] = [];
		for (const f of under) {
			if (ICON_ONLY.some((entry) => matches(entry, f)) && f.ratio < 3) {
				failures.push(`${f.file}:${f.line} icon ${f.ratio.toFixed(2)} ${f.at}`);
			}
			const elsewhere = LABEL_ELSEWHERE.find((entry) => matches(entry, f));
			if (elsewhere) {
				const { ratio, at } = worstStateContrast(CSS, f.pair, elsewhere.label);
				if (ratio < 4.5) {
					failures.push(`${f.file}:${f.line} ${ratio.toFixed(2)} ${at}`);
				}
			}
		}
		expect(failures).toEqual([]);
	});

	it("keeps every reviewed entry live", () => {
		const stale = [...ICON_ONLY, ...LABEL_ELSEWHERE, ...NO_LABEL]
			.filter((entry) => !under.some((f) => matches(entry, f)))
			.map((entry) => `${entry.file} ${entry.token}`);
		expect(stale).toEqual([]);
	});

	it("reads the pairs the way the cascade paints them (fixtures)", () => {
		const pairsOf = (classes: string) => statePairs(classes, COLORS);
		const outlineDark = pairsOf(
			"hover:bg-accent hover:text-accent-foreground dark:hover:bg-input/50",
		).find((p) => p.theme === "dark");
		expect(outlineDark?.fill).toEqual({ token: "input", alpha: 0.5 });
		expect(outlineDark?.label).toEqual({
			token: "accent-foreground",
			alpha: 1,
		});
		const toggleOnHover = pairsOf(
			"hover:text-muted-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary-text",
		).find((p) => p.state === "data-[state=on]:hover" && p.theme === "light");
		expect(toggleOnHover?.fill).toEqual({ token: "primary-text", alpha: 1 });
		expect(toggleOnHover?.label).toEqual({
			token: "primary-foreground",
			alpha: 1,
		});
		const iconOnFocus = pairsOf(
			"focus:bg-accent [&_svg:not([class*='text-'])]:text-muted-foreground focus:[&_svg:not([class*='text-'])]:text-accent-foreground",
		).find((p) => p.state.includes("[&_svg") && p.theme === "dark");
		expect(iconOnFocus?.fill).toEqual({ token: "accent", alpha: 1 });
		const failing = pairsOf(
			"bg-primary text-primary-foreground hover:bg-primary/90",
		)
			.filter((p) => p.theme === "light")
			.map((p) => worstStateContrast(CSS, p).ratio);
		expect(Math.min(...failing)).toBeLessThan(4.5);
	});
});
