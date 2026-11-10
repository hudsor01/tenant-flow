// D-20 var-reference census and explicit-map rewrite for the Tailwind v4 / shadcn remediation
// (66.2-11; H5, N9, N10, N14). Every mode except --apply is read-only against the repo: reports
// go to $TW_AUDIT_OUT (default: <tmpdir>/tenantflow-tw-audit) or to an explicit path outside
// src/. --apply is the only mode that writes repo files, and only the edits listed in
// <dir>/pairs.json, after re-asserting each slice.
//
// Usage (from the repo root):
//   node .planning/tailwind-shadcn/audit/var-rewrite.mjs --census [--out <file>]
//   node .planning/tailwind-shadcn/audit/var-rewrite.mjs --snapshot <dir>
//   node .planning/tailwind-shadcn/audit/var-rewrite.mjs --apply <tsx|css> <dir>
//   node .planning/tailwind-shadcn/audit/var-rewrite.mjs --parity <dir> [--scope tsx|css|all]
//   node .planning/tailwind-shadcn/audit/var-rewrite.mjs --intended <dir> <out.json>
//   node .planning/tailwind-shadcn/audit/var-rewrite.mjs --self-test
//
// --census    classifies every var(--spacing|radius|duration-*) and -(--…) shorthand reference
//             in git-tracked src/ and tests/ ts/tsx/css/mjs files into exactly one kind; exit 1
//             when any reference is unclassified. Also lists informational X3 references.
// --snapshot  writes <dir>/census.json, globals.css (byte copy), compiled.css and
//             candidate-css.json (audit.mjs's method, byte-identical) and pairs.json (one entry
//             per planned edit, positions are UTF-16 indices, N9). Exit 1 on a slice mismatch
//             or an edit on a comment line.
// --apply     applies the pairs of one scope in descending position order; aborts with no write
//             on any slice mismatch.
// --parity    P1 class bodies (normalized candidatesToCss), P2 fixed-list compiled CSS under
//             normSpacing plus the scale values, P3 Chromium computed values, P4 the N10 forward
//             check (no numeric --spacing-* scale). Writes $TW_AUDIT_OUT/var-rewrite-parity.json.
// --intended  writes the css-parity --intended file for the rewritten candidates.
//
// The mapping is mapClass/mapCssRef below. canonicalizeCandidates is never consulted to choose
// an edit (D-20/H5/N10): it maps gap-[var(--spacing-2)] to the dangling gap-(--spacing-2).
// Exit: 0 success, 1 failed check, 2 usage error.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = process.cwd();
const require = createRequire(path.join(ROOT, "package.json"));
const { __unstable__loadDesignSystem, compile } = await import(require.resolve("@tailwindcss/node"));
const { Scanner } = require("@tailwindcss/oxide");
const postcss = require("postcss");

const OUT = process.env.TW_AUDIT_OUT ?? path.join(os.tmpdir(), "tenantflow-tw-audit");
const cssPath = path.join(ROOT, "src/app/globals.css");
const base = path.dirname(cssPath);
const GLOBALS_REL = "src/app/globals.css";
const DASHBOARD_REL = "src/app/(owner)/dashboard.css";
const KEPT_DURATIONS = new Set(["100", "200", "300", "500", "700", "1000", "standard"]);
const NUM = "[0-9]+(?:_[0-9]+)?";

// ---------- pure functions ----------

function splitVariant(candidate) {
	let depth = 0;
	let last = -1;
	for (let i = 0; i < candidate.length; i++) {
		const ch = candidate[i];
		if (ch === "[" || ch === "(") depth++;
		else if (ch === "]" || ch === ")") depth--;
		else if (ch === ":" && depth === 0) last = i;
	}
	return [candidate.slice(0, last + 1), candidate.slice(last + 1)];
}

function mapClass(candidate) {
	const [prefix, rest0] = splitVariant(candidate);
	const neg = rest0.startsWith("-") ? "-" : "";
	const rest = rest0.slice(neg.length);
	const spacing = new RegExp(`^(.+)-(?:\\[var\\(--spacing-(${NUM})\\)\\]|\\(--spacing-(${NUM})\\))$`).exec(rest);
	if (spacing) return `${prefix}${neg}${spacing[1]}-${(spacing[2] ?? spacing[3]).replace("_", ".")}`;
	const radius = /^rounded(-(?:tl|tr|br|bl|ss|se|es|ee|t|r|b|l|s|e))?-\[var\(--radius-([a-z0-9]+)\)\]$/.exec(rest);
	if (radius) return `${prefix}${neg}rounded${radius[1] ?? ""}-${radius[2]}`;
	if (rest === "duration-[var(--duration-standard)]") return `${prefix}${neg}duration-(--duration-standard)`;
	return null;
}

