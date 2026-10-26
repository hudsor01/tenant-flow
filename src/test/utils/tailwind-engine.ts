/**
 * The one Tailwind engine every guard in
 * `src/app/__tests__/tailwind-theme-integrity.test.ts` runs against: it compiles
 * a stylesheet with Tailwind's own compiler, scans the sources that compiler
 * declares with Tailwind's own Oxide scanner, and loads Tailwind's own design
 * system for the same stylesheet.
 *
 * NOT A BARREL FILE. Everything below is declared here and nothing is
 * re-exported (CLAUDE.md zero-tolerance rule 2).
 *
 * WHY IT EXISTS. D-17. The theme defects Phase 66.2 removes shipped because the
 * earlier checks read regex copies of `globals.css` (X1/X6), and a regex copy
 * agrees with itself no matter what the real compiler does. A guard built on
 * this module asks the compiler, the scanner and the design system directly,
 * so it sees what the production build sees.
 *
 * WHAT IT PROVIDES.
 *   - `loadProjectTailwindEngine()`: the real `src/app/globals.css`, read from
 *     disk on every call (the test file owns sharing one promise).
 *   - `loadTailwindEngine({ css })`: the same pipeline for ANY stylesheet text,
 *     so a guard can be fed the pre-fix baseline
 *     (`git show 754c91802:src/app/globals.css`) to prove it fails there.
 *   - `fixtureCss()` / `loadFixtureEngine()`: an isolated stylesheet that opts
 *     out of source detection, so a negative control compiles a few lines
 *     without scanning the repository or inheriting the project theme.
 *   - `resolveScanSources()` / `scanSources()` / `parseCss()`: the individual
 *     steps, for guards that need a custom source set or the postcss tree.
 *
 * CONSTRAINTS.
 *   1. Imports are limited to `node:fs`, `node:path`, `@tailwindcss/node`,
 *      `@tailwindcss/oxide` and `postcss`: no `#` alias and no relative or
 *      `src/` import. Plain Node and the git-baseline red-proof runner
 *      (`.planning/tailwind-shadcn/audit/guard-redproof.ts`, 66.2-04) import
 *      this file directly. `REPO_ROOT` is `process.cwd()` at module load, so
 *      the runner's `process.chdir(root)` before the import binds it to the
 *      tree under test. The guard check functions live in
 *      `src/test/utils/tailwind-guards.ts` (66.2-04), not here.
 *   2. Only erasable TypeScript (no enum, namespace or constructor parameter
 *      properties), and every type-only import is written `import type`, so
 *      Node's type stripping can load the file unchanged.
 *   3. No utility class names in string literals or comments. This file sits
 *      inside the scanned source set, so anything that reads as a class would
 *      join the project build. Fixture stylesheets and probe classes belong in
 *      the test file, which the `@source not` line for test files in
 *      `globals.css` keeps out of the scan.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { __unstable__loadDesignSystem, compile } from "@tailwindcss/node";
import type { SourceEntry } from "@tailwindcss/oxide";
import { Scanner } from "@tailwindcss/oxide";
import type { Root } from "postcss";
import postcss from "postcss";

export const REPO_ROOT = process.cwd();

export const GLOBALS_CSS_PATH = resolve(REPO_ROOT, "src/app/globals.css");

export const TAILWIND_BASE = dirname(GLOBALS_CSS_PATH);

export const FIXTURE_CSS_PREFIX = '@import "tailwindcss" source(none);\n';

export type TailwindCompiler = Awaited<ReturnType<typeof compile>>;

export type TailwindDesignSystem = Awaited<
	ReturnType<typeof __unstable__loadDesignSystem>
>;

export interface LoadTailwindEngineOptions {
	css: string;
	from?: string;
	base?: string;
}

export interface TailwindEngine {
	readonly css: string;
	readonly from: string;
	readonly base: string;
	readonly ast: Root;
	readonly compiler: TailwindCompiler;
	readonly sources: SourceEntry[];
	readonly candidates: string[];
	readonly scannedFiles: string[];
	readonly compiledCss: string;
	readonly designSystem: TailwindDesignSystem;
}

/**
 * Source detection exactly as `@tailwindcss/postcss` performs it (and as
 * `.planning/tailwind-shadcn/audit/audit.mjs` mirrors it): `source(none)`
 * scans nothing automatically, an absent root scans the repository root, and
 * an explicit root scans that root; the declared `@source` entries follow.
 */
export function resolveScanSources(
	compiler: Pick<TailwindCompiler, "root" | "sources">,
	repoRoot: string = REPO_ROOT,
): SourceEntry[] {
	const { root } = compiler;
	const automatic: SourceEntry[] =
		root === "none"
			? []
			: root === null
				? [{ base: repoRoot, pattern: "**/*", negated: false }]
				: [{ ...root, negated: false }];
	return automatic.concat(compiler.sources);
}

export function scanSources(sources: SourceEntry[]): {
	candidates: string[];
	files: string[];
} {
	const scanner = new Scanner({ sources });
	const candidates = scanner.scan();
	return { candidates, files: scanner.files };
}

export function parseCss(css: string, from: string = GLOBALS_CSS_PATH): Root {
	return postcss.parse(css, { from });
}

export async function loadTailwindEngine(
	options: LoadTailwindEngineOptions,
): Promise<TailwindEngine> {
	const { css } = options;
	const base = options.base ?? TAILWIND_BASE;
	const from = options.from ?? GLOBALS_CSS_PATH;
	const compiler = await compile(css, {
		base,
		from,
		onDependency: () => undefined,
	});
	const sources = resolveScanSources(compiler);
	const { candidates, files } = scanSources(sources);
	const compiledCss = compiler.build(candidates);
	const designSystem = await __unstable__loadDesignSystem(css, { base });
	const ast = parseCss(css, from);
	return {
		css,
		from,
		base,
		ast,
		compiler,
		sources,
		candidates,
		scannedFiles: files,
		compiledCss,
		designSystem,
	};
}

export function loadProjectTailwindEngine(): Promise<TailwindEngine> {
	const css = readFileSync(GLOBALS_CSS_PATH, "utf8");
	return loadTailwindEngine({ css });
}

export function fixtureCss(body: string): string {
	return FIXTURE_CSS_PREFIX + body;
}

export function loadFixtureEngine(body: string): Promise<TailwindEngine> {
	return loadTailwindEngine({ css: fixtureCss(body) });
}
