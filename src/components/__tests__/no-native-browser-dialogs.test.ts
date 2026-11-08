/**
 * The app asks through its own dialogs, never the browser's (66.2-39 fix
 * round 4, Part 8g).
 *
 * `confirm()`, `alert()` and `prompt()` open the browser's own modal. It
 * ignores the theme, the brand, the focus styles and the AlertDialog contract
 * every other confirmation follows, and it has no DOM: Part 8f's states sweep
 * could not measure the three deletes that asked that way (the properties bulk
 * delete, an inspection room, a maintenance request), and Playwright dismisses
 * it unseen. Each now asks through `ConfirmDialog`
 * (`#components/ui/confirm-dialog`). A yes/no is a `ConfirmDialog`, an alert a
 * toast or an inline message, a prompt a Dialog with a field.
 *
 * THE SCAN. Every tracked `src/**\/*.{ts,tsx}` that is not a test, parsed with
 * oxc (`rolldown/utils`, as the other source guards parse). It fails on:
 * - a call of, or a value reference to, the global `confirm`, `alert` or
 *   `prompt`: a bare identifier that no enclosing scope declares (a parameter,
 *   a `var`/`let`/`const`, a function or class name, an import, a catch
 *   binding);
 * - any read of one of them from `window`, `globalThis`, `self`, `top`,
 *   `parent`, `frames` or `document.defaultView`, called or not
 *   (`window.confirm(…)`, `window?.alert`, `globalThis["prompt"]`);
 * - destructuring one of them from those objects (`const { confirm } = window`).
 * The fixtures below hold the scan to each of those shapes, and to the local
 * bindings it must leave alone.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseSync } from "rolldown/utils";
import { describe, expect, it } from "vitest";

type Node = {
	type: string;
	start: number;
	end: number;
	[key: string]: unknown;
};

const DIALOGS = new Set(["confirm", "alert", "prompt"]);
const GLOBALS = new Set([
	"window",
	"globalThis",
	"self",
	"top",
	"parent",
	"frames",
]);

function isNode(value: unknown): value is Node {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as { type?: unknown }).type === "string"
	);
}

function childNodes(node: Node): Node[] {
	const out: Node[] = [];
	for (const [key, value] of Object.entries(node)) {
		if (key === "type" || key === "start" || key === "end") continue;
		if (Array.isArray(value)) {
			for (const v of value) if (isNode(v)) out.push(v);
		} else if (isNode(value)) {
			out.push(value);
		}
	}
	return out;
}

function visit(node: Node, parents: Node[], fn: (n: Node, p: Node[]) => void) {
	fn(node, parents);
	const next = [...parents, node];
	for (const child of childNodes(node)) visit(child, next, fn);
}

/** The names a binding pattern declares. */
function patternNames(pattern: unknown): string[] {
	if (!isNode(pattern)) return [];
	switch (pattern.type) {
		case "Identifier":
			return [String(pattern.name)];
		case "ObjectPattern":
			return (
				Array.isArray(pattern.properties) ? pattern.properties : []
			).flatMap((p: unknown) =>
				isNode(p)
					? p.type === "RestElement"
						? patternNames(p.argument)
						: patternNames(p.value)
					: [],
			);
		case "ArrayPattern":
			return (Array.isArray(pattern.elements) ? pattern.elements : []).flatMap(
				patternNames,
			);
		case "AssignmentPattern":
			return patternNames(pattern.left);
		case "RestElement":
			return patternNames(pattern.argument);
		case "TSParameterProperty":
			return patternNames(pattern.parameter);
		default:
			return [];
	}
}

const FUNCTION_TYPES = new Set([
	"FunctionDeclaration",
	"FunctionExpression",
	"ArrowFunctionExpression",
]);

