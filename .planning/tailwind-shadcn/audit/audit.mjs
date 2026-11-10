// Tailwind v4 / shadcn token audit for TenantFlow. Read-only: writes reports to
// $TW_AUDIT_OUT (default: <tmpdir>/tenantflow-tw-audit), never to the repo.
// Run from the repo root:  node .planning/tailwind-shadcn/audit/audit.mjs
// Every count it prints is a progress metric in .planning/tailwind-shadcn/PLAN.md.
// scanned-files.txt lists every file the class scan read, repo-relative and sorted (M1).
// M6 follows @theme inline var() mappings to :root/.dark (structure-agnostic light-only tokens).
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const require = createRequire(path.join(ROOT, "package.json"));
const { __unstable__loadDesignSystem, compile } = await import(require.resolve("@tailwindcss/node"));
const { Scanner } = require("@tailwindcss/oxide");
const postcss = require("postcss");

const OUT = process.env.TW_AUDIT_OUT ?? path.join(os.tmpdir(), "tenantflow-tw-audit");
fs.mkdirSync(OUT, { recursive: true });
const cssPath = path.join(ROOT, "src/app/globals.css");
const base = path.dirname(cssPath);
const css = fs.readFileSync(cssPath, "utf8");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
const report = {};

// 1. Source detection exactly as @tailwindcss/postcss does it (auto root = cwd).
const compiler = await compile(css, { base, from: cssPath, onDependency() {} });
const sources = (
	compiler.root === "none"
		? []
		: compiler.root === null
			? [{ base: ROOT, pattern: "**/*", negated: false }]
			: [{ ...compiler.root, negated: false }]
).concat(compiler.sources);
const scanner = new Scanner({ sources });
const candidates = scanner.scan();
const compiled = compiler.build(candidates);
fs.writeFileSync(path.join(OUT, "compiled.css"), compiled);
report.scannedFiles = scanner.files.length;
fs.writeFileSync(path.join(OUT, "scanned-files.txt"), scanner.files.map((f) => path.relative(ROOT, f)).sort().join("\n"));
report.explicitSourcesMatchingNothing = compiler.sources
	.filter((s) => !s.negated)
	.filter((s) => new Scanner({ sources: [s] }).scan() && new Scanner({ sources: [s] }).files.length === 0)
	.map((s) => s.pattern);

// 2. Canonical class check (Tailwind's own canonicalizer, rem = 16px).
const ds = await __unstable__loadDesignSystem(css, { base });
const cssFor = ds.candidatesToCss(candidates);
const valid = candidates.filter((_, i) => cssFor[i] !== null).sort();
fs.writeFileSync(path.join(OUT, "valid-candidates.txt"), valid.join("\n"));
// Per-class generated CSS: diff two runs to prove a cleanup changed no used rule.
const candidateCss = Object.fromEntries(candidates.map((c, i) => [c, cssFor[i]]).filter(([, v]) => v !== null).sort(([a], [b]) => (a < b ? -1 : 1)));
fs.writeFileSync(path.join(OUT, "candidate-css.json"), JSON.stringify(candidateCss, null, 1));
const noncanonical = valid
	.map((c) => [c, ds.canonicalizeCandidates([c], { rem: 16 }).join(" ")])
	.filter(([c, k]) => c !== k);
const srcFiles = execFileSync("rg", ["--files", "src", "-g", "*.{ts,tsx}", "-g", "!**/*.test.*", "-g", "!**/__tests__/**"], { cwd: ROOT, encoding: "utf8" })
	.trim()
	.split("\n");
