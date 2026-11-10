// Wave 3 source assertions for the Tailwind v4 / shadcn remediation (66.2-17), reused by 66.2-37.
// Read-only: parses the W2 gate commit's src/app/globals.css (via `git show`) and the current
// src/app/globals.css with the repo's postcss, and reads src/ files. It never writes.
//
// Usage (from the repo root):
//   node .planning/tailwind-shadcn/audit/source-assertions-w3.mjs [--w2 <sha>]
//
// --w2 defaults to the W2 gate commit: the newest commit whose subject starts with
// `docs(66.2-15): record the wave 2 gate`.
//
// Prints one `PASS <id> <description>` or `FAIL <id> <description> :: <detail>` line per
// assertion and exits 1 when any assertion fails, else 0. Values are compared after collapsing
// whitespace runs to one space and trimming, and nothing else.
// Ids: a (moved set), b (light identity, D-24), c (dark identity, D-24), d (@theme inline
// mapping, D-23), e1..e5 (structure: no non-inline --color-, no :where(.dark, .dark *) rule,
// @custom-variant dark kept, radius/shadow/text scales, zinc sidebar D-21), f (census at W2),
// g (census at W3), h (N2 source), i (satori surfaces), j (no nested dark scope).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const ROOT = process.cwd();
const require = createRequire(path.join(ROOT, "package.json"));
const postcss = require("postcss");

const argv = process.argv.slice(2);
const w2Flag = argv.indexOf("--w2");
const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 });
const W2 =
	w2Flag >= 0
		? argv[w2Flag + 1]
		: git(["log", "--format=%H", "-n", "1", "--grep=^docs(66.2-15): record the wave 2 gate"]).trim();
if (!W2) {
	console.log("FAIL setup W2 gate commit :: not resolved");
	process.exit(1);
}

const collapse = (s) => s.replace(/\s+/g, " ").trim();
let failed = 0;
const report = (id, description, ok, detail = "") => {
	if (ok === false) failed++;
	console.log(`${ok ? "PASS" : "FAIL"} ${id} ${description}${ok ? "" : ` :: ${detail}`}`);
};

const DUAL = [
	"background", "foreground", "muted", "muted-foreground", "popover", "popover-foreground", "card",
	"card-foreground", "border", "input", "ring", "primary", "primary-foreground", "secondary",
	"secondary-foreground", "accent", "accent-foreground", "accent-main", "destructive",
	"destructive-foreground", "success", "success-foreground", "warning", "warning-foreground", "info",
	"info-foreground", "success-text", "warning-text", "destructive-text", "primary-text", "info-text",
];
const LIGHT_ONLY = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];
const MOVED = [...DUAL, ...LIGHT_ONLY];

const w2Css = git(["show", `${W2}:src/app/globals.css`]);
const curCss = fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8");
const w2Root = postcss.parse(w2Css);
const curRoot = postcss.parse(curCss);

const isInlineTheme = (n) => n.type === "atrule" && n.name === "theme" && collapse(n.params) === "inline";
const isPlainTheme = (n) => n.type === "atrule" && n.name === "theme" && collapse(n.params) === "";
const inThemeKind = (d, pred) => {
	for (let p = d.parent; p && p.type !== "root"; p = p.parent) if (p.type === "atrule" && p.name === "theme") return pred(p);
	return false;
};
const decls = (root, filter) => {
	const out = [];
	root.walkDecls((d) => {
		if (filter(d)) out.push(d);
	});
	return out;
};
const ruleSel = (d) => (d.parent?.type === "rule" ? collapse(d.parent.selector) : null);

// (a) Moved set.
const w2ThemeColors = decls(w2Root, (d) => d.prop.startsWith("--color-") && inThemeKind(d, isPlainTheme));
const w2ThemeMap = new Map(w2ThemeColors.map((d) => [d.prop.slice("--color-".length), collapse(d.value)]));
{
	const names = [...w2ThemeMap.keys()];
	const extra = names.filter((n) => !MOVED.includes(n));
	const missing = MOVED.filter((n) => !w2ThemeMap.has(n));
	const dup = w2ThemeColors.length !== w2ThemeMap.size;
	report("a", `W2 non-inline @theme --color-* names equal the ${MOVED.length} moved names`, extra.length === 0 && missing.length === 0 && !dup, `extra=${extra.join(",")} missing=${missing.join(",")} duplicates=${dup}`);
}

// (b) Light identity.
{
	const bad = [];
	for (const n of MOVED) {
		const hits = decls(curRoot, (d) => d.prop === `--${n}` && ruleSel(d) === ":root");
		if (hits.length !== 1) {
			bad.push(`${n}: ${hits.length} :root decls`);
			continue;
		}
		const d = hits[0];
		if (d.parent.parent?.type !== "root") bad.push(`${n}: :root rule is not top-level`);
		if (collapse(d.value) !== w2ThemeMap.get(n)) bad.push(`${n}: ${collapse(d.value)} vs W2 ${w2ThemeMap.get(n)}`);
	}
	report("b", "each moved name has exactly one top-level :root --<n> equal to W2 @theme --color-<n>", bad.length === 0, bad.join("; "));
}

