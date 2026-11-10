// Per-pair parity prover for canonicalizer rewrites (66.2-19, P12 / VD-13). For every
// { from, to } pair of a canonicalize rewrite it proves, independently of the codemod, that the
// old class and its canonical replacement style an element the same way. Read-only against the
// repo: writes only the report file.
//
// Usage (from the repo root):
//   node .planning/tailwind-shadcn/audit/pair-parity.mjs <pairs.json> --old-css <file>
//     --theme-css <compiled.css> [--old-candidates <file>] [--out <file>]
//
// <pairs.json> is a JSON array of { from, to, files } (the pairs-prew4.json shape). --old-css is
// the globals.css the old classes were written against; the new css is <ROOT>/src/app/globals.css.
// Both design systems load with base <ROOT>/src/app. --theme-css is a compiled stylesheet (theme
// variables, @property registrations and preflight) that every Chromium fixture page loads.
//
// Design systems. Rule text is read from two systems (old, new) that never run the canonicalizer:
// on tailwindcss 4.3 a canonicalizeCandidates call switches its system to the non-inline color
// form and compiled candidates are cached (66.2-18 deviation 1). A third system for the old css
// answers the canonical check, canonicalizeCandidates([from], { rem: 16 })[0] === to with no
// collapse option. Its answers depend on what the system compiled and canonicalized before
// (66.2-18 deviation 2), so it is primed the way audit.mjs and G8 evaluate a tree: one
// candidatesToCss over the --old-candidates list (newline-separated, e.g. the old tree's
// audit.mjs valid-candidates.txt; default: every pair class), then one canonicalize call per
// listed candidate in list order. A mismatch, or a class that compiles to no CSS, is `unproven`.
//
// Tier 1, `text-equal`. Both rules are normalized: the escaped class selector ("." plus the
// CSSOM CSS.escape of the candidate) becomes `.__c`, a single-argument `:is(<compound>)` whose
// argument has no combinator and no comma is unwrapped, and whitespace runs collapse to one space.
// Equal strings give `text-equal`; they render identically at every root size.
//
// Tier 2, `computed-equal`. Each remaining pair renders in headless Chromium on a page holding
// --theme-css plus the two rules inside `@layer utilities`, with their class selectors renamed to
// `.__a` (old) and `.__b` (new). Three identical fixtures sit in position:relative boxes: one
// with class __a, one with __b, and a control with neither. A fixture is a div.group wrapping a
// span.peer and the target div, whose two span children hold, in the first, an i grandchild.
// Every attribute selector of the normalized rule ([name], [name=value], [name="value"]) is set on
// every fixture element. :hover, :focus, :focus-visible, :active and :focus-within are forced on
// the group, the peer and the target through CDP (CSS.forcePseudoState).
//   Compared: the complete getComputedStyle list (every enumerated property, custom properties
//   included) of the target, both children, the grandchild, and the target's ::before and ::after,
//   plus the border-box geometry (getBoundingClientRect relative to the fixture box) of the
//   target, both children and the grandchild.
//   Custom-property token streams: a registered `syntax: "*"` property keeps its declared tokens
//   as its computed value, so `calc(50% * -1)` and `-50%` differ there even where every consumer
//   computes the same. A pair whose only differences are custom properties is still equal when
//   each such property is registered `inherits: false` in the pair's own rules (no descendant
//   sees it) and is consumed, through var(), by at least one standard property those rules
//   declare; every standard property and every geometry value must already be equal. Those
//   properties are listed in `detail.consumerResolved` with both token streams and consumers.
//   Contexts: viewport 1600x1000 and 360x800, each with and without class="dark" on <html>. Print
//   media is emulated when the rule holds `@media print`, reduced motion when it holds
//   `prefers-reduced-motion`.
//   Companions: a rule that only sets gradient variables has no visible effect alone, so the
//   fixture adds the utilities that consume them (COMPANIONS below) to all three targets,
//   control included. They are compiled by the new system.
//   A pair is `computed-equal` when __a and __b match in every context and the rule applied
//   (some compared property differs from the control) in at least one context. A rule that
//   applies nowhere is `unproven`: the fixture is what gets fixed, never the verdict.
//
// Tier 3, `rem-for-px`. Each computed-equal pair runs again in the same four contexts with
// `html { font-size: 20px }` added. A pair equal at the 16px root that differs at 20px is
// re-tagged `rem-for-px`: identical at the default root size, scaling with the user's root size.
//
// Output (--out, default $TW_AUDIT_OUT/pair-parity.json):
//   { total, counts: { "text-equal", "computed-equal", "rem-for-px", unproven },
//     pairs: [{ from, to, class, files, detail }] }
// The counts print on stdout. Exit 1 when unproven > 0, 2 on a usage error.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = process.cwd();
const require = createRequire(path.join(ROOT, "package.json"));
const OUT_DIR = process.env.TW_AUDIT_OUT ?? path.join(os.tmpdir(), "tenantflow-tw-audit");
const REM_PX = 16;
const ALT_ROOT_PX = 20;
const FORCED = [":hover", ":focus", ":focus-visible", ":active", ":focus-within"];
const CONTEXTS = [
	{ width: 1600, height: 1000, dark: false },
	{ width: 1600, height: 1000, dark: true },
	{ width: 360, height: 800, dark: false },
	{ width: 360, height: 800, dark: true },
];
// Utilities a rule needs before its declarations reach a standard property. Keyed by a pattern
// on the normalized rule text; `unless` skips the entry when the rule sets the consumer itself.
const COMPANIONS = [
	{ test: /--tw-gradient-/, classes: ["from-primary", "to-accent"] },
	{ test: /--tw-gradient-via/, unless: /background-image/, classes: ["bg-linear-to-r"] },
];