function mapCssRef(text) {
	const m = new RegExp(`^var\\(--spacing-(${NUM})\\)$`).exec(text);
	return m ? `--spacing(${m[1].replace("_", ".")})` : null;
}

function normSelector(css, candidate) {
	if (typeof css !== "string") throw new Error(`normSelector: no CSS for ${candidate}`);
	let found = false;
	const out = css
		.split("\n")
		.map((line) => {
			if (!/\{\s*$/.test(line) || /^\s*@/.test(line)) return line;
			const stripped = line.replaceAll("\\", "");
			if (!stripped.includes(candidate)) return stripped;
			found = true;
			return stripped.split(candidate).join("__C__");
		})
		.join("\n");
	if (!found) throw new Error(`normSelector: ${candidate} not in any selector`);
	return out;
}

// css-parity.mjs normSpacing rules 1-8, same order (copied: css-parity.mjs has top-level effects).
function normSpacing(text) {
	if (text == null) return text;
	let s = text
		.replace(/var\(--spacing-(\d+)_(\d+)\)/g, "calc(var(--spacing) * $1.$2)")
		.replace(/var\(--spacing-px\)/g, "1px")
		.replace(/var\(--spacing-(\d+)\)/g, "calc(var(--spacing) * $1)")
		.replace(/calc\(calc\(var\(--spacing\) \* (\d+(?:\.\d+)?)\) \* -1\)/g, "calc(var(--spacing) * -$1)")
		.replace(/calc\(var\(--spacing\) \* -?0\)/g, "0px")
		.replace(/calc\(var\(--spacing\) \* 1\)/g, "var(--spacing)")
		.replace(/calc\(0px \* [^;]*/g, "0");
	let prev;
	do {
		prev = s;
		s = s.replace(/^([ \t]*[\w-]+:[^;\n]*;)\n\1$/gm, "$1");
	} while (s !== prev);
	return s;
}

function isCommentLine(lineText) {
	const t = lineText.trim();
	return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("{/*");
}

function lineIndex(content) {
	const starts = [0];
	for (let i = 0; i < content.length; i++) if (content[i] === "\n") starts.push(i + 1);
	return (offset) => {
		let lo = 0;
		let hi = starts.length - 1;
		while (lo < hi) {
			const mid = (lo + hi + 1) >> 1;
			if (starts[mid] <= offset) lo = mid;
			else hi = mid - 1;
		}
		const lineStart = starts[lo];
		const lineEnd = content.indexOf("\n", lineStart);
		return { line: lo + 1, col: offset - lineStart + 1, text: content.slice(lineStart, lineEnd === -1 ? content.length : lineEnd) };
	};
}

function fail(msg) {
	console.error(`var-rewrite: ${msg}`);
	process.exit(1);
}

const SELF = { mapClass, mapCssRef, normSelector, normSpacing, isCommentLine, splitVariant };

// ---------- engine helpers (audit.mjs's method) ----------

async function compileAndScan(cssText) {
	const compiler = await compile(cssText, { base, from: cssPath, onDependency() {} });
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
	return { compiler, candidates, compiled };
}

async function candidateCssJson(cssText, candidates) {
	const ds = await __unstable__loadDesignSystem(cssText, { base });
	const cssFor = ds.candidatesToCss(candidates);
	const candidateCss = Object.fromEntries(candidates.map((c, i) => [c, cssFor[i]]).filter(([, v]) => v !== null).sort(([a], [b]) => (a < b ? -1 : 1)));
	return JSON.stringify(candidateCss, null, 1);
}

async function buildFixed(cssText, list) {
	const compiler = await compile(cssText, { base, from: cssPath, onDependency() {} });
	return compiler.build(list);
}

// ---------- census ----------

function trackedFiles() {
	return execFileSync("git", ["ls-files", "src", "tests"], { cwd: ROOT, encoding: "utf8" })
		.split("\n")
		.filter((f) => /\.(ts|tsx|css|mjs)$/.test(f));
}

function themeRadiusNames(cssText) {
	const names = new Set();
	postcss.parse(cssText).walkAtRules("theme", (at) => {
		at.walkDecls((d) => {
			const m = /^--radius-([a-z0-9]+)$/.exec(d.prop);
			if (m) names.add(m[1]);
		});
	});
	return names;
}

const X3_RE = /var\(--(color-white|color-black|color-slate-[a-z0-9-]+|text-(?:xs|sm|base|lg|xl|[2-6]xl)|font-weight-[a-z0-9-]+|leading-none|ease-(?:in-out|in|out|linear)|max-width-(?:2xl|3xl)|width-full)(?=[\s,)])/g;

async function census() {
	const globalsText = fs.readFileSync(cssPath, "utf8");
	const ds = await __unstable__loadDesignSystem(globalsText, { base });
	const ds0 = await __unstable__loadDesignSystem('@import "tailwindcss";', { base });
	const radii = themeRadiusNames(globalsText);
	const validCache = new Map();
	const isValid = (c) => {
		if (!validCache.has(c)) validCache.set(c, ds.candidatesToCss([c])[0] !== null);
		return validCache.get(c);
	};
	const refs = [];
	const x3Refs = [];
	const HIT_RE = /var\(--(spacing|radius|duration)-([a-z0-9_]+)\)|-\(--(spacing|radius|duration)-([a-z0-9_]+)\)/g;
	for (const file of trackedFiles()) {
		const content = fs.readFileSync(path.join(ROOT, file), "utf8");
		const at = lineIndex(content);
		const ext = path.extname(file).slice(1);
		let cands = null;
		const isTest = /\.test\./.test(file) || file.includes("__tests__/") || file.startsWith("tests/");
		for (const m of content.matchAll(HIT_RE)) {
			const family = m[1] ?? m[3];
			const suffix = m[2] ?? m[4];
			const token = `--${family}-${suffix}`;
			const offset = m.index;
			const { line, col, text } = at(offset);
			const keptDuration = family === "duration" && KEPT_DURATIONS.has(suffix);
			const ref = { file, line, col, offset, token, match: m[0], text: text.trim() };
			if (isCommentLine(text)) ref.comment = true;
			let kind = "unclassified";
			if (file === DASHBOARD_REL) kind = "defer:dashboard-css";
			else if (isTest) kind = keptDuration ? "keep:test-pin" : "unclassified";
			else if (file.startsWith("src/components/ui/")) kind = keptDuration ? "keep:ui-vendored" : "unclassified";
			else if (file === GLOBALS_REL) {
				if (family === "spacing" && new RegExp(`^${NUM}$`).test(suffix) && m[1]) kind = "css-spacing";
				else if (family === "radius" && radii.has(suffix)) kind = "keep:css-radius";
				else if (keptDuration) kind = "keep:css-duration";
			} else if (ext === "ts" || ext === "tsx") {
				cands ??= new Scanner({ sources: [] }).getCandidatesWithPositions({ content, extension: ext });
				const end = offset + m[0].length;
				const containing = cands
					.filter((c) => c.position <= offset && c.position + c.candidate.length >= end && isValid(c.candidate))
					.sort((a, b) => b.candidate.length - a.candidate.length);
				const cand = containing[0];
				if (cand) {
					ref.candidate = cand.candidate;
					ref.position = cand.position;
					const mapped = mapClass(cand.candidate);
					if (mapped !== null) {
						ref.new = mapped;
						kind = `${family}-class`;
					} else if (keptDuration) kind = "keep:duration-no-canonical-form";
				} else if (keptDuration) kind = "keep:duration-inline-style";
			}
			ref.kind = kind;
			refs.push(ref);
		}
		if (/^src\/.*\.(ts|tsx|css)$/.test(file)) {
			for (const m of content.matchAll(X3_RE)) {
				const name = `--${m[1]}`;
				const { line, text } = at(m.index);
				x3Refs.push({ file, line, name, text: text.trim(), defaultDefines: ds0.resolveThemeValue(name) !== undefined });
			}
		}
	}
	const counts = {};
	const distinctSets = {};
	for (const r of refs) {
		counts[r.kind] = (counts[r.kind] ?? 0) + 1;
		(distinctSets[r.kind] ??= new Set()).add(r.candidate ?? r.match);
	}
	const sortObj = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1)));
	const distinct = sortObj(Object.fromEntries(Object.entries(distinctSets).map(([k, s]) => [k, s.size])));
	return { counts: sortObj(counts), distinct, refs, unclassified: refs.filter((r) => r.kind === "unclassified"), x3Refs };
}

