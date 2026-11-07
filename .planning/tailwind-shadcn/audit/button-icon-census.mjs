// Button icon and shrink census for TenantFlow (66.2-22, D-29, VD-20). Read-only:
// writes the full report to --out (default: $TW_AUDIT_OUT/button-icon-census.json,
// $TW_AUDIT_OUT defaulting to <tmpdir>/tenantflow-tw-audit) and prints a counts line.
// Run from the repo root:
//   node .planning/tailwind-shadcn/audit/button-icon-census.mjs [--out <file>] [--self-test]
//
// Why it exists. The shadcn new-york-v4 buttonVariants base carries
// [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 and
// shrink-0. The svg rule compiles to a descendant selector with a class, an element and
// a :not() attribute test, so it out-specifies an icon's own h-N and w-N classes and its
// width/height presentation attributes: any svg under a Button without a size- class
// renders 16px. The host's shrink-0 stops a Button from shrinking in a flex row. This tool
// finds every svg the rule reaches and every Button that could have been shrinking.
//
// Hosts. A JSX element is a host when it is Button bound to an import from
// #components/ui/button (or a relative ./button or ../button), AlertDialogAction or
// AlertDialogCancel, or any element whose className expression calls buttonVariants.
// Every JSX descendant of a host counts, at any depth, including JSX inside conditional
// and logical expressions (the rule is a descendant selector).
//
// Classes. The static class string of an element joins every string literal and template
// quasi inside its className expression, following same-file identifiers one hop (a cva
// call, a string or an object of strings). A lucide-react element gets the classes the
// library renders (lucide lucide-<kebab name>) in front. hasSize mirrors [class*='size-']
// exactly: the class string contains the substring "size-".
//
// Icon elements: lucide identifiers, intrinsic svg, member expressions on a local value
// (config.icon), capitalized names bound in the same file by a declarator, a destructuring
// pattern or a parameter (never an import), and components (same file or imported through
// the package.json imports map or a relative path, one re-export hop) whose function
// returns an svg or a lucide element as its root.
//
// Icon kinds, tested in this order (a className with no static string is unresolved):
//   has-size    the class string contains "size-"
//   h4w4        the h-/w- tokens are exactly h-4 and w-4
//   convert     one equal h-N/w-N pair per variant prefix, N not 4 somewhere; target size-N
//   attr-sized  width/height attributes (or the lucide size prop) and no h-/w- token;
//               target size-<px/4>
//   unsized     no size-, h- or w- token and no width/height attribute
//   mixed       any other combination of h-/w- tokens
//   unresolved  no static class string, or (reason unresolved-definition) a sized
//               component whose definition could not be resolved
//   nested-sized an svg or lucide element with an h-/w- token or width/height and no
//               size- class, one definition deep inside a non-svg component in a host
//
// Shrink rows: every host whose tokens include w-full, w-[...], w-<n>, basis-*, max-w-*,
// truncate, overflow-hidden or min-w-0 and none of flex-1, flex-auto, flex-none, grow or
// shrink-<n>. The parent is the nearest JSX ancestor, skipping fragments and asChild
// wrappers (a Slot merges into its child, so the DOM parent is the wrapper's parent); a
// component parent is resolved to the intrinsic root of its definition. Verdicts:
// has-shrink, exempt-floor, exempt-not-flex, exempt-col, exempt-auto, exempt-sole-child (the
// only child of the row and w-full at every row breakpoint), add-shrink, review.
// A review row that the tool cannot resolve is settled in MANUAL_VERDICTS below.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const require = createRequire(path.join(ROOT, "package.json"));
const { parse } = require("@babel/parser");
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

const BREAKPOINTS = ["", "sm", "md", "lg", "xl", "2xl"];
// Custom flex utilities from src/app/globals.css (@utility blocks that @apply flex).
const CUSTOM_FLEX = {
	"flex-center": "row",
	"inline-flex-center": "row",
	"flex-between": "row",
	"flex-start": "row",
	"flex-col-center": "col",
};
// Packages whose components render a known non-svg element (resolution for bare imports).
const KNOWN_PACKAGE_COMPONENTS = {
	"next/link": { default: "a" },
	"next/image": { default: "img" },
};
// The Button definition itself is not a call site.
const BUTTON_DEFINITION = "src/components/ui/button.tsx";
// Manual verdicts for review rows the tool cannot resolve, read from the parent's own
// definition: key = `${file}:${parentName}` (or `${file}:<root>` for a Button that is the
// root of a component function).
const MANUAL_VERDICTS = {
	"src/components/ledger/ledger-date-field.tsx:Popover": {
		verdict: "exempt-col",
		reason:
			"Popover (radix Popover.Root) renders no DOM element, so the DOM parent of the PopoverTrigger asChild Button is Field, whose fieldVariants vertical default is flex flex-col with [&>*]:w-full",
	},
	"src/components/pricing/pricing-comparison-table.tsx:Collapsible": {
		verdict: "exempt-not-flex",
		reason:
			"Collapsible renders radix Collapsible.Root, a plain div with no className at this call site, so the CollapsibleTrigger asChild Button's parent has no flex token",
	},
	"src/components/ui/calendar.tsx:<root>": {
		verdict: "exempt-not-flex",
		reason:
			"CalendarDayButton is rendered by react-day-picker inside the day cell, whose classNames.day (relative w-full h-full p-0 text-center ... aspect-square select-none) has no flex token",
	},
};

