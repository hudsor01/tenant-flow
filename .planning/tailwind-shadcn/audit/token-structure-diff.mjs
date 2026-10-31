// Structure-agnostic light/dark value diff of two globals.css files (66.2-16, D-24 + H12).
// Read-only against the repo: reads the two input files, writes reports to $TW_AUDIT_OUT
// (default: <tmpdir>/tenantflow-tw-audit), never to the repo.
//
// Usage (from the repo root):
//   node .planning/tailwind-shadcn/audit/token-structure-diff.mjs <pre.css> <post.css>
//   node .planning/tailwind-shadcn/audit/token-structure-diff.mjs --self-test
//
// For each input, every --color-* key of the @theme context (inline or not) is resolved to
// its light and dark source strings, independent of the token structure:
//   light  the theme or :root value of the last member of its var() alias chain
//   dark   the dark-scope value of the first chain member that has one, else null
// The chain resolver and the context split are the G4 helpers of
// src/test/utils/tailwind-guards.ts (collectCustomPropertiesByContext,
// resolveCustomPropertyChain), so the legacy literal-@theme + layered dark rule and the
// :root/.dark + @theme inline structure resolve the same way.
//
// It also compares every non-color custom property declared in an @theme at-rule (key
// "<params or default> <prop>") and the top-level sidebar blocks (every top-level node whose
// direct declarations are all --sidebar* or --color-sidebar*), byte for byte.
//
// Outputs:
//   $TW_AUDIT_OUT/token-structure-diff.json  { pre, post, onlyPre, onlyPost, mismatches,
//                                              nonColorThemeChanged, sidebarBlocksIdentical }
//   $TW_AUDIT_OUT/theme-color-names.txt      the post --color-* names, sorted, one per line
// stdout: a one-line summary.
// Exit: 0 when every list is empty, the sidebar blocks are identical and both counts are
// equal pre/post; 1 otherwise; 2 on a usage error.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const OUT = process.env.TW_AUDIT_OUT ?? path.join(os.tmpdir(), "tenantflow-tw-audit");
const require = createRequire(path.join(ROOT, "package.json"));
const postcss = require("postcss");
const { collectCustomPropertiesByContext, resolveCustomPropertyChain } = await import(
	pathToFileURL(path.join(ROOT, "src/test/utils/tailwind-guards.ts")).href
);

function nearestAtRule(node) {
	for (let p = node.parent; p; p = p.parent) {
		if (p.type === "atrule") return p;
	}
	return null;
}

export function resolveColors(css) {
	const ctx = collectCustomPropertiesByContext(css);
	const colors = new Map();
	let themeColorKeys = 0;
	for (const key of ctx.theme.keys()) {
		if (!key.startsWith("--color-")) continue;
		themeColorKeys += 1;
		const chain = resolveCustomPropertyChain(key, ctx);
		const last = chain.at(-1);
		const light = (ctx.theme.get(last) ?? ctx.root.get(last) ?? null)?.trim() ?? null;
		const darkName = chain.find((name) => ctx.dark.has(name));
		const dark = darkName === undefined ? null : ctx.dark.get(darkName).trim();
		colors.set(key, { light, dark });
	}
	return { colors, counts: { themeColorKeys, darkKeys: ctx.dark.size } };
}

export function nonColorTheme(css) {
	const out = new Map();
	postcss.parse(css).walkDecls((decl) => {
		const at = nearestAtRule(decl);
		if (at === null || at.name !== "theme") return;
		if (!decl.prop.startsWith("--") || decl.prop.startsWith("--color-")) return;
		out.set(`${at.params.trim() || "default"} ${decl.prop}`, decl.value.trim());
	});
	return out;
}

export function sidebarBlocks(css) {
	const blocks = [];
	for (const node of postcss.parse(css).nodes) {
		if (!Array.isArray(node.nodes)) continue;
		const decls = node.nodes.filter((child) => child.type === "decl");
		if (decls.length === 0) continue;
		if (decls.every((d) => d.prop.startsWith("--sidebar") || d.prop.startsWith("--color-sidebar"))) {
			blocks.push(node.toString());
		}
	}
	return blocks;
}

