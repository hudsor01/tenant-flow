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

// Each later guard plan appends its own entry here (ids G2, G3, G4, G5, G7,
// G8, inline-structure), keeping registry order equal to the default run order.
const GUARDS: GuardEntry[] = [
	{ id: "G1", run: (ctx) => guardsModule.checkOklchRange(ctx.css) },
	{ id: "G6", run: (ctx) => guardsModule.checkSourceGlobs(ctx.compiler.sources) },
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
