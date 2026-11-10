// Per-hunk proof for two audit.mjs candidate-css maps (Tailwind v4 / shadcn remediation, 66.2-15),
// reused by 66.2-37. Read-only against the repo: git runs read-only through execFileSync, and the
// reports go to the --json / --intended-out paths (default directory $TW_AUDIT_OUT, else
// <tmpdir>/tenantflow-tw-audit), never into src/.
//
// Usage (from the repo root):
//   node .planning/tailwind-shadcn/audit/hunk-proof.mjs --a <candidate-css A> --a-css <compiled A>
//        --b <candidate-css B> --b-css <compiled B> --changed-since <sha> [--pairs <file>]
//        [--scope-delta] --json <out> [--intended-out <file>]
//   node .planning/tailwind-shadcn/audit/hunk-proof.mjs --self-test
//
// Every candidate in A ∪ B whose rule text differs gets the first kind that holds:
//   spacing-equivalent  normSpacing(a) === normSpacing(b) (css-parity.mjs's normalizer, imported)
//   resolved-equal      both sides present; every var(--x) / var(--x, fallback) is replaced by
//                       that tree's :root/:host definition of --x (recursively, 5 levels), equal
//                       consecutive declarations in one block collapse to one, and the results are
//                       equal, or equal per declaration under the numeric rule (one unit, or a calc()
//                       over one unit, within 1e-6) and the zero rule (unitless 0 = 0px/0em/0rem;
//                       0% is not a zero length here)
//   scope               removed, and dropped by the D-18 source("..") scope (--scope-delta)
//   rewrite-pair        the key is the from or the to of a --pairs entry { from, to } with from in A,
//                       to in B, and both declaration bodies (selectors removed) equal after
//                       normSpacing
//   source-removed      removed, and the candidate text occurs verbatim in `git show <sha>:<f>` for a
//                       file f of `git diff --name-only <sha>..HEAD -- src` (deleted files included)
//   source-added        added, and the candidate text occurs verbatim in the current content of such
//                       a file
//   unproven            none of the above
// Theme-value identity: every non --color-* custom property defined in both compiled files must
// be equal after whitespace collapse, normSpacing and the numeric / zero rules (else
// themeValueChanges); every --spacing-<N> defined in A must equal N x 0.25rem (else
// spacingScaleMismatches).
// --scope-delta compiles the current src/app/globals.css twice in memory with audit.mjs's method:
// as is, and with source("..") removed plus the two W1-era @source negations restored. It
// reports scopeDropped / scopeAdded (valid candidates). Nothing is written under the repo.
//
// Outputs: --json { sha, scopeDropped, scopeAdded, pairsChecked, counts, hunks: [{ candidate,
// kind, detail }], unproven, themeValueChanges, spacingScaleMismatches }; --intended-out the
// css-parity.mjs --intended file { "w2-resolved-equal", "w2-rewrite-pair", "w2-scope",
// "w2-source-removed", "w2-source-added" } with exact candidate strings.
// Exit: 1 when unproven, themeValueChanges or spacingScaleMismatches is non-empty, 2 on a usage
// error, else 0. --self-test prints `hunk-proof self-test: N passed` and exits 1 on a failure.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { normSpacing } from "./css-parity.mjs";

const ROOT = process.cwd();
const require = createRequire(path.join(ROOT, "package.json"));
const postcss = require("postcss");
const OUT = process.env.TW_AUDIT_OUT ?? path.join(os.tmpdir(), "tenantflow-tw-audit");

const collapse = (s) => s.replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ").trim();

// ---------- custom-property definitions of a compiled stylesheet ----------