const SKIP_KEYS = new Set(["loc", "start", "end", "leadingComments", "trailingComments", "innerComments", "extra", "range"]);

function children(node) {
	const out = [];
	for (const key of Object.keys(node)) {
		if (SKIP_KEYS.has(key)) continue;
		const v = node[key];
		if (Array.isArray(v)) {
			for (const c of v) if (c && typeof c.type === "string") out.push(c);
		} else if (v && typeof v.type === "string") out.push(v);
	}
	return out;
}

function walk(node, visit, ancestors = []) {
	if (visit(node, ancestors) === false) return;
	ancestors.push(node);
	for (const c of children(node)) walk(c, visit, ancestors);
	ancestors.pop();
}

const kebab = (name) =>
	name
		.replace(/Icon$/, "")
		.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
		.replace(/([a-zA-Z])([0-9])/g, "$1-$2")
		.toLowerCase();

function splitVariants(token) {
	const parts = [];
	let depth = 0;
	let cur = "";
	for (const ch of token) {
		if (ch === "[" || ch === "(") depth++;
		if (ch === "]" || ch === ")") depth--;
		if (ch === ":" && depth === 0) {
			parts.push(cur);
			cur = "";
		} else cur += ch;
	}
	parts.push(cur);
	const util = parts.pop().replace(/^!|!$/g, "");
	return { prefix: parts.length ? `${parts.join(":")}:` : "", util, variants: parts };
}

const tokensOf = (classString) => classString.split(/\s+/).filter(Boolean);
const isHW = (util) => /^-?(h|w)-./.test(util);

// ---------- file model ----------

const fileCache = new Map();