// ---------- pairs ----------

function cssDeclContext(cssText, offset) {
	let hit = null;
	postcss.parse(cssText).walkDecls((d) => {
		const s = d.source?.start?.offset;
		const e = d.source?.end?.offset;
		if (s !== undefined && e !== undefined && s <= offset && offset <= e) hit = d;
	});
	if (!hit) throw new Error(`no declaration contains offset ${offset}`);
	const p = hit.parent;
	const selector = p.type === "rule" ? p.selector : p.type === "atrule" ? `@${p.name} ${p.params}` : p.type;
	return { selector, property: hit.prop, declValue: hit.value };
}

function buildPairs(cen) {
	const pairs = [];
	const globalsText = fs.readFileSync(cssPath, "utf8");
	const seen = new Set();
	for (const r of cen.refs) {
		if (r.kind === "spacing-class" || r.kind === "radius-class" || r.kind === "duration-class") {
			const key = `${r.file}:${r.position}`;
			if (seen.has(key)) continue;
			seen.add(key);
			const e = { file: r.file, position: r.position, line: r.line, old: r.candidate, new: r.new, scope: "tsx", kind: r.kind };
			if (r.comment) e.comment = true;
			pairs.push(e);
		} else if (r.kind === "css-spacing") {
			const neu = mapCssRef(r.match);
			if (neu === null) throw new Error(`css-spacing ref without a map entry: ${r.match} at ${r.file}:${r.line}`);
			const e = { file: r.file, position: r.offset, line: r.line, old: r.match, new: neu, scope: "css", kind: r.kind, ...cssDeclContext(globalsText, r.offset) };
			if (r.comment) e.comment = true;
			pairs.push(e);
		}
	}
	return pairs;
}

