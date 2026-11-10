// In-memory source("..") scan projection for TenantFlow (66.2-02). Read-only:
// writes its report to $TW_AUDIT_OUT (default: <tmpdir>/tenantflow-tw-audit),
// never to the repo. It rewrites the globals.css source directives IN MEMORY
// (no file under src/ is written) and compares the scan of today's CSS with the
// scan of the projected `@import "tailwindcss" source("..");` CSS.
// Run from the repo root:  node .planning/tailwind-shadcn/audit/scope-projection.mjs
// Output: { currentFiles, projectedFiles, projectedRoot, droppedValidCandidates,
// addedValidCandidates } (the M1 target and the D-18 dropped-candidate claim).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = process.cwd();
const require = createRequire(path.join(ROOT, "package.json"));
const { __unstable__loadDesignSystem, compile } = await import(require.resolve("@tailwindcss/node"));
const { Scanner } = require("@tailwindcss/oxide");

const OUT = process.env.TW_AUDIT_OUT ?? path.join(os.tmpdir(), "tenantflow-tw-audit");
fs.mkdirSync(OUT, { recursive: true });
const cssPath = path.join(ROOT, "src/app/globals.css");
const base = path.dirname(cssPath);
const css = fs.readFileSync(cssPath, "utf8");

// The four in-memory edits. Each must apply exactly once, or the projection
// would silently measure something other than the intended directive set.
const lines = css.split("\n");
const replaceOnce = (from, to) => {
	const hits = lines.flatMap((l, i) => (l.trim() === from ? [i] : []));
	if (hits.length !== 1) throw new Error(`expected exactly one line "${from}" in globals.css, found ${hits.length}`);
	if (to === null) lines.splice(hits[0], 1);
	else lines[hits[0]] = to;
};
replaceOnce('@import "tailwindcss";', '@import "tailwindcss" source("..");');
replaceOnce('@source "..*.{ts,tsx}";', null);
replaceOnce('@source not "../../.planning/**/*";', null);
replaceOnce('@source not "../../README.md";', null);
const projectedCss = lines.join("\n");
if (!projectedCss.includes('@source not "../**/*.test.{ts,tsx}";')) throw new Error("test-file exclusion missing from the projection");

// Scan construction identical to audit.mjs (auto root = cwd when root is null).
const scan = async (text) => {
	const compiler = await compile(text, { base, from: cssPath, onDependency() {} });
	const sources = (
		compiler.root === "none"
			? []
			: compiler.root === null
				? [{ base: ROOT, pattern: "**/*", negated: false }]
				: [{ ...compiler.root, negated: false }]
	).concat(compiler.sources);
	const scanner = new Scanner({ sources });
	const candidates = scanner.scan();
	return { compiler, candidates, files: scanner.files.length };
};
const current = await scan(css);
const projected = await scan(projectedCss);

// One design system, loaded on the real CSS, decides validity for both sets.
const ds = await __unstable__loadDesignSystem(css, { base });
const validSet = (cands) => {
	const out = ds.candidatesToCss(cands);
	return new Set(cands.filter((_, i) => out[i] !== null));
};
const validCurrent = validSet(current.candidates);
const validProjected = validSet(projected.candidates);

const root = projected.compiler.root;
const report = {
	currentFiles: current.files,
	projectedFiles: projected.files,
	projectedRoot:
		root === "none" || root === null
			? root
			: { base: path.relative(ROOT, root.base) || ".", pattern: root.pattern },
	droppedValidCandidates: [...validCurrent].filter((c) => !validProjected.has(c)).sort(),
	addedValidCandidates: [...validProjected].filter((c) => !validCurrent.has(c)).sort(),
};
fs.writeFileSync(path.join(OUT, "scope-projection.json"), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
