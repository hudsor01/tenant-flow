// W4 canonical-class codemod for the Tailwind v4 / shadcn remediation (66.2-18, D-25, N9, P12).
//
// Usage (from the repo root):
//   node .planning/tailwind-shadcn/audit/canonicalize.mjs [--write] [--label <name>]
//   node .planning/tailwind-shadcn/audit/canonicalize.mjs --self-test
//   node .planning/tailwind-shadcn/audit/canonicalize.mjs --merge-check --old-root <dir> --pairs <file>
//        [--out <file>]
//
// The default is a dry run: it reads the repo and writes only
// $TW_AUDIT_OUT/canonicalize-<label>.json (default dir <tmpdir>/tenantflow-tw-audit, default
// label `run`). `--write` edits the first-party files in place, and only when every dry-run
// check passes; otherwise it writes nothing and exits 1.
//
// Run it only after wave 3 (66.2-16/17). The design system is loaded from the CURRENT
// src/app/globals.css (`loadProjectTailwindEngine` of src/test/utils/tailwind-engine.ts), and a
// canonical suggestion always points at the token structure that file declares: run against a
// tree whose explicit spacing scale is gone but whose call sites still name it, the
// canonicalizer would suggest `X-(--spacing-N)` forms (N10).
//
// Scope (= G8 scope): `scanSources(firstPartyScanSources(engine.sources, ROOT)).files`, i.e. the
// project scan sources with the vendored src/components/ui directory negated; test files are
// already outside the project scan (`@source not` in globals.css). Any ui or test path in the
// set is a scope error (exit 2).
//
// Rule: a candidate is rewritten when the design system compiles it and
// `canonicalizeCandidates([c], { rem: CANONICAL_ROOT_FONT_SIZE_PX })[0] !== c`. Each candidate is
// canonicalized on its own, exactly as G8 (`checkCanonicalCandidates`) and audit.mjs M10 do.
// The answer depends on design-system state (measured on tailwindcss 4.3.3: a canonicalize call
// switches the system to the non-inline color form, compiled candidates are cached, so whether
// `X-(--color-Y)` canonicalizes to `X-Y` depends on whether `X-Y` was compiled before the first
// canonicalize call). The real run therefore primes the system exactly as
// `checkCanonicalCandidates` does (one `candidatesToCss` over the scanned candidates, then one
// canonicalize call per candidate in scan order) and then asserts that its distinct pairs equal
// the G8 violations of a separately loaded system over the same candidates (exit 2 otherwise).
//
// N9: Oxide `getCandidatesWithPositions` positions are UTF-16 indices into the JS string. Every
// edit requires `content.slice(position, position + candidate.length) === candidate`; one
// mismatch (or two overlapping edits) aborts the run before any file is written. Edits are
// applied per file in descending position order.
//
// P12 pair parity: every distinct from -> to pair gets the first class whose cumulative
// normalization of the two `candidatesToCss` texts makes them equal. Those texts come from a
// second design system for the same stylesheet that never runs `canonicalizeCandidates`:
// measured on tailwindcss 4.3.3, a canonicalize call switches the design system it runs on to
// the non-inline color form (a color utility then compiles to var(--color-x) where the build
// emits var(--x)), and compiled candidates are cached, so CSS read from the canonicalizing
// system mixes the two forms. The parity system compiles what the build compiles:
//   identical          selector class token replaced, whitespace around / , ( ) : ; { } removed
//   theme-value        + var(--x) replaced by resolveThemeValue("--x") (fixpoint, 5 passes); not
//                      applied when a substituted name is declared in a rule whose selector
//                      contains .dark
//   negation-form      + calc(<literal> * -1) -> -<literal>
//   gradient-fallback  + a --tw-gradient-position declaration directly followed by the
//                      progressive `@supports (background-image: linear-gradient(in lab, ...))`
//                      block that redeclares it takes the inner value; the block is dropped
//   rem-for-px         + lengths resolved at a 16px root: calc(var(--spacing) * N), <n>rem,
//                      calc(<n>px * <m>) and calc(<n>px * -1) become px literals (VD-13: these
//                      render differently only at a non-default root font size)
//   unclassified       anything else (blocks --write)
//
// Merge check (cn()/tailwind-merge): per-class CSS equality cannot see a changed merge result,
// so at every cn/cva/twMerge call holding a rewritten class (`call`), at every component element
// whose class attribute holds one, merged with each cn/cva/twMerge base of the resolved component
// module (`caller-to-base`), and at every importer element of a component whose cn base holds
// one (`base-to-caller`), the project `cn` result is compared as a class set, old tokens mapped
// through the pair map. A diff blocks --write like an unclassified pair. `--merge-check` runs only
// this check, old contents from --old-root, new contents from the repo (gate 66.2-19).
//
// Order flips: for each edit, every other valid candidate on the same line with the same variant
// prefix and an intersecting set of declared properties is compared by getClassOrder before and
// after. Review list only (alternate ternary branches never co-apply).
//
// Report: { written, designSystemCssSha256, scannedFiles, files, edits, pairs, counts,
// mismatches, mergeCheck, orderFlips, flagged }. stdout: counts.
// Exit: 0 when mismatches, unclassified and mergeCheck.diffs are all empty; 1 otherwise;
// 2 on a usage or scope error.
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const OUT = process.env.TW_AUDIT_OUT ?? path.join(os.tmpdir(), "tenantflow-tw-audit");
const require = createRequire(path.join(ROOT, "package.json"));
const { Scanner } = require("@tailwindcss/oxide");
const postcss = require("postcss");
const { parse: babelParse } = require("@babel/parser");
const { __unstable__loadDesignSystem } = await import(require.resolve("@tailwindcss/node"));
const engineModule = await import(pathToFileURL(path.join(ROOT, "src/test/utils/tailwind-engine.ts")).href);
const guardsModule = await import(pathToFileURL(path.join(ROOT, "src/test/utils/tailwind-guards.ts")).href);
const { cn: projectCn } = await import(pathToFileURL(path.join(ROOT, "src/lib/utils.ts")).href);
const { firstPartyScanSources, CANONICAL_ROOT_FONT_SIZE_PX, VENDORED_UI_RELATIVE_DIR } = guardsModule;
const PACKAGE_IMPORTS = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).imports ?? {};

