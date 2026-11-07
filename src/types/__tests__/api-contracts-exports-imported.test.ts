/**
 * Every type `src/types/api-contracts.ts` exports is imported by another
 * tracked file (66.2-39 fix round 3, part 7b).
 *
 * WHY. The file exported 43 names no other file imported (two of them named
 * only in comments): List/Detail shapes for joins no query makes
 * (`MaintenanceRequestDetail` beside the live `MaintenanceDetailRow`),
 * Insert/Update aliases of the generated `TablesInsert`/`TablesUpdate`,
 * request inputs the Zod schemas replaced (`CreateLeaseInput` beside
 * `LeaseCreate`), filter and status shapes their factories never read, and
 * `ApiResponse`, which this PR's financial queries stopped returning. Each one
 * reads as the shape to reach for, and CLAUDE.md's Type Lookup Order sends a
 * search here before any new type: a dead one there is a wrong answer
 * (CLAUDE.md rule 3).
 *
 * THE RULE. A name the module exports is named in an import from it in
 * another tracked code file: `#types/api-contracts`, or a relative path to it.
 * A dynamic `import()` or a `vi.mock()` of the module counts every identifier
 * in the importing file. A name only the module itself uses is not exported.
 * The files come from `git ls-files`, as the sibling guards' do
 * (`e2e-support-exports-have-callers.test.ts`).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const MODULE = resolve(ROOT, "src/types/api-contracts.ts");
const ALIAS = "#types/api-contracts";
const CODE_FILE = /\.(ts|tsx|mts|mjs|js|cjs)$/;

function trackedCodeFiles(): string[] {
	const out = execFileSync("git", ["ls-files", "-z"], {
		cwd: ROOT,
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
	});
	return out
		.split("\0")
		.filter((path) => CODE_FILE.test(path) && !path.startsWith(".planning/"))
		.map((path) => resolve(ROOT, path))
		.filter((path) => path !== MODULE && existsSync(path));
}

/** The names a module exports, read from its top-level `export` statements. */
function exportedNames(source: string): string[] {
	const names = new Set<string>();
	for (const m of source.matchAll(
		/^export\s+(?:declare\s+)?(?:async\s+)?(?:function\*?|const|let|var|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/gm,
	)) {
		if (m[1]) names.add(m[1]);
	}
	return [...names];
}

function isThisModule(from: string, specifier: string): boolean {
	if (specifier === ALIAS) return true;
	if (!specifier.startsWith(".")) return false;
	const target = resolve(dirname(from), specifier);
	return target === MODULE || `${target}.ts` === MODULE;
}

const IMPORT_FORMS =
	/^[ \t]*(?:import|export)\s+(?:type\s+)?((?:[\w$*,\s]|\{[^}]*\})+?)\s+from\s+["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']\s*\)|\bvi\.mock\(\s*["']([^"']+)["']/gm;

/** The names `source` (at `path`) imports from the module. */
function importedNames(path: string, source: string): Set<string> {
	const names = new Set<string>();
	for (const m of source.matchAll(IMPORT_FORMS)) {
		const specifier = m[2] ?? m[3] ?? m[4] ?? "";
		if (!isThisModule(path, specifier)) continue;
		if (m[3] || m[4]) {
			for (const id of source.matchAll(/[A-Za-z_$][\w$]*/g)) names.add(id[0]);
			continue;
		}
		const braces = (m[1] ?? "").match(/\{([\s\S]*)\}/)?.[1];
		for (const part of braces?.split(",") ?? []) {
			const name = part
				.trim()
				.replace(/^type\s+/, "")
				.split(/\s+as\s+/)[0]
				?.trim();
			if (name) names.add(name);
		}
	}
	return names;
}

/** The exports of `moduleSource` no file in `files` imports. */
function unimportedExports(
	moduleSource: string,
	files: ReadonlyMap<string, string>,
): string[] {
	const imported = new Set<string>();
	for (const [path, source] of files) {
		for (const name of importedNames(path, source)) imported.add(name);
	}
	return exportedNames(moduleSource)
		.filter((name) => !imported.has(name))
		.sort();
}

describe("src/types/api-contracts.ts exports only what another file imports", () => {
	it("leaves no export without an importer", () => {
		const files = new Map<string, string>();
		for (const path of trackedCodeFiles())
			files.set(path, readFileSync(path, "utf8"));
		const moduleSource = readFileSync(MODULE, "utf8");
		expect(exportedNames(moduleSource).length).toBeGreaterThan(5);
		expect(unimportedExports(moduleSource, files)).toEqual([]);
	});

	it("flags an export no file imports, and counts alias, relative and multi-line imports", () => {
		const moduleSource = [
			"export interface Kept {}",
			"export type AlsoKept = string;",
			"export type ViaRelative = number;",
			"export interface Dead {}",
		].join("\n");
		const files = new Map([
			[
				resolve(ROOT, "src/a.ts"),
				'import type {\n\tKept,\n\tAlsoKept as Renamed,\n} from "#types/api-contracts";',
			],
			[
				resolve(ROOT, "src/types/b.ts"),
				'import type { ViaRelative } from "./api-contracts";',
			],
			[
				resolve(ROOT, "src/c.ts"),
				'import type { Dead } from "#types/other-module";',
			],
		]);
		expect(unimportedExports(moduleSource, files)).toEqual(["Dead"]);
	});
});
