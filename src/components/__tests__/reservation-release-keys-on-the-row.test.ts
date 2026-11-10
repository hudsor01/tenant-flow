// @vitest-environment node
/**
 * A stat label's two-line reservation is released on its row's own width,
 * never the viewport's (66.2-39 fix round 4, K1, G38).
 *
 * Stat rows keep every label two lines tall (`min-h-10`) so the figures in a
 * row share a line whichever labels wrap. The release used to key on the lg
 * viewport, but an owner page's width also depends on the rail: with it
 * expanded the tenants, overview and property-performance rows' labels still
 * wrapped beside one-line neighbours from 1024 to about 1200px, so their
 * figures sat 20px apart (Chrome, compiled CSS: tenants 1024-1152,
 * overview 1088-1176, property performance 1056-1200). Those rows are named
 * containers now and release at their 56rem variant, where four columns hold
 * each row's longest label on one line.
 *
 * The scan reads every class string in shipped `src` (`classStrings`): one
 * that reserves a height (`min-h-N`) and releases it under a viewport
 * breakpoint (`sm:`…`2xl:`, `min-[…]:`, `max-…:`) fails, unless REVIEWED lists
 * its file with the measured reason the viewport release cannot misalign it
 * there. The compile proof checks that each row's container and release are
 * extracted from the sources and compile to the container query.
 */
import { describe, expect, it } from "vitest";
import { classStrings } from "#test/utils/state-fill-pairs";
import { loadProjectTailwindEngine } from "#test/utils/tailwind-engine";
import { collectG7SourceTexts } from "#test/utils/tailwind-guards";

const ROOT = process.cwd();

/** A breakpoint variant on the viewport (any, as Tailwind names them). */
const VIEWPORT = /^(?:sm|md|lg|xl|2xl|min-\[[^\]]+\]|max-[a-z0-9[\]-]+):/;
const MIN_H = "min-h-";

/** A reserved height (`min-h-N`, N not 0) released by a viewport variant. */
function viewportRelease(classString: string): string | null {
	const tokens = classString.split(/\s+/).filter(Boolean);
	const reserves = tokens.some((t) => t.startsWith(MIN_H) && t !== `${MIN_H}0`);
	if (!reserves) return null;
	return (
		tokens.find((t) => VIEWPORT.test(t) && t.endsWith(`:${MIN_H}0`)) ?? null
	);
}

/** Rows whose viewport release was measured never to misalign them. */
const REVIEWED: { file: string; release: string; reason: string }[] = [
	{
		file: "src/app/(owner)/analytics/financial/_components/financial-overview-stats.tsx",
		release: `lg:${MIN_H}0`,
		reason:
			"its columns step on the row's own width (66.2-39 fix round 4, Part 8c): two from 29rem, four from 58rem, where each tile is 220px or wider and Scheduled Margin (113.09px) fits beside the 32px indicator: no label wraps at lg in either rail state",
	},
];

/** The rows that release on their own container, and its name. */
const CONTAINER_ROWS = [
	{ file: "src/components/tenants/tenant-stats.tsx", name: "tenant-stats" },
	{
		file: "src/app/(owner)/analytics/overview/analytics-stat-cards.tsx",
		name: "analytics-stats",
	},
	{
		file: "src/app/(owner)/analytics/property-performance/performance-stat-cards.tsx",
		name: "performance-stats",
	},
];

function releases(): { file: string; line: number; token: string }[] {
	const found: { file: string; line: number; token: string }[] = [];
	for (const { path, text } of collectG7SourceTexts(ROOT)) {
		if (!path.endsWith(".tsx")) continue;
		for (const literal of classStrings(text)) {
			const token = viewportRelease(literal.text);
			if (token) found.push({ file: path, line: literal.line, token });
		}
	}
	return found;
}

describe("stat label reservations release on the row's width", () => {
	it("leave no viewport release outside the reviewed rows", () => {
		const unreviewed = releases()
			.filter(
				(r) =>
					!REVIEWED.some((e) => e.file === r.file && e.release === r.token),
			)
			.map((r) => `${r.file}:${r.line} ${r.token}`);
		expect(unreviewed).toEqual([]);
	});

	it("keeps every reviewed row live", () => {
		const found = releases();
		const stale = REVIEWED.filter(
			(e) => !found.some((r) => r.file === e.file && r.token === e.release),
		).map((e) => e.file);
		expect(stale).toEqual([]);
	});

	it("reads a release the way the class string writes it (fixtures)", () => {
		expect(viewportRelease(`${MIN_H}10 lg:${MIN_H}0`)).toBe(`lg:${MIN_H}0`);
		expect(viewportRelease(`${MIN_H}10 max-md:${MIN_H}0`)).toBe(
			`max-md:${MIN_H}0`,
		);
		expect(viewportRelease(`${MIN_H}10 @4xl/rows:${MIN_H}0`)).toBeNull();
		expect(viewportRelease(`lg:${MIN_H}0`)).toBeNull();
	});

	it("extracts and compiles each row's container and its 56rem release", async () => {
		const engine = await loadProjectTailwindEngine();
		for (const { name } of CONTAINER_ROWS) {
			const container = `@container/${name}`;
			const release = `@4xl/${name}:${MIN_H}0`;
			expect(engine.candidates).toContain(container);
			expect(engine.candidates).toContain(release);
			const [containerCss, releaseCss] = engine.designSystem.candidatesToCss([
				container,
				release,
			]);
			expect(containerCss).toMatch(/container-type:\s*inline-size/);
			expect(containerCss).toContain(`container-name: ${name}`);
			expect(releaseCss).toContain(`@container ${name} (width >= 56rem)`);
		}
	}, 30_000);
});
