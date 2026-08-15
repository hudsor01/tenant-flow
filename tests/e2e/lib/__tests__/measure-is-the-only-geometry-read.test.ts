/**
 * `tests/e2e/lib/measure.ts` is the ONLY place in the Playwright tree allowed to
 * read layout geometry, and this test is what enforces it.
 *
 * WHY A GUARD AND NOT A COMMENT. `measure.ts` already says it, in its own header:
 * "Use these helpers for ALL geometry reads. A bare `boundingBox()` in a spec is
 * a latent CI failure, not a style preference." The commit that wrote that
 * sentence converted one read and left NINE behind, and one of the survivors
 * failed in CI on the very next run (run 31331577238, `apply-token.spec.ts` E-6,
 * `expect(right).toBeLessThan(0)` receiving exactly `0`). A rule that lives only
 * in prose is a rule that is enforced only when someone remembers it.
 *
 * WHAT A BARE READ ACTUALLY BREAKS. `Locator.boundingBox()` and
 * `Element.getBoundingClientRect()` are ONE-SHOT. Unlike `expect(locator)`,
 * `expect.poll` and `toPass`, they do not retry — and `expect(<number>)` around
 * them does not retry either, because the number was already read. Both answer an
 * ALL-ZERO rect for a node with no layout box, and React hydration detaching the
 * node between the locator resolving and the read landing is exactly that state.
 * The observed failure is therefore never "the element is missing"; it is a
 * plausible-looking wrong number.
 *
 * THAT IS WORSE THAN A FLAKE. An all-zero rect is ALSO what a genuinely
 * `display: none` element produces, so the racy read cannot distinguish "layout
 * not committed yet" from "the thing under test regressed". `retries: 2` then
 * turns the race green and launders the regression with it.
 *
 * THE RULE. A geometry read outside `measure.ts` is a failure UNLESS it is
 * lexically inside a `polledRead(...)` callback — the shared helper that wraps a
 * composite browser-side measurement in a poll. Both conditions are checked, and
 * both are needed:
 *
 *   - Lexical containment alone would let anyone exempt a read by moving it, so
 *     each exemption must ALSO appear in `SANCTIONED_POLLED_READS` below with a
 *     reason. Exactly one line qualifies today.
 *   - The allowlist alone would let a listed line drift out of the poll and keep
 *     its exemption, so containment is verified independently.
 *
 * There is no exemption for an UNPOLLED read, at all. Every element measurement
 * this tree needs is expressible through `boxOf`, `widthOf`, `heightOf` or
 * `boxesOf`, and each of those polls.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

/** The Playwright tree, rooted at the repo. */
const E2E_ROOT = resolve(process.cwd(), "tests/e2e");

/** The one module allowed to hold a geometry read. */
const MEASURE_MODULE = "tests/e2e/lib/measure.ts";

/**
 * Build output, Playwright's own artifacts, and this guard's own directory.
 *
 * `.cache` holds the e2e tsconfig's emitted declarations, which would otherwise
 * re-report every read in `measure.ts` under a second path. `__tests__` holds
 * NODE-SIDE guards — this file names both banned functions in string literals, so
 * scanning itself would report itself. Nothing under `__tests__` drives a
 * browser, so nothing there can take a racy layout snapshot.
 */
const IGNORED_DIRECTORIES = new Set([
	".cache",
	".fallow",
	"__tests__",
	"node_modules",
	"playwright-report",
	"test-results",
]);

/**
 * The two one-shot reads. `getClientRects()` is deliberately NOT here: it is the
 * layout-commitment probe `measure.ts` polls ON, so banning it would ban the fix.
 */
const GEOMETRY_READ = /boundingBox\(\)|getBoundingClientRect\(\)/;

/** The shared helper that makes a composite browser-side read safe. */
const POLL_WRAPPER = "polledRead(";

/**
 * Every read outside `measure.ts` that is allowed to exist, keyed by its exact
 * source line, with the reason it cannot go through a `Locator` helper.
 *
 * ONE ENTRY, and it is the only read in this tree that is not an element read at
 * all. A `Range` has no `Locator`, so `boxOf` cannot express it — and the width
 * of a trigger's rendered TEXT is the number E-22 exists to check, because
 * `scrollWidth` on an `overflow: visible` box is clamped to `clientWidth` in
 * Chrome and reports no overflow at the exact moment the label is spilling out.
 * It is inside `polledRead`, gated on `textWidth > 0`, which is verified below
 * rather than taken on trust.
 */
const SANCTIONED_POLLED_READS: ReadonlyMap<string, string> = new Map([
	[
		"textWidth: range.getBoundingClientRect().width,",
		"a Range measurement of a tab label's rendered text; a Range is not an element and has no Locator equivalent",
	],
]);

interface Violation {
	file: string;
	line: number;
	source: string;
}

function tsFilesUnder(directory: string): string[] {
	const found: string[] = [];
	for (const entry of readdirSync(directory)) {
		const path = join(directory, entry);
		if (statSync(path).isDirectory()) {
			if (IGNORED_DIRECTORIES.has(entry)) continue;
			found.push(...tsFilesUnder(path));
			continue;
		}
		if (entry.endsWith(".ts")) found.push(path);
	}
	return found;
}

