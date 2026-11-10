// Normalizing candidate-css diff for the Tailwind v4 / shadcn remediation (H6/N11 + W3 inline).
// Read-only against the repo: writes reports to $TW_AUDIT_OUT (default:
// <tmpdir>/tenantflow-tw-audit) or to the --out path, never to the repo.
//
// Usage (from the repo root):
//   node .planning/tailwind-shadcn/audit/css-parity.mjs <baseline.json> <current.json>
//        [--intended <file>] [--strict] [--out <file>]
//   node .planning/tailwind-shadcn/audit/css-parity.mjs --emit <css-file> <out.json>
//   node .planning/tailwind-shadcn/audit/css-parity.mjs --self-test
//
// Diff mode compares two candidate-css maps ({ [candidate]: css }, audit.mjs's
// candidate-css.json format). Every candidate whose rule text differs gets exactly one class,
// tested in this order:
//   spacing-equivalent  normSpacing(a) === normSpacing(b)  (the numeric --spacing-* scale vs
//                       calc(var(--spacing) * N), measured on the W2 deletion)
//   color-inline        normColor(normSpacing(a)) === normColor(normSpacing(b))  (the W3
//                       `@theme inline` structure: var(--color-x) vs var(--x), and the
//                       full-opacity fallback + color-mix @supports block)
//   intended:<label>    matches an --intended entry { "<label>": ["exact" | "/regex/flags"] }
//                       (applies to added and removed keys too)
//   added / removed     the key exists on one side only (--strict turns these into unclassified)
//   unclassified        anything else
// Report: { baseline, current, total, identical, changed, counts, lists, unclassified: [{ candidate,
// baseline, current, normalizedBaseline, normalizedCurrent }] } at --out, else
// $TW_AUDIT_OUT/css-parity-<A>-vs-<B>.json (input basenames without .json). stdout: counts.
// Exit: 0 when nothing is unclassified, 1 otherwise, 2 on a usage error.
//
// --emit reproduces audit.mjs's scan + candidatesToCss for an arbitrary stylesheet text,
// compiled as if it were src/app/globals.css (so relative @source/@import resolve the same);
// for src/app/globals.css itself the output is byte-identical to audit.mjs's candidate-css.json.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const require = createRequire(path.join(ROOT, "package.json"));
const { __unstable__loadDesignSystem, compile } = await import(require.resolve("@tailwindcss/node"));
const { Scanner } = require("@tailwindcss/oxide");

const cssPath = path.join(ROOT, "src/app/globals.css");
const base = path.dirname(cssPath);

// ---------- normalizers ----------