// (c) Dark identity.
{
	const bad = [];
	const w2Dark = decls(w2Root, (d) => ruleSel(d) === ":where(.dark, .dark *)");
	const w2DarkMap = new Map(w2Dark.filter((d) => d.prop.startsWith("--color-")).map((d) => [d.prop.slice("--color-".length), collapse(d.value)]));
	const curDark = decls(curRoot, (d) => ruleSel(d) === ".dark");
	for (const n of DUAL) {
		const hits = curDark.filter((d) => d.prop === `--${n}`);
		if (hits.length !== 1) bad.push(`${n}: ${hits.length} .dark decls`);
		else if (collapse(hits[0].value) !== w2DarkMap.get(n)) bad.push(`${n}: ${collapse(hits[0].value)} vs W2 ${w2DarkMap.get(n)}`);
	}
	for (const n of LIGHT_ONLY) if (curDark.some((d) => d.prop === `--${n}`)) bad.push(`${n}: has a .dark decl`);
	const w2DarkNames = [...w2DarkMap.keys()].sort();
	if (JSON.stringify(w2DarkNames) !== JSON.stringify([...DUAL].sort())) bad.push(`W2 dark --color-* set differs: ${w2DarkNames.join(",")}`);
	for (const d of w2Dark.filter((x) => !x.prop.startsWith("--color-")))
		if (!curDark.some((c) => c.prop === d.prop && collapse(c.value) === collapse(d.value))) bad.push(`W2 dark ${d.prop} not carried`);
	report("c", "each dual-mode name has exactly one .dark --<n> equal to W2 dark --color-<n>; charts have none", bad.length === 0, bad.join("; "));
}

// (d) Mapping.
{
	const bad = [];
	for (const n of MOVED) {
		const hits = decls(curRoot, (d) => d.prop === `--color-${n}` && inThemeKind(d, isInlineTheme));
		if (hits.length !== 1) bad.push(`${n}: ${hits.length} inline decls`);
		else if (collapse(hits[0].value) !== `var(--${n})`) bad.push(`${n}: ${collapse(hits[0].value)}`);
	}
	report("d", "each moved name has exactly one @theme inline --color-<n>: var(--<n>)", bad.length === 0, bad.join("; "));
}

// (e) Structure.
{
	const nonInlineColor = decls(curRoot, (d) => d.prop.startsWith("--color-") && inThemeKind(d, (p) => !isInlineTheme(p)));
	report("e1", "no non-inline @theme declaration starts with --color-", nonInlineColor.length === 0, nonInlineColor.map((d) => d.prop).join(","));
	const whereRules = [];
	curRoot.walkRules((r) => {
		if (collapse(r.selector) === ":where(.dark, .dark *)") whereRules.push(r.source?.start?.line);
	});
	report("e2", "no rule selector is :where(.dark, .dark *) (X4)", whereRules.length === 0, `lines ${whereRules.join(",")}`);
	let variant = 0;
	curRoot.walkAtRules("custom-variant", (at) => {
		if (collapse(at.params) === "dark (&:where(.dark, .dark *))") variant++;
	});
	report("e3", "@custom-variant dark (&:where(.dark, .dark *)) exists", variant === 1, `count ${variant}`);
	const scaleRe = /^--(radius(-|$)|shadow-|text-|leading-|tracking-)/;
	const scale = (root) => {
		const m = new Map();
		const dups = [];
		for (const d of decls(root, (x) => scaleRe.test(x.prop) && inThemeKind(x, isPlainTheme))) {
			if (m.has(d.prop)) dups.push(d.prop);
			m.set(d.prop, collapse(d.value));
		}
		return { m, dups };
	};
	const s2 = scale(w2Root);
	const s3 = scale(curRoot);
	const diffs = [...new Set([...s2.m.keys(), ...s3.m.keys()])].filter((k) => s2.m.get(k) !== s3.m.get(k));
	report("e4", `non-inline @theme radius/shadow/text/leading/tracking map equals W2 (${s3.m.size} decls)`, diffs.length === 0 && s2.m.size > 0 && s2.dups.join() === s3.dups.join(), `differs: ${diffs.join(",")}`);
	const sidebar = (root) =>
		decls(root, (d) => d.prop.startsWith("--sidebar") && (ruleSel(d) === ":root" || ruleSel(d) === ".dark" || inThemeKind(d, isInlineTheme)))
			.concat(decls(root, (d) => d.prop.startsWith("--color-sidebar") && inThemeKind(d, isInlineTheme)))
			.map((d) => `${ruleSel(d) ?? "@theme inline"}|${d.prop}|${collapse(d.value)}`)
			.sort();
	const sb2 = sidebar(w2Root);
	const sb3 = sidebar(curRoot);
	report("e5", `every --sidebar* decl in :root, .dark and @theme inline equals W2 (${sb3.length} decls, D-21)`, sb2.length > 0 && JSON.stringify(sb2) === JSON.stringify(sb3), `W2-only: ${sb2.filter((x) => !sb3.includes(x)).join("; ")} W3-only: ${sb3.filter((x) => !sb2.includes(x)).join("; ")}`);
}