function loadFile(file, fsys) {
	if (fileCache.has(file)) return fileCache.get(file);
	const src = fsys.read(file);
	if (src === null) {
		fileCache.set(file, null);
		return null;
	}
	const ast = parse(src, { sourceType: "module", plugins: ["jsx", "typescript"] });
	const model = { file, ast, imports: new Map(), fns: new Map(), consts: new Map(), bound: new Set(), reexports: new Map() };
	for (const stmt of ast.program.body) {
		if (stmt.type === "ImportDeclaration") {
			for (const s of stmt.specifiers) {
				const imported = s.type === "ImportSpecifier" ? (s.imported.name ?? s.imported.value) : s.type === "ImportDefaultSpecifier" ? "default" : "*";
				model.imports.set(s.local.name, { source: stmt.source.value, imported });
			}
		}
		if (stmt.type === "ExportNamedDeclaration" && stmt.source) {
			for (const s of stmt.specifiers) {
				const exported = s.exported.name ?? s.exported.value;
				model.reexports.set(exported, { source: stmt.source.value, imported: s.local.name ?? s.local.value });
			}
		}
	}
	const unwrapFn = (init) => {
		if (!init) return null;
		if (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression") return init;
		if (init.type === "CallExpression" && init.arguments[0] && /^(forwardRef|memo)$/.test(init.callee.name ?? init.callee.property?.name ?? "")) return unwrapFn(init.arguments[0]);
		return null;
	};
	const bindPattern = (p) => {
		if (!p) return;
		if (p.type === "Identifier") {
			if (/^[A-Z]/.test(p.name)) model.bound.add(p.name);
		} else if (p.type === "ObjectPattern") {
			for (const prop of p.properties) bindPattern(prop.type === "RestElement" ? prop.argument : prop.value);
		} else if (p.type === "ArrayPattern") {
			for (const el of p.elements) bindPattern(el);
		} else if (p.type === "AssignmentPattern") bindPattern(p.left);
		else if (p.type === "RestElement") bindPattern(p.argument);
		else if (p.type === "TSParameterProperty") bindPattern(p.parameter);
	};
	walk(ast.program, (node) => {
		if (node.type === "FunctionDeclaration" && node.id) model.fns.set(node.id.name, node);
		if (node.type === "VariableDeclarator") {
			const fn = unwrapFn(node.init);
			if (node.id.type === "Identifier" && fn) model.fns.set(node.id.name, fn);
			else if (node.id.type === "Identifier") {
				if (node.init) model.consts.set(node.id.name, node.init);
				bindPattern(node.id);
			} else bindPattern(node.id);
		}
		if (/Function/.test(node.type) && node.params) for (const p of node.params) bindPattern(p);
	});
	fileCache.set(file, model);
	return model;
}

function resolveSpecifier(fromFile, spec, fsys) {
	let base = null;
	if (spec.startsWith("#")) {
		for (const [key, target] of Object.entries(PKG.imports ?? {})) {
			if (key.endsWith("/*") && spec.startsWith(key.slice(0, -1))) base = path.join(target.slice(2, -1), spec.slice(key.length - 1));
			else if (key === spec) base = target.slice(2);
		}
	} else if (spec.startsWith(".")) base = path.join(path.dirname(fromFile), spec);
	if (base === null) return null;
	for (const cand of [base, `${base}.tsx`, `${base}.ts`, path.join(base, "index.tsx"), path.join(base, "index.ts")]) {
		if (/\.(tsx|ts)$/.test(cand) && fsys.exists(cand)) return path.normalize(cand);
	}
	return null;
}

function jsxName(nameNode) {
	if (nameNode.type === "JSXIdentifier") return nameNode.name;
	if (nameNode.type === "JSXMemberExpression") return `${jsxName(nameNode.object)}.${nameNode.property.name}`;
	if (nameNode.type === "JSXNamespacedName") return `${nameNode.namespace.name}:${nameNode.name.name}`;
	return "?";
}

function attr(el, name) {
	return el.openingElement.attributes.find((a) => a.type === "JSXAttribute" && a.name.name === name) ?? null;
}

// Static class strings of an expression, following same-file identifiers one hop.
function staticStrings(expr, model, depth = 0) {
	const out = [];
	const visit = (node) => {
		if (node.type === "StringLiteral") out.push(node.value);
		else if (node.type === "TemplateElement") out.push(node.value.cooked ?? node.value.raw);
		else if (node.type === "Identifier" && depth === 0 && model.consts.has(node.name)) {
			out.push(...staticStrings(model.consts.get(node.name), model, depth + 1));
		} else if (node.type === "CallExpression" && node.callee.type === "Identifier" && depth === 0 && model.consts.has(node.callee.name)) {
			out.push(...staticStrings(model.consts.get(node.callee.name), model, depth + 1));
			for (const a of node.arguments) walk(a, (n) => (visit(n), n.type === "StringLiteral" || n.type === "TemplateElement" ? false : undefined));
			return false;
		}
		return undefined;
	};
	walk(expr, (n) => visit(n));
	return out;
}

function classInfo(el, model) {
	const a = attr(el, "className");
	if (!a) return { classString: "", unresolvedClass: false, hasClassName: false };
	if (!a.value) return { classString: "", unresolvedClass: false, hasClassName: true };
	if (a.value.type === "StringLiteral") return { classString: a.value.value, unresolvedClass: false, hasClassName: true };
	const strs = staticStrings(a.value.expression, model);
	return { classString: strs.join(" "), unresolvedClass: strs.length === 0, hasClassName: true };
}

function sizeAttrs(el, isLucide) {
	const read = (name) => {
		const a = attr(el, name);
		if (!a || !a.value) return null;
		if (a.value.type === "StringLiteral") return a.value.value;
		const e = a.value.expression;
		if (e.type === "NumericLiteral") return String(e.value);
		if (e.type === "StringLiteral") return e.value;
		return "dynamic";
	};
	const out = {};
	const w = read("width");
	const h = read("height");
	if (w !== null) out.width = w;
	if (h !== null) out.height = h;
	if (isLucide) {
		const s = read("size");
		if (s !== null) {
			out.width ??= s;
			out.height ??= s;
		}
	}
	return out;
}

const isFunctionNode = (n) => /Function/.test(n.type);

// Root JSX element of a function (first return of JSX at the function's own level).
function fnRoot(fn) {
	if (fn.body.type !== "BlockStatement") return unwrapJsx(fn.body);
	let root = null;
	walk(fn.body, (node, anc) => {
		if (root) return false;
		if (node !== fn.body && isFunctionNode(node)) return false;
		if (node.type === "ReturnStatement" && node.argument) {
			const r = unwrapJsx(node.argument);
			if (r) root = r;
		}
		return anc ? undefined : undefined;
	});
	return root;
}

function unwrapJsx(e) {
	if (!e) return null;
	if (e.type === "ParenthesizedExpression") return unwrapJsx(e.expression);
	if (e.type === "JSXElement") return e;
	return null;
}

// Definition of an exported component: { file, model, fn, root, kind }.
function findDefinition(file, name, fsys, hops = 0) {
	const model = loadFile(file, fsys);
	if (!model) return null;
	if (name === "default") {
		for (const stmt of model.ast.program.body) {
			if (stmt.type === "ExportDefaultDeclaration") {
				const d = stmt.declaration;
				if (isFunctionNode(d)) return { file, model, fn: d };
				if (d.type === "Identifier" && model.fns.has(d.name)) return { file, model, fn: model.fns.get(d.name) };
			}
		}
		return null;
	}
	if (model.fns.has(name)) return { file, model, fn: model.fns.get(name) };
	if (hops === 0 && model.reexports.has(name)) {
		const r = model.reexports.get(name);
		const target = resolveSpecifier(file, r.source, fsys);
		if (target) return findDefinition(target, r.imported, fsys, 1);
	}
	if (hops === 0 && model.imports.has(name)) {
		const r = model.imports.get(name);
		const target = resolveSpecifier(file, r.source, fsys);
		if (target) return findDefinition(target, r.imported, fsys, 1);
	}
	return null;
}

// What a capitalized or member JSX name refers to, from the point of view of `model`.
function resolveElement(el, model, fsys) {
	const name = jsxName(el.openingElement.name);
	if (el.openingElement.name.type === "JSXMemberExpression") {
		const objName = name.split(".")[0];
		if (model.imports.has(objName)) return { type: "component", name, svgRoot: null, reason: "library-member" };
		return { type: "icon", via: "member", name };
	}
	if (!/^[A-Z]/.test(name)) return { type: name === "svg" ? "svg" : "intrinsic", name };
	const imp = model.imports.get(name);
	if (imp) {
		if (imp.source === "lucide-react") return { type: "lucide", name, lucide: imp.imported };
		const known = KNOWN_PACKAGE_COMPONENTS[imp.source]?.[imp.imported];
		if (known) return { type: "component", name, svgRoot: known === "svg", renders: known };
		const target = resolveSpecifier(model.file, imp.source, fsys);
		if (!target) return { type: "component", name, svgRoot: null, reason: "unresolved-import" };
		const def = findDefinition(target, imp.imported, fsys);
		if (!def) return { type: "component", name, svgRoot: null, reason: "no-definition" };
		return defElement(name, def, fsys);
	}
	if (model.fns.has(name)) return defElement(name, { file: model.file, model, fn: model.fns.get(name) }, fsys);
	if (model.bound.has(name)) return { type: "icon", via: "bound", name };
	return { type: "component", name, svgRoot: null, reason: "unknown-binding" };
}

function defElement(name, def, fsys) {
	const root = fnRoot(def.fn);
	if (!root) return { type: "component", name, svgRoot: null, reason: "no-static-root", def };
	const rootName = jsxName(root.openingElement.name);
	if (rootName === "svg") return { type: "icon", via: "svg-root", name, def, root };
	const rootImp = def.model.imports.get(rootName);
	if (rootImp && rootImp.source === "lucide-react") return { type: "icon", via: "lucide-root", name, def, root, lucide: rootImp.imported };
	return { type: "component", name, svgRoot: false, def, root };
}

function classifyIcon({ classString, unresolvedClass, attrs }) {
	if (unresolvedClass) return { kind: "unresolved", reason: "dynamic-className" };
	if (classString.includes("size-")) return { kind: "has-size" };
	const toks = tokensOf(classString).map(splitVariants);
	const hw = toks.filter((t) => isHW(t.util));
	const hasAttrs = attrs.width !== undefined || attrs.height !== undefined;
	if (!hasAttrs && hw.length === 2 && hw.every((t) => t.prefix === "") && hw.some((t) => t.util === "h-4") && hw.some((t) => t.util === "w-4")) return { kind: "h4w4" };
	if (!hasAttrs && hw.length > 0) {
		const groups = new Map();
		for (const t of hw) {
			const g = groups.get(t.prefix) ?? { h: [], w: [] };
			g[t.util.replace(/^-/, "")[0]].push(t.util.replace(/^-?(h|w)-/, ""));
			groups.set(t.prefix, g);
		}
		const ok = [...groups.values()].every((g) => g.h.length === 1 && g.w.length === 1 && g.h[0] === g.w[0]);
		if (ok && [...groups.values()].some((g) => g.h[0] !== "4")) {
			return { kind: "convert", target: [...groups.entries()].map(([p, g]) => `${p}size-${g.h[0]}`).join(" ") };
		}
	}
	if (hasAttrs && hw.length === 0) {
		const px = Number(attrs.width ?? attrs.height);
		if (attrs.width === attrs.height && Number.isFinite(px)) return { kind: "attr-sized", attrs, target: `size-${px / 4}` };
		return { kind: "mixed", attrs };
	}
	if (hw.length === 0) return { kind: "unsized" };
	return { kind: "mixed" };
}

const KIND_COUNT = {
	"has-size": "hasSize",
	h4w4: "h4w4",
	convert: "convert",
	"attr-sized": "attrSized",
	mixed: "mixed",
	unsized: "unsized",
	unresolved: "unresolved",
	"nested-sized": "nestedSized",
};

function hostKind(el, model) {
	const name = jsxName(el.openingElement.name);
	if (model.file === BUTTON_DEFINITION) return null;
	if (name === "AlertDialogAction" || name === "AlertDialogCancel") return name;
	if (name === "Button") {
		const imp = model.imports.get("Button");
		if (imp && (imp.source === "#components/ui/button" || /^\.\.?\/(.*\/)?button$/.test(imp.source))) return "Button";
	}
	const a = attr(el, "className");
	if (a?.value?.type === "JSXExpressionContainer") {
		let found = false;
		walk(a.value.expression, (n) => {
			if (n.type === "CallExpression" && n.callee.type === "Identifier" && n.callee.name === "buttonVariants") found = true;
		});
		if (found) return `buttonVariants:${name}`;
	}
	return null;
}

function iconRow(file, el, host, resolved, model) {
	const line = el.loc.start.line;
	const callsite = classInfo(el, model);
	let classString = callsite.classString;
	let unresolvedClass = callsite.unresolvedClass;
	let attrs = sizeAttrs(el, resolved.type === "lucide" || resolved.via === "lucide-root");
	let icon = resolved.name;
	if (resolved.type === "lucide") classString = `lucide lucide-${kebab(resolved.lucide)} ${classString}`;
	if (resolved.via === "svg-root" || resolved.via === "lucide-root") {
		const rootInfo = classInfo(resolved.root, resolved.def.model);
		const rootAttrs = sizeAttrs(resolved.root, resolved.via === "lucide-root");
		const prefix = resolved.via === "lucide-root" ? `lucide lucide-${kebab(resolved.lucide)} ` : "";
		classString = `${prefix}${rootInfo.classString} ${classString}`.trim();
		unresolvedClass = callsite.unresolvedClass && rootInfo.unresolvedClass;
		attrs = { ...rootAttrs, ...attrs };
		icon = `${resolved.name} (${resolved.via} ${path.relative(ROOT, resolved.def.file)})`;
	}
	const kind = classifyIcon({ classString: classString.trim(), unresolvedClass, attrs });
	const row = { file, line, host, icon, element: resolved.type === "lucide" ? "lucide" : (resolved.via ?? resolved.type), kind: kind.kind, classes: classString.trim() };
	if (kind.target) row.target = kind.target;
	if (kind.attrs) row.attrs = kind.attrs;
	if (kind.reason) row.reason = kind.reason;
	return row;
}

function nestedSized(file, host, comp, fsys) {
	const rows = [];
	const { def, root } = comp;
	walk(root, (node) => {
		if (node.type !== "JSXElement") return undefined;
		const r = resolveElement(node, def.model, fsys);
		if (r.type !== "svg" && r.type !== "lucide") return undefined;
		const info = classInfo(node, def.model);
		const attrs = sizeAttrs(node, r.type === "lucide");
		const toks = tokensOf(info.classString).map(splitVariants);
		const hw = toks.filter((t) => isHW(t.util)).map((t) => t.prefix + t.util);
		const hasSize = info.classString.includes("size-");
		if (!hasSize && (hw.length > 0 || attrs.width !== undefined || attrs.height !== undefined)) {
			rows.push({ file: path.relative(ROOT, def.file), line: node.loc.start.line, host, via: comp.name, usedIn: file, icon: r.name, kind: "nested-sized", tokens: hw, attrs });
		}
		return undefined;
	});
	return rows;
}

// ---------- shrink ----------

function layoutAt(tokens, bp) {
	const allowed = BREAKPOINTS.slice(0, BREAKPOINTS.indexOf(bp) + 1);
	let display = null;
	let dir = "row";
	for (const t of tokens) {
		if (t.variants.length > 1) continue;
		const p = t.variants[0] ?? "";
		if (!allowed.includes(p)) continue;
		if (t.util === "flex" || t.util === "inline-flex") display = "flex";
		else if (CUSTOM_FLEX[t.util]) {
			display = "flex";
			dir = CUSTOM_FLEX[t.util];
		} else if (/^(hidden|block|inline-block|inline|grid|inline-grid|contents|table)$/.test(t.util)) display = t.util;
		if (/^flex-row(-reverse)?$/.test(t.util)) dir = "row";
		if (/^flex-col(-reverse)?$/.test(t.util)) dir = "col";
	}
	return { display, dir };
}

function widthAt(tokens, bp) {
	const allowed = BREAKPOINTS.slice(0, BREAKPOINTS.indexOf(bp) + 1);
	let w = "auto";
	for (const t of tokens) {
		if (t.variants.length > 1) continue;
		const p = t.variants[0] ?? "";
		if (allowed.includes(p) && /^w-/.test(t.util)) w = t.util.slice(2);
	}
	return w;
}

const RISK = (u) => /^w-(full|\[.+\]|\d+(\.\d+)?|\d+\/\d+|px)$/.test(u) || /^basis-/.test(u) || /^max-w-/.test(u) || u === "truncate" || u === "overflow-hidden" || u === "min-w-0";
const FLEXES = (u) => /^(flex-1|flex-auto|flex-none|grow|grow-\d+|shrink-\d+)$/.test(u);

function shrinkRow(file, el, host, ancestors, model, fsys) {
	const own = tokensOf(classInfo(el, model).classString).map(splitVariants);
	const risk = own.filter((t) => RISK(t.util)).map((t) => t.prefix + t.util);
	if (risk.length === 0) return null;
	if (own.some((t) => t.prefix === "" && FLEXES(t.util))) return null;
	const row = { file, line: el.loc.start.line, host, risk, parent: null, parentClasses: "", verdict: null, reason: "", verdictSource: "tool" };
	if (own.some((t) => t.prefix === "" && t.util === "shrink")) return { ...row, verdict: "has-shrink", reason: "carries shrink" };
	const w = own.find((t) => t.prefix === "" && /^w-/.test(t.util));
	const mw = own.find((t) => t.prefix === "" && /^min-w-/.test(t.util));
	if (w && mw && w.util.slice(2) === mw.util.slice(6)) return { ...row, verdict: "exempt-floor", reason: `${mw.util} equals ${w.util}` };
	// Nearest JSX ancestor, skipping fragments and asChild wrappers.
	let parentEl = null;
	let childOfParent = el;
	const chain = [];
	for (let i = ancestors.length - 1; i >= 0; i--) {
		const a = ancestors[i];
		if (a.type === "JSXFragment") continue;
		if (a.type !== "JSXElement") continue;
		const n = jsxName(a.openingElement.name);
		if (attr(a, "asChild") && a !== el) {
			chain.push(`${n}[asChild]`);
			childOfParent = a;
			continue;
		}
		parentEl = a;
		break;
	}
	if (!parentEl) {
		const manual = MANUAL_VERDICTS[`${file}:<root>`];
		if (manual) return { ...row, parent: "<root>", ...manual, verdictSource: "manual" };
		return { ...row, parent: "<root>", verdict: "review", reason: "no JSX parent in this file" };
	}
	const pName = jsxName(parentEl.openingElement.name);
	row.parent = chain.length ? `${pName} (via ${chain.join(", ")})` : pName;
	const pInfo = classInfo(parentEl, model);
	let pClasses = pInfo.classString;
	if (pInfo.unresolvedClass && !MANUAL_VERDICTS[`${file}:${pName}`]) return { ...row, verdict: "review", reason: `parent ${pName} has no static className` };
	let intrinsic = /^[a-z]/.test(pName) && !pName.includes(".");
	let ownChildren = false;
	if (!intrinsic) {
		const r = resolveElement(parentEl, model, fsys);
		const manual = MANUAL_VERDICTS[`${file}:${pName}`];
		if (r.root && /^[a-z]/.test(jsxName(r.root.openingElement.name))) {
			const rootCls = classInfo(r.root, r.def.model).classString;
			pClasses = `${rootCls} ${pClasses}`.trim();
			ownChildren = r.root.children.some((c) => c.type !== "JSXText" || c.value.trim() !== "");
			intrinsic = true;
			row.parent = `${row.parent} -> <${jsxName(r.root.openingElement.name)}> in ${path.relative(ROOT, r.def.file)}`;
			row.verdictSource = "resolved";
		} else if (r.renders) {
			intrinsic = true;
			row.parent = `${row.parent} -> <${r.renders}>`;
			row.verdictSource = "resolved";
		} else if (manual) {
			return { ...row, parentClasses: pClasses, ...manual, verdictSource: "manual" };
		} else {
			return { ...row, parentClasses: pClasses, verdict: "review", reason: `component parent ${pName} (${r.reason ?? "non-intrinsic root"})` };
		}
	}
	row.parentClasses = pClasses;
	const pt = tokensOf(pClasses).map(splitVariants);
	const layouts = BREAKPOINTS.map((bp) => ({ bp, ...layoutAt(pt, bp) }));
	if (layouts.every((l) => l.display !== "flex")) return { ...row, verdict: "exempt-not-flex", reason: "parent is never a flex container" };
	const rowBps = layouts.filter((l) => l.display === "flex" && l.dir === "row");
	if (rowBps.length === 0) return { ...row, verdict: "exempt-col", reason: "parent is flex-col at every breakpoint" };
	// A sole w-full child: its flex basis is the container's own content box, so the free
	// space is never negative and flex-shrink has nothing to act on.
	const siblings = parentEl.children.filter((c) => c !== childOfParent && (c.type !== "JSXText" || c.value.trim() !== ""));
	const margins = own.some((t) => t.prefix === "" && /^-?m[xlrse]?-/.test(t.util));
	if (!ownChildren && siblings.length === 0 && !margins && rowBps.every((l) => widthAt(own, l.bp) === "full")) {
		return { ...row, verdict: "exempt-sole-child", reason: `the only child of the flex row, w-full at every row breakpoint (${rowBps.map((l) => l.bp || "base").join(", ")})` };
	}
	const minContent = own.some((t) => t.util === "truncate" || t.util === "overflow-hidden" || t.util === "min-w-0");
	if (!minContent && rowBps.every((l) => widthAt(own, l.bp) === "auto")) {
		return { ...row, verdict: "exempt-auto", reason: `w-auto at every row breakpoint (${rowBps.map((l) => l.bp || "base").join(", ")})` };
	}
	return { ...row, verdict: "add-shrink", reason: `parent is a flex row at ${rowBps.map((l) => l.bp || "base").join(", ")}` };
}

// ---------- census ----------

function analyze(files, fsys) {
	fileCache.clear();
	const report = { icons: [], components: [], parentSvgSelectors: [], shrink: [] };
	for (const file of files) {
		const model = loadFile(file, fsys);
		if (!model) continue;
		walk(model.ast.program, (node, ancestors) => {
			if (node.type !== "JSXElement") return undefined;
			const host = hostKind(node, model);
			if (host) {
				const hc = classInfo(node, model).classString;
				for (const t of tokensOf(hc)) {
					const s = splitVariants(t);
					if (s.variants.some((v) => v === "[&_svg]" || v === "[&>svg]" || v === "*") && /^(size|h|w)-/.test(s.util)) {
						report.parentSvgSelectors.push({ file, line: node.loc.start.line, host, token: t });
					}
				}
				const sr = shrinkRow(file, node, host, ancestors, model, fsys);
				if (sr) report.shrink.push(sr);
			}
			const hostAnc = ancestors.filter((a) => a.type === "JSXElement" && hostKind(a, model));
			if (hostAnc.length === 0) return undefined;
			const hostName = hostKind(hostAnc[hostAnc.length - 1], model);
			const r = resolveElement(node, model, fsys);
			if (r.type === "intrinsic") return undefined;
			if (r.type === "svg" || r.type === "lucide" || r.type === "icon") {
				report.icons.push(iconRow(file, node, hostName, r, model));
				return undefined;
			}
			const comp = { file, line: node.loc.start.line, host: hostName, name: r.name, svgRoot: r.svgRoot };
			if (r.reason) comp.reason = r.reason;
			if (r.def) comp.definedIn = path.relative(ROOT, r.def.file);
			report.components.push(comp);
			if (r.svgRoot === null) {
				const ci = classInfo(node, model);
				if (tokensOf(ci.classString).some((t) => isHW(splitVariants(t).util))) {
					report.icons.push({ file, line: comp.line, host: hostName, icon: r.name, element: "component", kind: "unresolved", reason: "unresolved-definition", classes: ci.classString });
				}
			}
			if (r.svgRoot === false && r.def) report.icons.push(...nestedSized(file, hostName, { ...r, name: r.name }, fsys));
			return undefined;
		});
	}
	const counts = { hasSize: 0, h4w4: 0, convert: 0, attrSized: 0, mixed: 0, unsized: 0, unresolved: 0, nestedSized: 0, addShrink: 0 };
	for (const i of report.icons) counts[KIND_COUNT[i.kind]]++;
	counts.addShrink = report.shrink.filter((s) => s.verdict === "add-shrink").length;
	return { counts, ...report };
}

function diskFs() {
	return {
		read: (f) => (fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), "utf8") : null),
		exists: (f) => fs.existsSync(path.join(ROOT, f)),
	};
}