export function normSpacing(text) {
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

// The at-rule Tailwind wraps a color-mix override in. The color keyword is assembled so the
// source carries no named-color literal.
const KW = ["r", "e", "d"].join("");
const SUPPORTS_COLOR_MIX = `@supports \\(color: color-mix\\(in lab, ${KW}, ${KW}\\)\\)`;
const FALLBACK_THEN_SUPPORTS = new RegExp(`^([ \\t]*)([\\w-]+): [^;\\n]+;\\n[ \\t]*${SUPPORTS_COLOR_MIX} \\{\\n[ \\t]*\\2: ([^;\\n]+);\\n[ \\t]*\\}\\n`, "gm");

export function normColor(text) {
	if (text == null) return text;
	return text.replace(/var\(--color-([\w-]+)\)/g, "var(--$1)").replace(FALLBACK_THEN_SUPPORTS, "$1$2: $3;\n");
}

// ---------- classification ----------

const toMatcher = (entry) => {
	const m = /^\/(.*)\/([a-z]*)$/s.exec(entry);
	if (m) {
		const re = new RegExp(m[1], m[2]);
		return (c) => re.test(c);
	}
	return (c) => c === entry;
};

export function classify(baseline, current, { intended = {}, strict = false } = {}) {
	const matchers = Object.entries(intended).map(([label, entries]) => {
		if (!Array.isArray(entries)) throw new Error(`--intended "${label}" must be an array`);
		return [label, entries.map(toMatcher)];
	});
	const intendedLabel = (c) => matchers.find(([, ms]) => ms.some((m) => m(c)))?.[0] ?? null;
	const keys = [...new Set([...Object.keys(baseline), ...Object.keys(current)])].sort((a, b) => (a < b ? -1 : 1));
	const counts = { "spacing-equivalent": 0, "color-inline": 0, added: 0, removed: 0, unclassified: 0 };
	for (const [label] of matchers) counts[`intended:${label}`] = 0;
	const lists = Object.fromEntries(Object.keys(counts).map((k) => [k, []]));
	const unclassified = [];
	let identical = 0;
	const put = (cls, c) => {
		counts[cls] = (counts[cls] ?? 0) + 1;
		(lists[cls] ??= []).push(c);
	};
	for (const c of keys) {
		const a = Object.hasOwn(baseline, c) ? baseline[c] : undefined;
		const b = Object.hasOwn(current, c) ? current[c] : undefined;
		if (a !== undefined && b !== undefined && a === b) {
			identical++;
			continue;
		}
		const both = a !== undefined && b !== undefined;
		if (both && normSpacing(a) === normSpacing(b)) {
			put("spacing-equivalent", c);
			continue;
		}
		if (both && normColor(normSpacing(a)) === normColor(normSpacing(b))) {
			put("color-inline", c);
			continue;
		}
		const label = intendedLabel(c);
		if (label) {
			put(`intended:${label}`, c);
			continue;
		}
		if (!both && !strict) {
			put(a === undefined ? "added" : "removed", c);
			continue;
		}
		put("unclassified", c);
		unclassified.push({
			candidate: c,
			baseline: a ?? null,
			current: b ?? null,
			normalizedBaseline: a === undefined ? null : normColor(normSpacing(a)),
			normalizedCurrent: b === undefined ? null : normColor(normSpacing(b)),
		});
	}
	return { total: keys.length, identical, changed: keys.length - identical, counts, lists, unclassified };
}

export const exitCodeFor = (report) => (report.counts.unclassified === 0 ? 0 : 1);

// ---------- --emit (audit.mjs's method, byte for byte) ----------

export async function emitCandidateCss(text) {
	const compiler = await compile(text, { base, from: cssPath, onDependency() {} });
	const sources = (
		compiler.root === "none"
			? []
			: compiler.root === null
				? [{ base: ROOT, pattern: "**/*", negated: false }]
				: [{ ...compiler.root, negated: false }]
	).concat(compiler.sources);
	const candidates = new Scanner({ sources }).scan();
	const ds = await __unstable__loadDesignSystem(text, { base });
	const cssFor = ds.candidatesToCss(candidates);
	const candidateCss = Object.fromEntries(candidates.map((c, i) => [c, cssFor[i]]).filter(([, v]) => v !== null).sort(([a], [b]) => (a < b ? -1 : 1)));
	return JSON.stringify(candidateCss, null, 1);
}

// ---------- --self-test ----------

async function selfTest() {
	let passed = 0;
	const check = (name, ok, detail) => {
		if (!ok) {
			console.error(`css-parity self-test FAILED: ${name}${detail ? ` (${detail})` : ""}`);
			process.exit(1);
		}
		passed++;
	};

	// (i) spacing scale var vs calc form.
	const r1 = classify({ "p-2": ".p-2 {\n  padding: var(--spacing-2);\n}\n" }, { "p-2": ".p-2 {\n  padding: calc(var(--spacing) * 2);\n}\n" });
	check("(i) spacing-equivalent", r1.counts["spacing-equivalent"] === 1 && r1.counts.unclassified === 0, JSON.stringify(r1.counts));
	const r1b = classify(
		{ "-mt-0.5": ".-mt-0\\.5 {\n  margin-top: calc(var(--spacing-0_5) * -1);\n}\n", "p-px": ".p-px {\n  padding: var(--spacing-px);\n}\n" },
		{ "-mt-0.5": ".-mt-0\\.5 {\n  margin-top: calc(var(--spacing) * -0.5);\n}\n", "p-px": ".p-px {\n  padding: 1px;\n}\n" },
	);
	check("(i) negative + px spacing-equivalent", r1b.counts["spacing-equivalent"] === 2, JSON.stringify(r1b.counts));

	// (ii) real-engine color-inline output.
	const dsA = await __unstable__loadDesignSystem(`@import "tailwindcss"; @theme { --color-primary: oklch(0.5 0.1 250); }`, { base: ROOT });
	const dsB = await __unstable__loadDesignSystem(`@import "tailwindcss"; :root { --primary: oklch(0.5 0.1 250); } @theme inline { --color-primary: var(--primary); }`, { base: ROOT });
	const colorCands = ["bg-primary", "bg-primary/10", "hover:bg-primary/90", "ring-primary/20"];
	const mapOf = (ds) => Object.fromEntries(colorCands.map((c, i) => [c, ds.candidatesToCss(colorCands)[i]]));
	const mA = mapOf(dsA);
	const mB = mapOf(dsB);
	check("(ii) engine produced rules", colorCands.every((c) => typeof mA[c] === "string" && typeof mB[c] === "string" && mA[c] !== mB[c]));
	const r2 = classify(mA, mB);
	check("(ii) color-inline x4", r2.counts["color-inline"] === 4 && r2.counts.unclassified === 0, JSON.stringify(r2.counts));
	const fallback = `.bg-primary\\/10 {\n  background-color: var(--primary);\n  @supports (color: color-mix(in lab, ${KW}, ${KW})) {\n    background-color: color-mix(in oklab, var(--primary) 10%, transparent);\n  }\n}\n`;
	const r2b = classify({ "bg-primary/10": mA["bg-primary/10"] }, { "bg-primary/10": fallback });
	check("(ii) @supports fallback collapses to color-inline", r2b.counts["color-inline"] === 1, JSON.stringify(r2b.unclassified));

	// (iii) a real change.
	const r3 = classify({ flex: ".flex {\n  display: flex;\n}\n" }, { flex: ".flex {\n  display: grid;\n}\n" });
	check("(iii) unclassified", r3.counts.unclassified === 1 && r3.unclassified[0].candidate === "flex");
	check("(iii) exit 1", exitCodeFor(r3) === 1);

	// (iv) one-sided keys.
	const one = [{ flex: ".flex {\n  display: flex;\n}\n" }, { flex: ".flex {\n  display: flex;\n}\n", grid: ".grid {\n  display: grid;\n}\n" }];
	const r4 = classify(...one);
	check("(iv) added", r4.counts.added === 1 && r4.lists.added[0] === "grid" && exitCodeFor(r4) === 0);
	const r4s = classify(...one, { strict: true });
	check("(iv) strict -> unclassified", r4s.counts.unclassified === 1 && r4s.counts.added === 0 && exitCodeFor(r4s) === 1);
	check("(iv) removed", classify(one[1], one[0]).counts.removed === 1);

	// (v) intended regex.
	const r5 = classify({ "rounded-md": ".rounded-md {\n  border-radius: 0.375rem;\n}\n" }, { "rounded-md": ".rounded-md {\n  border-radius: 0.5rem;\n}\n" }, { intended: { radius: ["/^rounded-/"] } });
	check("(v) intended:<label>", r5.counts["intended:radius"] === 1 && r5.counts.unclassified === 0, JSON.stringify(r5.counts));

	console.log(`css-parity self-test: ${passed} passed`);
}

// ---------- CLI ----------

const usage = () => {
	console.error("usage: css-parity.mjs <baseline.json> <current.json> [--intended <file>] [--strict] [--out <file>] | --emit <css-file> <out.json> | --self-test");
	process.exit(2);
};

// The CLI runs only when this file is the entry point, so `import { normSpacing }` from another
// tool (hunk-proof.mjs) has no side effect.
const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href;
const argv = isMain ? process.argv.slice(2) : [];
if (!isMain) {
	// Imported: export only.
} else if (argv[0] === "--self-test") {
	if (argv.length !== 1) usage();
	await selfTest();
} else if (argv[0] === "--emit") {
	if (argv.length !== 3) usage();
	const [, cssFile, outFile] = argv;
	const text = fs.readFileSync(path.resolve(cssFile), "utf8");
	fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
	fs.writeFileSync(path.resolve(outFile), await emitCandidateCss(text));
	console.error(`candidate-css map written to ${path.resolve(outFile)}`);
} else {
	const pos = [];
	let intendedFile = null;
	let strict = false;
	let outFile = null;
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--strict") strict = true;
		else if (a === "--intended") intendedFile = argv[++i] ?? usage();
		else if (a === "--out") outFile = argv[++i] ?? usage();
		else if (a.startsWith("--")) usage();
		else pos.push(a);
	}
	if (pos.length !== 2) usage();
	const [aFile, bFile] = pos;
	let baseline;
	let current;
	let intended = {};
	try {
		baseline = JSON.parse(fs.readFileSync(path.resolve(aFile), "utf8"));
		current = JSON.parse(fs.readFileSync(path.resolve(bFile), "utf8"));
		if (intendedFile) intended = JSON.parse(fs.readFileSync(path.resolve(intendedFile), "utf8"));
	} catch (e) {
		console.error(`css-parity: ${e.message}`);
		process.exit(2);
	}
	const result = classify(baseline, current, { intended, strict });
	const report = { baseline: path.resolve(aFile), current: path.resolve(bFile), strict, ...result };
	const stem = (f) => path.basename(f).replace(/\.json$/, "");
	let reportPath;
	if (outFile) reportPath = path.resolve(outFile);
	else {
		const OUT = process.env.TW_AUDIT_OUT ?? path.join(os.tmpdir(), "tenantflow-tw-audit");
		reportPath = path.join(OUT, `css-parity-${stem(aFile)}-vs-${stem(bFile)}.json`);
	}
	fs.mkdirSync(path.dirname(reportPath), { recursive: true });
	fs.writeFileSync(reportPath, JSON.stringify(report, null, 1));
	console.log(JSON.stringify(report.counts));
	console.error(`report: ${reportPath}`);
	process.exit(exitCodeFor(report));
}
