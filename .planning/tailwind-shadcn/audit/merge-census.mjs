// tailwind-merge census for TenantFlow (66.2-09, PATTERNS #9). Read-only: writes
// merge-census.json to $TW_AUDIT_OUT (default: <tmpdir>/tenantflow-tw-audit),
// never to the repo, and prints the same JSON.
// Run from the repo root:  node .planning/tailwind-shadcn/audit/merge-census.mjs
//
// It answers one question: does the project cn (tailwind-merge extended with
// TAILWIND_MERGE_EXTENSION from src/lib/utils.ts) render a different class list
// than vanilla twMerge anywhere today? For every cn/cva/twMerge call in src/
// whose string arguments carry a custom key, it joins every string literal and
// template quasi in the arguments (over-approximating conditional branches) and
// merges the result both ways. It also lists capitalized JSX elements whose
// className carries a custom key, because a component that merges className
// with cn is a second merge point. The key regex is built from the extension
// itself, so a later plan that edits the extension reruns this unchanged.
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const require = createRequire(path.join(ROOT, "package.json"));
const { parse } = require("@babel/parser");
const tm = require("tailwind-merge");
const { TAILWIND_MERGE_EXTENSION } = await import(pathToFileURL(path.join(ROOT, "src/lib/utils.ts")).href);
const ext = tm.extendTailwindMerge(TAILWIND_MERGE_EXTENSION);

const OUT = process.env.TW_AUDIT_OUT ?? path.join(os.tmpdir(), "tenantflow-tw-audit");
fs.mkdirSync(OUT, { recursive: true });

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
const strings = (group) => (group ?? []).filter((v) => typeof v === "string");
const theme = TAILWIND_MERGE_EXTENSION.extend?.theme ?? {};
const durations = (TAILWIND_MERGE_EXTENSION.extend?.classGroups?.duration ?? []).flatMap((entry) =>
	entry !== null && typeof entry === "object" ? strings(entry.duration) : [],
);
const alternatives = [
	...strings(theme.text).map((k) => `text-${esc(k)}`),
	...strings(theme.leading).map((k) => `leading-${esc(k)}`),
	...strings(theme.spacing).map((k) => `[a-z-]+-${esc(k)}`),
	...durations.map((k) => `duration-${esc(k)}`),
].sort((a, b) => b.length - a.length);
if (alternatives.length === 0) throw new Error("TAILWIND_MERGE_EXTENSION lists no key: nothing to census");
const KEY_RE = new RegExp(`\\b(${alternatives.join("|")})\\b`);

const srcDir = path.join(ROOT, "src");
const files = fs
	.readdirSync(srcDir, { recursive: true, encoding: "utf8" })
	.map((f) => f.replaceAll("\\", "/"))
	.filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith(".d.ts") && !f.includes("__tests__/") && !/\.test\./.test(f))
	.sort();

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
	return out;
}

function elementName(name) {
	if (name.type === "JSXIdentifier") return name.name;
	if (name.type === "JSXMemberExpression") return `${elementName(name.object)}.${name.property.name}`;
	if (name.type === "JSXNamespacedName") return `${name.namespace.name}:${name.name.name}`;
	return "";
}

const tokens = (s) => s.split(/\s+/).filter(Boolean);
const CALLEES = new Set(["cn", "cva", "twMerge"]);
let callsScanned = 0;
let callsWithCustomKey = 0;
const calls = [];
const diffs = [];
const componentClassNames = [];

for (const rel of files) {
	const file = `src/${rel}`;
	const text = fs.readFileSync(path.join(ROOT, file), "utf8");
	if (!KEY_RE.test(text)) continue;
	const ast = parse(text, { sourceType: "module", plugins: ["typescript", "jsx"] });
	walk(ast.program, (node) => {
		if (node.type === "CallExpression" && node.callee.type === "Identifier" && CALLEES.has(node.callee.name)) {
			callsScanned += 1;
			const joined = collectStrings(node.arguments).join(" ").replace(/\s+/g, " ").trim();
			if (!KEY_RE.test(joined)) return;
			callsWithCustomKey += 1;
			const vanilla = tm.twMerge(joined);
			const extended = ext(joined);
			const line = node.loc?.start.line;
			calls.push({ file, line, callee: node.callee.name, match: joined.match(KEY_RE)?.[1] });
			if (vanilla !== extended) {
				const v = new Set(tokens(vanilla));
				const e = new Set(tokens(extended));
				diffs.push({
					file,
					line,
					callee: node.callee.name,
					vanilla,
					extended,
					droppedByVanilla: [...e].filter((t) => !v.has(t)),
					droppedByExtended: [...v].filter((t) => !e.has(t)),
				});
			}
		} else if (node.type === "JSXOpeningElement") {
			const element = elementName(node.name);
			if (!/^[A-Z]/.test(element)) return;
			for (const attr of node.attributes) {
				if (attr.type !== "JSXAttribute" || attr.name.type !== "JSXIdentifier" || attr.name.name !== "className") continue;
				const source = text.slice(attr.start, attr.end);
				const match = source.match(KEY_RE);
				if (match) componentClassNames.push({ file, line: attr.loc?.start.line, element, match: match[1] });
			}
		}
	});
}

const report = {
	keyPattern: KEY_RE.source,
	filesScanned: files.length,
	callsScanned,
	callsWithCustomKey,
	calls,
	diffs,
	componentClassNames,
};
fs.writeFileSync(path.join(OUT, "merge-census.json"), `${JSON.stringify(report, null, 1)}\n`);
console.log(JSON.stringify(report, null, 1));
