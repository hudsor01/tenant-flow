// Origin: research 66.2 guard prototype (2026-10-25), preserved verbatim from scratch; read-only, writes nothing.
// Prototype of G1-G8 against a repo checkout (read-only). Usage: node guards-proto.mjs <repoRoot>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const ROOT = path.resolve(process.argv[2] ?? process.cwd());
const require = createRequire(path.join(ROOT, "package.json"));
const T = {}; const tick = (k, t) => (T[k] = Math.round(performance.now() - t));
let t = performance.now();
const { compile, __unstable__loadDesignSystem } = await import(require.resolve("@tailwindcss/node"));
const { Scanner } = require("@tailwindcss/oxide");
const postcss = require("postcss");
const { twMerge } = require("tailwind-merge");
tick("import", t);
const cssPath = path.join(ROOT, "src/app/globals.css");
const base = path.dirname(cssPath);
const css = fs.readFileSync(cssPath, "utf8");
const R = {};
// G1 oklch range
t = performance.now();
const root = postcss.parse(css);
const bad1 = [];
root.walkDecls((d) => { for (const m of d.value.matchAll(/oklch\(\s*([0-9.]+%?)\s+([0-9.]+%?)\s+/g)) { const L = m[1].endsWith("%") ? parseFloat(m[1]) / 100 : +m[1]; const C = m[2].endsWith("%") ? (parseFloat(m[2]) / 100) * 0.4 : +m[2]; if (L < 0 || L > 1 || C < 0 || C > 0.37) bad1.push(`${d.prop}: ${m[0]}`); } });
R.G1 = bad1; tick("G1", t);
// G2 non-inline theme var referencing var()
t = performance.now();
const bad2 = [];
root.walkAtRules("theme", (at) => { if (/\binline\b/.test(at.params)) return; at.walkDecls((d) => { if (d.prop.startsWith("--") && /var\(/.test(d.value)) bad2.push(d.prop); }); });
R.G2 = bad2; tick("G2", t);
// G3 @utility shadowing
t = performance.now();
const utilNames = []; root.walkAtRules("utility", (at) => utilNames.push(at.params.trim()));
const stripped = postcss.parse(css); stripped.walkAtRules("utility", (at) => at.remove());
const dsStripped = await __unstable__loadDesignSystem(stripped.toString(), { base });
R.G3 = utilNames.filter((u) => !u.endsWith("-*") && dsStripped.candidatesToCss([u])[0]);
tick("G3", t);
// compile + scan (shared by G4/G6/G7/G8)
t = performance.now();
const compiler = await compile(css, { base, from: cssPath, onDependency() {} });
const rootSrc = compiler.root === "none" ? [] : compiler.root === null ? [{ base: ROOT, pattern: "**/*", negated: false }] : [{ ...compiler.root, negated: false }];
const scanner = new Scanner({ sources: [...rootSrc, ...compiler.sources] });
const candidates = scanner.scan();
const built = compiler.build(candidates);
tick("compile+scan", t);
// G6 explicit @source globs match >=1 file
t = performance.now();
R.G6 = compiler.sources.filter((s) => { const sc = new Scanner({ sources: [{ ...s, negated: false }] }); sc.scan(); return sc.files.length === 0; }).map((s) => `${s.negated ? "not " : ""}${s.pattern}`);
tick("G6", t);
// G4 light-only color tokens (structure-agnostic static resolver)
t = performance.now();
const decls = { theme: new Map(), root: new Map(), dark: new Map() };
root.walkDecls((d) => {
  if (!d.prop.startsWith("--")) return;
  let p = d.parent; let ctx = null;
  for (; p && p.type !== "root"; p = p.parent) { if (p.type === "atrule" && p.name === "theme") { ctx = "theme"; break; } if (p.type === "rule") { if (/\.dark\b/.test(p.selector)) { ctx = "dark"; break; } if (/:root/.test(p.selector)) { ctx = "root"; break; } } }
  if (ctx) decls[ctx].set(d.prop, d.value);
});
const MODE_INDEPENDENT = new Set(["--color-white", "--color-black", ...[1, 2, 3, 4, 5].map((n) => `--color-chart-${n}`)]);
const used = new Set([...built.matchAll(/var\(\s*(--color-[\w-]+)/g)].map((m) => m[1]));
const hasDark = (name, seen = new Set()) => { if (decls.dark.has(name)) return true; if (seen.has(name)) return false; seen.add(name); const v = decls.theme.get(name) ?? decls.root.get(name); const ref = v && /^var\((--[\w-]+)\)$/.exec(v.trim()); return ref ? hasDark(ref[1], seen) : false; };
R.G4 = [...decls.theme.keys()].filter((n) => n.startsWith("--color-") && used.has(n) && !MODE_INDEPENDENT.has(n) && !hasDark(n));
tick("G4", t);
// G5 tailwind-merge custom keys (behavioral, against the repo's plain twMerge here)
t = performance.now();
const defaultsCss = '@import "tailwindcss";';
const dsDefault = await __unstable__loadDesignSystem(defaultsCss, { base });
const projectKeys = (ns) => [...decls.theme.keys()].filter((k) => k.startsWith(`--${ns}-`) && !k.includes("--", 2 + ns.length)).map((k) => k.slice(ns.length + 3));
const bad5 = [];
for (const [ns, prefix, std, color] of [["text", "text-", "text-xs", true], ["leading", "leading-", "leading-6"], ["spacing", "p-", "p-2"], ["transition-duration", "duration-", "duration-300"]]) {
  for (const k of projectKeys(ns)) {
    if (ns === "spacing" && /^\d|^px$/.test(k)) continue; // numeric scale keys are known to twMerge
    const c = `${prefix}${k.replace(/_/g, ".")}`;
    if (twMerge(`${c} ${std}`) !== std) bad5.push(`${c} does not merge with ${std}`);
    if (color && twMerge(`${c} text-primary`) !== `${c} text-primary`) bad5.push(`${c} dropped next to text-primary`);
  }
}
R.G5 = bad5; tick("G5", t);
// G7 dangling theme-namespace refs
t = performance.now();
const definedVars = new Set([...built.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
const NS = /^--(color|text|spacing|radius|shadow|font|leading|tracking|ease|transition-duration|duration)(-|$)/;
const srcFiles = scanner.files.filter((f) => /\.(tsx?|css)$/.test(f) && !/\.test\.|__tests__/.test(f) && f.startsWith(path.join(ROOT, "src")));
const runtime = new Set(["--font-geist-mono", "--font-sans", "--font-display", "--font-roboto", "--font-playfair"]);
const refs = new Map();
for (const f of srcFiles) { const txt = fs.readFileSync(f, "utf8"); for (const m of txt.matchAll(/["'](--[\w-]+)["']\s*:/g)) runtime.add(m[1]); if (/ChartConfig/.test(txt)) for (const m of txt.matchAll(/^\s*["']?([A-Za-z][\w-]*)["']?\s*:\s*\{/gm)) runtime.add(`--color-${m[1]}`); for (const m of txt.matchAll(/var\(\s*(--[\w-]+)/g)) (refs.get(m[1]) ?? refs.set(m[1], new Set()).get(m[1])).add(path.relative(ROOT, f)); }
for (const m of built.matchAll(/var\(\s*(--[\w-]+)/g)) if (!refs.has(m[1])) refs.set(m[1], new Set(["<compiled css>"]));
R.G7 = [...refs].filter(([v]) => NS.test(v) && !definedVars.has(v) && !runtime.has(v)).map(([v, fs_]) => `${v} <- ${[...fs_].join(", ")}`);
tick("G7", t);
// G8 canonical first-party classes
t = performance.now();
const ds = await __unstable__loadDesignSystem(css, { base });
tick("G8-loadDS", t); t = performance.now();
const fpScanner = new Scanner({ sources: [...rootSrc, ...compiler.sources, { base: path.join(ROOT, "src/components/ui"), pattern: "**/*", negated: true }] });
const fp = fpScanner.scan();
const css8 = ds.candidatesToCss(fp);
const valid8 = fp.filter((_, i) => css8[i] !== null);
R.G8 = valid8.map((c) => [c, ds.canonicalizeCandidates([c], { rem: 16 })[0]]).filter(([c, k]) => c !== k).map(([c, k]) => `${c} -> ${k}`);
tick("G8", t);
console.log(JSON.stringify({ timingsMs: T, scannedFiles: scanner.files.length, fpCandidates: fp.length, fpValid: valid8.length, counts: Object.fromEntries(Object.entries(R).map(([k, v]) => [k, v.length])), G1: R.G1, G2: R.G2, G3: R.G3, G4: R.G4, G5: R.G5.slice(0, 6), G6: R.G6, G7: R.G7, G8sample: R.G8.slice(0, 5) }, null, 1));
