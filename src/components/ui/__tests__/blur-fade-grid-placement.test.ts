/**
 * A grid or flex placement utility never sits on BlurFade's child.
 *
 * BlurFade renders its own `<div data-slot="blur-fade">`. Inside a grid or flex
 * container that div is the item, so `col-span-*`, `row-span-*`, `col-start-*`,
 * `col-end-*`, `row-start-*`, `row-end-*` or `order-*` on the element BlurFade
 * wraps applies to a non-item and does nothing. Three call sites did it:
 * `/analytics/property-performance` and `/analytics/financial` (`lg:col-span-2`,
 * so the chart card rendered one track wide at 1280px) and the profile card
 * (`lg:col-span-1`, inert only because one track is the default). The utility
 * goes on BlurFade's `className`, which lands on the grid item.
 *
 * The 66.2-39 part H AST sweep over every placement utility in `src/` found no
 * other wrapper between an item and its container; this guard pins the one that
 * did it three times.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { JSX_CHILD_GAP } from "#test/utils/regexp-source";

const SRC = join(process.cwd(), "src");

function tsxFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const abs = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name !== "__tests__") out.push(...tsxFiles(abs));
		} else if (
			entry.name.endsWith(".tsx") &&
			!/\.(test|spec)\.tsx$/.test(entry.name)
		) {
			out.push(abs);
		}
	}
	return out;
}

// `<BlurFade …>` then, after whitespace or JSX comments, the first child's
// opening tag, its className, and a placement utility in it. The utility's
// name starts at a word boundary with or without variants (`lg:col-span-2`,
// `-order-1`), so the variant prefix needs no quantifier of its own: one there
// overlapped the lazy scan before it.
const WRAPPED_PLACEMENT = new RegExp(
	String.raw`<BlurFade\b[^>]*>${JSX_CHILD_GAP}<([A-Za-z][\w.]*)\b[^>]*?className=["'\x60{][^>]*?\b(?:col-span|row-span|col-start|col-end|row-start|row-end|order)-[\w[\]/.-]+`,
	"g",
);

/** How long `pattern` takes to scan `input` to the end, in milliseconds. */
function scanMs(pattern: RegExp, input: string): number {
	const start = performance.now();
	[...input.matchAll(pattern)];
	return performance.now() - start;
}

describe("BlurFade grid placement", () => {
	const files = tsxFiles(SRC);

	it("scans the BlurFade call sites", () => {
		const callers = files.filter((f) =>
			readFileSync(f, "utf8").includes("<BlurFade"),
		);
		expect(callers.length).toBeGreaterThan(20);
	});

	it("puts placement on the BlurFade, not on the element it wraps", () => {
		const hits: string[] = [];
		for (const abs of files) {
			const source = readFileSync(abs, "utf8");
			for (const match of source.matchAll(WRAPPED_PLACEMENT)) {
				const line = source.slice(0, match.index).split("\n").length;
				hits.push(`${relative(process.cwd(), abs)}:${line} <${match[1]}>`);
			}
		}
		expect(
			hits,
			`placement utility on BlurFade's child -- move it to <BlurFade className>:\n${hits.join("\n")}`,
		).toEqual([]);
	});

	it("matches the defect shape it guards", () => {
		const sample =
			'<BlurFade delay={0.6}>\n\t<div className="lg:col-span-2 bg-card">';
		expect([...sample.matchAll(WRAPPED_PLACEMENT)]).toHaveLength(1);
		const fixed =
			'<BlurFade delay={0.6} className="lg:col-span-2">\n\t<div className="bg-card">';
		expect([...fixed.matchAll(WRAPPED_PLACEMENT)]).toHaveLength(0);
	});

	it("looks past JSX comments to the first child, and no further", () => {
		const afterComment =
			'<BlurFade>\n\t{/* the chart */}\n\t<div className="lg:col-span-2 bg-card">';
		expect([...afterComment.matchAll(WRAPPED_PLACEMENT)]).toHaveLength(1);
		const noPlacement =
			'<BlurFade>\n\t{/* the chart */}\n\t<div className="bg-card">';
		expect([...noPlacement.matchAll(WRAPPED_PLACEMENT)]).toHaveLength(0);
		// The first child has no placement. A comment body that could run on past
		// `*/}` swallowed `<div>` and reported the grandchild instead.
		const grandchild =
			'<BlurFade>{/* a */}<div>{/* b */}<span className="col-span-2">';
		expect([...grandchild.matchAll(WRAPPED_PLACEMENT)]).toHaveLength(0);
	});

	it("scans adversarial comment runs in linear time", () => {
		// A run of comments with no child after it split 2^n ways under the old
		// comment body: these 34 took 19 s on a laptop, compiled. Each input here
		// takes about a millisecond at most now; the bound only separates the two.
		// The short run comes first, so the old pattern fails before the long ones.
		const inputs = [
			`<BlurFade>${"{/* x */}".repeat(34)}`,
			`<BlurFade>${"{/* x */}".repeat(20_000)}`,
			`<BlurFade>{/*${"*/}}{{/*".repeat(20_000)}`,
			`<BlurFade>{/*${" x".repeat(100_000)}`,
		];
		for (const input of inputs) {
			expect(scanMs(WRAPPED_PLACEMENT, input)).toBeLessThan(1000);
		}
	});
});
