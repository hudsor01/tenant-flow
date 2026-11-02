/**
 * No component or hook builds a list from an empty literal that nothing fills.
 *
 * `/analytics/overview` rendered "Top Performing Properties" from
 * `const properties = [] as PropertyPerformance[]`, so the card could only
 * ever show its empty state, although the page already loaded the data. The
 * lease template builder passed `const customClauses: CustomClause[] = []` to
 * the template renderer, behind a custom-clause renderer no input could reach
 * (and whose markup never closed its `<article>`). A local list declared empty
 * is fine when the code then fills it (`push`, an index write, reassignment);
 * one that is only read is a placeholder where data was intended.
 *
 * Scope: every non-test `src/**\/*.{ts,tsx}`. A declaration counts when it is
 * indented (inside a function: a module-level constant is a data table, such
 * as the deliberately empty `testimonials` the landing page gates on) and its
 * initializer is `[]`, optionally `as T[]`. The 66.2-39 part I AST sweep
 * (never-mutated empty arrays and all-literal objects, and `useState` of one
 * whose setter is never called) found these two and nothing else.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");

function sourceFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const abs = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name !== "__tests__" && entry.name !== "test") {
				out.push(...sourceFiles(abs));
			}
		} else if (
			/\.(ts|tsx)$/.test(entry.name) &&
			!/\.(test|spec)\.(ts|tsx)$/.test(entry.name) &&
			!entry.name.endsWith(".d.ts")
		) {
			out.push(abs);
		}
	}
	return out;
}

const LOCAL_EMPTY_LIST =
	/^[ \t]+(?:const|let)\s+([A-Za-z_$][\w$]*)(?:\s*:\s*[^=\n]+)?\s*=\s*\[\](?:\s+as\s+[^;\n]+)?;/gm;

function escapeName(name: string): string {
	return name.replace(/\$/g, "\\$");
}

/**
 * Whether `source` fills or replaces the list named `name` anywhere outside
 * its declaration (`declaredAt`, the declaration's start and end offsets).
 */
function isFilled(
	source: string,
	name: string,
	declaredAt: readonly [number, number],
): boolean {
	const n = escapeName(name);
	const writes = [
		`\\b${n}\\s*\\.\\s*(?:push|unshift|splice|fill|copyWithin)\\s*\\(`,
		`\\b${n}\\s*\\[[^\\]]*\\]\\s*=(?!=)`,
		`(?<![.\\w$])${n}\\s*=(?![=>])`,
		`\\b${n}\\.length\\s*=(?!=)`,
	];
	return writes.some((write) =>
		[...source.matchAll(new RegExp(write, "g"))].some(
			(match) => match.index < declaredAt[0] || match.index >= declaredAt[1],
		),
	);
}

/** `file:line name` for every local empty list nothing fills. */
function unfilledLists(files: ReadonlyMap<string, string>): string[] {
	const hits: string[] = [];
	for (const [path, source] of files) {
		for (const match of source.matchAll(LOCAL_EMPTY_LIST)) {
			const name = match[1];
			const declaredAt = [match.index, match.index + match[0].length] as const;
			if (name === undefined || isFilled(source, name, declaredAt)) continue;
			const line = source.slice(0, match.index).split("\n").length;
			hits.push(`${path}:${line} ${name}`);
		}
	}
	return hits;
}

describe("no local list stays the empty literal it was declared as", () => {
	const files = new Map(
		sourceFiles(SRC).map((abs) => [
			relative(process.cwd(), abs),
			readFileSync(abs, "utf8"),
		]),
	);

	it("scans the local empty-list declarations", () => {
		// The accumulators the code fills: a vacuous scan would find none.
		let declarations = 0;
		for (const source of files.values()) {
			declarations += [...source.matchAll(LOCAL_EMPTY_LIST)].length;
		}
		expect(declarations).toBeGreaterThan(20);
	});

	it("flags a planted placeholder and passes a filled accumulator", () => {
		const planted = new Map([
			[
				"a.tsx",
				"function A() {\n\tconst rows = [] as Row[];\n\treturn rows.map(r);\n}",
			],
			[
				"b.ts",
				"function b() {\n\tconst out: string[] = [];\n\tout.push(x);\n\treturn out;\n}",
			],
			[
				"c.ts",
				"function c() {\n\tlet acc: number[] = [];\n\tacc = acc.concat(1);\n\treturn acc;\n}",
			],
		]);
		expect(unfilledLists(planted)).toEqual(["a.tsx:2 rows"]);
	});

	it("finds none in src/", () => {
		const hits = unfilledLists(files);
		expect(
			hits,
			`a list declared empty and never filled -- load the data, or delete the section:\n${hits.join("\n")}`,
		).toEqual([]);
	});
});