export function compare(preCss, postCss) {
	const pre = resolveColors(preCss);
	const post = resolveColors(postCss);
	const onlyPre = [...pre.colors.keys()].filter((k) => !post.colors.has(k)).sort();
	const onlyPost = [...post.colors.keys()].filter((k) => !pre.colors.has(k)).sort();
	const mismatches = [];
	for (const [name, a] of pre.colors) {
		const b = post.colors.get(name);
		if (b === undefined) continue;
		if (a.light !== b.light || a.dark !== b.dark) mismatches.push({ name, pre: a, post: b });
	}
	const ncPre = nonColorTheme(preCss);
	const ncPost = nonColorTheme(postCss);
	const nonColorThemeChanged = [...new Set([...ncPre.keys(), ...ncPost.keys()])]
		.filter((k) => ncPre.get(k) !== ncPost.get(k))
		.sort();
	const sbPre = sidebarBlocks(preCss);
	const sbPost = sidebarBlocks(postCss);
	const sidebarBlocksIdentical =
		sbPre.length === sbPost.length && sbPre.every((block, i) => block === sbPost[i]);
	return {
		pre: pre.counts,
		post: post.counts,
		onlyPre,
		onlyPost,
		mismatches,
		nonColorThemeChanged,
		sidebarBlocksIdentical,
		sidebarBlockCount: { pre: sbPre.length, post: sbPost.length },
		postColorNames: [...post.colors.keys()].sort(),
	};
}

export function passes(r) {
	return (
		r.onlyPre.length === 0 &&
		r.onlyPost.length === 0 &&
		r.mismatches.length === 0 &&
		r.nonColorThemeChanged.length === 0 &&
		r.sidebarBlocksIdentical &&
		r.pre.themeColorKeys === r.post.themeColorKeys &&
		r.pre.darkKeys === r.post.darkKeys
	);
}

function selfTest() {
	const legacy =
		"@theme { --color-q: oklch(0.5 0 0); } @layer base { :where(.dark, .dark *) { --color-q: oklch(0.9 0 0); } }";
	const inline =
		":root { --q: oklch(0.5 0 0); } .dark { --q: oklch(0.9 0 0); } @theme inline { --color-q: var(--q); }";
	const cases = [
		[
			"legacy vs inline: 0 mismatches, equal counts",
			() => {
				const r = compare(legacy, inline);
				return (
					r.mismatches.length === 0 &&
					r.pre.themeColorKeys === r.post.themeColorKeys &&
					r.pre.darkKeys === r.post.darkKeys &&
					passes(r)
				);
			},
		],
		[
			"changed inline dark value: exactly 1 mismatch",
			() => {
				const r = compare(legacy, inline.replace("oklch(0.9 0 0)", "oklch(0.91 0 0)"));
				return r.mismatches.length === 1 && r.mismatches[0].name === "--color-q" && !passes(r);
			},
		],
		[
			"dropped post token: onlyPre lists it",
			() => {
				const r = compare(legacy, ":root { --q: oklch(0.5 0 0); } .dark { --q: oklch(0.9 0 0); }");
				return r.onlyPre.length === 1 && r.onlyPre[0] === "--color-q" && !passes(r);
			},
		],
	];
	let passed = 0;
	for (const [name, fn] of cases) {
		if (!fn()) {
			process.stderr.write(`token-structure-diff self-test FAILED: ${name}\n`);
			process.exit(1);
		}
		passed += 1;
	}
	process.stdout.write(`token-structure-diff self-test: ${passed} passed\n`);
	process.exit(0);
}

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--self-test") selfTest();
if (args.length !== 2 || args.some((a) => a.startsWith("--"))) {
	process.stderr.write("usage: token-structure-diff.mjs <pre.css> <post.css> | --self-test\n");
	process.exit(2);
}

const [prePath, postPath] = args;
const result = compare(fs.readFileSync(prePath, "utf8"), fs.readFileSync(postPath, "utf8"));
const { postColorNames, ...report } = result;
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(
	path.join(OUT, "token-structure-diff.json"),
	`${JSON.stringify({ preFile: path.resolve(prePath), postFile: path.resolve(postPath), ...report }, null, 2)}\n`,
);
fs.writeFileSync(path.join(OUT, "theme-color-names.txt"), `${postColorNames.join("\n")}\n`);
const ok = passes(result);
process.stdout.write(
	`token-structure-diff: ${ok ? "PASS" : "FAIL"} mismatches=${report.mismatches.length} onlyPre=${report.onlyPre.length} onlyPost=${report.onlyPost.length} nonColorThemeChanged=${report.nonColorThemeChanged.length} sidebarBlocksIdentical=${report.sidebarBlocksIdentical} themeColorKeys=${report.pre.themeColorKeys}/${report.post.themeColorKeys} darkKeys=${report.pre.darkKeys}/${report.post.darkKeys}\n`,
);
process.exit(ok ? 0 : 1);
