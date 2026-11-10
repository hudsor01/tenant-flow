// Wave 2 source assertions for the Tailwind v4 / shadcn remediation (66.2-15), reused by 66.2-37.
// Read-only: parses src/app/globals.css with the repo's postcss and walks src/ and tests/ with
// node:fs. It writes nothing.
//
// Usage (from the repo root):
//   node .planning/tailwind-shadcn/audit/source-assertions-w2.mjs
//
// Prints one `PASS <id> <description>` or `FAIL <id> <description> :: <detail>` line per
// assertion and exits 1 when any assertion fails, else 0.
// Ids: D18-a..c (source scope), D19-a..c (dashboard.css removal and the owner loading
// utilities), D20-a..c (no var() spacing/radius references, kept durations), D21-a (sidebar
// mappings), X3-a/X3-b (no copies of Tailwind defaults), AppA-a, D14-a (tailwind-merge keys),
// D22-a/D22-b (selector citations, the font-size harness), D30-a (LoadingSpinner sizes) and
// W1-carry-* (the wave 1 contracts).
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const require = createRequire(path.join(ROOT, "package.json"));
const postcss = require("postcss");
const { __unstable__loadDesignSystem } = await import(require.resolve("@tailwindcss/node"));

const cssPath = path.join(ROOT, "src/app/globals.css");
const css = fs.readFileSync(cssPath, "utf8");
const root = postcss.parse(css, { from: cssPath });
const rel = (f) => path.relative(ROOT, f);
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const collapse = (s) => s.replace(/\s+/g, " ").trim();

let failed = 0;
const report = (id, description, ok, detail = "") => {
	if (!ok) failed++;
	console.log(`${ok ? "PASS" : "FAIL"} ${id} ${description}${!ok && detail ? ` :: ${detail}` : ""}`);
};

const walk = (dir) => {
	const out = [];
	const abs = path.join(ROOT, dir);
	if (!fs.existsSync(abs)) return out;
	for (const e of fs.readdirSync(abs, { withFileTypes: true, recursive: true })) {
		if (!e.isFile()) continue;
		const f = path.join(e.parentPath ?? e.path, e.name);
		if (f.split(path.sep).includes("node_modules")) continue;
		out.push(rel(f));
	}
	return out.sort();
};
const srcFiles = walk("src");
const testsFiles = walk("tests");
const isTestFile = (f) => /\.test\.[cm]?[jt]sx?$/.test(f) || f.split("/").includes("__tests__");
const textOf = new Map();
const text = (f) => {
	if (!textOf.has(f)) textOf.set(f, fs.readFileSync(path.join(ROOT, f), "utf8"));
	return textOf.get(f);
};
const isTextual = (f) => /\.(c|m)?(j|t)sx?$|\.css$|\.mdx?$|\.json$|\.ya?ml$|\.html$/.test(f);
const grepFiles = (files, re) => files.filter(isTextual).flatMap((f) => (re.test(text(f)) ? [f] : []));

const ancestors = (n) => {
	const a = [];
	for (let p = n.parent; p && p.type !== "root"; p = p.parent) a.push(p);
	return a;
};
const themeAt = (n) => ancestors(n).find((a) => a.type === "atrule" && a.name === "theme");
const isInlineTheme = (at) => /\binline\b/.test(at.params);
const decls = [];
root.walkDecls((d) => decls.push(d));
const at = (d) => d.source?.start?.line;

// ---------- D-18: source scope ----------
const imports = [];
root.walkAtRules("import", (r) => imports.push(r));
report("D18-a", 'the first @import is "tailwindcss" source("..")', imports.length > 0 && /^"tailwindcss"\s+source\("\.\."\)$/.test(collapse(imports[0].params)), imports[0]?.params ?? "no @import");
const sources = [];
root.walkAtRules("source", (r) => sources.push(r));
report("D18-b", '@source not "../**/*.test.{ts,tsx}" exists', sources.some((s) => collapse(s.params) === 'not "../**/*.test.{ts,tsx}"'), sources.map((s) => s.params).join(" | "));
const badSources = sources.filter((s) => s.params.includes(".planning") || s.params.includes("README") || collapse(s.params) === '"..*.{ts,tsx}"');
report("D18-c", "no @source names .planning or README, and none is \"..*.{ts,tsx}\"", badSources.length === 0, badSources.map((s) => `${s.params}@${at(s)}`).join(" | "));