// Unconditional :root / :host declarations (theme layer and base-layer :root rules). A name with
// two different unconditional values is ambiguous and is never substituted.
export function definitionsOf(cssText) {
	const defs = new Map();
	const ambiguous = new Set();
	postcss.parse(cssText).walkDecls((d) => {
		if (!d.prop.startsWith("--")) return;
		const rule = d.parent;
		if (rule?.type !== "rule") return;
		const sels = rule.selector.split(",").map((s) => s.trim());
		if (!sels.every((s) => s === ":root" || s === ":host")) return;
		for (let p = rule.parent; p && p.type !== "root"; p = p.parent) if (p.type === "atrule" && p.name !== "layer") return;
		const v = d.value.trim();
		if (defs.has(d.prop) && defs.get(d.prop) !== v) ambiguous.add(d.prop);
		else defs.set(d.prop, v);
	});
	for (const n of ambiguous) defs.delete(n);
	return { defs, ambiguous: [...ambiguous].sort() };
}

// ---------- var() substitution ----------

// Index of the parenthesis closing the one opened at `open`.
const closeParen = (s, open) => {
	let depth = 0;
	for (let i = open; i < s.length; i++) {
		if (s[i] === "(") depth++;
		else if (s[i] === ")" && --depth === 0) return i;
	}
	return -1;
};

export function substitute(text, defs, used = new Set(), depth = 0) {
	if (depth >= 5) return text;
	let out = "";
	let i = 0;
	for (;;) {
		const j = text.indexOf("var(", i);
		if (j < 0) {
			out += text.slice(i);
			break;
		}
		const k = closeParen(text, j + 3);
		if (k < 0) {
			out += text.slice(i);
			break;
		}
		const inner = text.slice(j + 4, k);
		const comma = inner.indexOf(",");
		const name = (comma < 0 ? inner : inner.slice(0, comma)).trim();
		out += text.slice(i, j);
		if (defs.has(name)) {
			used.add(name);
			out += substitute(defs.get(name), defs, used, depth + 1);
		} else {
			out += `var(${substitute(inner, defs, used, depth + 1)})`;
		}
		i = k + 1;
	}
	return out;
}

// ---------- numeric evaluation (one unit) ----------

// Returns { value, unit } or null. Supports numbers with an optional unit, + - * /, parentheses
// and calc(); every dimensioned term must share one unit.
export function evalLength(input) {
	const src = input.trim();
	let pos = 0;
	const ws = () => {
		while (pos < src.length && /\s/.test(src[pos])) pos++;
	};
	const fail = () => {
		throw new Error("not numeric");
	};
	const primary = () => {
		ws();
		if (src.startsWith("calc(", pos)) {
			pos += 5;
			const v = sum();
			ws();
			if (src[pos] !== ")") fail();
			pos++;
			return v;
		}
		if (src[pos] === "(") {
			pos++;
			const v = sum();
			ws();
			if (src[pos] !== ")") fail();
			pos++;
			return v;
		}
		const m = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(%|[a-z]+)?/i.exec(src.slice(pos));
		if (!m) fail();
		pos += m[0].length;
		return { value: Number(m[1]), unit: (m[2] ?? "").toLowerCase() };
	};
	const product = () => {
		let l = primary();
		for (;;) {
			ws();
			const op = src[pos];
			if (op !== "*" && op !== "/") return l;
			pos++;
			const r = primary();
			if (op === "*") {
				if (l.unit && r.unit) fail();
				l = { value: l.value * r.value, unit: l.unit || r.unit };
			} else {
				if (r.unit || r.value === 0) fail();
				l = { value: l.value / r.value, unit: l.unit };
			}
		}
	};
	const sum = () => {
		let l = product();
		for (;;) {
			ws();
			const op = src[pos];
			if (op !== "+" && op !== "-") return l;
			pos++;
			const r = product();
			if (l.unit !== r.unit) fail();
			l = { value: op === "+" ? l.value + r.value : l.value - r.value, unit: l.unit };
		}
	};
	try {
		const v = sum();
		ws();
		return pos === src.length ? v : null;
	} catch {
		return null;
	}
}