// (f)/(g) Census of bare references to moved names.
const censusRe = () => new RegExp(`var\\(\\s*--(${MOVED.join("|")})\\s*[,)]`, "g");
const inScope = (f) => /^src\/.*\.(ts|tsx|css)$/.test(f) && !/\.test\./.test(f) && !f.split("/").includes("__tests__");
const hitsIn = (text) => [...text.matchAll(censusRe())].map((m) => m[0]);
{
	const files = git(["ls-tree", "-r", "--name-only", W2, "--", "src"]).trim().split("\n").filter(inScope);
	const hits = [];
	for (const f of files) for (const h of hitsIn(git(["show", `${W2}:${f}`]))) hits.push(`${f}: ${h}`);
	const outside = hits.filter((h) => !h.startsWith("src/lib/data-table.ts: "));
	const globals = hits.filter((h) => h.startsWith("src/app/globals.css: "));
	report("f", `W2 census: ${hits.length} hits over ${files.length} files, all in src/lib/data-table.ts [${hits.join("; ")}]`, outside.length === 0 && globals.length === 0, outside.join("; "));
}
{
	const files = git(["ls-files", "src"]).trim().split("\n").filter(inScope).filter((f) => fs.existsSync(path.join(ROOT, f)));
	const outside = [];
	for (const f of files) {
		if (f === "src/app/globals.css") continue;
		for (const h of hitsIn(fs.readFileSync(path.join(ROOT, f), "utf8"))) outside.push(`${f}: ${h}`);
	}
	const textHits = hitsIn(curCss).length;
	const mapped = decls(curRoot, (d) => inThemeKind(d, isInlineTheme) && d.prop.startsWith("--color-") && hitsIn(d.value).length > 0);
	const mappedOk = mapped.every((d) => collapse(d.value) === `var(--${d.prop.slice("--color-".length)})`);
	const mappedHits = mapped.reduce((n, d) => n + hitsIn(d.value).length, 0);
	report("g", `W3 census: 0 hits outside globals.css over ${files.length} files; globals.css ${textHits} hits, ${mappedHits} in @theme inline --color-<n> mappings`, outside.length === 0 && textHits === mappedHits && mappedOk && textHits === MOVED.length, `outside=${outside.join("; ")} text=${textHits} mapped=${mappedHits}`);
}

// (h) N2 source.
{
	const dt = fs.readFileSync(path.join(ROOT, "src/lib/data-table.ts"), "utf8");
	const bgLines = dt.split("\n").filter((l) => /^\s*background\s*:/.test(l));
	const ok =
		!dt.includes("var(--background)") &&
		!dt.includes("var(--border)") &&
		dt.includes("var(--color-background)") &&
		bgLines.length === 1 &&
		/^\s*background:\s*isPinned\s*\?\s*"var\(--color-background\)"\s*:\s*"transparent",\s*$/.test(bgLines[0]);
	report("h", "data-table.ts: no var(--background)/var(--border); var(--color-background) only when isPinned, else transparent", ok, bgLines.join(" | "));
}

// (i) Satori surfaces.
{
	const diff = git(["diff", "-U0", `${W2}..HEAD`, "--", "src/app/api/og/blog/[slug]/route.tsx", "scripts/render-blog-cover.tsx"]);
	const changed = diff.split("\n").filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)( |$)/.test(l));
	const nonComment = changed.filter((l) => !/^[+-]\s*(\/\/|\*|\/\*)/.test(l));
	const route = fs.readFileSync(path.join(ROOT, "src/app/api/og/blog/[slug]/route.tsx"), "utf8");
	const chartOklch = (route.match(/--chart-[1-5]: oklch/g) || []).length;
	const colorChart = (route.match(/--color-chart-/g) || []).length;
	report("i", `satori diff: ${changed.length} changed lines, all comments; route.tsx --chart-N: oklch x${chartOklch}, --color-chart- x${colorChart}`, nonComment.length === 0 && chartOklch === 5 && colorChart === 0, nonComment.join(" | "));
}

// (j) No nested dark scope in className strings.
{
	let out = "";
	let status = 0;
	try {
		out = execFileSync("rg", ["-n", "--pcre2", "className=\\{?[\"'`][^\"'`]*(?<![\\w:/-])dark(?![\\w:/-])", "src", "-g", "*.tsx", "-g", "!**/*.test.*"], { cwd: ROOT, encoding: "utf8" });
	} catch (e) {
		status = e.status ?? 2;
		out = String(e.stdout ?? "");
	}
	const ok = status === 1 && out.trim() === "";
	report("j", "no className applies a nested `dark` scope (rg exit 1 = 0 hits)", ok, status === 0 ? out.trim().split("\n").join("; ") : `rg exit ${status}`);
}

console.log(`W2=${W2}`);
process.exit(failed ? 1 : 0);