function assertSlices(pairs) {
	const byFile = new Map();
	const bad = [];
	for (const p of pairs) {
		if (!byFile.has(p.file)) byFile.set(p.file, fs.readFileSync(path.join(ROOT, p.file), "utf8"));
		const content = byFile.get(p.file);
		if (content.slice(p.position, p.position + p.old.length) !== p.old) bad.push(p);
	}
	return { bad, byFile };
}

// ---------- modes ----------

async function modeCensus(outFile) {
	const cen = await census();
	const target = outFile ? path.resolve(outFile) : path.join(OUT, "census.json");
	fs.mkdirSync(path.dirname(target), { recursive: true });
	fs.writeFileSync(target, JSON.stringify(cen, null, 1));
	console.log(JSON.stringify({ counts: cen.counts, distinct: cen.distinct, unclassified: cen.unclassified.length, x3Refs: cen.x3Refs.length }));
	console.error(`census: ${target}`);
	process.exit(cen.unclassified.length === 0 ? 0 : 1);
}

async function modeSnapshot(dir) {
	const d = path.resolve(dir);
	fs.mkdirSync(d, { recursive: true });
	const cen = await census();
	const pairs = buildPairs(cen);
	const { bad } = assertSlices(pairs);
	if (bad.length) fail(`slice mismatch: ${JSON.stringify(bad.slice(0, 5))}`);
	const globalsText = fs.readFileSync(cssPath, "utf8");
	const { candidates, compiled } = await compileAndScan(globalsText);
	fs.writeFileSync(path.join(d, "census.json"), JSON.stringify(cen, null, 1));
	fs.copyFileSync(cssPath, path.join(d, "globals.css"));
	fs.writeFileSync(path.join(d, "compiled.css"), compiled);
	fs.writeFileSync(path.join(d, "candidate-css.json"), await candidateCssJson(globalsText, candidates));
	fs.writeFileSync(path.join(d, "pairs.json"), JSON.stringify(pairs, null, 1));
	const comments = pairs.filter((p) => p.comment);
	const summary = { counts: cen.counts, pairs: { tsx: pairs.filter((p) => p.scope === "tsx").length, css: pairs.filter((p) => p.scope === "css").length }, comments: comments.length, unclassified: cen.unclassified.length };
	console.log(JSON.stringify(summary));
	if (comments.length) fail(`edit on a comment line: ${JSON.stringify(comments)}`);
	if (cen.unclassified.length) fail(`unclassified references: ${JSON.stringify(cen.unclassified)}`);
}

function modeApply(scope, dir) {
	const pairs = JSON.parse(fs.readFileSync(path.join(path.resolve(dir), "pairs.json"), "utf8")).filter((p) => p.scope === scope);
	if (pairs.length === 0) fail(`no ${scope} pairs`);
	const { bad, byFile } = assertSlices(pairs);
	if (bad.length) fail(`slice mismatch, nothing written: ${JSON.stringify(bad.slice(0, 5))}`);
	const result = {};
	const next = new Map();
	for (const [file, content] of byFile) {
		let s = content;
		const mine = pairs.filter((p) => p.file === file).sort((a, b) => b.position - a.position);
		for (const p of mine) {
			if (s.slice(p.position, p.position + p.old.length) !== p.old) fail(`slice mismatch during apply, nothing written: ${file}:${p.line}`);
			s = s.slice(0, p.position) + p.new + s.slice(p.position + p.old.length);
		}
		next.set(file, s);
		result[file] = mine.length;
	}
	for (const [file, s] of next) fs.writeFileSync(path.join(ROOT, file), s);
	console.log(JSON.stringify(result));
}