// ---------- edits (N9) ----------

const COMMENT_LINE = /^\s*(\/\/|\/\*|\*|\{\/\*)/;
const FLAGGED_PATH = /__tests__\/|\.spec\.|^src\/test\//;
const FLAGGED_EXT = /\.(css|md|mdx)$/;

const canonicalCache = new WeakMap();
/** The canonical form of `c`, `null` when the design system does not compile it. */
function canonicalOf(ds, c) {
	let cache = canonicalCache.get(ds);
	if (!cache) canonicalCache.set(ds, (cache = new Map()));
	if (!cache.has(c)) {
		const valid = ds.candidatesToCss([c])[0] !== null;
		cache.set(c, valid ? ds.canonicalizeCandidates([c], { rem: CANONICAL_ROOT_FONT_SIZE_PX })[0] : null);
	}
	return cache.get(c);
}

/** Fills the canonical cache the way `checkCanonicalCandidates` evaluates `candidates`. */
export function primeCanonical(ds, candidates) {
	let cache = canonicalCache.get(ds);
	if (!cache) canonicalCache.set(ds, (cache = new Map()));
	const list = [...candidates];
	const css = ds.candidatesToCss(list);
	list.forEach((c, i) => {
		if (css[i] === null || css[i] === undefined) cache.set(c, null);
	});
	for (const c of list) {
		if (cache.has(c)) continue;
		cache.set(c, ds.canonicalizeCandidates([c], { rem: CANONICAL_ROOT_FONT_SIZE_PX })[0]);
	}
}

export function scanPositions(content, extension) {
	return new Scanner({ sources: [] }).getCandidatesWithPositions({ content, extension });
}

function lineAt(content, position) {
	const start = content.lastIndexOf("\n", position - 1) + 1;
	let end = content.indexOf("\n", position);
	if (end < 0) end = content.length;
	let line = 1;
	for (let i = content.indexOf("\n"); i >= 0 && i < position; i = content.indexOf("\n", i + 1)) line += 1;
	return { line, text: content.slice(start, end) };
}

/** Edits and N9 mismatches for one file; `positions` is the Oxide list (or an injected one). */
export function computeEdits(ds, file, content, positions) {
	const edits = [];
	const mismatches = [];
	const valid = [];
	const seen = new Set();
	for (const { candidate, position } of positions) {
		const key = `${position}\u0000${candidate}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const canonical = canonicalOf(ds, candidate);
		if (canonical === null) continue;
		const found = content.slice(position, position + candidate.length);
		const { line, text } = lineAt(content, position);
		valid.push({ candidate, position, line });
		if (canonical === candidate) continue;
		if (found !== candidate) {
			mismatches.push({ file, position, candidate, found, reason: "slice" });
			continue;
		}
		const comment = COMMENT_LINE.test(text);
		edits.push({
			file,
			line,
			lineText: text.trim().slice(0, 160),
			from: candidate,
			to: canonical,
			position,
			comment,
			flagged: comment || FLAGGED_EXT.test(file) || FLAGGED_PATH.test(file),
		});
	}
	edits.sort((a, b) => a.position - b.position);
	for (let i = 1; i < edits.length; i += 1) {
		const prev = edits[i - 1];
		if (edits[i].position < prev.position + prev.from.length) {
			mismatches.push({ file, position: edits[i].position, candidate: edits[i].from, found: prev.from, reason: "overlap" });
		}
	}
	return { edits, mismatches, valid };
}

/** Applies `edits` in descending position order. */
export function applyEdits(content, edits) {
	let out = content;
	for (const e of [...edits].sort((a, b) => b.position - a.position)) {
		out = out.slice(0, e.position) + e.to + out.slice(e.position + e.from.length);
	}
	return out;
}

// ---------- pair parity (P12) ----------

const PARITY_CLASSES = ["identical", "theme-value", "negation-form", "gradient-fallback", "rem-for-px"];
const GRADIENT_SUPPORTS = /linear-gradient\(in lab,[^)]*\)/;
const LEADING_CLASS_TOKEN = /^\.(?:\\.|[\w-])+/;

/** Every custom property declared inside a rule whose selector contains `.dark`. */
export function darkDeclaredProps(css) {
	const set = new Set();
	postcss.parse(css).walkRules((rule) => {
		if (!rule.selector.includes(".dark")) return;
		rule.walkDecls((d) => {
			if (d.prop.startsWith("--")) set.add(d.prop);
		});
	});
	return set;
}

function substituteThemeVars(ds, text, substituted) {
	let s = text;
	for (let pass = 0; pass < 5; pass += 1) {
		const next = s.replace(/var\((--[\w-]+)\)/g, (m, name) => {
			const v = ds.resolveThemeValue(name);
			if (typeof v !== "string") return m;
			substituted.add(name);
			return v;
		});
		if (next === s) break;
		s = next;
	}
	return s;
}

const fmt = (n) => `${Number(n.toFixed(4))}`;

function resolveLengths(text, spacingPx) {
	return text
		.replace(/calc\(\s*var\(--spacing\)\s*\*\s*(-?[\d.]+)\s*\)/g, (_, n) => `${fmt(Number(n) * spacingPx)}px`)
		.replace(/(-?[\d.]+)rem\b/g, (_, n) => `${fmt(Number(n) * 16)}px`)
		.replace(/calc\(\s*(-?[\d.]+)px\s*\*\s*(-?[\d.]+)\s*\)/g, (_, a, b) => `${fmt(Number(a) * Number(b))}px`);
}

/** `text` normalized through level `level` (1-based index into PARITY_CLASSES). */
function normalize(ds, ctx, text, level, themeSound) {
	const root = postcss.parse(text);
	root.walkRules((rule) => {
		rule.selectors = rule.selectors.map((s) => s.replace(LEADING_CLASS_TOKEN, ".__c"));
	});
	if (level >= 4) {
		root.walkDecls("--tw-gradient-position", (decl) => {
			const next = decl.next();
			if (!next || next.type !== "atrule" || next.name !== "supports" || !GRADIENT_SUPPORTS.test(next.params)) return;
			let inner = null;
			next.walkDecls("--tw-gradient-position", (d) => {
				inner = d;
			});
			if (inner === null) return;
			decl.value = inner.value;
			next.remove();
		});
	}
	let s = root.toString();
	if (level >= 2 && themeSound) s = substituteThemeVars(ds, s, new Set());
	if (level >= 3) s = s.replace(/calc\(\s*(-?[\d.]+(?:%|[a-z]+)?)\s*\*\s*-1\s*\)/g, "-$1");
	if (level >= 5) s = resolveLengths(s, ctx.spacingPx);
	return s
		.replace(/\s*([/,():;{}])\s*/g, "$1")
		.replace(/\s+/g, " ")
		.trim();
}

/** Parity class of two `candidatesToCss` texts. */
export function classifyCss(ds, ctx, a, b) {
	if (typeof a !== "string" || typeof b !== "string") return "unclassified";
	const substituted = new Set();
	substituteThemeVars(ds, a, substituted);
	substituteThemeVars(ds, b, substituted);
	const themeSound = ![...substituted].some((name) => ctx.darkProps.has(name));
	for (let level = 1; level <= PARITY_CLASSES.length; level += 1) {
		if (level === 2 && !themeSound) continue;
		if (normalize(ds, ctx, a, level, themeSound) === normalize(ds, ctx, b, level, themeSound)) return PARITY_CLASSES[level - 1];
	}
	return "unclassified";
}

export function classifyPair(ds, ctx, from, to) {
	const [a, b] = ds.candidatesToCss([from, to]);
	return { from, to, class: classifyCss(ds, ctx, a, b), old: a, new: b };
}

export function parityContext(ds, css) {
	const spacing = ds.resolveThemeValue("--spacing");
	const value = Number.parseFloat(spacing ?? "");
	const spacingPx = typeof spacing === "string" && spacing.trim().endsWith("rem") ? value * 16 : value;
	return { darkProps: darkDeclaredProps(css), spacingPx };
}

// ---------- merge check (cn()/tailwind-merge) ----------

const CALLEES = new Set(["cn", "cva", "twMerge"]);
const CLASS_ATTR = /(^c|C)lassNames?$/;
const tokens = (s) => s.split(/\s+/).filter(Boolean);

function walk(node, visit) {
	if (Array.isArray(node)) {
		for (const child of node) walk(child, visit);
		return;
	}
	if (node === null || typeof node !== "object" || typeof node.type !== "string") return;
	visit(node);
	for (const [key, value] of Object.entries(node)) {
		if (key === "loc" || key === "start" || key === "end" || key === "extra" || key.endsWith("Comments")) continue;
		if (value !== null && typeof value === "object") walk(value, visit);
	}
}

function collectStrings(node) {
	const out = [];
	walk(node, (n) => {
		if (n.type === "StringLiteral") out.push(n.value);
		else if (n.type === "TemplateLiteral") for (const q of n.quasis) out.push(q.value.cooked ?? q.value.raw);
	});
	return out.join(" ").replace(/\s+/g, " ").trim();
}

function rootBinding(name) {
	if (name.type === "JSXIdentifier") return name.name;
	if (name.type === "JSXMemberExpression") return rootBinding(name.object);
	return null;
}

function parseModule(text) {
	try {
		return babelParse(text, { sourceType: "module", plugins: ["typescript", "jsx"] });
	} catch {
		return babelParse(text, { sourceType: "module", plugins: ["typescript"] });
	}
}

/** cn/cva/twMerge calls, class-carrying component attributes and import bindings, in source order. */
function moduleInfo(text) {
	const ast = parseModule(text);
	const calls = [];
	const attrs = [];
	const imports = new Map();
	for (const stmt of ast.program.body) {
		if (stmt.type !== "ImportDeclaration") continue;
		for (const spec of stmt.specifiers) imports.set(spec.local.name, stmt.source.value);
	}
	walk(ast.program, (node) => {
		if (node.type === "CallExpression" && node.callee.type === "Identifier" && CALLEES.has(node.callee.name)) {
			calls.push({ line: node.loc?.start.line ?? null, joined: collectStrings(node.arguments) });
		} else if (node.type === "JSXOpeningElement") {
			const member = node.name.type === "JSXMemberExpression";
			const binding = rootBinding(node.name);
			if (binding === null || (!member && !/^[A-Z]/.test(binding))) return;
			for (const attr of node.attributes) {
				if (attr.type !== "JSXAttribute" || attr.name.type !== "JSXIdentifier" || !CLASS_ATTR.test(attr.name.name)) continue;
				attrs.push({ binding, attribute: attr.name.name, line: attr.loc?.start.line ?? null, joined: attr.value ? collectStrings(attr.value) : "" });
			}
		}
	});
	return { calls, attrs, imports };
}

/** Repo-relative module path for an import specifier, or null (package or no file). */
export function resolveImport(root, fromFile, specifier, imports = PACKAGE_IMPORTS) {
	let target = null;
	if (specifier.startsWith(".")) {
		target = path.resolve(root, path.dirname(fromFile), specifier);
	} else if (specifier.startsWith("#")) {
		for (const [key, value] of Object.entries(imports)) {
			if (key.endsWith("/*") && specifier.startsWith(key.slice(0, -1))) {
				target = path.resolve(root, value.slice(0, -1) + specifier.slice(key.length - 1));
				break;
			}
			if (key === specifier) {
				target = path.resolve(root, value);
				break;
			}
		}
	}
	if (target === null) return null;
	for (const candidate of [target, `${target}.tsx`, `${target}.ts`, path.join(target, "index.tsx"), path.join(target, "index.ts")]) {
		if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return path.relative(root, candidate).replaceAll("\\", "/");
	}
	return null;
}

// Cascade-equivalence exception (66.2-18 plan decision, 2026-10-31). An unequal merge site is
// cascade-equivalent when the new merge adds no class and every class D it drops has a survivor
// S in the new set with (1) the identical variant chain (important marker included), the same
// selector skeleton and the same layer (both are Tailwind utilities with a non-null class
// order), (2) D's declared properties a subset of S's, and (3) S after D in getClassOrder, so
// S's declaration already wins in the old render: the order is checked for the new forms AND for
// the old (pre-rewrite) forms of D and S, because the old render ordered the old forms. `ds` must be a design system that never ran
// canonicalizeCandidates.

function variantChain(c) {
	const prefix = variantPrefix(c);
	const utility = prefix === "" ? c : c.slice(prefix.length + 1);
	return `${prefix}|${utility.startsWith("!") || utility.endsWith("!") ? "important" : ""}`;
}

function ruleFacts(ds, c) {
	const css = ds.candidatesToCss([c])[0];
	if (typeof css !== "string") return null;
	const root = postcss.parse(css);
	const props = new Set();
	root.walkDecls((d) => {
		for (let p = d.parent; p; p = p.parent) if (p.type === "atrule" && p.name === "property") return;
		props.add(d.prop);
	});
	const skeleton = root.clone();
	skeleton.walkAtRules("property", (a) => a.remove());
	skeleton.walkDecls((d) => d.remove());
	skeleton.walkRules((r) => {
		r.selectors = r.selectors.map((sel) => sel.replace(LEADING_CLASS_TOKEN, ".__c"));
	});
	return { css, props: [...props].sort(), skeleton: skeleton.toString().replace(/\s+/g, "") };
}

/** Cascade-equivalence evidence for an unequal site, or null when any condition fails. */
export function cascadeEquivalence(ds, oldSet, newSet, oldForms = (t) => [t]) {
	const added = [...newSet].filter((t) => !oldSet.has(t));
	if (added.length > 0) return null;
	const dropped = [...oldSet].filter((t) => !newSet.has(t)).sort();
	if (dropped.length === 0) return null;
	const drops = [];
	for (const d of dropped) {
		const fd = ruleFacts(ds, d);
		if (fd === null) return null;
		let found = null;
		for (const sCandidate of [...newSet].sort()) {
			if (variantChain(sCandidate) !== variantChain(d)) continue;
			const fs_ = ruleFacts(ds, sCandidate);
			if (fs_ === null || fs_.skeleton !== fd.skeleton) continue;
			if (!fd.props.every((p) => fs_.props.includes(p))) continue;
			const [[, orderD], [, orderS]] = ds.getClassOrder([d, sCandidate]);
			if (orderD === null || orderS === null || !(orderS > orderD)) continue;
			const oldOrders = [];
			for (const dOld of oldForms(d)) {
				for (const sOld of oldForms(sCandidate)) {
					const [[, a], [, b]] = ds.getClassOrder([dOld, sOld]);
					oldOrders.push({ D: dOld, S: sOld, orderD: a === null ? null : String(a), orderS: b === null ? null : String(b), ok: a !== null && b !== null && b > a });
				}
			}
			if (oldOrders.length === 0 || !oldOrders.every((x) => x.ok)) continue;
			found = { D: d, S: sCandidate, ruleD: fd.css, ruleS: fs_.css, orderD: String(orderD), orderS: String(orderS), oldOrders, propsD: fd.props, propsS: fs_.props };
			break;
		}
		if (found === null) return null;
		drops.push(found);
	}
	return drops;
}

/**
 * The merge check. `readOld`/`readNew` return a repo-relative file's text before/after the
 * rewrite; `editedFiles` are the files with an edit; `importerFiles` are searched for
 * base-to-caller sites. A component bound in the caller's own file (no import) resolves to that
 * file.
 */
export function mergeCheck({ root, ds, pairs, editedFiles, readOld, readNew, importerFiles, cn = projectCn }) {
	const pairMap = new Map(pairs.map((p) => [p.from, p.to]));
	const hasFrom = (s) => tokens(s).some((t) => pairMap.has(t));
	const merged = (strings) => new Set(tokens(cn(...strings)));
	const mapped = (set) => new Set([...set].map((t) => pairMap.get(t) ?? t));
	const sorted = (set) => [...set].sort();
	const cache = new Map();
	const info = (rel, which) => {
		const key = `${which}\u0000${rel}`;
		if (!cache.has(key)) cache.set(key, moduleInfo(which === "old" ? readOld(rel) : readNew(rel)));
		return cache.get(key);
	};
	const sites = { call: 0, "caller-to-base": 0, "base-to-caller": 0 };
	const diffs = [];
	const cascadeEquivalent = [];
	let calls = 0;
	let unresolved = 0;
	const compare = (kind, file, line, other, oldStrings, newStrings) => {
		sites[kind] += 1;
		const raw = merged(oldStrings);
		const o = mapped(raw);
		const n = merged(newStrings);
		if (o.size !== n.size || [...o].some((t) => !n.has(t))) {
			const oldForms = (t) => [...raw].filter((r) => (pairMap.get(r) ?? r) === t);
			const drops = cascadeEquivalence(ds, o, n, oldForms);
			if (drops !== null) cascadeEquivalent.push({ kind, file, line, other, drops, old: sorted(o), new: sorted(n), oldStrings, newStrings });
			else diffs.push({ kind, file, line, other, old: sorted(o), new: sorted(n), oldStrings, newStrings });
		}
	};
	const sameCount = (kind, file, a, b) => {
		if (a.length === b.length) return true;
		diffs.push({ kind, file, line: null, other: null, old: [String(a.length)], new: [String(b.length)] });
		return false;
	};
	const code = [...editedFiles].filter((f) => !/\.(css|md|mdx)$/.test(f)).sort();
	const bases = new Set();
	for (const rel of code) {
		const o = info(rel, "old");
		const n = info(rel, "new");
		calls += o.calls.length;
		if (sameCount("call-count", rel, o.calls, n.calls)) {
			o.calls.forEach((call, i) => {
				if (!hasFrom(call.joined)) return;
				bases.add(rel);
				compare("call", rel, call.line, null, [call.joined], [n.calls[i].joined]);
			});
		}
		if (!sameCount("attr-count", rel, o.attrs, n.attrs)) continue;
		o.attrs.forEach((attr, i) => {
			if (!hasFrom(attr.joined)) return;
			const spec = o.imports.get(attr.binding);
			const target = spec === undefined ? rel : resolveImport(root, rel, spec);
			if (target === null) {
				unresolved += 1;
				return;
			}
			const to = info(target, "old");
			const tn = info(target, "new");
			if (!sameCount("call-count", target, to.calls, tn.calls)) return;
			to.calls.forEach((call, j) => {
				compare("caller-to-base", rel, attr.line, target, [call.joined, attr.joined], [tn.calls[j].joined, n.attrs[i].joined]);
			});
		});
	}
	for (const rel of [...importerFiles].sort()) {
		const fo = info(rel, "old");
		const bound = new Map();
		for (const [local, spec] of fo.imports) {
			const target = resolveImport(root, rel, spec);
			if (target !== null && bases.has(target) && target !== rel) bound.set(local, target);
		}
		if (bound.size === 0) continue;
		const fn = info(rel, "new");
		if (!sameCount("attr-count", rel, fo.attrs, fn.attrs)) continue;
		fo.attrs.forEach((attr, i) => {
			const base = bound.get(attr.binding);
			if (base === undefined) return;
			const bo = info(base, "old");
			const bn = info(base, "new");
			bo.calls.forEach((call, j) => {
				if (!hasFrom(call.joined)) return;
				compare("base-to-caller", base, attr.line, rel, [call.joined, attr.joined], [bn.calls[j].joined, fn.attrs[i].joined]);
			});
		});
	}
	return { pairs: pairMap.size, files: code.length, calls, sites, unresolved, diffs, cascadeEquivalent };
}

/** Non-test .ts/.tsx files under <root>/src, repo-relative and sorted. */
function importerFilesUnder(root) {
	return fs
		.readdirSync(path.join(root, "src"), { recursive: true, encoding: "utf8" })
		.map((f) => `src/${f.replaceAll("\\", "/")}`)
		.filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith(".d.ts") && !f.includes("__tests__/") && !/\.(test|spec)\./.test(f))
		.sort();
}

// ---------- order flips ----------

function variantPrefix(c) {
	let depth = 0;
	let last = -1;
	for (let i = 0; i < c.length; i += 1) {
		const ch = c[i];
		if (ch === "[" || ch === "(") depth += 1;
		else if (ch === "]" || ch === ")") depth -= 1;
		else if (ch === ":" && depth === 0) last = i;
	}
	return last < 0 ? "" : c.slice(0, last);
}

function declaredProps(ds, c) {
	const css = ds.candidatesToCss([c])[0] ?? "";
	return new Set([...css.matchAll(/^\s+([a-z][a-z-]*):/gm)].map((m) => m[1]));
}

export function orderFlips(ds, file, edits, valid) {
	const flips = [];
	const editAt = new Map(edits.map((e) => [e.position, e]));
	const seen = new Set();
	for (const e of edits) {
		const props = declaredProps(ds, e.from);
		for (const other of valid) {
			if (other.line !== e.line || other.position === e.position || other.candidate === e.from) continue;
			if (variantPrefix(other.candidate) !== variantPrefix(e.from)) continue;
			const otherProps = declaredProps(ds, other.candidate);
			if (![...props].some((p) => otherProps.has(p))) continue;
			const otherNew = editAt.get(other.position)?.to ?? other.candidate;
			const key = [e.from, other.candidate].sort().join("\u0000") + e.line;
			if (seen.has(key)) continue;
			seen.add(key);
			const [[, a0], [, b0]] = ds.getClassOrder([e.from, other.candidate]);
			const [[, a1], [, b1]] = ds.getClassOrder([e.to, otherNew]);
			if (a0 === null || b0 === null || a1 === null || b1 === null) continue;
			if (a0 < b0 !== a1 < b1) flips.push({ file, line: e.line, lineText: e.lineText, old: [e.from, other.candidate], new: [e.to, otherNew] });
		}
	}
	return flips;
}

// ---------- run ----------

export function exitCodeFor(report) {
	return report.mismatches.length === 0 && report.counts.unclassified === 0 && report.mergeCheck.diffs.length === 0 ? 0 : 1;
}

/**
 * One full run over `files` (repo-relative to `root`). Writes the edited files only when
 * `write` is set and every check passes.
 */
export function runCodemod({ ds, parityDs = ds, ctx, root, files, write = false, beforeWrite = () => true, positionsFor = scanPositions, importerFiles = [], cn = projectCn }) {
	const original = new Map();
	const updated = new Map();
	const edits = [];
	const mismatches = [];
	const flips = [];
	for (const rel of files) {
		const content = fs.readFileSync(path.join(root, rel), "utf8");
		original.set(rel, content);
		const result = computeEdits(ds, rel, content, positionsFor(content, path.extname(rel).slice(1), rel));
		mismatches.push(...result.mismatches);
		if (result.edits.length === 0) continue;
		edits.push(...result.edits);
		updated.set(rel, applyEdits(content, result.edits));
		flips.push(...orderFlips(ds, rel, result.edits, result.valid));
	}
	const pairIndex = new Map();
	for (const e of edits) {
		const key = `${e.from}\u0000${e.to}`;
		if (!pairIndex.has(key)) pairIndex.set(key, { from: e.from, to: e.to, count: 0, files: new Set() });
		const p = pairIndex.get(key);
		p.count += 1;
		p.files.add(e.file);
	}
	const pairs = [...pairIndex.values()]
		.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0))
		.map((p) => ({ ...classifyPair(parityDs, ctx, p.from, p.to), count: p.count, files: [...p.files].sort() }));
	const read = (map) => (rel) => map.get(rel) ?? original.get(rel) ?? fs.readFileSync(path.join(root, rel), "utf8");
	const merge = mergeCheck({
		root,
		ds: parityDs,
		pairs,
		editedFiles: new Set(updated.keys()),
		readOld: read(new Map()),
		readNew: read(updated),
		importerFiles,
		cn,
	});
	const counts = { files: updated.size, edits: edits.length, distinctFrom: new Set(edits.map((e) => e.from)).size };
	for (const c of [...PARITY_CLASSES, "unclassified"]) counts[c] = pairs.filter((p) => p.class === c).length;
	const report = {
		written: false,
		scannedFiles: files.length,
		files: [...updated.keys()].sort(),
		edits,
		pairs,
		counts,
		mismatches,
		mergeCheck: merge,
		orderFlips: flips,
		flagged: edits.filter((e) => e.flagged),
	};
	if (write && exitCodeFor(report) === 0 && beforeWrite(report)) {
		for (const [rel, text] of updated) fs.writeFileSync(path.join(root, rel), text);
		report.written = true;
	}
	return report;
}

// ---------- self-test ----------

async function selfTest() {
	const fixtureCss = '@import "tailwindcss" source(none);\n@theme { --leading-display: 1.1; }\n';
	const ds = await __unstable__loadDesignSystem(fixtureCss, { base: path.join(ROOT, "src/app") });
	const ctx = parityContext(ds, fixtureCss);
	let passed = 0;
	const check = (name, ok, detail) => {
		if (!ok) {
			console.error(`canonicalize self-test FAILED: ${name}${detail === undefined ? "" : `\n${JSON.stringify(detail, null, 1)}`}`);
			process.exit(1);
		}
		passed += 1;
	};
	const editsOf = (content) => computeEdits(ds, "fixture.tsx", content, scanPositions(content, "tsx"));

	// (a) N9: a non-ASCII character before the candidate.
	const a = '<p className="— flex-shrink-0 ok">';
	const ra = editsOf(a);
	check(
		"(a) UTF-16 positions",
		a.length !== Buffer.byteLength(a) && ra.mismatches.length === 0 && applyEdits(a, ra.edits) === '<p className="— shrink-0 ok">',
		ra,
	);
	// (b) descending order on one line.
	const b = '<p className="bg-gradient-to-r flex-shrink-0">';
	const rb = editsOf(b);
	check("(b) descending edits", rb.edits.length === 2 && applyEdits(b, rb.edits) === '<p className="bg-linear-to-r shrink-0">', rb);
	// (c) comment line.
	const rc = editsOf("const x = 1;\n// flex-shrink-0\n");
	check("(c) comment flag", rc.edits.length === 1 && rc.edits[0].comment === true && rc.edits[0].flagged === true && rc.edits[0].line === 2, rc);
	// (d) no collapse: two classes a collapse would merge stay as they are.
	check("(d) no collapse", editsOf('<p className="w-4 h-4">').edits.length === 0);
	// (e) invalid candidate.
	check("(e) invalid untouched", editsOf('<p className="not-a-class-xyz">').edits.length === 0);
	// (f) one pair per parity class.
	for (const [from, expected] of [
		["flex-shrink-0", "identical"],
		["leading-[1.1]", "theme-value"],
		["-translate-y-[50%]", "negation-form"],
		["bg-gradient-to-r", "gradient-fallback"],
		["w-[130px]", "rem-for-px"],
	]) {
		const to = canonicalOf(ds, from);
		const pair = classifyPair(ds, ctx, from, to);
		check(`(f) ${from} -> ${to} is ${expected}`, to !== from && pair.class === expected, pair);
	}
	// (g) a declared value differs.
	const [flexCss, gridCss] = ds.candidatesToCss(["flex", "grid"]);
	const gClass = classifyCss(ds, ctx, flexCss, gridCss);
	check("(g) unclassified", gClass === "unclassified", { flexCss, gridCss, gClass });
	const gReport = { mismatches: [], counts: { unclassified: 1 }, mergeCheck: { diffs: [] } };
	check("(g) unclassified exits 1", exitCodeFor(gReport) === 1);
	// (h) --write with one injected mismatch writes nothing.
	const hDir = path.join(OUT, "canonicalize-selftest-h");
	fs.rmSync(hDir, { recursive: true, force: true });
	fs.mkdirSync(hDir, { recursive: true });
	const hText = '<p className="flex-shrink-0" />\n';
	fs.writeFileSync(path.join(hDir, "a.tsx"), hText);
	const hReport = runCodemod({
		ds,
		ctx,
		root: hDir,
		files: ["a.tsx"],
		write: true,
		positionsFor: (content, ext) => [...scanPositions(content, ext), { candidate: "flex-shrink-0", position: 1 }],
	});
	check(
		"(h) mismatch blocks --write",
		hReport.mismatches.length === 1 && hReport.written === false && exitCodeFor(hReport) === 1 && fs.readFileSync(path.join(hDir, "a.tsx"), "utf8") === hText,
		hReport.mismatches,
	);
	// (i) call kind.
	const callCase = (oldText, newText, from, to) => {
		const files = { "x.tsx": [oldText, newText] };
		return mergeCheck({
			root: hDir,
			ds,
			pairs: [{ from, to }],
			editedFiles: new Set(["x.tsx"]),
			readOld: (rel) => files[rel][0],
			readNew: (rel) => files[rel][1],
			importerFiles: [],
		});
	};
	const i1 = callCase('cn("flex-shrink-0 shrink")', 'cn("shrink-0 shrink")', "flex-shrink-0", "shrink-0");
	check("(i) call merge diff", i1.calls === 1 && i1.sites.call === 1 && i1.diffs.length === 1, i1);
	const i2 = callCase('cn("h-[300px] h-4")', 'cn("h-75 h-4")', "h-[300px]", "h-75");
	check("(i) call merge no diff", i2.sites.call === 1 && i2.diffs.length === 0, i2);
	// (j)/(k) caller-to-base across two files.
	const twoFile = (prop, callerClass) => {
		const dir = path.join(OUT, "canonicalize-selftest-j");
		fs.rmSync(dir, { recursive: true, force: true });
		fs.mkdirSync(dir, { recursive: true });
		const box = `import { cn } from "./cn";\nexport function Box({ ${prop} }: { ${prop}?: string }) {\n\treturn <div className={cn("shrink", ${prop})} />;\n}\n`;
		const caller = `import { Box } from "./box";\nexport const X = () => <Box ${prop}="${callerClass}" />;\n`;
		fs.writeFileSync(path.join(dir, "box.tsx"), box);
		fs.writeFileSync(path.join(dir, "caller.tsx"), caller);
		const report = runCodemod({ ds, ctx, root: dir, files: ["box.tsx", "caller.tsx"], importerFiles: ["box.tsx", "caller.tsx"] });
		return report.mergeCheck;
	};
	const j1 = twoFile("className", "flex-shrink-0");
	check("(j) caller-to-base diff", j1.sites["caller-to-base"] === 1 && j1.diffs.length === 1 && j1.diffs[0].kind === "caller-to-base", j1);
	const j2 = twoFile("className", "p-2");
	check("(j) caller-to-base no diff", j2.diffs.length === 0, j2);
	const k1 = twoFile("contentClassName", "flex-shrink-0");
	check("(k) class-carrying prop diff", k1.sites["caller-to-base"] === 1 && k1.diffs.length === 1, k1);
	// (m) cascade-equivalence exception, on the project design system (never canonicalized).
	const projectDs = await engineModule.loadProjectDesignSystem();
	const cascadeCase = (oldText, newText, pairs) => {
		const files = { "m.tsx": [oldText, newText] };
		return mergeCheck({
			root: hDir,
			ds: projectDs,
			pairs,
			editedFiles: new Set(["m.tsx"]),
			readOld: (rel) => files[rel][0],
			readNew: (rel) => files[rel][1],
			importerFiles: [],
		});
	};
	const dropzoneBase =
		"relative flex select-none flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 outline-none transition-colors hover:bg-accent/30 focus-visible:border-ring/50 data-disabled:pointer-events-none data-dragging:border-primary/30 data-invalid:border-destructive data-dragging:bg-accent/30 data-invalid:ring-destructive/20";
	const uploadCaller = (v) =>
		`group relative rounded-xl border-2 border-dashed p-10 transition-all duration-300 cursor-pointer hover:border-primary/60 hover:bg-primary/5 hover:shadow-lg hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${v}:border-primary ${v}:bg-primary/10 ${v}:shadow-lg ${v}:shadow-primary/10 ${v}:scale-[1.01]`;
	const dragOld = tokens(uploadCaller("data-[drag-over]"));
	const dragNew = tokens(uploadCaller("data-drag-over"));
	const invalidPairs = [
		{ from: "data-[invalid]:border-destructive/60", to: "data-invalid:border-destructive/60" },
		{ from: "data-[invalid]:bg-destructive/5", to: "data-invalid:bg-destructive/5" },
		...dragOld.map((from, i) => ({ from, to: dragNew[i] })).filter((p) => p.from !== p.to),
	];
	const m1 = cascadeCase(
		`cn("${dropzoneBase}", "${uploadCaller("data-[drag-over]")} data-[invalid]:border-destructive/60 data-[invalid]:bg-destructive/5")`,
		`cn("${dropzoneBase}", "${uploadCaller("data-drag-over")} data-invalid:border-destructive/60 data-invalid:bg-destructive/5")`,
		invalidPairs,
	);
	const m1Drop = m1.cascadeEquivalent[0]?.drops?.[0];
	check(
		"(m) measured bulk-import site is cascade-equivalent",
		m1.diffs.length === 0 &&
			m1.cascadeEquivalent.length === 1 &&
			m1Drop?.D === "data-invalid:border-destructive" &&
			m1Drop?.S === "data-invalid:border-destructive/60",
		m1,
	);
	const m2 = cascadeCase(
		'cn("data-invalid:border-destructive/60 data-[invalid]:border-destructive")',
		'cn("data-invalid:border-destructive/60 data-invalid:border-destructive")',
		[{ from: "data-[invalid]:border-destructive", to: "data-invalid:border-destructive" }],
	);
	check("(m) control: S before D stays a diff", m2.diffs.length === 1 && m2.cascadeEquivalent.length === 0, m2);
	const m3 = cascadeCase('cn("data-invalid:px-4 data-[invalid]:p-2")', 'cn("data-invalid:px-4 data-invalid:p-2")', [
		{ from: "data-[invalid]:p-2", to: "data-invalid:p-2" },
	]);
	check("(m) control: D declares a property S does not", m3.diffs.length === 1 && m3.cascadeEquivalent.length === 0, m3);
	const mVariant = cascadeEquivalence(projectDs, new Set(["hover:border-destructive", "data-invalid:border-destructive/60"]), new Set(["data-invalid:border-destructive/60"]));
	const mSame = cascadeEquivalence(projectDs, new Set(["data-invalid:border-destructive", "data-invalid:border-destructive/60"]), new Set(["data-invalid:border-destructive/60"]));
	check("(m) control: different variant chains fail", mVariant === null && Array.isArray(mSame) && mSame.length === 1, { mVariant, mSame });
	// (l) parity CSS comes from a design system the canonicalizer never ran on.
	const inlineCss = '@import "tailwindcss" source(none);\n@theme inline { --color-probe-x: var(--probe-x); }\n:root { --probe-x: 1px; }\n';
	const inlineDs = await __unstable__loadDesignSystem(inlineCss, { base: path.join(ROOT, "src/app") });
	const cleanDs = await __unstable__loadDesignSystem(inlineCss, { base: path.join(ROOT, "src/app") });
	const arbitrary = "bg-(--color-probe-x)";
	const canonical = canonicalOf(inlineDs, arbitrary);
	const lPair = classifyPair(cleanDs, parityContext(cleanDs, inlineCss), arbitrary, canonical);
	check(
		"(l) parity system keeps the inline form",
		canonical === "bg-probe-x" && /var\(--probe-x\)/.test(lPair.new ?? "") && lPair.class === "theme-value",
		lPair,
	);
	console.log(`canonicalize self-test: ${passed} passed`);
}

// ---------- CLI ----------

function usage(message) {
	console.error(`canonicalize: ${message}`);
	process.exit(2);
}

const args = process.argv.slice(2);
const flags = { write: false, selfTest: false, mergeOnly: false, label: "run", oldRoot: null, pairs: null, out: null };
for (let i = 0; i < args.length; i += 1) {
	const arg = args[i];
	const value = () => {
		const v = args[i + 1];
		if (v === undefined || v.startsWith("--")) usage(`${arg} needs a value`);
		i += 1;
		return v;
	};
	if (arg === "--write") flags.write = true;
	else if (arg === "--self-test") flags.selfTest = true;
	else if (arg === "--merge-check") flags.mergeOnly = true;
	else if (arg === "--label") flags.label = value();
	else if (arg === "--old-root") flags.oldRoot = value();
	else if (arg === "--pairs") flags.pairs = value();
	else if (arg === "--out") flags.out = value();
	else usage(`unknown argument ${arg}`);
}

fs.mkdirSync(OUT, { recursive: true });

if (flags.selfTest) {
	await selfTest();
	process.exit(0);
}

if (flags.mergeOnly) {
	if (flags.oldRoot === null || flags.pairs === null) usage("--merge-check needs --old-root and --pairs");
	const input = JSON.parse(fs.readFileSync(flags.pairs, "utf8"));
	const pairs = Array.isArray(input) ? input.map(({ from, to }) => ({ from, to })) : input.pairs.map(({ from, to }) => ({ from, to }));
	const editedFiles = new Set(Array.isArray(input) ? input.flatMap((p) => p.files ?? []) : input.edits.map((e) => e.file));
	const oldRoot = path.resolve(flags.oldRoot);
	const result = mergeCheck({
		root: ROOT,
		ds: await engineModule.loadProjectDesignSystem(),
		pairs,
		editedFiles,
		readOld: (rel) => fs.readFileSync(fs.existsSync(path.join(oldRoot, rel)) ? path.join(oldRoot, rel) : path.join(ROOT, rel), "utf8"),
		readNew: (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8"),
		importerFiles: importerFilesUnder(ROOT),
	});
	const outPath = flags.out ?? path.join(OUT, "merge-check.json");
	fs.writeFileSync(outPath, `${JSON.stringify(result, null, 1)}\n`);
	console.log(JSON.stringify({ pairs: result.pairs, files: result.files, calls: result.calls, sites: result.sites, unresolved: result.unresolved, diffs: result.diffs.length }));
	process.exit(result.diffs.length === 0 ? 0 : 1);
}

const engine = await engineModule.loadProjectTailwindEngine();
const ds = engine.designSystem;
const scan = engineModule.scanSources(firstPartyScanSources(engine.sources, ROOT));
const files = scan.files.map((f) => path.relative(ROOT, f).replaceAll("\\", "/")).sort();
const outOfScope = files.filter((f) => f.startsWith(`${VENDORED_UI_RELATIVE_DIR}/`) || /\.test\.tsx?$/.test(f));
if (outOfScope.length > 0) {
	console.error(`canonicalize: scope error, the first-party set holds ${outOfScope.join(", ")}`);
	process.exit(2);
}
primeCanonical(ds, scan.candidates);
const parityDs = await __unstable__loadDesignSystem(engine.css, { base: engine.base });
const g8Ds = await __unstable__loadDesignSystem(engine.css, { base: engine.base });
const g8 = new Set(guardsModule.checkCanonicalCandidates(g8Ds, scan.candidates).violations);
const agreement = (report) => {
	const own = new Set(report.pairs.map((p) => `${p.from} -> ${p.to}`));
	report.g8Agreement = { g8Violations: g8.size, codemodPairs: own.size, equal: g8.size === own.size && [...own].every((p) => g8.has(p)) };
	return report.g8Agreement.equal;
};
const report = runCodemod({
	ds,
	parityDs,
	ctx: parityContext(parityDs, engine.css),
	root: ROOT,
	files,
	write: flags.write,
	beforeWrite: agreement,
	importerFiles: importerFilesUnder(ROOT),
});
const agreed = agreement(report);
report.designSystemCssSha256 = createHash("sha256").update(engine.css).digest("hex");
fs.writeFileSync(path.join(OUT, `canonicalize-${flags.label}.json`), `${JSON.stringify(report, null, 1)}\n`);
console.log(JSON.stringify({ ...report.counts, mismatches: report.mismatches.length, mergeCheckDiffs: report.mergeCheck.diffs.length, orderFlips: report.orderFlips.length, flagged: report.flagged.length, g8Agreement: agreed, written: report.written }));
if (!agreed) {
	console.error(`canonicalize: the codemod pairs (${report.g8Agreement.codemodPairs}) differ from the G8 violations (${g8.size})`);
	process.exit(2);
}
process.exit(exitCodeFor(report));