function declarationNames(statement: unknown): string[] {
	if (!isNode(statement)) return [];
	switch (statement.type) {
		case "VariableDeclaration":
			return (
				Array.isArray(statement.declarations) ? statement.declarations : []
			).flatMap((d: unknown) => (isNode(d) ? patternNames(d.id) : []));
		case "FunctionDeclaration":
		case "TSDeclareFunction":
		case "ClassDeclaration":
			return patternNames(statement.id);
		case "ImportDeclaration":
			return (
				Array.isArray(statement.specifiers) ? statement.specifiers : []
			).flatMap((s: unknown) => (isNode(s) ? patternNames(s.local) : []));
		case "ExportNamedDeclaration":
		case "ExportDefaultDeclaration":
			return declarationNames(statement.declaration);
		default:
			return [];
	}
}

/** `var` names anywhere under `node`, not inside a nested function. */
function hoistedVarNames(node: Node): string[] {
	const out: string[] = [];
	const walk = (n: Node) => {
		if (n.type === "VariableDeclaration" && n.kind === "var") {
			out.push(...declarationNames(n));
		}
		for (const child of childNodes(n)) {
			if (!FUNCTION_TYPES.has(child.type)) walk(child);
		}
	};
	walk(node);
	return out;
}

/** The names a scope node declares for the code inside it. */
function scopeNames(scope: Node): string[] {
	if (FUNCTION_TYPES.has(scope.type)) {
		const params = Array.isArray(scope.params) ? scope.params : [];
		const own =
			scope.type === "FunctionExpression" ? patternNames(scope.id) : [];
		const body = isNode(scope.body) ? hoistedVarNames(scope.body) : [];
		return [...params.flatMap(patternNames), ...own, ...body];
	}
	switch (scope.type) {
		case "Program":
			return [
				...(Array.isArray(scope.body) ? scope.body : []).flatMap(
					declarationNames,
				),
				...hoistedVarNames(scope),
			];
		case "BlockStatement":
		case "StaticBlock":
			return (Array.isArray(scope.body) ? scope.body : []).flatMap(
				declarationNames,
			);
		case "SwitchStatement":
			return (Array.isArray(scope.cases) ? scope.cases : []).flatMap(
				(c: unknown) =>
					isNode(c) && Array.isArray(c.consequent)
						? c.consequent.flatMap(declarationNames)
						: [],
			);
		case "CatchClause":
			return patternNames(scope.param);
		case "ForStatement":
			return declarationNames(scope.init);
		case "ForInStatement":
		case "ForOfStatement":
			return declarationNames(scope.left);
		case "ClassExpression":
			return patternNames(scope.id);
		default:
			return [];
	}
}

function shadowed(name: string, parents: Node[]): boolean {
	return parents.some((scope) => scopeNames(scope).includes(name));
}

/** The static name of a member's property, if any (`.confirm`, `["confirm"]`). */
function memberName(member: Node): string | null {
	const property = member.property;
	if (!isNode(property)) return null;
	if (!member.computed && property.type === "Identifier") {
		return String(property.name);
	}
	if (property.type === "Literal" && typeof property.value === "string") {
		return property.value;
	}
	if (
		property.type === "TemplateLiteral" &&
		Array.isArray(property.expressions) &&
		property.expressions.length === 0 &&
		Array.isArray(property.quasis)
	) {
		const quasi = property.quasis[0];
		const value = isNode(quasi) ? quasi.value : null;
		return typeof value === "object" && value !== null
			? String((value as { cooked?: unknown }).cooked ?? "")
			: null;
	}
	return null;
}

/** `window`, `globalThis`, … or `document.defaultView`. */
function isGlobalObject(node: unknown): boolean {
	if (!isNode(node)) return false;
	if (node.type === "Identifier") return GLOBALS.has(String(node.name));
	if (node.type === "ParenthesizedExpression") {
		return isGlobalObject(node.expression);
	}
	return (
		node.type === "MemberExpression" &&
		memberName(node) === "defaultView" &&
		isNode(node.object) &&
		node.object.type === "Identifier" &&
		node.object.name === "document"
	);
}