const PROBE_PROPS = [
	"margin-top",
	"margin-right",
	"margin-bottom",
	"margin-left",
	"padding-top",
	"padding-right",
	"padding-bottom",
	"padding-left",
	"row-gap",
	"column-gap",
	"width",
	"height",
	"min-height",
	"top",
	"right",
	"bottom",
	"left",
	"border-top-left-radius",
	"border-bottom-right-radius",
	"transition-duration",
];

function longhandsFor(prop) {
	if (prop.startsWith("--")) return ["padding-top"];
	if (prop === "padding" || prop === "margin") return ["top", "right", "bottom", "left"].map((s) => `${prop}-${s}`);
	if (prop === "gap") return ["row-gap", "column-gap"];
	return [prop];
}

function findCompiledDecl(compiledText, selector, property) {
	const want = selector.startsWith("@utility ") ? `.${selector.slice("@utility ".length).trim()}` : selector;
	const norm = (s) => s.replace(/\s+/g, " ").trim();
	let value = null;
	postcss.parse(compiledText).walkRules((r) => {
		if (value !== null || norm(r.selector) !== norm(want)) return;
		r.each((n) => {
			if (value === null && n.type === "decl" && n.prop === property) value = n.value;
		});
	});
	return value;
}

async function chromiumProbe(cssA, cssB, tsxPairs, cssPairs) {
	const { chromium } = require("playwright");
	const browser = await chromium.launch();
	try {
		const run = async (css, probes) => {
			const page = await browser.newPage();
			await page.setContent(`<!doctype html><html class="light"><head><style>${css}</style></head><body><div id="root"></div></body></html>`);
			const out = await page.evaluate(
				({ probes, props }) => {
					const root = document.getElementById("root");
					return probes.map((p) => {
						root.replaceChildren();
						const box = document.createElement("div");
						box.style.cssText = "position:relative;width:400px";
						const el = document.createElement("div");
						if (p.cls) el.className = p.cls;
						if (p.prop) el.style.setProperty(p.prop, p.value);
						el.append(document.createElement("span"), document.createElement("span"));
						box.append(el);
						root.append(box);
						const cs = getComputedStyle(el);
						const v = {};
						for (const k of p.read ?? props) v[k] = cs.getPropertyValue(k);
						const first = getComputedStyle(el.firstElementChild);
						v["child:margin-block-start"] = first.marginBlockStart;
						v["child:margin-block-end"] = first.marginBlockEnd;
						return v;
					});
				},
				{ probes, props: PROBE_PROPS },
			);
			await page.close();
			return out;
		};
		const probesA = [...tsxPairs.map((p) => ({ cls: p.old })), ...cssPairs.map((p) => ({ prop: p.prop, value: p.preValue, read: p.read }))];
		const probesB = [...tsxPairs.map((p) => ({ cls: p.new })), ...cssPairs.map((p) => ({ prop: p.prop, value: p.postValue, read: p.read }))];
		const a = await run(cssA, probesA);
		const b = await run(cssB, probesB);
		return { a, b };
	} finally {
		await browser.close();
	}
}

async function gitDiffLines(textA, textB) {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "var-rewrite-"));
	const fa = path.join(tmp, "a.css");
	const fb = path.join(tmp, "b.css");
	fs.writeFileSync(fa, textA);
	fs.writeFileSync(fb, textB);
	let out = "";
	try {
		out = execFileSync("git", ["diff", "--no-index", "--numstat", fa, fb], { encoding: "utf8" });
	} catch (e) {
		out = e.stdout ?? "";
	}
	fs.rmSync(tmp, { recursive: true, force: true });
	return out
		.trim()
		.split("\n")
		.filter(Boolean)
		.reduce((n, l) => n + l.split("\t").slice(0, 2).reduce((s, x) => s + Number(x), 0), 0);
}