/**
 * A line is PROSE when it opens a block comment, continues one (` * …`), or is a
 * whole-line `//` comment.
 *
 * Deliberately not a real tokenizer, and deliberately not a `//`-anywhere strip.
 * Every geometry mention in this tree that is prose sits inside a JSDoc block or
 * on its own `//` line, and stripping `//` mid-line would silently blind the scan
 * to anything written after a `://` inside a URL string. Under-stripping can only
 * ever produce a FALSE POSITIVE, which someone must then look at; over-stripping
 * produces a false negative, which is the failure this guard exists to prevent.
 */
function isProse(line: string): boolean {
	const trimmed = line.trim();
	return (
		trimmed.startsWith("*") ||
		trimmed.startsWith("//") ||
		trimmed.startsWith("/*")
	);
}

/** Leading tabs, then leading spaces. Biome formats this repo with tabs. */
function indentOf(line: string): number {
	const match = /^[\t ]*/.exec(line);
	return match ? match[0].length : 0;
}

/**
 * Is the read on `index` lexically inside a `polledRead(...)` call?
 *
 * Walks upward through the ANCESTOR lines — the successive lines of strictly
 * decreasing indentation, which for formatted code are exactly the enclosing
 * expressions — and answers true if any of them opens the wrapper. Indentation
 * rather than paren counting, because paren counting has to understand string
 * and regex literals to stay in sync and this does not.
 *
 * Over-reporting is impossible in the direction that matters: a line can only be
 * "inside" a wrapper it is genuinely nested under.
 */
function isInsidePolledRead(lines: string[], index: number): boolean {
	let depth = indentOf(lines[index] ?? "");
	for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
		const line = lines[cursor];
		if (line === undefined || line.trim() === "") continue;
		const indent = indentOf(line);
		if (indent >= depth) continue;
		depth = indent;
		if (line.includes(POLL_WRAPPER)) return true;
		if (indent === 0) return false;
	}
	return false;
}

function scan(): {
	violations: Violation[];
	polled: Violation[];
	scanned: string[];
} {
	const violations: Violation[] = [];
	const polled: Violation[] = [];
	const scanned: string[] = [];
	for (const path of tsFilesUnder(E2E_ROOT)) {
		const file = relative(process.cwd(), path).split(sep).join("/");
		scanned.push(file);
		const lines = readFileSync(path, "utf8").split("\n");
		lines.forEach((source, index) => {
			if (isProse(source)) return;
			if (!GEOMETRY_READ.test(source)) return;
			const found: Violation = { file, line: index + 1, source: source.trim() };
			if (file !== MEASURE_MODULE && isInsidePolledRead(lines, index)) {
				polled.push(found);
				return;
			}
			violations.push(found);
		});
	}
	return { violations, polled, scanned };
}

describe("the Playwright tree reads geometry only through measure.ts", () => {
	it("finds no bare boundingBox() or getBoundingClientRect() in any other module", () => {
		const { violations, polled, scanned } = scan();

		// POSITIVE CONTROL ON THE SCANNER ITSELF, and it is not optional. A wrong
		// root, a wrong extension filter or a regex that matched nothing would
		// report zero violations and this test would pass while proving nothing.
		// `measure.ts` is the one file that MUST contain reads, so it is the probe:
		// if the scanner cannot see them there, it cannot see them anywhere.
		expect(scanned).toContain(MEASURE_MODULE);
		expect(scanned.length).toBeGreaterThan(10);
		const inMeasure = violations.filter((v) => v.file === MEASURE_MODULE);
		expect(inMeasure.length).toBeGreaterThan(0);

		// SECOND POSITIVE CONTROL, on the prose filter. `apply-token.spec.ts`
		// discusses `getBoundingClientRect()` at length in its header. If `isProse`
		// were inverted or broken those header lines would show up here, so the
		// filter has to be doing real work rather than matching everything.
		const applySpec = "tests/e2e/tests/public/apply-token.spec.ts";
		expect(scanned).toContain(applySpec);
		expect(readFileSync(resolve(process.cwd(), applySpec), "utf8")).toContain(
			"getBoundingClientRect()",
		);

		// THIRD POSITIVE CONTROL, on the containment walk. If `isInsidePolledRead`
		// answered false for everything, the exemption branch would be dead and the
		// allowlist assertion below would pass by describing nothing. The E-22
		// composite is the probe: its read genuinely IS nested inside `polledRead`.
		expect(polled.length).toBeGreaterThan(0);

		const offenders = violations.filter((v) => v.file !== MEASURE_MODULE);
		expect(
			offenders.map((v) => `${v.file}:${v.line}  ${v.source}`),
		).toStrictEqual([]);

		// Being inside a poll is necessary but not sufficient. Every exempt read must
		// also be named, so adding one is a decision someone made on purpose rather
		// than a side effect of where they happened to put the code.
		expect(polled.map((v) => v.source).sort()).toStrictEqual(
			[...SANCTIONED_POLLED_READS.keys()].sort(),
		);
	});
});