/**
 * Whether a bare identifier sits where it is read as a value. A property key,
 * a member's property, a binding, a label or a type name is not a read of the
 * global.
 */
function isValueRead(id: Node, parent: Node | undefined): boolean {
	if (!parent) return false;
	switch (parent.type) {
		case "MemberExpression":
			return (
				parent.object === id || (!!parent.computed && parent.property === id)
			);
		case "Property":
			return parent.value === id || (!!parent.computed && parent.key === id);
		case "PropertyDefinition":
		case "MethodDefinition":
			return parent.value === id || (!!parent.computed && parent.key === id);
		case "VariableDeclarator":
			return parent.init === id;
		case "AssignmentExpression":
			return parent.right === id;
		case "FunctionDeclaration":
		case "FunctionExpression":
		case "ArrowFunctionExpression":
			return parent.body === id;
		case "ImportSpecifier":
		case "ImportDefaultSpecifier":
		case "ImportNamespaceSpecifier":
		case "ExportSpecifier":
		case "LabeledStatement":
		case "BreakStatement":
		case "ContinueStatement":
		case "ClassDeclaration":
		case "ClassExpression":
		case "CatchClause":
		case "TSTypeReference":
		case "TSQualifiedName":
		case "TSPropertySignature":
		case "TSMethodSignature":
		case "TSInterfaceDeclaration":
		case "TSTypeAliasDeclaration":
		case "TSEnumMember":
		case "TSTypeQuery":
			return false;
		case "AssignmentPattern":
			return parent.right === id;
		case "ObjectPattern":
		case "ArrayPattern":
		case "RestElement":
			return false;
		default:
			return true;
	}
}

interface Hit {
	line: number;
	what: string;
}

/** Every native dialog in one source file. */
function scanSource(file: string, source: string): Hit[] {
	const { program, errors } = parseSync(file, source, {
		lang: file.endsWith(".ts") ? "ts" : "tsx",
	});
	if (errors.length > 0) throw new Error(`${file}: ${errors[0]?.message}`);
	const root: unknown = program;
	if (!isNode(root)) throw new Error(`${file}: no program`);
	const lineOf = (pos: number) => source.slice(0, pos).split("\n").length;
	const hits: Hit[] = [];
	visit(root, [], (node, parents) => {
		const parent = parents.at(-1);
		if (node.type === "Identifier" && DIALOGS.has(String(node.name))) {
			const name = String(node.name);
			// A pattern's own property, as in `{ confirm: c } = window`, is checked below.
			if (
				parent?.type === "Property" &&
				parents.at(-2)?.type === "ObjectPattern"
			) {
				return;
			}
			if (isValueRead(node, parent) && !shadowed(name, parents)) {
				const called =
					(parent?.type === "CallExpression" ||
						parent?.type === "NewExpression") &&
					parent.callee === node;
				hits.push({
					line: lineOf(node.start),
					what: `${called ? "a call of" : "a reference to"} the global ${name}`,
				});
			}
			return;
		}
		if (node.type === "MemberExpression") {
			const name = memberName(node);
			if (name && DIALOGS.has(name) && isGlobalObject(node.object)) {
				hits.push({
					line: lineOf(node.start),
					what: `${source.slice(node.start, node.end)}`,
				});
			}
			return;
		}
		const from =
			node.type === "VariableDeclarator"
				? node.init
				: node.type === "AssignmentExpression"
					? node.right
					: null;
		const pattern =
			node.type === "VariableDeclarator"
				? node.id
				: node.type === "AssignmentExpression"
					? node.left
					: null;
		if (!isNode(from) || !isGlobalObject(from)) return;
		if (!isNode(pattern) || pattern.type !== "ObjectPattern") return;
		const properties = Array.isArray(pattern.properties)
			? pattern.properties
			: [];
		for (const p of properties) {
			if (!isNode(p) || p.type !== "Property" || !isNode(p.key)) continue;
			const key = p.key;
			const keyName =
				key.type === "Identifier" && !p.computed
					? String(key.name)
					: key.type === "Literal" && typeof key.value === "string"
						? key.value
						: null;
			if (keyName && DIALOGS.has(keyName)) {
				hits.push({
					line: lineOf(p.start),
					what: `${keyName} destructured from ${source.slice(from.start, from.end)}`,
				});
			}
		}
	});
	return hits;
}