const ZERO_LENGTH_UNITS = new Set(["", "px", "em", "rem"]);
// "numeric" | "zero" | null: why two value strings denote the same thing.
export function valuesEqual(a, b) {
	if (collapse(a) === collapse(b)) return "equal";
	const x = evalLength(a);
	const y = evalLength(b);
	if (!x || !y) return null;
	if (x.unit === y.unit && Math.abs(x.value - y.value) <= 1e-6) return "numeric";
	if (x.value === 0 && y.value === 0 && ZERO_LENGTH_UNITS.has(x.unit) && ZERO_LENGTH_UNITS.has(y.unit) && (x.unit === "" || y.unit === "")) return "zero";
	return null;
}

// ---------- rule normalization ----------

const isDecl = (line) => /^\s*[\w-]+\s*:[^{}]*;\s*$/.test(line) && !/^\s*@/.test(line);
const splitDecl = (line) => {
	const m = /^(\s*)([\w-]+)\s*:\s*(.*?);\s*$/.exec(line);
	return m ? { indent: m[1], prop: m[2], value: m[3] } : null;
};

function collapseDuplicates(text) {
	const lines = text.split("\n");
	const out = [];
	let collapsed = 0;
	for (const line of lines) {
		const prev = out.at(-1);
		if (prev !== undefined && isDecl(line) && isDecl(prev)) {
			const a = splitDecl(prev);
			const b = splitDecl(line);
			if (a && b && a.prop === b.prop && collapse(a.value) === collapse(b.value)) {
				collapsed++;
				continue;
			}
		}
		out.push(line);
	}
	return { text: out.join("\n"), collapsed };
}

export function resolvedEqual(a, b, defsA, defsB) {
	const usedA = new Set();
	const usedB = new Set();
	const sa = collapseDuplicates(substitute(a, defsA, usedA));
	const sb = collapseDuplicates(substitute(b, defsB, usedB));
	const rules = new Set();
	if (sa.collapsed || sb.collapsed) rules.add("collapse");
	const detail = () => ({ substitutedA: [...usedA].sort(), substitutedB: [...usedB].sort(), rules: [...rules].sort() });
	if (sa.text === sb.text) return { ok: true, ...detail() };
	const la = sa.text.split("\n");
	const lb = sb.text.split("\n");
	if (la.length !== lb.length) return { ok: false, ...detail() };
	for (let i = 0; i < la.length; i++) {
		if (la[i] === lb[i]) continue;
		const da = isDecl(la[i]) ? splitDecl(la[i]) : null;
		const db = isDecl(lb[i]) ? splitDecl(lb[i]) : null;
		if (!da || !db || da.prop !== db.prop || da.indent !== db.indent) return { ok: false, ...detail() };
		const why = valuesEqual(da.value, db.value);
		if (!why) return { ok: false, ...detail() };
		if (why !== "equal") rules.add(why);
	}
	return { ok: true, ...detail() };
}

