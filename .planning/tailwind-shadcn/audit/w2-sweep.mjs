// Wave 2 (66.2-13) sweep tool for the Tailwind v4 / shadcn remediation: the X3 default-duplicate
// census, the removed-selector attribution check and the rewrite-equality proof of every intended
// css-parity hunk. Read-only against the repo: writes only to $TW_AUDIT_OUT (default:
// <tmpdir>/tenantflow-tw-audit) and prints JSON.
//
// Usage (from the repo root):
//   node .planning/tailwind-shadcn/audit/w2-sweep.mjs census
//   node .planning/tailwind-shadcn/audit/w2-sweep.mjs selectors <pre.css> <post.css> <dead.json...>
//   node .planning/tailwind-shadcn/audit/w2-sweep.mjs intended-check <pre.json> <post.json> <intended.json>
//
// census          Compares every custom property declared in an @theme block or a :root rule of
//                 src/app/globals.css with node_modules/tailwindcss/theme.css. A name the default
//                 theme also declares is `identical` when both values match after whitespace
//                 collapse and the oklch `N%` lightness rewrite (N/100), else `differsString`;
//                 a `differsString` entry is `valueEqual` when both values denote the same thing
//                 (two zero lengths, or two colors that round to the same 8-bit sRGB channels).
//                 Also lists `notInDefault` and the X3 `staticRoutes` (names Tailwind serves as
//                 static utilities, not as theme variables). Writes w2-census.json.
// selectors       Every class in a rule selector (outside @keyframes) of <pre.css> that is absent
//                 from <post.css> must be a deadClass[].cls or deadUtil[].name in one of the given
//                 audit.mjs dead.json files. Prints { removed, unattributed }; exit 1 on any
//                 unattributed class.
// intended-check  For every candidate matching one of the four x3-* labels, applies that label's
//                 substitution to the <pre.json> rule and requires it to equal the <post.json>
//                 rule (both compared after css-parity.mjs's normSpacing and whitespace collapse).
//                 Labels owned by other plans are `skipped`; a labelled candidate on one side only
//                 is `oneSided`, except the LoadingSpinner pair of x3-ease-linear-literal, whose
//                 declaration bodies are compared. Prints { checked, skipped, oneSided,
//                 mismatches }; exit 1 on any mismatch.
// Exit 2 on a usage error.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = process.cwd();
const require = createRequire(path.join(ROOT, "package.json"));
const postcss = require("postcss");

const OUT = process.env.TW_AUDIT_OUT ?? path.join(os.tmpdir(), "tenantflow-tw-audit");
const GLOBALS = path.join(ROOT, "src/app/globals.css");
const DEFAULT_THEME = path.join(ROOT, "node_modules/tailwindcss/theme.css");

const usage = () => {
	console.error("usage: w2-sweep.mjs census | selectors <pre.css> <post.css> <dead.json...> | intended-check <pre.json> <post.json> <intended.json>");
	process.exit(2);
};

const readJson = (f) => JSON.parse(fs.readFileSync(path.resolve(f), "utf8"));

// ---------- census ----------