async function modeParity(dir, scope) {
	const d = path.resolve(dir);
	const preCss = fs.readFileSync(path.join(d, "globals.css"), "utf8");
	const postCss = fs.readFileSync(cssPath, "utf8");
	const pairs = JSON.parse(fs.readFileSync(path.join(d, "pairs.json"), "utf8"));
	const preCandidateCss = JSON.parse(fs.readFileSync(path.join(d, "candidate-css.json"), "utf8"));
	const dsPre = await __unstable__loadDesignSystem(preCss, { base });
	const dsPost = await __unstable__loadDesignSystem(postCss, { base });
	const { compiled: postCompiled } = await compileAndScan(postCss);
	fs.mkdirSync(OUT, { recursive: true });
	fs.writeFileSync(path.join(OUT, "var-rewrite-compiled-post.css"), postCompiled);
	const tsxAll = pairs.filter((p) => p.scope === "tsx");
	const cssAll = pairs.filter((p) => p.scope === "css");
	const distinct = [...new Map(tsxAll.map((p) => [`${p.old}\u0000${p.new}`, { old: p.old, new: p.new }])).values()];
	const report = { scope };

	// P1
	const p1f = [];
	for (const p of distinct) {
		for (const [label, ds] of [
			["pre", dsPre],
			["post", dsPost],
		]) {
			try {
				const [a, b] = ds.candidatesToCss([p.old, p.new]);
				if (normSelector(a, p.old) !== normSelector(b, p.new)) p1f.push({ ...p, theme: label, oldCss: a, newCss: b });
			} catch (e) {
				p1f.push({ ...p, theme: label, error: e.message });
			}
		}
	}
	report.p1 = { checked: distinct.length, failures: p1f };

	// P2
	const C = [...new Set([...Object.keys(preCandidateCss), ...tsxAll.map((p) => p.new)])].sort();
	const preFixed = await buildFixed(preCss, C);
	const postFixed = await buildFixed(postCss, C);
	const p2f = [];
	const rawDiffLines = await gitDiffLines(preFixed, postFixed);
	if (scope === "tsx") {
		if (preFixed !== postFixed) p2f.push({ check: "raw byte-identical (scope tsx)", rawDiffLines });
	} else if (normSpacing(preFixed) !== normSpacing(postFixed)) {
		const a = normSpacing(preFixed).split("\n");
		const b = normSpacing(postFixed).split("\n");
		const sa = new Set(a);
		const sb = new Set(b);
		p2f.push({ check: "normSpacing(preFixed) === normSpacing(postFixed)", onlyPre: a.filter((l) => !sb.has(l)).slice(0, 40), onlyPost: b.filter((l) => !sa.has(l)).slice(0, 40) });
	}
	const scaleF = [];
	const ks = [...new Set(cssAll.map((p) => /--spacing\(([0-9.]+)\)/.exec(p.new)[1]))];
	for (const k of ks) {
		const v = dsPre.resolveThemeValue(`--spacing-${k.replace(".", "_")}`);
		if (typeof v !== "string" || !v.endsWith("rem") || Number(v.slice(0, -3)) !== Number(k) * 0.25) scaleF.push({ k, value: v ?? null });
	}
	const unit = dsPre.resolveThemeValue("--spacing");
	if (unit !== "0.25rem") scaleF.push({ k: "--spacing", value: unit ?? null });
	p2f.push(...scaleF.map((f) => ({ check: "scale", ...f })));
	report.p2 = { candidates: C.length, rawDiffLines, scaleChecked: ks.length + 1, failures: p2f };

	// P3
	const p3Tsx = scope === "css" ? [] : distinct;
	let p3Css = [];
	const p3f = [];
	if (scope !== "tsx") {
		const utils = [...new Set(cssAll.filter((p) => p.selector.startsWith("@utility ")).map((p) => p.selector.slice("@utility ".length).trim()))];
		const postWithUtils = await buildFixed(postCss, [...C, ...utils]);
		p3Css = cssAll.map((p) => {
			const postValue = findCompiledDecl(postWithUtils, p.selector, p.property);
			if (postValue === null) p3f.push({ pair: p, error: "compiled declaration not found" });
			return { ...p, prop: p.property.startsWith("--") ? "padding-top" : p.property, preValue: p.declValue, postValue: postValue ?? "", read: longhandsFor(p.property) };
		});
	}
	const preCompiled = fs.readFileSync(path.join(d, "compiled.css"), "utf8");
	const { a, b } = await chromiumProbe(preCompiled, postCompiled, p3Tsx, p3Css);
	const labels = [...p3Tsx.map((p) => ({ kind: "tsx", old: p.old, new: p.new })), ...p3Css.map((p) => ({ kind: "css", file: p.file, line: p.line, selector: p.selector, property: p.property, pre: p.preValue, post: p.postValue }))];
	labels.forEach((l, i) => {
		if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) p3f.push({ ...l, a: a[i], b: b[i] });
	});
	// Vacuity guard: a css probe whose every read longhand is unset/zero on either page means a
	// variable did not resolve there, so an equal pair would prove nothing.
	const UNSET = new Set(["", "0px", "auto", "normal"]);
	const tsxN = p3Tsx.length;
	p3Css.forEach((p, j) => {
		for (const [side, vals] of [
			["a", a[tsxN + j]],
			["b", b[tsxN + j]],
		]) {
			if (p.read.every((k) => UNSET.has(vals[k]))) p3f.push({ kind: "css-vacuous", side, file: p.file, line: p.line, selector: p.selector, property: p.property, read: Object.fromEntries(p.read.map((k) => [k, vals[k]])) });
		}
	});
	report.p3 = {
		checked: labels.length,
		tsxChecked: tsxN,
		cssChecked: p3Css.length,
		failures: p3f,
		css: p3Css.map((p, j) => ({ line: p.line, selector: p.selector, property: p.property, pre: p.preValue, post: p.postValue, computed: Object.fromEntries(p.read.map((k) => [k, b[tsxN + j][k]])) })),
	};

	// P4
	if (scope === "tsx") report.p4 = { skipped: true, failures: [] };
	else {
		const scratch = postCss
			.split("\n")
			.filter((l) => !/^\s*--spacing-([0-9]+(_[0-9]+)?|px):/.test(l))
			.join("\n");
		const removed = postCss.split("\n").length - scratch.split("\n").length;
		const dsS = await __unstable__loadDesignSystem(scratch, { base });
		const p4f = [];
		const news = [...new Set(tsxAll.map((p) => p.new))].sort();
		for (const c of news) {
			const css = dsS.candidatesToCss([c])[0];
			const canon = dsS.canonicalizeCandidates([c], { rem: 16 })[0];
			if (css === null || canon !== c) p4f.push({ candidate: c, css, canonical: canon });
		}
		const { compiled: scratchCompiled } = await compileAndScan(scratch);
		const dangling = (scratchCompiled.match(/var\(--spacing-[0-9]/g) ?? []).length;
		if (dangling !== 0) p4f.push({ check: "danglingSpacingVars", count: dangling });
		report.p4 = { checked: news.length, scaleLinesRemoved: removed, danglingSpacingVars: dangling, failures: p4f };
	}
	const target = path.join(OUT, "var-rewrite-parity.json");
	fs.writeFileSync(target, JSON.stringify(report, null, 1));
	const failed = ["p1", "p2", "p3", "p4"].filter((k) => report[k].failures.length > 0);
	console.log(JSON.stringify({ scope, p1: report.p1.checked, p2: report.p2.candidates, p2rawDiffLines: rawDiffLines, p3: report.p3.checked, p4: report.p4.checked ?? "skipped", failed }));
	console.error(`parity: ${target}`);
	process.exit(failed.length === 0 ? 0 : 1);
}