// Declaration body: every rule selector line replaced by its brace, at-rule lines kept.
export const bodyOf = (ruleText) =>
	normSpacing(ruleText)
		.split("\n")
		.map((l) => (/\{\s*$/.test(l) && !/^\s*@/.test(l) ? l.replace(/^(\s*).*\{\s*$/, "$1{") : l))
		.join("\n");

// ---------- classification ----------

export function classifyHunks({ a, b, defsA, defsB, pairs = [], scopeDropped = [], wasInSource = () => false, isInSource = () => false }) {
	const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort((x, y) => (x < y ? -1 : 1));
	const dropped = new Set(scopeDropped);
	const counts = { "spacing-equivalent": 0, "resolved-equal": 0, scope: 0, "rewrite-pair": 0, "source-removed": 0, "source-added": 0, unproven: 0 };
	const hunks = [];
	const put = (candidate, kind, detail = {}) => {
		counts[kind]++;
		hunks.push({ candidate, kind, detail });
	};
	const pairOf = (c) => pairs.find((p) => (p.from === c || p.to === c) && Object.hasOwn(a, p.from) && Object.hasOwn(b, p.to));
	for (const c of keys) {
		const x = Object.hasOwn(a, c) ? a[c] : undefined;
		const y = Object.hasOwn(b, c) ? b[c] : undefined;
		if (x !== undefined && y !== undefined && x === y) continue;
		const both = x !== undefined && y !== undefined;
		if (both && normSpacing(x) === normSpacing(y)) {
			put(c, "spacing-equivalent");
			continue;
		}
		if (both) {
			const r = resolvedEqual(x, y, defsA, defsB);
			if (r.ok) {
				put(c, "resolved-equal", { substitutedA: r.substitutedA, substitutedB: r.substitutedB, rules: r.rules });
				continue;
			}
		}
		if (y === undefined && dropped.has(c)) {
			put(c, "scope");
			continue;
		}
		const p = pairOf(c);
		if (p && bodyOf(a[p.from]) === bodyOf(b[p.to])) {
			put(c, "rewrite-pair", { from: p.from, to: p.to });
			continue;
		}
		if (y === undefined) {
			const f = wasInSource(c);
			if (f) {
				put(c, "source-removed", { file: f });
				continue;
			}
		}
		if (x === undefined) {
			const f = isInSource(c);
			if (f) {
				put(c, "source-added", { file: f });
				continue;
			}
		}
		put(c, "unproven", { a: x ?? null, b: y ?? null });
	}
	const pairsChecked = pairs.filter((p) => Object.hasOwn(a, p.from) && Object.hasOwn(b, p.to) && bodyOf(a[p.from]) === bodyOf(b[p.to])).length;
	return { counts, hunks, unproven: hunks.filter((h) => h.kind === "unproven"), pairsChecked };
}

// ---------- theme-value identity ----------

export function themeIdentity(defsA, defsB) {
	const changes = [];
	for (const [name, va] of defsA) {
		if (name.startsWith("--color-") || !defsB.has(name)) continue;
		const vb = defsB.get(name);
		if (collapse(va) === collapse(vb)) continue;
		if (collapse(normSpacing(va)) === collapse(normSpacing(vb))) continue;
		if (valuesEqual(va, vb)) continue;
		changes.push({ name, a: va, b: vb });
	}
	return changes.sort((x, y) => (x.name < y.name ? -1 : 1));
}

export function spacingScale(defsA) {
	const mismatches = [];
	for (const [name, v] of defsA) {
		const m = /^--spacing-(\d+(?:_\d+)?|px)$/.exec(name);
		if (!m) continue;
		const expected = m[1] === "px" ? { value: 1, unit: "px" } : { value: Number(m[1].replace("_", ".")) * 0.25, unit: "rem" };
		const got = evalLength(v);
		const ok = got && ((got.unit === expected.unit && Math.abs(got.value - expected.value) <= 1e-6) || (got.value === 0 && expected.value === 0 && ZERO_LENGTH_UNITS.has(got.unit)));
		if (!ok) mismatches.push({ name, value: v, expected: `${expected.value}${expected.unit}` });
	}
	return mismatches;
}

// ---------- D-18 scope delta ----------

async function scopeDelta() {
	const { __unstable__loadDesignSystem, compile } = await import(require.resolve("@tailwindcss/node"));
	const { Scanner } = require("@tailwindcss/oxide");
	const cssPath = path.join(ROOT, "src/app/globals.css");
	const base = path.dirname(cssPath);
	const css = fs.readFileSync(cssPath, "utf8");
	const lines = css.split("\n");
	const hits = lines.flatMap((l, i) => (l.trim() === '@import "tailwindcss" source("..");' ? [i] : []));
	if (hits.length !== 1) throw new Error(`expected exactly one @import "tailwindcss" source(".."); line, found ${hits.length}`);
	lines.splice(hits[0], 1, '@import "tailwindcss";', '@source not "../../.planning/**/*";', '@source not "../../README.md";');
	const variant = lines.join("\n");
	// audit.mjs's scan construction (auto root = cwd when root is null).
	const scan = async (text) => {
		const compiler = await compile(text, { base, from: cssPath, onDependency() {} });
		const sources = (
			compiler.root === "none"
				? []
				: compiler.root === null
					? [{ base: ROOT, pattern: "**/*", negated: false }]
					: [{ ...compiler.root, negated: false }]
		).concat(compiler.sources);
		return new Scanner({ sources }).scan();
	};
	const ds = await __unstable__loadDesignSystem(css, { base });
	const validSet = (cands) => {
		const out = ds.candidatesToCss(cands);
		return new Set(cands.filter((_, i) => out[i] !== null));
	};
	const set1 = validSet(await scan(css));
	const set2 = validSet(await scan(variant));
	return { scopeDropped: [...set2].filter((c) => !set1.has(c)).sort(), scopeAdded: [...set1].filter((c) => !set2.has(c)).sort() };
}

// ---------- git attribution ----------

function gitAttribution(sha) {
	const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "pipe"] });
	// Non-test files first, so an attribution names the file that renders the class when one exists.
	const isTest = (f) => /\.test\.[cm]?[jt]sx?$/.test(f) || f.split("/").includes("__tests__");
	const files = git(["diff", "--name-only", `${sha}..HEAD`, "--", "src"])
		.split("\n")
		.filter(Boolean)
		.sort((x, y) => Number(isTest(x)) - Number(isTest(y)) || (x < y ? -1 : 1));
	const before = new Map();
	const after = new Map();
	for (const f of files) {
		try {
			before.set(f, git(["show", `${sha}:${f}`]));
		} catch {
			// Added after <sha>: no earlier content.
		}
		const abs = path.join(ROOT, f);
		if (fs.existsSync(abs)) after.set(f, fs.readFileSync(abs, "utf8"));
	}
	const find = (m) => (c) => [...m].find(([, t]) => t.includes(c))?.[0] ?? false;
	return { files, wasInSource: find(before), isInSource: find(after) };
}