const collapse = (v) => v.replace(/\s+/g, " ").trim();
const normValue = (v) => collapse(v).replace(/oklch\(\s*([0-9.]+)%/g, (_, n) => `oklch(${Number((Number(n) / 100).toFixed(6))}`);

const ZERO_LENGTH = /^0(?:\.0+)?(?:px|em|rem|%)?$/;

// OKLab -> linear sRGB -> gamma-encoded 8-bit channels (Björn Ottosson's matrices).
function oklchToChannels(L, C, H) {
	const h = (H * Math.PI) / 180;
	const a = C * Math.cos(h);
	const b = C * Math.sin(h);
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	const lin = [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
	];
	return lin.map((x) => {
		const g = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.max(x, 0) ** (1 / 2.4) - 0.055;
		return Math.round(Math.min(1, Math.max(0, g)) * 255);
	});
}

function channelsOf(value) {
	const v = normValue(value);
	const ok = /^oklch\(([0-9.]+) ([0-9.]+) ([0-9.]+)\)$/.exec(v);
	if (ok) return oklchToChannels(Number(ok[1]), Number(ok[2]), Number(ok[3]));
	const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
	if (hex) {
		const digits = hex[1].length === 3 ? [...hex[1]].map((d) => d + d) : hex[1].match(/../g);
		return digits.map((d) => Number.parseInt(d, 16));
	}
	return null;
}

function valueEqual(a, b) {
	if (ZERO_LENGTH.test(collapse(a)) && ZERO_LENGTH.test(collapse(b))) return true;
	const ca = channelsOf(a);
	const cb = channelsOf(b);
	return ca !== null && cb !== null && ca.every((c, i) => c === cb[i]);
}

function census() {
	const defaults = new Map();
	postcss.parse(fs.readFileSync(DEFAULT_THEME, "utf8")).walkAtRules("theme", (at) => {
		at.walkDecls((d) => {
			if (d.prop.startsWith("--") && !defaults.has(d.prop)) defaults.set(d.prop, d.value);
		});
	});
	const contextOf = (d) => {
		const parts = [];
		for (let p = d.parent; p && p.type !== "root"; p = p.parent) parts.unshift(p.type === "atrule" ? `@${p.name}${p.params ? ` ${p.params}` : ""}` : p.selector);
		return parts.join(" > ");
	};
	const inTheme = (d) => {
		for (let p = d.parent; p && p.type !== "root"; p = p.parent) if (p.type === "atrule" && p.name === "theme") return true;
		return false;
	};
	const project = [];
	postcss.parse(fs.readFileSync(GLOBALS, "utf8")).walkDecls((d) => {
		if (!d.prop.startsWith("--")) return;
		if (inTheme(d) || (d.parent.type === "rule" && d.parent.selector.trim() === ":root")) project.push({ name: d.prop, context: contextOf(d), project: collapse(d.value), line: d.source?.start?.line });
	});
	const identical = [];
	const differsString = [];
	const notInDefault = [];
	for (const p of project) {
		if (!defaults.has(p.name)) {
			notInDefault.push({ name: p.name, context: p.context, line: p.line });
			continue;
		}
		const def = collapse(defaults.get(p.name));
		const entry = { name: p.name, context: p.context, line: p.line, project: p.project, default: def };
		if (normValue(p.project) === normValue(def)) identical.push(entry);
		else {
			const ca = channelsOf(p.project);
			const cb = channelsOf(def);
			differsString.push({
				...entry,
				valueEqual: valueEqual(p.project, def),
				...(ca && cb ? { channels: { project: ca, default: cb } } : {}),
			});
		}
	}
	const STATIC_ROUTES = ["--leading-none", "--ease-linear", "--width-full", "--max-width-2xl", "--max-width-3xl"];
	const staticRoutes = STATIC_ROUTES.map((name) => {
		const p = project.find((x) => x.name === name);
		return { name, project: p?.project ?? null, line: p?.line ?? null, inDefaultTheme: defaults.has(name) };
	});
	const result = {
		globals: path.relative(ROOT, GLOBALS),
		defaultTheme: path.relative(ROOT, DEFAULT_THEME),
		counts: { project: project.length, identical: identical.length, differsString: differsString.length, valueEqual: differsString.filter((d) => d.valueEqual).length, notInDefault: notInDefault.length },
		identical,
		valueEqual: differsString.filter((d) => d.valueEqual).map((d) => d.name),
		differsString,
		staticRoutes,
		notInDefault,
	};
	fs.mkdirSync(OUT, { recursive: true });
	fs.writeFileSync(path.join(OUT, "w2-census.json"), JSON.stringify(result, null, 1));
	console.log(JSON.stringify({ counts: result.counts, identical: identical.map((d) => d.name), valueEqual: result.valueEqual, staticRoutes: STATIC_ROUTES }, null, 1));
}

// ---------- selectors ----------

const CLASS_TOKEN = /\.((?:\\[0-9a-fA-F]{1,6}\s?|\\[^0-9a-fA-F\s]|[A-Za-z0-9_-])+)/g;
const unescapeCss = (s) => s.replace(/\\([0-9a-fA-F]{1,6})\s?|\\(.)/g, (_, hex, ch) => (hex ? String.fromCodePoint(Number.parseInt(hex, 16)) : ch));

function classesOf(file) {
	const set = new Set();
	postcss.parse(fs.readFileSync(path.resolve(file), "utf8")).walkRules((r) => {
		for (let p = r.parent; p && p.type !== "root"; p = p.parent) if (p.type === "atrule" && /keyframes$/.test(p.name)) return;
		for (const m of r.selector.matchAll(CLASS_TOKEN)) set.add(unescapeCss(m[1]));
	});
	return set;
}

function selectors(preCss, postCss, deadFiles) {
	const pre = classesOf(preCss);
	const post = classesOf(postCss);
	const dead = new Set();
	for (const f of deadFiles) {
		const d = readJson(f);
		for (const c of d.deadClass ?? []) dead.add(c.cls);
		for (const u of d.deadUtil ?? []) dead.add(u.name);
	}
	const removed = [...pre].filter((c) => !post.has(c)).sort();
	const unattributed = removed.filter((c) => !dead.has(c));
	console.log(JSON.stringify({ pre: pre.size, post: post.size, removed, unattributed }, null, 1));
	process.exit(unattributed.length === 0 ? 0 : 1);
}

// ---------- intended-check ----------

// Kept equal to css-parity.mjs normSpacing (importing that file would run its CLI).
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

const norm = (t) => collapse(normSpacing(t));

const SUBSTITUTIONS = {
	"x3-width-full-single-declaration": (t) => t.replace(/^[ \t]*width: var\(--width-full\);\n/gm, ""),
	"x3-max-width-to-container": (t) => t.replace(/var\(--max-width-(2xl|3xl)\)/g, "var(--container-$1)"),
	"x3-leading-none-literal": (t) => t.replaceAll("var(--leading-none)", "1"),
	"x3-ease-linear-literal": (t) => t.replaceAll("var(--ease-linear)", "linear"),
};
const SPINNER_PAIR = ["[animation-timing-function:var(--ease-linear)]", "[animation-timing-function:linear]"];

// Same matcher semantics and label order as css-parity.mjs classify().
const toMatcher = (entry) => {
	const m = /^\/(.*)\/([a-z]*)$/s.exec(entry);
	if (m) {
		const re = new RegExp(m[1], m[2]);
		return (c) => re.test(c);
	}
	return (c) => c === entry;
};

const declarationBody = (t) => {
	const open = t.indexOf("{");
	const close = t.lastIndexOf("}");
	return open < 0 || close < open ? t : t.slice(open + 1, close);
};

function intendedCheck(preFile, postFile, intendedFile) {
	const pre = readJson(preFile);
	const post = readJson(postFile);
	const intended = readJson(intendedFile);
	const matchers = Object.entries(intended).map(([label, entries]) => [label, entries.map(toMatcher)]);
	const labelOf = (c) => matchers.find(([, ms]) => ms.some((m) => m(c)))?.[0] ?? null;
	const checked = Object.fromEntries(Object.keys(SUBSTITUTIONS).map((l) => [l, []]));
	const unchanged = Object.fromEntries(Object.keys(SUBSTITUTIONS).map((l) => [l, 0]));
	const skipped = Object.keys(intended).filter((l) => !Object.hasOwn(SUBSTITUTIONS, l));
	const oneSided = [];
	const mismatches = [];
	const keys = [...new Set([...Object.keys(pre), ...Object.keys(post)])].sort();
	for (const c of keys) {
		const label = labelOf(c);
		if (label === null || !Object.hasOwn(SUBSTITUTIONS, label)) continue;
		if (SPINNER_PAIR.includes(c)) continue;
		const a = Object.hasOwn(pre, c) ? pre[c] : undefined;
		const b = Object.hasOwn(post, c) ? post[c] : undefined;
		if (a === undefined || b === undefined) {
			oneSided.push({ candidate: c, label, side: a === undefined ? "post" : "pre" });
			continue;
		}
		if (a === b) {
			unchanged[label]++;
			continue;
		}
		const expected = norm(SUBSTITUTIONS[label](a));
		const actual = norm(b);
		checked[label].push(c);
		if (expected !== actual) mismatches.push({ candidate: c, label, expected, actual });
	}
	// The LoadingSpinner pair: the rewrite renames the candidate, so only the bodies compare.
	const [varForm, literalForm] = SPINNER_PAIR;
	const pairLabel = labelOf(varForm);
	if (pairLabel === "x3-ease-linear-literal") {
		const pairName = `${varForm} -> ${literalForm}`;
		const state = { preVar: Object.hasOwn(pre, varForm), preLiteral: Object.hasOwn(pre, literalForm), postVar: Object.hasOwn(post, varForm), postLiteral: Object.hasOwn(post, literalForm) };
		if (state.preVar && state.postLiteral && !state.postVar && !state.preLiteral) {
			const expected = norm(SUBSTITUTIONS[pairLabel](declarationBody(pre[varForm])));
			const actual = norm(declarationBody(post[literalForm]));
			checked[pairLabel].push(pairName);
			if (expected !== actual) mismatches.push({ candidate: pairName, label: pairLabel, expected, actual });
		} else if (state.preVar === state.postVar && state.preLiteral === state.postLiteral) {
			// The rename is outside this window: each form present must be unchanged.
			for (const form of SPINNER_PAIR) {
				if (Object.hasOwn(pre, form) && pre[form] !== post[form]) mismatches.push({ candidate: form, label: pairLabel, expected: pre[form], actual: post[form] });
			}
		} else {
			mismatches.push({ candidate: pairName, label: pairLabel, expected: "the var form on the pre side only and the literal form on the post side only", actual: state });
		}
	}
	const result = {
		checked: Object.fromEntries(Object.entries(checked).map(([l, list]) => [l, list.length])),
		checkedCandidates: checked,
		unchanged,
		skipped,
		oneSided,
		mismatches,
	};
	console.log(JSON.stringify(result, null, 1));
	process.exit(mismatches.length === 0 ? 0 : 1);
}

// ---------- CLI ----------

const [mode, ...args] = process.argv.slice(2);
if (mode === "census") {
	if (args.length !== 0) usage();
	census();
} else if (mode === "selectors") {
	if (args.length < 3) usage();
	const [preCss, postCss, ...deadFiles] = args;
	selectors(preCss, postCss, deadFiles);
} else if (mode === "intended-check") {
	if (args.length !== 3) usage();
	intendedCheck(...args);
} else usage();