function modeIntended(dir, outFile) {
	const pairs = JSON.parse(fs.readFileSync(path.join(path.resolve(dir), "pairs.json"), "utf8")).filter((p) => p.scope === "tsx");
	const intended = { "d20-rewrite-removed": [...new Set(pairs.map((p) => p.old))].sort(), "d20-rewrite-added": [...new Set(pairs.map((p) => p.new))].sort() };
	fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
	fs.writeFileSync(path.resolve(outFile), `${JSON.stringify(intended, null, 1)}\n`);
	console.log(JSON.stringify({ removed: intended["d20-rewrite-removed"].length, added: intended["d20-rewrite-added"].length }));
}

async function selfTest() {
	let passed = 0;
	const check = (name, ok, detail) => {
		if (!ok) {
			console.error(`var-rewrite self-test FAILED: ${name}${detail ? ` (${detail})` : ""}`);
			process.exit(1);
		}
		passed++;
	};
	// (i) mapClass
	const maps = [
		["mt-[var(--spacing-1)]", "mt-1"],
		["w-[var(--spacing-1_5)]", "w-1.5"],
		["hover:-mt-[var(--spacing-2)]", "hover:-mt-2"],
		["gap-(--spacing-2)", "gap-2"],
		["rounded-[var(--radius-lg)]", "rounded-lg"],
		["rounded-t-[var(--radius-md)]", "rounded-t-md"],
		["duration-[var(--duration-standard)]", "duration-(--duration-standard)"],
	];
	for (const [i, o] of maps) check(`(i) mapClass ${i}`, SELF.mapClass(i) === o, SELF.mapClass(i));
	for (const n of ["p-[var(--spacing-px)]", "p-[var(--layout-gap-items)]", "[animation-delay:var(--duration-200)]", "duration-[var(--duration-200)]"]) check(`(i) mapClass null ${n}`, SELF.mapClass(n) === null, SELF.mapClass(n));
	// (ii) mapCssRef
	check("(ii) mapCssRef 16", SELF.mapCssRef("var(--spacing-16)") === "--spacing(16)");
	check("(ii) mapCssRef 1_5", SELF.mapCssRef("var(--spacing-1_5)") === "--spacing(1.5)");
	check("(ii) mapCssRef px null", SELF.mapCssRef("var(--spacing-px)") === null);
	check("(ii) mapCssRef container-inline null", SELF.mapCssRef("var(--spacing-container-inline)") === null);
	// (iii) real engine
	const ds = await __unstable__loadDesignSystem(fs.readFileSync(cssPath, "utf8"), { base });
	const body = (c) => SELF.normSelector(ds.candidatesToCss([c])[0], c);
	check("(iii) mt-[var(--spacing-1)] == mt-1", body("mt-[var(--spacing-1)]") === body("mt-1"));
	check("(iii) space-y-[var(--spacing-2)] == space-y-2", body("space-y-[var(--spacing-2)]") === body("space-y-2"));
	check("(iii) negative: mt-[var(--spacing-1)] != mt-2", body("mt-[var(--spacing-1)]") !== body("mt-2"));
	let threw = false;
	try {
		SELF.normSelector(".mt-1 {\n  margin-top: var(--spacing-1);\n}\n", "mt-2");
	} catch {
		threw = true;
	}
	check("(iii) normSelector throws on an absent candidate", threw);
	// (iv) normSpacing
	check("(iv) normSpacing 5", SELF.normSpacing("padding: var(--spacing-5);") === SELF.normSpacing("padding: calc(var(--spacing) * 5);"));
	check("(iv) normSpacing 1", SELF.normSpacing("margin: var(--spacing-1) 0 0 0;") === SELF.normSpacing("margin: var(--spacing) 0 0 0;"));
	check("(iv) negative: 5 != 6", SELF.normSpacing("padding: var(--spacing-5);") !== SELF.normSpacing("padding: calc(var(--spacing) * 6);"));
	// (v) N9 UTF-16 positions
	const content = '<p className="— mt-[var(--spacing-1)]">';
	const hit = new Scanner({ sources: [] }).getCandidatesWithPositions({ content, extension: "tsx" }).find((c) => c.candidate === "mt-[var(--spacing-1)]");
	check("(v) N9 slice", hit && content.slice(hit.position, hit.position + hit.candidate.length) === hit.candidate, JSON.stringify(hit));
	// (vi) comment-line detector
	check("(vi) // comment", SELF.isCommentLine("  // mt-[var(--spacing-1)]"));
	check("(vi) {/* */} comment", SELF.isCommentLine("\t{/* mt-[var(--spacing-1)] */}"));
	check("(vi) code line is not a comment", SELF.isCommentLine('<p className="mt-[var(--spacing-1)]">') === false);
	console.log(`var-rewrite self-test: ${passed} passed`);
}

// ---------- CLI ----------

const usage = () => {
	console.error("usage: var-rewrite.mjs --census [--out <file>] | --snapshot <dir> | --apply <tsx|css> <dir> | --parity <dir> [--scope tsx|css|all] | --intended <dir> <out.json> | --self-test");
	process.exit(2);
};

const argv = process.argv.slice(2);
const mode = argv[0];
if (mode === "--self-test" && argv.length === 1) await selfTest();
else if (mode === "--census" && (argv.length === 1 || (argv.length === 3 && argv[1] === "--out"))) await modeCensus(argv[2]);
else if (mode === "--snapshot" && argv.length === 2) await modeSnapshot(argv[1]);
else if (mode === "--apply" && argv.length === 3 && (argv[1] === "tsx" || argv[1] === "css")) modeApply(argv[1], argv[2]);
else if (mode === "--parity" && (argv.length === 2 || (argv.length === 4 && argv[2] === "--scope" && ["tsx", "css", "all"].includes(argv[3])))) await modeParity(argv[1], argv[3] ?? "all");
else if (mode === "--intended" && argv.length === 3) modeIntended(argv[1], argv[2]);
else usage();
