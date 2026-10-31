// Git-baseline red-proof runner for the Tailwind theme guards of Phase 66.2.
// Read-only: reads files under --root, writes only the --json file when given.
// Run from the repo root:
//   bun .planning/tailwind-shadcn/audit/guard-redproof.ts --root <dir> --guards G1,G6 --json <file>
// --root defaults to the current directory, --guards to every registered id.
// It runs the guard check functions of src/test/utils/tailwind-guards.ts against
// the tree at --root (for example an extracted 754c91802 baseline), so a gate can
// show each guard fails where its defect existed and passes on the current tree.
// Registry extended by 66.2-05 (G2), 07 (G4), 08 (G3), 09 (G5), 12 (G6
// extension), 14 (G7), 16 (inline-structure), 18 (G8); run by gates
// 66.2-10/15/17/19/29/37.
//
// Module rule: the chdir to root runs FIRST, then the check modules are
// imported from THIS checkout (WORKTREE) by absolute file URL, never from root.
// Their module-level REPO_ROOT (process.cwd()) therefore binds to root, while the
// code always comes from the worktree. A baseline tree has no tailwind-guards.ts,
// which is why code never comes from root; only data (globals.css, the src/
// texts a guard scans, src/lib/utils.ts for G5) is read from root.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
// Type-only imports: erased before run time, resolved relative to this file.
import type * as EngineModule from "../../../src/test/utils/tailwind-engine.ts";
import type * as GuardsModule from "../../../src/test/utils/tailwind-guards.ts";

type GuardContext = {
	root: string;
	css: string;
	compiler: EngineModule.TailwindCompiler;
	engine: EngineModule.TailwindEngine;
};

// Shape of <root>/src/lib/utils.ts that G5 reads; a baseline tree exports cn only.
type RootUtilsModule = {
	cn: GuardsModule.MergeFunction;
	TAILWIND_MERGE_EXTENSION?: GuardsModule.MergeExtension;
};

type GuardEntry = {
	id: string;
	run(
		ctx: GuardContext,
	): GuardsModule.GuardResult | Promise<GuardsModule.GuardResult>;
};

const WORKTREE = fileURLToPath(new URL("../../../", import.meta.url));

function fail(message: string): never {
	process.stderr.write(`guard-redproof: ${message}\n`);
	process.exit(2);
}

function parseArgs(argv: string[]): {
	root: string;
	guards: string[] | null;
	json: string | null;
} {
	let root = process.cwd();
	let guards: string[] | null = null;
	let json: string | null = null;
	for (let i = 0; i < argv.length; i += 1) {
		const flag = argv[i];
		const value = argv[i + 1];
		if (flag === "--root" || flag === "--guards" || flag === "--json") {
			if (value === undefined || value.startsWith("--")) {
				fail(`${flag} needs a value`);
			}
			i += 1;
			if (flag === "--root") root = value;
			if (flag === "--guards") {
				guards = value
					.split(",")
					.map((id) => id.trim())
					.filter((id) => id !== "");
			}
			if (flag === "--json") json = path.resolve(value);
		} else {
			fail(`unknown argument ${flag}`);
		}
	}
	return { root: path.resolve(root), guards, json };
}

const args = parseArgs(process.argv.slice(2));
const cssPath = path.join(args.root, "src/app/globals.css");
if (!existsSync(cssPath)) fail(`no src/app/globals.css under ${args.root}`);

process.chdir(args.root);

const engineModule: typeof EngineModule = await import(
	pathToFileURL(path.join(WORKTREE, "src/test/utils/tailwind-engine.ts")).href
);
const guardsModule: typeof GuardsModule = await import(
	pathToFileURL(path.join(WORKTREE, "src/test/utils/tailwind-guards.ts")).href
);