function trackedSources(): string[] {
	return execFileSync("git", ["ls-files", "src"], { encoding: "utf8" })
		.split("\n")
		.filter(
			(f) =>
				/\.(ts|tsx)$/.test(f) &&
				!/\.d\.ts$/.test(f) &&
				!/\.(test|spec)\.(ts|tsx)$/.test(f) &&
				!f.includes("/__tests__/") &&
				!f.startsWith("src/test/"),
		);
}

describe("the scan finds each native dialog shape (fixtures)", () => {
	const lines = (source: string, lang: "a.ts" | "a.tsx" = "a.tsx") =>
		scanSource(lang, source).map((h) => `${h.line}: ${h.what}`);

	it("a bare global call or reference, and a read on a global object", () => {
		expect(
			lines(
				[
					'if (confirm("Delete?")) remove();',
					'alert("Saved");',
					'const name = prompt("Name?");',
					"const ask = confirm;",
					"<button onClick={() => window.confirm('x')} />;",
					'window?.alert?.("y");',
					'globalThis["prompt"]("z");',
					"self[`confirm`]('w');",
					"document.defaultView.alert('v');",
					"const { confirm: c, alert: a } = window;",
					"run({ confirm });",
				].join("\n"),
			),
		).toEqual([
			"1: a call of the global confirm",
			"2: a call of the global alert",
			"3: a call of the global prompt",
			"4: a reference to the global confirm",
			"5: window.confirm",
			"6: window?.alert",
			'7: globalThis["prompt"]',
			"8: self[`confirm`]",
			"9: document.defaultView.alert",
			"10: confirm destructured from window",
			"10: alert destructured from window",
			"11: a reference to the global confirm",
		]);
	});

	it("leaves a local binding of the same name, and names that are not reads", () => {
		expect(
			lines(
				[
					"import { confirm } from './x';",
					"confirm();",
					"function f(alert: () => void) { alert(); }",
					"const g = ({ prompt }: { prompt: () => void }) => prompt();",
					"try { run(); } catch (alert) { alert(); }",
					"const options = { confirm: true, alert: 'x' };",
					"dialog.confirm(); state.alert;",
					"type T = { prompt: string };",
					"<Dialog confirm alert={1} />;",
					"for (const prompt of list) prompt();",
				].join("\n"),
			),
		).toEqual([]);
	});

	it("a local in one scope does not hide the global in another", () => {
		expect(
			lines(
				[
					"function a() { const confirm = () => true; return confirm(); }",
					"function b() { return confirm('real'); }",
					"function c() { if (x) { var alert = noop; } alert(); }",
				].join("\n"),
				"a.ts",
			),
		).toEqual(["2: a call of the global confirm"]);
	});
});

describe("no native browser dialog in the app", () => {
	const files = trackedSources();

	it("scans the app's sources (the scan is not vacuous)", () => {
		expect(files.length).toBeGreaterThan(800);
		expect(files).toContain("src/components/ui/confirm-dialog.tsx");
	});

	it("asks through the app's own dialogs: no confirm, alert or prompt", () => {
		const bad: string[] = [];
		for (const file of files) {
			for (const hit of scanSource(file, readFileSync(file, "utf8"))) {
				bad.push(`${file}:${hit.line} ${hit.what}`);
			}
		}
		expect(bad).toEqual([]);
	});
});