function usage(message) {
	process.stderr.write(`pair-parity: ${message}\n`);
	process.stderr.write(
		"usage: node pair-parity.mjs <pairs.json> --old-css <file> --theme-css <compiled.css>" +
			" [--old-candidates <file>] [--out <file>]\n",
	);
	process.exit(2);
}

function parseArgs(argv) {
	const args = { pairs: null, oldCss: null, themeCss: null, oldCandidates: null, out: null };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--old-css") args.oldCss = argv[++i];
		else if (a === "--old-candidates") args.oldCandidates = argv[++i];
		else if (a === "--theme-css") args.themeCss = argv[++i];
		else if (a === "--out") args.out = argv[++i];
		else if (a.startsWith("--")) usage(`unknown option ${a}`);
		else if (args.pairs === null) args.pairs = a;
		else usage(`unexpected argument ${a}`);
	}
	if (!args.pairs) usage("missing <pairs.json>");
	if (!args.oldCss) usage("missing --old-css");
	if (!args.themeCss) usage("missing --theme-css");
	for (const p of [args.pairs, args.oldCss, args.themeCss, args.oldCandidates].filter(Boolean)) {
		if (!fs.existsSync(p)) usage(`no such file ${p}`);
	}
	return args;
}

/** The CSSOM CSS.escape algorithm (https://drafts.csswg.org/cssom/#serialize-an-identifier). */
export function cssEscape(value) {
	const s = String(value);
	const n = s.length;
	const first = n > 0 ? s.charCodeAt(0) : 0;
	let out = "";
	for (let i = 0; i < n; i++) {
		const c = s.charCodeAt(i);
		if (c === 0) {
			out += "�";
			continue;
		}
		const isDigit = c >= 48 && c <= 57;
		if ((c >= 1 && c <= 31) || c === 127 || (i === 0 && isDigit) || (i === 1 && isDigit && first === 45)) {
			out += `\\${c.toString(16)} `;
			continue;
		}
		if (i === 0 && n === 1 && c === 45) {
			out += `\\${s.charAt(i)}`;
			continue;
		}
		if (c >= 128 || c === 45 || c === 95 || isDigit || (c >= 65 && c <= 90) || (c >= 97 && c <= 122)) {
			out += s.charAt(i);
			continue;
		}
		out += `\\${s.charAt(i)}`;
	}
	return out;
}

function renameSelector(css, candidate, name) {
	return css.split(`.${cssEscape(candidate)}`).join(`.${name}`);
}

/** Unwraps `:is(X)` when X is one compound selector (no top-level comma, no combinator). */
function unwrapIs(text) {
	let out = "";
	let i = 0;
	while (i < text.length) {
		if (text.startsWith(":is(", i)) {
			let depth = 1;
			let j = i + 4;
			while (j < text.length && depth > 0) {
				if (text[j] === "(") depth++;
				else if (text[j] === ")") depth--;
				j++;
			}
			const inner = text.slice(i + 4, j - 1);
			let top = "";
			let d = 0;
			for (const ch of inner) {
				if (ch === "(" || ch === "[") d++;
				else if (ch === ")" || ch === "]") d--;
				else if (d === 0) top += ch;
			}
			if (depth === 0 && !/[\s,>+~]/.test(top)) {
				out += unwrapIs(inner);
				i = j;
				continue;
			}
		}
		out += text[i];
		i++;
	}
	return out;
}