// Each later guard plan appends its own entry here (ids G3, G4, G5, G7, G8,
// inline-structure), keeping registry order equal to the default run order.
const GUARDS: GuardEntry[] = [
	{ id: "G1", run: (ctx) => guardsModule.checkOklchRange(ctx.css) },
	{
		// 66.2-12: the explicit @source globs plus the source() root, which must
		// cover <root>/src (a 754c91802 tree has no source(), so its root is null).
		id: "G6",
		run: (ctx) => {
			const globs = guardsModule.checkSourceGlobs(ctx.compiler.sources);
			const root = guardsModule.checkSourceRoot(ctx.compiler.root, path.join(ctx.root, "src"));
			return { checked: globs.checked + root.checked, violations: [...globs.violations, ...root.violations] };
		},
	},
	{ id: "G2", run: (ctx) => guardsModule.checkNonInlineThemeVarRefs(ctx.css) },
	{
		id: "G4",
		run: (ctx) =>
			guardsModule.checkLightOnlyColorTokens(
				ctx.css,
				ctx.engine.compiledCss,
				guardsModule.collectSourceCustomPropertyRefs(path.join(ctx.root, "src")),
			),
	},
	{
		id: "G3",
		run: (ctx) =>
			guardsModule.checkUtilityShadowing(ctx.css, path.join(ctx.root, "src/app")),
	},
	{
		// G5 takes the merge function and extension from root's own utils.ts; the
		// 754c91802 tree has no extension export, so only its merge failures count.
		id: "G5",
		run: async (ctx) => {
			const utils: RootUtilsModule = await import(
				pathToFileURL(path.join(ctx.root, "src/lib/utils.ts")).href
			);
			return guardsModule.checkMergeKeys(
				ctx.css,
				utils.TAILWIND_MERGE_EXTENSION ?? undefined,
				utils.cn,
			);
		},
	},
	{
		// 66.2-14: dangling theme-namespace var() references. The compiled CSS is
		// ctx.engine's build of <root>'s globals.css over <root>/src (the same
		// build loadProjectTailwindEngine() makes with REPO_ROOT bound to root);
		// the sources and node_modules/geist are read from root.
		id: "G7",
		run: (ctx) => {
			const sources = guardsModule.collectG7SourceTexts(ctx.root);
			return guardsModule.checkG7DanglingThemeVars(
				ctx.engine.compiledCss,
				sources,
				guardsModule.deriveG7RuntimeVars(sources, ctx.root),
			);
		},
	},
	{
		// 66.2-18: canonical first-party classes (D-25). Every root is scanned with
		// this one src/ rule (the post-W2 D-18 scan root, minus test files and the
		// vendored src/components/ui), so the 754c91802 baseline, whose globals.css
		// has no source(), and the current tree are measured identically. The
		// design system is <root>'s globals.css with base <root>/src/app
		// (loadProjectDesignSystem binds TAILWIND_BASE to root after the chdir).
		id: "G8",
		run: async (ctx) => {
			const ds = await engineModule.loadProjectDesignSystem(ctx.css);
			const src = path.join(ctx.root, "src");
			const { candidates } = engineModule.scanSources(
				guardsModule.firstPartyScanSources(
					[
						{ base: src, pattern: "**/*", negated: false },
						{ base: src, pattern: "**/*.test.{ts,tsx}", negated: true },
					],
					ctx.root,
				),
			);
			return guardsModule.checkCanonicalCandidates(ds, candidates);
		},
	},
	{
		// 66.2-16: D-23/X4 structure pin over <root>'s globals.css text.
		id: "inline-structure",
		run: (ctx) => guardsModule.checkInlineColorTokenStructure(ctx.css),
	},
];

const selected = args.guards ?? GUARDS.map((entry) => entry.id);
const unknown = selected.filter((id) => !GUARDS.some((entry) => entry.id === id));
if (unknown.length > 0) {
	fail(
		`unknown guard id(s) ${unknown.join(", ")}; registered: ${GUARDS.map((entry) => entry.id).join(", ")}`,
	);
}
if (selected.length === 0) fail("--guards selected no guard");

const css = readFileSync(cssPath, "utf8");
const engine = await engineModule.loadTailwindEngine({
	css,
	base: path.join(args.root, "src/app"),
	from: cssPath,
});
const ctx: GuardContext = {
	root: args.root,
	css,
	compiler: engine.compiler,
	engine,
};

const guards: Record<string, { count: number; violations: string[] }> = {};
for (const id of selected) {
	const entry = GUARDS.find((candidate) => candidate.id === id);
	if (entry === undefined) fail(`unknown guard id ${id}`);
	const result = await entry.run(ctx);
	guards[id] = { count: result.violations.length, violations: result.violations };
}

const text = `${JSON.stringify({ root: args.root, guards }, null, 2)}\n`;
process.stdout.write(text);
if (args.json !== null) writeFileSync(args.json, text);
