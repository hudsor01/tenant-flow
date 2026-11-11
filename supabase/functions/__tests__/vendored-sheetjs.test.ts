/**
 * The vendored SheetJS build stays the pinned build, and the Edge Functions
 * use only its write API.
 *
 * WHY. `supabase/functions/_shared/vendor/` holds SheetJS Community Edition
 * (`xlsx.mjs` and its types) because Supabase's hosted bundler refuses imports
 * from cdn.sheetjs.com. `.github/codeql/codeql-config.yml` excludes that
 * directory from CodeQL: its alerts sit in SheetJS's read and parse paths and
 * in a regex built from its own constants, and the Edge Functions only write
 * workbooks from their own report data. Two things would make that exclusion
 * wrong, and this file fails on each:
 *   - the vendored files drift from the build `package.json` pins (an upgrade
 *     that bumps `package.json` and forgets the copy, or a hand edit);
 *   - Edge code calls a SheetJS API outside the reviewed write set (a read of
 *     an uploaded workbook would reach the code CodeQL no longer scans).
 * Test code (`tests/`, `__tests__/`) may read workbooks back; it is not
 * deployed.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const FUNCTIONS = join(ROOT, "supabase/functions");
const VENDOR = join(FUNCTIONS, "_shared/vendor");

/** The SheetJS members Edge code may name: the write API and two types. */
const REVIEWED_XLSX_MEMBERS = [
	"CellObject",
	"WorkSheet",
	"utils.book_append_sheet",
	"utils.book_new",
	"utils.encode_cell",
	"utils.encode_range",
	"write",
] as const;

function sha256(path: string): string {
	return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function pinnedVersion(): string {
	const pkg: unknown = JSON.parse(
		readFileSync(join(ROOT, "package.json"), "utf8"),
	);
	const deps =
		typeof pkg === "object" && pkg !== null && "dependencies" in pkg
			? (pkg.dependencies as Record<string, string>)
			: {};
	const spec = deps.xlsx ?? "";
	const version = /\/xlsx-(\d+\.\d+\.\d+)\.tgz$/.exec(spec)?.[1];
	if (version === undefined) {
		throw new Error(`package.json pins xlsx as ${spec || "nothing"}, not a SheetJS CDN tarball`);
	}
	return version;
}

/** Deployed Edge source: every .ts under supabase/functions but tests and the vendor copy. */
function edgeSources(dir = FUNCTIONS): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			return ["tests", "__tests__", "vendor", "node_modules"].includes(entry.name)
				? []
				: edgeSources(path);
		}
		return entry.name.endsWith(".ts") ? [path] : [];
	});
}

describe("vendored SheetJS", () => {
	it("is byte for byte the build package.json pins, and nothing else is vendored", () => {
		const version = pinnedVersion();
		expect(readdirSync(VENDOR).sort()).toEqual(
			[`xlsx-${version}.d.ts`, `xlsx-${version}.mjs`].sort(),
		);
		expect(sha256(join(VENDOR, `xlsx-${version}.mjs`))).toBe(
			sha256(join(ROOT, "node_modules/xlsx/xlsx.mjs")),
		);
		expect(sha256(join(VENDOR, `xlsx-${version}.d.ts`))).toBe(
			sha256(join(ROOT, "node_modules/xlsx/types/index.d.ts")),
		);
	});

	it("is imported whole as XLSX and called only through its write API", () => {
		const importers: string[] = [];
		const members = new Set<string>();
		for (const path of edgeSources()) {
			const source = readFileSync(path, "utf8");
			for (const m of source.matchAll(/^import[^;]*?from\s+"([^"]*vendor\/xlsx-[^"]*)";/gms)) {
				const file = relative(ROOT, path);
				importers.push(file);
				expect(m[0], `${file} imports the vendored SheetJS other than as \`* as XLSX\``).toMatch(
					/^import \* as XLSX from "/,
				);
			}
			for (const m of source.matchAll(/\bXLSX\.([A-Za-z_]+(?:\.[A-Za-z_]+)?)/g)) {
				if (m[1] !== undefined) members.add(m[1]);
			}
		}
		expect(importers).toEqual(["supabase/functions/_shared/report-xlsx.ts"]);
		const unreviewed = [...members].filter(
			(name) => !(REVIEWED_XLSX_MEMBERS as readonly string[]).includes(name),
		);
		expect(
			unreviewed,
			"Edge code names a SheetJS member outside the reviewed write set. Its code is excluded from CodeQL (.github/codeql/codeql-config.yml): review the new call for untrusted input before adding it here.",
		).toEqual([]);
		expect([...members].sort()).toContain("write");
	});
});