export function normalizeRule(css, candidate) {
	return unwrapIs(renameSelector(css, candidate, "__c")).replace(/\s+/g, " ").trim();
}

/** Attribute selectors of a rule: [name], [name=value], [name="value"] (quotes optional). */
export function attributeSelectors(text) {
	const attrs = new Map();
	const re = /\[([a-zA-Z_][\w-]*)(?:([~|^$*]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]+)))?\s*\]/g;
	for (const m of text.matchAll(re)) {
		const name = m[1];
		if (m[2] !== undefined && m[2] !== "=") continue;
		const value = m[3] ?? m[4] ?? m[5] ?? "";
		if (!attrs.has(name) || value !== "") attrs.set(name, value);
	}
	return [...attrs.entries()];
}

/** Builds the three fixtures with DOM methods (no markup parsing). Runs in the page. */
const BUILD = `(spec) => {
	const stage = document.querySelector(".__stage");
	stage.replaceChildren();
	const el = (tag, cls, text) => {
		const n = document.createElement(tag);
		n.className = cls;
		for (const [name, value] of spec.attrs) n.setAttribute(name, value);
		if (text) n.append(text);
		return n;
	};
	for (const [box, target] of spec.boxes) {
		const b = document.createElement("div");
		b.className = "__box " + box;
		const g = el("div", "group __g");
		const p = el("span", "peer __p", "p");
		const t = el("div", (target + " __t").trim());
		const c1 = el("span", "__c1", "a");
		c1.append(el("i", "__gc", "b"));
		t.append(c1, el("span", "__c2", "c"));
		g.append(p, t);
		b.append(g);
		stage.append(b);
	}
}`;

const COLLECT = `(() => {
	const read = (el, pseudo) => {
		const cs = getComputedStyle(el, pseudo);
		const out = {};
		for (let i = 0; i < cs.length; i++) {
			const p = cs[i];
			out[p] = cs.getPropertyValue(p);
		}
		return out;
	};
	const rect = (el, box) => {
		const r = el.getBoundingClientRect();
		const o = box.getBoundingClientRect();
		return { x: String(r.x - o.x), y: String(r.y - o.y), width: String(r.width), height: String(r.height) };
	};
	const res = {};
	for (const box of ["__fa", "__fb", "__fc"]) {
		const root = document.querySelector("." + box);
		const t = root.querySelector(".__t");
		res[box] = {
			geometry: {
				...Object.fromEntries(Object.entries(rect(t, root)).map(([k, v]) => ["target." + k, v])),
				...Object.fromEntries(Object.entries(rect(root.querySelector(".__c1"), root)).map(([k, v]) => ["child1." + k, v])),
				...Object.fromEntries(Object.entries(rect(root.querySelector(".__gc"), root)).map(([k, v]) => ["grandchild." + k, v])),
				...Object.fromEntries(Object.entries(rect(root.querySelector(".__c2"), root)).map(([k, v]) => ["child2." + k, v])),
			},
			target: read(t, null),
			child1: read(root.querySelector(".__c1"), null),
			grandchild: read(root.querySelector(".__gc"), null),
			child2: read(root.querySelector(".__c2"), null),
			before: read(t, "::before"),
			after: read(t, "::after"),
		};
	}
	return res;
})()`;

function diffKeys(x, y) {
	const out = [];
	for (const part of Object.keys(x)) {
		const a = x[part];
		const b = y[part];
		for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
			if (a[k] !== b[k]) out.push({ part, property: k, a: a[k] ?? null, b: b[k] ?? null });
		}
	}
	return out;
}

/** Registered properties of a rule text: name -> { inherits }. */
function registeredProperties(text) {
	const out = new Map();
	for (const m of text.matchAll(/@property\s+(--[\w-]+)\s*\{([^}]*)\}/g)) {
		out.set(m[1], { inherits: /inherits:\s*true/.test(m[2]) });
	}
	return out;
}