// ---------- D-19: dashboard.css and the owner loading skeleton ----------
const dashboardImporters = srcFiles.filter(isTextual).filter((f) => /(?:\bfrom\s*|\bimport\s*\(?\s*|@import\s+(?:url\()?)["'][^"'\n]*dashboard\.css["']/.test(text(f)));
report("D19-a", "src/app/(owner)/dashboard.css is gone and nothing under src/ imports a dashboard.css", !fs.existsSync(path.join(ROOT, "src/app/(owner)/dashboard.css")) && dashboardImporters.length === 0, `exists ${fs.existsSync(path.join(ROOT, "src/app/(owner)/dashboard.css"))}; importers ${dashboardImporters.join(",")}`);
const DASHBOARD_CLASS = /(?<![\w-])dashboard-(content|section|section-header|cards-container|panel|table-wrapper)(?![\w-])/;
const dashSelectors = [];
root.walkRules((r) => {
	if (DASHBOARD_CLASS.test(r.selector)) dashSelectors.push(`${r.selector}@${at(r)}`);
});
const loadingPath = "src/app/(owner)/loading.tsx";
const loading = read(loadingPath);
report("D19-b", "no live dashboard-* class in globals.css selectors or loading.tsx", dashSelectors.length === 0 && !DASHBOARD_CLASS.test(loading), `selectors ${dashSelectors.join(" | ")}; loading.tsx ${DASHBOARD_CLASS.exec(loading)?.[0] ?? "none"}`);
const loadingNeedles = [
	"flex flex-col gap-(--layout-gap-group)",
	"grid-cols-[repeat(auto-fit,minmax(20rem,1fr))]",
	"gap-6",
	"rounded-lg border border-border bg-card shadow-sm",
	"rounded-xl border border-border bg-card shadow-sm",
];
const missingNeedles = loadingNeedles.filter((n) => !loading.includes(n));
report("D19-c", "loading.tsx uses the UI-SPEC Owner Loading Skeleton utilities and no [var( form", missingNeedles.length === 0 && !loading.includes("[var("), `missing ${JSON.stringify(missingNeedles)}; [var( ${loading.includes("[var(")}`);

// ---------- D-20: spacing / radius var references, durations ----------
const srcCode = srcFiles.filter((f) => /\.tsx?$/.test(f) && !isTestFile(f));
const d20aHits = grepFiles(srcCode, /\[var\(--spacing-[0-9]|rounded-\[var\(--radius/);
report("D20-a", "no non-test src .ts/.tsx has [var(--spacing-N) or rounded-[var(--radius", d20aHits.length === 0, d20aHits.join(","));
const d20bValues = decls.filter((d) => /var\(--spacing-[0-9]/.test(d.value)).map((d) => `${d.prop}@${at(d)}`);
const d20bProps = decls.filter((d) => /^--spacing-([0-9]+(_[0-9]+)?|px)$/.test(d.prop)).map((d) => `${d.prop}@${at(d)}`);
report("D20-b", "no globals.css value uses var(--spacing-N) and no --spacing-N / --spacing-px declaration", d20bValues.length === 0 && d20bProps.length === 0, `values ${d20bValues.join(",")}; props ${d20bProps.join(",")}`);
const declared = new Set(decls.map((d) => d.prop));
const keptDurations = ["--duration-100", "--duration-200", "--duration-300", "--duration-500", "--duration-700", "--duration-1000", "--duration-standard"];
const goneDurations = ["--duration-75", "--duration-150", "--duration-medium"];
report("D20-c", "live --duration-100..1000 and --duration-standard kept; --duration-75/150/medium gone (N14)", keptDurations.every((d) => declared.has(d)) && goneDurations.every((d) => !declared.has(d)), `missing ${keptDurations.filter((d) => !declared.has(d)).join(",")}; present ${goneDurations.filter((d) => declared.has(d)).join(",")}`);

// ---------- D-21: sidebar mappings ----------
const sidebarNonInline = decls.filter((d) => d.prop.startsWith("--color-sidebar") && themeAt(d) && !isInlineTheme(themeAt(d))).map((d) => `${d.prop}@${at(d)}`);
const sidebarInline = decls.filter((d) => d.prop.startsWith("--color-sidebar") && themeAt(d) && isInlineTheme(themeAt(d)));
report("D21-a", "no non-inline @theme --color-sidebar*; the zinc @theme inline block is kept for W6", sidebarNonInline.length === 0 && sidebarInline.length >= 1, `non-inline ${sidebarNonInline.join(",")}; inline ${sidebarInline.length}`);

// ---------- X3: copies of Tailwind defaults ----------
const x3Props = decls.filter((d) => d.prop === "--color-white" || d.prop === "--color-black" || /^--color-slate-/.test(d.prop) || /^--color-border-secondary$/.test(d.prop) || /^--color-accent-85$/.test(d.prop)).map((d) => `${d.prop}@${at(d)}`);
report("X3-a", "no --color-white/black, --color-slate-*, --color-border-secondary or --color-accent-85 declaration", x3Props.length === 0, x3Props.join(","));
const defaults = await __unstable__loadDesignSystem('@import "tailwindcss";', { base: ROOT });
const themeDecls = decls.filter((d) => d.prop.startsWith("--") && themeAt(d));
const duplicates = [];
let comparedWithDefault = 0;
for (const d of themeDecls) {
	const def = defaults.resolveThemeValue(d.prop);
	if (def === null || def === undefined) continue;
	comparedWithDefault++;
	if (collapse(String(def)) === collapse(d.value)) duplicates.push(`${d.prop}: ${collapse(d.value)}@${at(d)}`);
}
report("X3-b", `no @theme declaration repeats Tailwind's default value (${comparedWithDefault} names the default theme resolves)`, duplicates.length === 0, duplicates.join(" | "));

// ---------- Appendix A ----------
const keyframes = [];
root.walkAtRules("keyframes", (r) => keyframes.push(r.params.trim()));
const panelRules = [];
root.walkRules((r) => {
	if (r.selector.split(",").some((s) => s.trim() === ".dashboard-panel")) panelRules.push(at(r));
});
report("AppA-a", "no @keyframes mobile-fade-in and no .dashboard-panel rule", !keyframes.includes("mobile-fade-in") && panelRules.length === 0, `keyframes ${keyframes.includes("mobile-fade-in")}; .dashboard-panel lines ${panelRules.join(",")}`);

// ---------- D-14: tailwind-merge keys ----------
const utilsMod = await import(pathToFileURL(path.join(ROOT, "src/lib/utils.ts")).href);
const ext = utilsMod.TAILWIND_MERGE_EXTENSION;
const spacingKey = ext?.extend?.theme?.spacing;
report("D14-a", "TAILWIND_MERGE_EXTENSION has no theme.spacing entries and no slower key", ext !== undefined && (spacingKey === undefined || (Array.isArray(spacingKey) && spacingKey.length === 0)) && !JSON.stringify(ext).includes('"slower"'), `extension ${ext === undefined ? "missing" : "present"}; spacing ${JSON.stringify(spacingKey)}; slower ${JSON.stringify(ext ?? {}).includes('"slower"')}`);

// ---------- D-22: citations and the font-size harness ----------
const citations = grepFiles([...srcFiles, ...testsFiles], /globals\.css:[0-9]/);
report("D22-a", "no globals.css:<line> citation under src/ or tests/ (N17)", citations.length === 0, citations.join(","));
const cascadePath = "src/test/utils/responsive-font-size-cascade.ts";
const cascade = read(cascadePath);
const noComments = cascade.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
const regexLiterals = [...noComments.matchAll(/(?:^|[=(,:;!&|?{}\[\s])\/(?![/*\s])((?:\\.|\[(?:\\.|[^\]\n])*\]|[^/\n\\[])+)\/[dgimsuyv]*/g)].map((m) => m[1]);
const textRegexLiterals = regexLiterals.filter((r) => r.includes("--text-"));
const textNewRegExp = [...noComments.matchAll(/new RegExp\(([^)]*)\)/g)].filter((m) => m[1].includes("--text-")).map((m) => m[0]);
report("D22-b", "responsive-font-size-cascade.ts resolves through resolveThemeValue and parses no --text- with a regex (X6)", cascade.includes("resolveThemeValue") && textRegexLiterals.length === 0 && textNewRegExp.length === 0, `resolveThemeValue ${cascade.includes("resolveThemeValue")}; literals ${JSON.stringify(textRegexLiterals)}; new RegExp ${JSON.stringify(textNewRegExp)}`);

// ---------- D-30: LoadingSpinner text sizes ----------
const spinner = read("src/components/ui/loading-spinner.tsx");
const sizes = ["text-xs", "text-sm", "text-base", "text-lg"];
report("D30-a", "LoadingSpinner has no text-(--font-*) and uses text-xs/sm/base/lg (C12d)", !spinner.includes("text-(--font-") && sizes.every((s) => spinner.includes(s)), `text-(--font- ${spinner.includes("text-(--font-")}; missing ${sizes.filter((s) => !spinner.includes(s)).join(",")}`);

// ---------- W1 carry ----------
const guards = await import(pathToFileURL(path.join(ROOT, "src/test/utils/tailwind-guards.ts")).href);
const ctx = guards.collectCustomPropertiesByContext(css);
const last = guards.resolveCustomPropertyChain("--color-secondary", ctx).at(-1);
const secondary = ctx.theme.get(last) ?? ctx.root.get(last);
report("W1-carry-secondary", "light --color-secondary resolves to oklch(0.9546 0.0351 246.58)", secondary !== undefined && collapse(secondary) === "oklch(0.9546 0.0351 246.58)", `chain end ${last}; value ${secondary}`);
const appleTokens = decls.filter((d) => /^--color-(label|fill|separator)/.test(d.prop)).map((d) => `${d.prop}@${at(d)}`);
report("W1-carry-label-fill-separator", "no --color-(label|fill|separator) declaration", appleTokens.length === 0, appleTokens.join(","));
const shadowUtils = [];
root.walkAtRules("utility", (r) => {
	if (["text-caption", "text-muted"].includes(r.params.trim())) shadowUtils.push(r.params.trim());
});
report("W1-carry-utilities", "no @utility text-caption or text-muted", shadowUtils.length === 0, shadowUtils.join(","));
const inlineDecl = (prop, needle) => decls.some((d) => d.prop === prop && themeAt(d) && isInlineTheme(themeAt(d)) && d.value.includes(needle));
const displayFiles = grepFiles(srcFiles, /--font-display|--font-playfair/);
report("W1-carry-fonts", "@theme inline --font-sans uses var(--font-roboto), --font-mono uses var(--font-geist-mono), no --font-display/--font-playfair in src/", inlineDecl("--font-sans", "var(--font-roboto)") && inlineDecl("--font-mono", "var(--font-geist-mono)") && displayFiles.length === 0, `sans ${inlineDecl("--font-sans", "var(--font-roboto)")}; mono ${inlineDecl("--font-mono", "var(--font-geist-mono)")}; display/playfair in ${displayFiles.join(",")}`);

console.log(failed === 0 ? "source-assertions-w2: all passed" : `source-assertions-w2: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
