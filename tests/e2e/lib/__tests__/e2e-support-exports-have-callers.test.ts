/**
 * Every export of a Playwright support module has a caller.
 *
 * WHY. The support modules (`tests/e2e/lib/`, `tests/e2e/tests/helpers/`,
 * `fixtures/`, `constants/`, `utils/`, `test-data/` and the top-level helpers)
 * had grown 97 exports no file imported, among them a 694-line TanStack helper
 * suite and a Stripe Connect data file for a feature that is permanently out of
 * scope. An uncalled helper reads as the sanctioned way to do something, and
 * one of them was a race: the outside-click modal close f27cf9e3c deleted
 * clicked before the Radix listener attached. So they are not harmless.
 *
 * THE RULE. A name a support module exports must be imported by another
 * tracked source file: a named, default, type or namespace import (`ns.name`),
 * or a dynamic `import()` / `vi.mock()` of the module. git grep -w alone cannot
 * prove a generic name (`createTenant`, `batch`) live, because unrelated files
 * use the same word, so the check follows the import specifier to the module.
 * A name only the module itself uses is not exported.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const E2E_ROOT = resolve(ROOT, "tests/e2e");

/** Directories no caller lives in (build output, artifacts, dependencies). */
const SKIP_DIRECTORIES = new Set([
	".cache",
	".fallow",
	".git",
	".next",
	".planning",
	"coverage",
	"node_modules",
	"playwright-report",
	"test-results",
]);

const CODE_FILE = /\.(ts|tsx|mts|mjs|js|cjs)$/;

function walk(dir: string, out: string[]): string[] {
	for (const name of readdirSync(dir)) {
		if (SKIP_DIRECTORIES.has(name)) continue;
		const path = join(dir, name);
		if (statSync(path).isDirectory()) walk(path, out);
		else if (CODE_FILE.test(name)) out.push(path);
	}
	return out;
}

/** A support module: an e2e source file that is not a spec, a guard or a declaration file. */
function isSupportModule(path: string): boolean {
	const rel = relative(E2E_ROOT, path);
	return (
		!rel.startsWith("..") &&
		path.endsWith(".ts") &&
		!path.endsWith(".spec.ts") &&
		!path.endsWith(".d.ts") &&
		!path.endsWith("playwright.config.ts") &&
		!rel.split("/").includes("__tests__")
	);
}

/** The names a module exports, read from its top-level `export` statements. */
function exportedNames(source: string): string[] {
	const names = new Set<string>();
	for (const m of source.matchAll(
		/^export\s+(?:declare\s+)?(?:async\s+)?(?:function\*?|const|let|var|class|abstract\s+class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/gm,
	)) {
		if (m[1]) names.add(m[1]);
	}
	for (const m of source.matchAll(/^export\s+(?:type\s+)?\{([^}]*)\}/gm)) {
		for (const part of (m[1] ?? "").split(",")) {
			const name = part
				.trim()
				.replace(/^type\s+/, "")
				.split(/\s+as\s+/)
				.pop()
				?.trim();
			if (name) names.add(name);
		}
	}
	if (/^export\s+default\b/m.test(source)) names.add("default");
	return [...names];
}

/**
 * A static import or re-export statement (anchored at a line start, its clause
 * limited to names, `*`, `as`, commas and one brace group, so it cannot run on
 * into the next statement), a dynamic `import()`, or a `vi.mock()`.
 */