/** Standard properties of a rule text whose value references var(<name>. */
function consumersOf(text, name) {
	const out = new Set();
	for (const m of text.matchAll(/(?:^|[{;\s])([a-z][a-z-]*)\s*:\s*([^;{}]*)/g)) {
		if (m[2].includes(`var(${name}`)) out.add(m[1]);
	}
	return [...out].sort();
}

/**
 * Splits a/b differences into the consumer-resolved custom properties and the rest. A custom
 * property difference resolves only when the property is registered non-inheriting in the
 * pair's rules and some standard property of those rules consumes it.
 */
function resolveCustom(differences, text) {
	const registered = registeredProperties(text);
	const resolved = [];
	const rest = [];
	for (const d of differences) {
		const reg = registered.get(d.property);
		const consumers = d.property.startsWith("--") ? consumersOf(text, d.property) : [];
		if (d.part !== "geometry" && reg && !reg.inherits && consumers.length > 0) {
			resolved.push({ ...d, consumers });
		} else {
			rest.push(d);
		}
	}
	return { resolved, rest };
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const outFile = args.out ?? path.join(OUT_DIR, "pair-parity.json");
	const pairs = JSON.parse(fs.readFileSync(args.pairs, "utf8"));
	if (!Array.isArray(pairs)) usage("<pairs.json> must be a JSON array of { from, to, files }");
	const { __unstable__loadDesignSystem } = await import(require.resolve("@tailwindcss/node"));
	const base = path.join(ROOT, "src/app");
	const oldCssText = fs.readFileSync(args.oldCss, "utf8");
	const newCssText = fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8");
	const oldDs = await __unstable__loadDesignSystem(oldCssText, { base });
	const newDs = await __unstable__loadDesignSystem(newCssText, { base });
	const canonDs = await __unstable__loadDesignSystem(oldCssText, { base });
	const primeList = args.oldCandidates
		? fs
				.readFileSync(args.oldCandidates, "utf8")
				.split("\n")
				.map((l) => l.trim())
				.filter(Boolean)
		: [...new Set(pairs.flatMap((p) => [p.from, p.to]))];
	const canonical = new Map();
	const primeCss = canonDs.candidatesToCss(primeList);
	primeList.forEach((c, i) => {
		if (primeCss[i] == null) canonical.set(c, null);
	});
	for (const c of primeList) {
		if (!canonical.has(c)) canonical.set(c, canonDs.canonicalizeCandidates([c], { rem: REM_PX })[0]);
	}
	const canonicalOf = (c) => {
		if (!canonical.has(c)) canonical.set(c, canonDs.canonicalizeCandidates([c], { rem: REM_PX })[0]);
		return canonical.get(c);
	};

	const results = [];
	const pending = [];
	for (const p of pairs) {
		const entry = { from: p.from, to: p.to, class: null, files: p.files ?? [], detail: {} };
		results.push(entry);
		const fromCss = oldDs.candidatesToCss([p.from])[0];
		const toCss = newDs.candidatesToCss([p.to])[0];
		const canon = canonicalOf(p.from);
		entry.detail.canonical = canon;
		if (canon !== p.to) {
			entry.class = "unproven";
			entry.detail.reason = `old system canonicalizes ${p.from} to ${canon}, not ${p.to}`;
			continue;
		}
		if (fromCss == null || toCss == null) {
			entry.class = "unproven";
			entry.detail.reason = `${fromCss == null ? p.from : p.to} compiles to no CSS`;
			continue;
		}
		const na = normalizeRule(fromCss, p.from);
		const nb = normalizeRule(toCss, p.to);
		if (na === nb) {
			entry.class = "text-equal";
			entry.detail.css = na;
			continue;
		}
		entry.detail.oldCss = na;
		entry.detail.newCss = nb;
		pending.push({ entry, ruleA: renameSelector(fromCss, p.from, "__a"), ruleB: renameSelector(toCss, p.to, "__b"), na, nb });
	}

	if (pending.length > 0) {
		const { chromium } = require("playwright");
		const browser = await chromium.launch();
		try {
			const context = await browser.newContext({ deviceScaleFactor: 1 });
			const page = await context.newPage();
			const theme = fs.readFileSync(args.themeCss, "utf8");
			await page.setContent(
				'<!doctype html><html lang="en"><head><style class="__theme"></style><style class="__pair"></style>' +
					'<style class="__root"></style></head><body><div class="__stage"></div></body></html>',
			);
			await page.evaluate((css) => {
				document.querySelector("style.__theme").textContent = css;
			}, theme);
			const cdp = await context.newCDPSession(page);
			await cdp.send("DOM.enable");
			await cdp.send("CSS.enable");

			const run = async (job, rootPx) => {
				const text = `${job.na} ${job.nb}`;
				const attrs = attributeSelectors(text);
				const companions = COMPANIONS.filter((c) => c.test.test(text) && !(c.unless && c.unless.test(text))).flatMap(
					(c) => c.classes,
				);
				const companionCss = companions.length > 0 ? newDs.candidatesToCss(companions).filter(Boolean).join("\n") : "";
				const media = /@media\s+print/.test(text) ? "print" : null;
				const reducedMotion = /prefers-reduced-motion/.test(text) ? "reduce" : null;
				await page.emulateMedia({ media, reducedMotion });
				const extra = companions.join(" ");
				await page.evaluate(
					({ pairCss, rootCss }) => {
						document.querySelector("style.__pair").textContent = pairCss;
						document.querySelector("style.__root").textContent = rootCss;
					},
					{
						pairCss: `.__box { position: relative; }\n@layer utilities {\n${companionCss}\n${job.ruleA}\n${job.ruleB}\n}`,
						rootCss: rootPx === REM_PX ? "" : `html { font-size: ${rootPx}px; }`,
					},
				);
				await page.evaluate(`(${BUILD})(${JSON.stringify({
					attrs,
					boxes: [
						["__fa", `__a ${extra}`],
						["__fb", `__b ${extra}`],
						["__fc", extra],
					],
				})})`);
				const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
				for (const sel of [".__g", ".__p", ".__t"]) {
					const { nodeIds } = await cdp.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: sel });
					for (const nodeId of nodeIds) {
						await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: FORCED.map((f) => f.slice(1)) });
					}
				}
				const per = [];
				for (const ctx of CONTEXTS) {
					await page.setViewportSize({ width: ctx.width, height: ctx.height });
					await page.evaluate((dark) => {
						document.documentElement.classList.toggle("dark", dark);
					}, ctx.dark);
					const res = await page.evaluate(COLLECT);
					const { resolved, rest } = resolveCustom(diffKeys(res.__fa, res.__fb), text);
					per.push({
						context: `${ctx.width}x${ctx.height}${ctx.dark ? " dark" : " light"}`,
						abDiff: rest,
						resolved,
						aVsControl: diffKeys(res.__fa, res.__fc).length,
						bVsControl: diffKeys(res.__fb, res.__fc).length,
					});
				}
				await page.emulateMedia({ media: null, reducedMotion: null });
				return { per, companions, attrs: attrs.map(([n, v]) => (v ? `${n}=${v}` : n)), media, reducedMotion };
			};

			for (const job of pending) {
				const r16 = await run(job, REM_PX);
				const equal16 = r16.per.every((c) => c.abDiff.length === 0);
				const applied = r16.per.filter((c) => c.aVsControl > 0 || c.bVsControl > 0).map((c) => c.context);
				const d = job.entry.detail;
				d.companions = r16.companions;
				d.attributes = r16.attrs;
				d.emulated = { media: r16.media, reducedMotion: r16.reducedMotion };
				d.appliedIn = applied;
				d.contexts16 = r16.per.map((c) => ({
					context: c.context,
					differences: c.abDiff,
					aVsControl: c.aVsControl,
					bVsControl: c.bVsControl,
				}));
				const resolvedAll = r16.per.flatMap((c) => c.resolved.map((x) => ({ context: c.context, ...x })));
				if (resolvedAll.length > 0) d.consumerResolved = resolvedAll;
				if (!equal16) {
					job.entry.class = "unproven";
					d.reason = "the old and new rules compute differently at the 16px root";
					continue;
				}
				if (applied.length === 0) {
					job.entry.class = "unproven";
					d.reason = "the rule applied in no context (fixture does not reach its state)";
					continue;
				}
				const r20 = await run(job, ALT_ROOT_PX);
				const differs20 = r20.per.filter((c) => c.abDiff.length > 0);
				d.contexts20 = r20.per.map((c) => ({ context: c.context, differences: c.abDiff, resolved: c.resolved }));
				job.entry.class = differs20.length > 0 ? "rem-for-px" : "computed-equal";
			}
		} finally {
			await browser.close();
		}
	}

	const counts = { "text-equal": 0, "computed-equal": 0, "rem-for-px": 0, unproven: 0 };
	for (const r of results) counts[r.class]++;
	const report = { total: results.length, counts, pairs: results };
	fs.mkdirSync(path.dirname(outFile), { recursive: true });
	fs.writeFileSync(outFile, `${JSON.stringify(report, null, 1)}\n`);
	process.stdout.write(`${JSON.stringify({ total: report.total, counts })}\n`);
	process.exit(counts.unproven > 0 ? 1 : 0);
}

await main();