// css-parity's --intended reads "/…/flags" as a regex; an exact candidate of that shape is anchored.
const intendedEntry = (c) => (/^\/(.*)\/([a-z]*)$/s.test(c) ? `/^${c.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}$/` : c);

// ---------- --self-test ----------

function selfTest() {
	let passed = 0;
	const check = (name, ok, detail) => {
		if (!ok) {
			console.error(`hunk-proof self-test FAILED: ${name}${detail ? ` (${detail})` : ""}`);
			process.exit(1);
		}
		passed++;
	};
	const defs = (text) => definitionsOf(text).defs;
	const kindOf = (r, c) => r.hunks.find((h) => h.candidate === c)?.kind;

	// (a) max-width through two theme names with one value.
	const aRule = { "max-w-2xl": ".max-w-2xl {\n  max-width: var(--max-width-2xl);\n}\n" };
	const bRule = { "max-w-2xl": ".max-w-2xl {\n  max-width: var(--container-2xl);\n}\n" };
	const ra = classifyHunks({ a: aRule, b: bRule, defsA: defs(":root, :host {\n  --max-width-2xl: 42rem;\n}\n"), defsB: defs(":root, :host {\n  --container-2xl: 42rem;\n}\n") });
	check("(a) resolved-equal", kindOf(ra, "max-w-2xl") === "resolved-equal" && ra.unproven.length === 0, JSON.stringify(ra.counts));
	// (b) the same with a different value stays unproven.
	const rb = classifyHunks({ a: aRule, b: bRule, defsA: defs(":root, :host {\n  --max-width-2xl: 42rem;\n}\n"), defsB: defs(":root, :host {\n  --container-2xl: 40rem;\n}\n") });
	check("(b) unproven", kindOf(rb, "max-w-2xl") === "unproven" && rb.unproven.length === 1, JSON.stringify(rb.counts));
	// (c) a rewrite pair whose bodies are equal after normSpacing.
	const rc = classifyHunks({
		a: { "mt-[var(--spacing-1)]": ".mt-\\[var\\(--spacing-1\\)\\] {\n  margin-top: var(--spacing-1);\n}\n" },
		b: { "mt-1": ".mt-1 {\n  margin-top: calc(var(--spacing) * 1);\n}\n" },
		defsA: new Map(),
		defsB: new Map(),
		pairs: [{ from: "mt-[var(--spacing-1)]", to: "mt-1" }],
	});
	check("(c) rewrite-pair", kindOf(rc, "mt-[var(--spacing-1)]") === "rewrite-pair" && kindOf(rc, "mt-1") === "rewrite-pair" && rc.pairsChecked === 1, JSON.stringify(rc.counts));
	// (d) spacing scale identity.
	check("(d) --spacing-4: 1rem passes", spacingScale(new Map([["--spacing-4", "1rem"], ["--spacing-px", "1px"], ["--spacing-1_5", "0.375rem"], ["--spacing-0", "0rem"]])).length === 0);
	const sd = spacingScale(new Map([["--spacing-4", "1.1rem"]]));
	check("(d) --spacing-4: 1.1rem flagged", sd.length === 1 && sd[0].name === "--spacing-4", JSON.stringify(sd));
	// (e) numeric equality of a calc() and its value.
	check("(e) calc(1 / 0.75) = 1.3333333333", valuesEqual("calc(1 / 0.75)", "1.3333333333") === "numeric");
	check("(e) 0.5rem vs 0.6rem differ", valuesEqual("0.5rem", "0.6rem") === null);
	// (f) duplicate-declaration collapse.
	const wf = classifyHunks({
		a: { "w-full": ".w-full {\n  width: 100%;\n  width: var(--width-full);\n}\n" },
		b: { "w-full": ".w-full {\n  width: 100%;\n}\n" },
		defsA: defs(":root, :host {\n  --width-full: 100%;\n}\n"),
		defsB: new Map(),
	});
	const wfh = wf.hunks.find((h) => h.candidate === "w-full");
	check("(f) collapse -> resolved-equal", wfh?.kind === "resolved-equal" && wfh.detail.rules.includes("collapse") && wfh.detail.substitutedA.includes("--width-full"), JSON.stringify(wfh));
	// (g) collapse never merges two different values.
	const wg = classifyHunks({
		a: { "w-full": ".w-full {\n  width: 100%;\n  width: var(--w);\n}\n" },
		b: { "w-full": ".w-full {\n  width: 100%;\n}\n" },
		defsA: defs(":root, :host {\n  --w: 50%;\n}\n"),
		defsB: new Map(),
	});
	check("(g) different values stay unproven", kindOf(wg, "w-full") === "unproven", JSON.stringify(wg.counts));
	// (h) theme identity: unitless zero vs 0em, and a real change.
	check("(h) --tracking-normal 0 = 0em", themeIdentity(new Map([["--tracking-normal", "0"]]), new Map([["--tracking-normal", "0em"]])).length === 0);
	const th = themeIdentity(new Map([["--tracking-normal", "0"]]), new Map([["--tracking-normal", "0.025em"]]));
	check("(h) 0 vs 0.025em is a change", th.length === 1 && th[0].name === "--tracking-normal", JSON.stringify(th));
	check("(h) 0% is not a zero length", valuesEqual("0", "0%") === null);
	// Attribution and scope kinds, through injected lookups.
	const rs = classifyHunks({
		a: { invert: ".invert {\n  --tw-invert: invert(100%);\n}\n", gone: ".gone {\n  display: none;\n}\n", stray: ".stray {\n  display: none;\n}\n" },
		b: { fresh: ".fresh {\n  display: block;\n}\n" },
		defsA: new Map(),
		defsB: new Map(),
		scopeDropped: ["invert"],
		wasInSource: (c) => (c === "gone" ? "src/x.tsx" : false),
		isInSource: (c) => (c === "fresh" ? "src/y.tsx" : false),
	});
	check("scope / source-removed / source-added / unproven", kindOf(rs, "invert") === "scope" && kindOf(rs, "gone") === "source-removed" && kindOf(rs, "fresh") === "source-added" && kindOf(rs, "stray") === "unproven", JSON.stringify(rs.counts));
	// var() fallback and nesting.
	check("substitute var(--x, fallback)", substitute("a: var(--x, var(--y));", new Map([["--x", "1px"]])) === "a: 1px;");
	console.log(`hunk-proof self-test: ${passed} passed`);
}

