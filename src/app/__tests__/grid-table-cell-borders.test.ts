/**
 * A grid table's rows draw one line each, not one per cell.
 *
 * WHAT WENT WRONG. globals.css gave every `th` and `td` a bottom border. In a
 * table that collapses its borders those merge into one row line, but the
 * virtualized lease, tenant, property and portfolio lists lay their rows out as
 * grid and flex: each cell drew its own line at its own height, with gaps at
 * the column edges, under the separator the table already draws (`divide-y` on
 * the body, or the shadcn `TableRow` border).
 *
 * THE RULE. The base cell border applies only to tables without the `grid`
 * class, and every `grid` table draws its own row lines.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function tsxSources(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			return entry.name === "__tests__" ? [] : tsxSources(path);
		}
		return entry.name.endsWith(".tsx") && !entry.name.includes(".test.")
			? [path]
			: [];
	});
}

describe("grid table cell borders", () => {
	it("draws the base cell border only in tables that collapse borders", () => {
		const css = readFileSync(join(ROOT, "src/app/globals.css"), "utf8").replace(
			/\/\*[\s\S]*?\*\//g,
			"",
		);
		const cellBorderSelectors = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
			.filter(([, , body]) => /border-bottom\s*:/.test(body ?? ""))
			.map(([, selector]) => (selector ?? "").trim().replace(/\s+/g, " "))
			.filter((selector) => /(^|[\s,(])(td|th)\b/.test(selector));
		expect(cellBorderSelectors).toEqual([
			":where(table:not(.grid)) :is(th, td)",
		]);
	});

	it("gives every grid table its own row lines", () => {
		const gridTables = tsxSources(join(ROOT, "src")).filter((path) =>
			/<table\b[^>]*className="[^"]*\bgrid\b/.test(readFileSync(path, "utf8")),
		);
		expect(gridTables.length).toBeGreaterThanOrEqual(4);
		const withoutRowLines = gridTables
			.filter(
				(path) => !/divide-y|<TableRow\b/.test(readFileSync(path, "utf8")),
			)
			.map((path) => relative(ROOT, path));
		expect(
			withoutRowLines,
			"A grid table draws no row line of its own: the base cell border does not apply to it.",
		).toEqual([]);
	});
});