const srcText = srcFiles.map((f) => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
const byFile = {};
for (const [c, k] of noncanonical) {
	let out = "";
	try {
		out = execFileSync("rg", ["-l", "-F", "-g", "*.{ts,tsx,css}", "-g", "!**/*.test.*", "-g", "!**/__tests__/**", "-e", c, "src"], { cwd: ROOT, encoding: "utf8" });
	} catch {}
	for (const f of out.trim().split("\n").filter(Boolean)) (byFile[f] ??= []).push(`${c} -> ${k}`);
}
const vendored = (f) => f.startsWith("src/components/ui/");
report.noncanonical = {
	classes: noncanonical.length,
	firstPartyFiles: Object.keys(byFile).filter((f) => !vendored(f)).length,
	vendoredUiFiles: Object.keys(byFile).filter(vendored).length,
};
fs.writeFileSync(path.join(OUT, "noncanonical-by-file.json"), JSON.stringify(byFile, null, 1));

// 3. Dead code in globals.css.
const root = postcss.parse(css);
const line = (n) => n.source?.start?.line;
const themeVars = [];
const otherVars = [];
const utilities = [];
const keyframes = [];
const classSelectors = new Map();
root.walkAtRules((at) => {
	if (at.name === "theme") at.walkDecls((d) => d.prop.startsWith("--") && themeVars.push({ name: d.prop, value: d.value, line: line(d), mode: at.params || "default" }));
	else if (at.name === "utility") utilities.push({ name: at.params.trim(), line: line(at) });
	else if (at.name === "keyframes") keyframes.push({ name: at.params.trim(), line: line(at) });
});
const inside = (node, names) => {
	for (let p = node.parent; p && p.type !== "root"; p = p.parent) if (p.type === "atrule" && names.includes(p.name)) return true;
	return false;
};
root.walkDecls((d) => {
	if (d.prop.startsWith("--") && !inside(d, ["theme"])) otherVars.push({ name: d.prop, line: line(d), context: d.parent.selector ?? `@${d.parent.name}` });
});
root.walkRules((r) => {
	if (inside(r, ["utility", "keyframes"])) return;
	for (const m of r.selector.matchAll(/\.([A-Za-z_][\w-]*)/g)) if (!classSelectors.has(m[1])) classSelectors.set(m[1], line(r));
});
const varRe = (n) => new RegExp(`var\\(\\s*${esc(n)}[\\s,)]|\\(${esc(n)}\\)`, "g");
const refs = (n) => (css.match(varRe(n)) || []).length + (srcText.match(varRe(n)) || []).length + (compiled.match(new RegExp(`var\\(\\s*${esc(n)}[\\s,)]`, "g")) || []).length + (new RegExp(`["'\`]${esc(n)}["'\`]`).test(srcText) ? 1 : 0);
const themeLayer = compiled.slice(compiled.indexOf("@layer theme"), compiled.indexOf("@layer base"));
// A namespaced theme var is used when a valid candidate (any variant) is <prefix><key>; inline --animate-* keys are never emitted into the theme layer.
const prefixes = {
	"--animate-": ["animate-"],
	"--font-weight-": ["font-"], "--font-": ["font-"], "--text-": ["text-"], "--leading-": ["leading-"], "--tracking-": ["tracking-"], "--transition-duration-": ["duration-"],
	"--shadow-": ["shadow-"], "--ease-": ["ease-"], "--z-index-": ["z-"], "--radius-": ["rounded-", "rounded-t-", "rounded-b-", "rounded-l-", "rounded-r-"],
	"--spacing-": ["p-", "px-", "py-", "pt-", "pb-", "pl-", "pr-", "m-", "mx-", "my-", "mt-", "mb-", "ml-", "mr-", "gap-", "gap-x-", "gap-y-", "w-", "h-", "size-", "min-w-", "min-h-", "max-w-", "max-h-", "inset-", "top-", "left-", "right-", "bottom-", "space-x-", "space-y-", "translate-x-", "translate-y-", "basis-", "-mt-", "-mx-", "-translate-y-"],
	"--color-": ["bg-", "text-", "border-", "ring-", "ring-offset-", "fill-", "stroke-", "from-", "via-", "to-", "outline-", "decoration-", "shadow-", "caret-", "accent-", "placeholder-", "divide-"],
};
const bareSet = new Set(valid.map((c) => c.split(":").pop().replace(/!$/, "").replace(/^!/, "")));
const deadTheme = themeVars.filter((v) => {
	if (new RegExp(`${esc(v.name)}\\s*:`).test(themeLayer)) return false;
	const ns = Object.keys(prefixes).find((p) => v.name.startsWith(p));
	if (!ns) return refs(v.name) === 0;
	const key = v.name.slice(ns.length).replace(/_/g, ".");
	return !prefixes[ns].some((p) => [...bareSet].some((b) => b === p + key || b.startsWith(`${p + key}/`)));
});
const deadOther = otherVars.filter((v) => refs(v.name) === 0);
const applyTokens = [...css.matchAll(/@apply ([^;]+);/g)].flatMap((m) => m[1].split(/\s+/));
const deadUtil = utilities.filter((u) => !valid.some((c) => c === u.name || c.endsWith(`:${u.name}`) || c.startsWith(`${u.name}/`) || c.replace(/!$/, "") === u.name) && !applyTokens.some((t) => t === u.name || t.endsWith(`:${u.name}`)));
const deadKf = keyframes.filter((k) => (css.match(new RegExp(`\\b${esc(k.name)}\\b`, "g")) || []).length <= 1 && !new RegExp(`\\b${esc(k.name)}\\b`).test(srcText));
const deadClass = [...classSelectors].filter(([c]) => !new RegExp(`(["'\`\\s])${esc(c)}(["'\`\\s])`).test(srcText) && !srcText.includes(`"${c}"`) && !valid.includes(c));
report.dead = {
	themeVars: deadTheme.length,
	customProperties: deadOther.length,
	utilities: `${deadUtil.length}/${utilities.length}`,
	keyframes: deadKf.length,
	plainClassSelectors: deadClass.length,
};
fs.writeFileSync(path.join(OUT, "dead.json"), JSON.stringify({ deadTheme, deadOther, deadUtil, deadKf, deadClass: deadClass.map(([c, l]) => ({ cls: c, line: l })) }, null, 1));

// 4. @utility names that shadow a core/theme utility (Tailwind merges both rules).
const stripped = postcss.parse(css);
stripped.walkAtRules("utility", (at) => at.remove());
const dsStripped = await __unstable__loadDesignSystem(stripped.toString(), { base });
report.utilityCollisions = utilities.filter((u) => dsStripped.candidatesToCss([u.name])[0]).map((u) => u.name);

// 5. Theme values that cannot render as written.
report.invalidOklch = [...css.matchAll(/oklch\(\s*([0-9.]+%?)\s+([0-9.]+%?)\s+([0-9.]+)/g)]
	.filter((m) => {
		const L = m[1].endsWith("%") ? Number.parseFloat(m[1]) / 100 : Number(m[1]);
		const C = m[2].endsWith("%") ? (Number.parseFloat(m[2]) / 100) * 0.4 : Number(m[2]);
		return L < 0 || L > 1 || C < 0 || C > 0.37;
	})
	.map((m) => `L${css.slice(0, m.index).split("\n").length} ${m[0]})`);
report.nonInlineThemeVarsReferencingVars = themeVars.filter((v) => v.mode !== "inline" && /var\(/.test(v.value)).map((v) => `L${v.line} ${v.name}: ${v.value.replace(/\s+/g, " ")}`);
// M6 follows @theme inline var() mappings to :root/.dark: dark keys come from EVERY
// `.dark` / `:where(.dark, .dark *)` rule at any depth, and an inline `--color-<n>:
// var(--<m>)` token is light-only when `--<m>` is declared in a :root rule and in no
// dark rule. A non-inline literal `--color-<n>` is light-only when no dark rule
// declares `--color-<n>`. A :root value that is itself a bare `var(--<k>)` alias (the
// W6 `--sidebar: var(--card)` brand aliases, D-37) is followed to its end: the token is
// light-only only when no name on that chain is declared in a dark rule (66.2-37).
const darkSelectors = new Set([".dark", ":where(.dark, .dark *)"]);
const darkKeys = new Set();
const rootValues = new Map();
root.walkRules((r) => {
	const sel = r.selector.replace(/\s+/g, " ").trim();
	if (darkSelectors.has(sel)) r.walkDecls((d) => d.prop.startsWith("--") && darkKeys.add(d.prop));
	else if (sel === ":root") r.walkDecls((d) => d.prop.startsWith("--") && !rootValues.has(d.prop) && rootValues.set(d.prop, d.value));
});
const BARE_VAR = /^var\(\s*(--[a-z0-9-]+)\s*\)$/;
// The light-only :root value an alias chain ends in, or null when any link has a dark value.
const lightOnlyRootValue = (name, seen = new Set()) => {
	if (seen.has(name) || darkKeys.has(name) || !rootValues.has(name)) return null;
	seen.add(name);
	const value = rootValues.get(name);
	const next = BARE_VAR.exec(value.trim());
	if (!next) return value;
	return rootValues.has(next[1]) || darkKeys.has(next[1]) ? lightOnlyRootValue(next[1], seen) : value;
};
report.lightOnlyColorTokensInUse = themeVars
	.filter((v) => v.name.startsWith("--color-") && !deadTheme.includes(v))
	.map((v) => {
		const alias = v.mode === "inline" ? BARE_VAR.exec(v.value.trim()) : null;
		if (alias) {
			const end = lightOnlyRootValue(alias[1]);
			return end === null ? null : `${v.name}: ${end}`;
		}
		if (/var\(/.test(v.value)) return null;
		return darkKeys.has(v.name) ? null : `${v.name}: ${v.value}`;
	})
	.filter(Boolean);

// 6. tailwind-merge: custom theme keys that merge wrongly through the project's cn().
const fontSizes = themeVars.filter((v) => v.name.startsWith("--text-") && !v.name.includes("--line-height") && !deadTheme.includes(v)).map((v) => v.name.slice(7));
const cnPath = path.join(ROOT, "src/lib/utils.ts");
const usesExtend = /extendTailwindMerge/.test(fs.readFileSync(cnPath, "utf8"));
// Evaluated through the project cn (Node type stripping). The 66.2-02 baseline
// cn was vanilla twMerge, so the metric definition is unchanged.
const { cn: projectCn } = await import(pathToFileURL(cnPath).href);
report.twMerge = {
	projectCnUsesExtendTailwindMerge: usesExtend,
	evaluatedWith: "src/lib/utils.ts cn",
	fontSizesDroppedNextToAColor: fontSizes.filter((k) => projectCn(`text-${k} text-primary`) === "text-primary").map((k) => `text-${k}`),
};

// 7. Other stylesheets (compiled separately, e.g. with @reference): dead classes and
// var() references that the globals.css build does not define.
const definedInCompiled = new Set([...compiled.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
// rg exits 1 when it lists no file: that is an empty list, not an error (M9).
const sheetList = spawnSync("rg", ["--files", "src", "-g", "*.css", "-g", "!src/app/globals.css"], { cwd: ROOT, encoding: "utf8" });
if (sheetList.status !== 0 && sheetList.status !== 1) throw new Error(`rg --files exited with status ${sheetList.status}: ${sheetList.stderr}`);
const otherSheets = sheetList.status === 1 ? [] : sheetList.stdout.trim().split("\n").filter(Boolean);
report.otherStylesheets = {};
for (const sheet of otherSheets) {
	const sheetRoot = postcss.parse(fs.readFileSync(path.join(ROOT, sheet), "utf8"));
	const sheetClasses = new Map();
	const undefinedRefs = new Set();
	sheetRoot.walkRules((r) => {
		for (const m of r.selector.matchAll(/\.([A-Za-z_][\w-]*)/g)) if (!sheetClasses.has(m[1])) sheetClasses.set(m[1], line(r));
		r.walkDecls((d) => {
			for (const m of d.value.matchAll(/var\((--[\w-]+)/g)) if (!definedInCompiled.has(m[1])) undefinedRefs.add(m[1]);
		});
	});
	const dead = [...sheetClasses].filter(([c]) => !new RegExp(`(["'\`\\s])${esc(c)}(["'\`\\s])`).test(srcText));
	report.otherStylesheets[sheet] = { classes: sheetClasses.size, deadClasses: dead.length, varsNotDefinedByGlobals: [...undefinedRefs] };
}

fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
console.log(`\nDetails in ${OUT}`);