const IMPORT_FORMS =
	/^[ \t]*(?:import|export)\s+(?:type\s+)?((?:[\w$*,\s]|\{[^}]*\})+?)\s+from\s+["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']\s*\)|\bvi\.mock\(\s*["']([^"']+)["']/gm;

function resolveRelative(
	from: string,
	specifier: string,
	modules: Set<string>,
): string | null {
	if (!specifier.startsWith(".")) return null;
	const base = resolve(dirname(from), specifier);
	for (const candidate of [
		base,
		`${base}.ts`,
		base.replace(/\.js$/, ".ts"),
		join(base, "index.ts"),
	]) {
		if (modules.has(candidate)) return candidate;
	}
	return null;
}

/**
 * The member read in every `namespace.member` access in `source`, found by
 * scanning rather than by a pattern built from the name: the name is an
 * identifier, so it may hold `$`, which a pattern reads as an anchor, and `\b`
 * would find `ns.x` inside `$ns.x`. An access counts when no identifier
 * character precedes the namespace.
 */
function namespaceMembers(source: string, namespace: string): string[] {
	const members: string[] = [];
	const prefix = `${namespace}.`;
	for (
		let at = source.indexOf(prefix);
		at >= 0;
		at = source.indexOf(prefix, at + 1)
	) {
		if (/[\w$]/.test(source[at - 1] ?? "")) continue;
		const member = /^[A-Za-z_$][\w$]*/.exec(
			source.slice(at + prefix.length),
		)?.[0];
		if (member) members.push(member);
	}
	return members;
}

/**
 * The names each module is imported under, keyed by module path. A dynamic
 * import or a `vi.mock` of a module counts every identifier in the importing
 * file, since the names it reads cannot be told apart statically.
 */
function importedNamesByModule(
	files: ReadonlyMap<string, string>,
	modules: Set<string>,
): Map<string, Set<string>> {
	const imported = new Map<string, Set<string>>();
	const add = (module: string, name: string) => {
		const set = imported.get(module) ?? new Set<string>();
		set.add(name);
		imported.set(module, set);
	};
	for (const [path, source] of files) {
		for (const m of source.matchAll(IMPORT_FORMS)) {
			const specifier = m[2] ?? m[3] ?? m[4] ?? "";
			const module = resolveRelative(path, specifier, modules);
			if (!module || module === path) continue;
			if (m[3] || m[4]) {
				for (const id of source.matchAll(/[A-Za-z_$][\w$]*/g))
					add(module, id[0]);
				continue;
			}
			const clause = m[1] ?? "";
			const namespace = clause.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/)?.[1];
			if (namespace) {
				for (const member of namespaceMembers(source, namespace))
					add(module, member);
			}
			const braces = clause.match(/\{([\s\S]*)\}/)?.[1];
			for (const part of braces?.split(",") ?? []) {
				const name = part
					.trim()
					.replace(/^type\s+/, "")
					.split(/\s+as\s+/)[0]
					?.trim();
				if (name) add(module, name);
			}
			const defaultName = clause
				.replace(/\{[\s\S]*\}/, "")
				.replace(/\*\s+as\s+[A-Za-z_$][\w$]*/, "")
				.replace(/,/g, "")
				.trim();
			if (/^[A-Za-z_$][\w$]*$/.test(defaultName)) add(module, "default");
		}
	}
	return imported;
}

/** Every `module: name` exported with no importer. */
function uncalledExports(
	files: ReadonlyMap<string, string>,
	modules: Set<string>,
): string[] {
	const imported = importedNamesByModule(files, modules);
	const out: string[] = [];
	for (const module of modules) {
		const source = files.get(module) ?? "";
		for (const name of exportedNames(source)) {
			if (!imported.get(module)?.has(name))
				out.push(`${relative(ROOT, module)}: ${name}`);
		}
	}
	return out.sort();
}

describe("Playwright support modules export only what is imported (66.2-39 fix round 1, part F)", () => {
	it("leaves no support-module export without an importer", () => {
		const files = new Map<string, string>();
		for (const path of walk(ROOT, []))
			files.set(path, readFileSync(path, "utf8"));
		const modules = new Set([...files.keys()].filter(isSupportModule));
		expect(modules.size).toBeGreaterThan(10);
		expect(uncalledExports(files, modules)).toEqual([]);
	});

	it("flags an uncalled export and passes every import form", () => {
		const helper = resolve(E2E_ROOT, "lib/fixture-helper.ts");
		const ns = resolve(E2E_ROOT, "lib/fixture-ns.ts");
		const spec = resolve(E2E_ROOT, "tests/fixture.spec.ts");
		const files = new Map<string, string>([
			[
				helper,
				[
					"export function usedNamed() {}",
					"export const usedAliased = 1;",
					"export interface UsedType { a: number }",
					"export async function uncalled() {}",
					"export default function main() {}",
					"export { local as renamedExport };",
					"const local = 2;",
				].join("\n"),
			],
			[
				ns,
				"export function viaNamespace() {}\nexport function namespaceUnused() {}",
			],
			[
				spec,
				[
					'import main, { usedNamed, usedAliased as a, type UsedType, renamedExport } from "../lib/fixture-helper";',
					'import * as helpers from "../lib/fixture-ns";',
					"helpers.viaNamespace();",
				].join("\n"),
			],
		]);
		expect(uncalledExports(files, new Set([helper, ns]))).toEqual([
			"tests/e2e/lib/fixture-helper.ts: uncalled",
			"tests/e2e/lib/fixture-ns.ts: namespaceUnused",
		]);
	});

	it("reads a namespace name holding `$` literally and as a whole identifier", () => {
		const ns = resolve(E2E_ROOT, "lib/fixture-dollar.ts");
		const spec = resolve(E2E_ROOT, "tests/fixture-dollar.spec.ts");
		const other = resolve(E2E_ROOT, "tests/fixture-other.spec.ts");
		const files = new Map<string, string>([
			[ns, "export function read() {}\nexport function lookalike() {}"],
			[spec, 'import * as $ns from "../lib/fixture-dollar";\n$ns.read();'],
			// `x$ns` is another identifier: it reads nothing from the module.
			[
				other,
				'import * as $ns from "../lib/fixture-dollar";\nx$ns.lookalike();',
			],
		]);
		expect(uncalledExports(files, new Set([ns]))).toEqual([
			"tests/e2e/lib/fixture-dollar.ts: lookalike",
		]);
	});
});