// ---------- CLI ----------

const usage = () => {
	console.error("usage: hunk-proof.mjs --a <cc A> --a-css <compiled A> --b <cc B> --b-css <compiled B> --changed-since <sha> [--pairs <file>] [--scope-delta] --json <out> [--intended-out <file>] | --self-test");
	process.exit(2);
};

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href;
if (isMain) {
	const argv = process.argv.slice(2);
	if (argv[0] === "--self-test") {
		if (argv.length !== 1) usage();
		selfTest();
	} else {
		const opt = {};
		for (let i = 0; i < argv.length; i++) {
			const k = argv[i];
			if (k === "--scope-delta") opt.scopeDelta = true;
			else if (["--a", "--a-css", "--b", "--b-css", "--changed-since", "--pairs", "--json", "--intended-out"].includes(k)) opt[k.slice(2)] = argv[++i] ?? usage();
			else usage();
		}
		if (!opt.a || !opt["a-css"] || !opt.b || !opt["b-css"] || !opt["changed-since"] || !opt.json) usage();
		const readJson = (f) => JSON.parse(fs.readFileSync(path.resolve(f), "utf8"));
		const a = readJson(opt.a);
		const b = readJson(opt.b);
		const A = definitionsOf(fs.readFileSync(path.resolve(opt["a-css"]), "utf8"));
		const B = definitionsOf(fs.readFileSync(path.resolve(opt["b-css"]), "utf8"));
		const pairs = opt.pairs ? readJson(opt.pairs) : [];
		const scope = opt.scopeDelta ? await scopeDelta() : { scopeDropped: [], scopeAdded: [] };
		const sha = execFileSync("git", ["rev-parse", opt["changed-since"]], { cwd: ROOT, encoding: "utf8" }).trim();
		const attr = gitAttribution(sha);
		const r = classifyHunks({ a, b, defsA: A.defs, defsB: B.defs, pairs, scopeDropped: scope.scopeDropped, wasInSource: attr.wasInSource, isInSource: attr.isInSource });
		const report = {
			sha,
			changedFiles: attr.files,
			ambiguousDefinitions: { a: A.ambiguous, b: B.ambiguous },
			scopeDropped: scope.scopeDropped,
			scopeAdded: scope.scopeAdded,
			pairsChecked: r.pairsChecked,
			counts: r.counts,
			hunks: r.hunks,
			unproven: r.unproven,
			themeValueChanges: themeIdentity(A.defs, B.defs),
			spacingScaleMismatches: spacingScale(A.defs),
		};
		const write = (f, data) => {
			const p = path.resolve(path.isAbsolute(f) ? f : path.join(OUT, f));
			fs.mkdirSync(path.dirname(p), { recursive: true });
			fs.writeFileSync(p, JSON.stringify(data, null, 1));
			return p;
		};
		console.error(`report: ${write(opt.json, report)}`);
		if (opt["intended-out"]) {
			const of = (kind) => r.hunks.filter((h) => h.kind === kind).map((h) => intendedEntry(h.candidate));
			const intended = {
				"w2-resolved-equal": of("resolved-equal"),
				"w2-rewrite-pair": of("rewrite-pair"),
				"w2-scope": of("scope"),
				"w2-source-removed": of("source-removed"),
				"w2-source-added": of("source-added"),
			};
			console.error(`intended: ${write(opt["intended-out"], intended)}`);
		}
		console.log(JSON.stringify({ counts: report.counts, scopeDropped: report.scopeDropped, scopeAdded: report.scopeAdded, pairsChecked: report.pairsChecked, unproven: report.unproven.length, themeValueChanges: report.themeValueChanges.length, spacingScaleMismatches: report.spacingScaleMismatches.length }));
		process.exit(report.unproven.length || report.themeValueChanges.length || report.spacingScaleMismatches.length ? 1 : 0);
	}
}