function sourceFiles() {
	const out = execFileSync("git", ["ls-files", "--", "src/**/*.tsx", "src/*.tsx"], { cwd: ROOT, encoding: "utf8" });
	return [...new Set(out.split("\n").filter(Boolean))].filter((f) => !/__tests__\/|\.test\.|\.spec\./.test(f)).sort();
}

// ---------- self-test ----------

function selfTest() {
	const IMPORTS = 'import { Button } from "#components/ui/button";\nimport { Plus, Loader2 } from "lucide-react";\n';
	const files = {
		"src/f/has-size.tsx": `${IMPORTS}export function A() { return <Button><Plus className="size-5" /></Button>; }`,
		"src/f/h4w4.tsx": `${IMPORTS}export function A() { return <Button><Plus className="h-4 w-4 mr-2" /></Button>; }`,
		"src/f/convert.tsx": `${IMPORTS}export function A() { return <Button>{x && <Plus className="mr-1 h-3.5 w-3.5" />}</Button>; }`,
		"src/f/convert-bp.tsx": `${IMPORTS}export function A() { return <Button><span><Plus className="h-4 w-4 sm:h-5 sm:w-5" /></span></Button>; }`,
		"src/f/attr.tsx": `${IMPORTS}function G() { return <svg width="18" height="18" className="shrink-0" />; }\nexport function A() { return <Button><div><G /></div></Button>; }`,
		"src/f/unsized.tsx": `${IMPORTS}export function A() { return <Button><Plus className="text-muted-foreground" /><Loader2 /></Button>; }`,
		"src/f/mixed.tsx": `${IMPORTS}export function A() { return <Button><Plus className="h-4 w-5" /></Button>; }`,
		"src/f/unresolved.tsx": `${IMPORTS}export function A({ c }) { return <Button><Plus className={c} /></Button>; }`,
		"src/f/bound.tsx": `${IMPORTS}export function A({ item }) { const Icon = item.icon; return <Button><Icon className="h-5 w-5" /></Button>; }`,
		"src/f/member.tsx": `${IMPORTS}export function A({ config }) { return <Button><config.icon className="size-2" /></Button>; }`,
		"src/f/imported-svg.tsx": `${IMPORTS}import { Mark } from "#components/f/mark";\nexport function A() { return <Button><Mark className="h-6 w-6" /></Button>; }`,
		"src/components/f/mark.tsx": `export function Mark({ className }) { return <svg viewBox="0 0 1 1" className={className} />; }`,
		"src/f/unresolvable.tsx": `${IMPORTS}import { Ghost } from "#components/f/nowhere";\nexport function A() { return <Button><Ghost className="h-5 w-5" /></Button>; }`,
		"src/f/nested.tsx": `${IMPORTS}import { Wrap } from "#components/f/wrap";\nexport function A() { return <Button><Wrap /></Button>; }`,
		"src/components/f/wrap.tsx": `export function Wrap() { return <span><svg className="h-5 w-5" /></span>; }`,
		"src/f/alert.tsx": `${IMPORTS}export function A() { return <AlertDialogAction><Plus className="h-6 w-6" /></AlertDialogAction>; }`,
		"src/f/variants.tsx": `${IMPORTS}export function A() { return <a className={cn(buttonVariants({ variant: "ghost" }))}><Plus className="w-5 h-5" /></a>; }`,
		"src/f/parent-sel.tsx": `${IMPORTS}export function A() { return <Button className="[&_svg]:size-5"><Plus /></Button>; }`,
		"src/f/not-host.tsx": `import { Button } from "some-other-lib";\nimport { Plus } from "lucide-react";\nexport function A() { return <Button><Plus className="h-5 w-5" /></Button>; }`,
		"src/f/s-col.tsx": `${IMPORTS}export function A() { return <div className="flex flex-col gap-2"><Button className="w-full">x</Button></div>; }`,
		"src/f/s-auto.tsx": `${IMPORTS}export function A() { return <div className="flex flex-col sm:flex-row"><Button className="w-full sm:w-auto">x</Button></div>; }`,
		"src/f/s-floor.tsx": `${IMPORTS}export function A() { return <div className="flex"><Button className="w-8 min-w-8">x</Button></div>; }`,
		"src/f/s-notflex.tsx": `${IMPORTS}export function A() { return <div className="w-full"><Button className="w-full overflow-hidden">x</Button></div>; }`,
		"src/f/s-has.tsx": `${IMPORTS}export function A() { return <div className="flex"><Button className="shrink overflow-hidden">x</Button></div>; }`,
		"src/f/s-add.tsx": `${IMPORTS}export function A() { return <div className="flex flex-col sm:flex-row"><Button className="overflow-hidden" asChild><a href="/">x</a></Button></div>; }`,
		"src/f/s-review.tsx": `${IMPORTS}import { Footer } from "some-lib";\nexport function A() { return <Footer><Button className="w-full">x</Button></Footer>; }`,
		"src/f/s-aschild.tsx": `${IMPORTS}import { Trigger } from "some-lib";\nexport function A() { return <div className="flex"><Trigger asChild><Button className="truncate">x</Button></Trigger></div>; }`,
		"src/f/s-resolved.tsx": `${IMPORTS}import { Row } from "#components/f/row";\nexport function A() { return <Row><Button className="w-40">x</Button></Row>; }`,
		"src/components/f/row.tsx": `import { cn } from "#lib/utils";\nexport function Row({ className, ...p }) { return <div className={cn("flex items-center gap-2", className)} {...p} />; }`,
		"src/f/s-sole.tsx": `${IMPORTS}import { Row } from "#components/f/row";\nexport function A() { return <Row><Button className="w-full">x</Button></Row>; }`,
		"src/f/s-two.tsx": `${IMPORTS}export function A() { return <div className="flex"><span>a</span><Button className="w-full">x</Button></div>; }`,
		"src/f/s-flex1.tsx": `${IMPORTS}export function A() { return <div className="flex"><Button className="w-full flex-1">x</Button></div>; }`,
	};
	const fsys = { read: (f) => files[f] ?? null, exists: (f) => f in files };
	const r = analyze(Object.keys(files).filter((f) => f.startsWith("src/f/")), fsys);
	const iconAt = (file) => r.icons.filter((i) => i.file === file);
	const shrinkAt = (file) => r.shrink.filter((s) => s.file === file);
	const failures = [];
	const expect = (label, cond, detail) => {
		if (!cond) failures.push({ label, detail });
	};
	const one = (file, kind, extra = {}) => {
		const rows = iconAt(file);
		expect(`${file} ${kind}`, rows.length >= 1 && rows.every((x) => x.kind === kind) && Object.entries(extra).every(([k, v]) => rows[0][k] === v), rows);
	};
	one("src/f/has-size.tsx", "has-size");
	one("src/f/h4w4.tsx", "h4w4");
	one("src/f/convert.tsx", "convert", { target: "size-3.5" });
	one("src/f/convert-bp.tsx", "convert", { target: "size-4 sm:size-5" });
	one("src/f/attr.tsx", "attr-sized", { target: "size-4.5" });
	one("src/f/unsized.tsx", "unsized");
	expect("unsized count", iconAt("src/f/unsized.tsx").length === 2, iconAt("src/f/unsized.tsx"));
	one("src/f/mixed.tsx", "mixed");
	one("src/f/unresolved.tsx", "unresolved", { reason: "dynamic-className" });
	one("src/f/bound.tsx", "convert", { target: "size-5" });
	one("src/f/member.tsx", "has-size");
	one("src/f/imported-svg.tsx", "convert", { target: "size-6" });
	one("src/f/unresolvable.tsx", "unresolved", { reason: "unresolved-definition" });
	expect("nested-sized row", r.icons.filter((i) => i.usedIn === "src/f/nested.tsx" && i.kind === "nested-sized").length === 1, r.icons);
	expect("nested component svgRoot false", r.components.some((c) => c.file === "src/f/nested.tsx" && c.name === "Wrap" && c.svgRoot === false), r.components);
	expect("nested row in defining file", iconAt("src/components/f/wrap.tsx").length === 1 && iconAt("src/components/f/wrap.tsx")[0].via === "Wrap", r.icons);
	one("src/f/alert.tsx", "convert", { host: "AlertDialogAction" });
	one("src/f/variants.tsx", "convert", { host: "buttonVariants:a", target: "size-5" });
	expect("parent selector", r.parentSvgSelectors.length === 1 && r.parentSvgSelectors[0].file === "src/f/parent-sel.tsx", r.parentSvgSelectors);
	expect("non-host Button ignored", iconAt("src/f/not-host.tsx").length === 0, iconAt("src/f/not-host.tsx"));
	const verdict = (file, v) => {
		const rows = shrinkAt(file);
		expect(`${file} ${v}`, rows.length === 1 && rows[0].verdict === v, rows);
	};
	verdict("src/f/s-col.tsx", "exempt-col");
	verdict("src/f/s-auto.tsx", "exempt-auto");
	verdict("src/f/s-floor.tsx", "exempt-floor");
	verdict("src/f/s-notflex.tsx", "exempt-not-flex");
	verdict("src/f/s-has.tsx", "has-shrink");
	verdict("src/f/s-add.tsx", "add-shrink");
	verdict("src/f/s-review.tsx", "review");
	verdict("src/f/s-aschild.tsx", "add-shrink");
	verdict("src/f/s-resolved.tsx", "add-shrink");
	verdict("src/f/s-sole.tsx", "exempt-sole-child");
	verdict("src/f/s-two.tsx", "add-shrink");
	expect("flex-1 is not a shrink row", shrinkAt("src/f/s-flex1.tsx").length === 0, shrinkAt("src/f/s-flex1.tsx"));
	const out = { selfTest: failures.length === 0 ? "pass" : "fail", checks: "kinds 7 + binding 4 + hosts 3 + verdicts 8 + parents 4", failures };
	console.log(JSON.stringify(out));
	process.exit(failures.length === 0 ? 0 : 1);
}

// ---------- main ----------

const args = process.argv.slice(2);
if (args.includes("--self-test")) selfTest();
else {
	const outIdx = args.indexOf("--out");
	const OUT_DIR = process.env.TW_AUDIT_OUT ?? path.join(os.tmpdir(), "tenantflow-tw-audit");
	const outFile = outIdx >= 0 ? args[outIdx + 1] : path.join(OUT_DIR, "button-icon-census.json");
	const files = sourceFiles();
	const result = analyze(files, diskFs());
	const report = { meta: { files: files.length, parser: `@babel/parser ${require("@babel/parser/package.json").version}`, generatedAt: new Date().toISOString() }, ...result };
	fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
	fs.writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`);
	console.log(JSON.stringify(result.counts));
}
