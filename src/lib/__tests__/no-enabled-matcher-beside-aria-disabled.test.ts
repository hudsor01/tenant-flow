/**
 * A test whose rendered modules set `aria-disabled` asserts a control's
 * availability with `expectAvailable` / `expectUnavailable`
 * (`#test/utils/availability`), never jest-dom's `toBeEnabled()` or
 * `not.toBeDisabled()` (66.2-39 fix round 4, D1, G13).
 *
 * Those two read only the native `disabled` state. A control that keeps its
 * tab stop through `aria-disabled` and ignores its click passes them in every
 * state: the tax documents' Download PDF test called it enabled whatever its
 * unavailable reason said, and a custom category's delete was "enabled" even
 * had it rendered the default category's aria-disabled control.
 *
 * The scan parses every tracked `.ts`/`.tsx` file under `src/` (oxc, through
 * `rolldown/utils`). A module sets `aria-disabled` when it holds a JSX
 * attribute or an object key of that name. A test file (`__tests__/` or
 * `*.test.*`) renders a module when it reaches it through value imports
 * (static, re-exported or dynamic; `import type` renders nothing), resolved
 * through `package.json` `imports` or relative to the importing file, the test
 * file itself included. In a test that reaches one, each `toBeEnabled(…)` and
 * `.not.toBeDisabled(…)` call is a violation. The reach is a superset of what
 * a test renders (a mocked module still counts), which costs only a stronger
 * assertion.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { parseSync } from "rolldown/utils";
import { describe, expect, it } from "vitest";

type Node = {
	type: string;
	start: number;
	end: number;
	[key: string]: unknown;
};

function isNode(value: unknown): value is Node {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as { type?: unknown }).type === "string"
	);
}

function visit(node: Node, fn: (n: Node) => void) {
	fn(node);
	for (const [key, value] of Object.entries(node)) {
		if (key === "type" || key === "start" || key === "end") continue;
		if (Array.isArray(value)) {
			for (const v of value) if (isNode(v)) visit(v, fn);
		} else if (isNode(value)) {
			visit(value, fn);
		}
	}
}

function nameOf(node: unknown): string | null {
	if (!isNode(node)) return null;
	if (node.type === "Identifier" || node.type === "JSXIdentifier") {
		return String(node.name);
	}
	if (node.type === "Literal" && typeof node.value === "string") {
		return node.value;
	}
	return null;
}

interface Module {
	/** Value-import specifiers, in source order. */
	specifiers: string[];
	setsAriaDisabled: boolean;
	/** `line matcher` for each banned matcher call. */
	matchers: string[];
}

const ARIA_DISABLED = "aria-disabled";

function parseModule(path: string, source: string): Module {
	const { program, errors } = parseSync(path, source, {
		lang: path.endsWith(".tsx") ? "tsx" : "ts",
	});
	if (errors.length > 0) throw new Error(`${path}: ${errors[0]?.message}`);
	const root: unknown = program;
	if (!isNode(root)) throw new Error(`${path}: the parser returned no program`);
	const lineOf = (index: number) => source.slice(0, index).split("\n").length;
	const out: Module = { specifiers: [], setsAriaDisabled: false, matchers: [] };
	visit(root, (node) => {
		const source = isNode(node.source) ? nameOf(node.source) : null;
		if (
			(node.type === "ImportDeclaration" && node.importKind !== "type") ||
			((node.type === "ExportNamedDeclaration" ||
				node.type === "ExportAllDeclaration") &&
				node.exportKind !== "type") ||
			node.type === "ImportExpression"
		) {
			const typeOnly =
				node.type === "ImportDeclaration" &&
				Array.isArray(node.specifiers) &&
				node.specifiers.length > 0 &&
				node.specifiers.every((s) => isNode(s) && s.importKind === "type");
			if (source !== null && !typeOnly) out.specifiers.push(source);
		}
		if (
			(node.type === "JSXAttribute" && nameOf(node.name) === ARIA_DISABLED) ||
			(node.type === "Property" && nameOf(node.key) === ARIA_DISABLED)
		) {
			out.setsAriaDisabled = true;
		}
		if (node.type === "CallExpression" && isNode(node.callee)) {
			const callee = node.callee;
			if (callee.type !== "MemberExpression") return;
			const property = nameOf(callee.property);
			const negated =
				isNode(callee.object) &&
				callee.object.type === "MemberExpression" &&
				nameOf(callee.object.property) === "not";
			if (
				property === "toBeEnabled" ||
				(property === "toBeDisabled" && negated)
			) {
				out.matchers.push(
					`${lineOf(node.start)} ${negated ? "not." : ""}${property}()`,
				);
			}
		}
	});
	return out;
}

const EXTENSIONS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

function resolver(
	files: ReadonlySet<string>,
	aliases: Readonly<Record<string, string>>,
): (specifier: string, from: string) => string | null {
	const entries = Object.entries(aliases).map(
		([key, value]) => [key, value.replace(/^\.\//, "")] as const,
	);
	return (specifier, from) => {
		let base: string | null = null;
		for (const [pattern, target] of entries) {
			if (pattern === specifier) base = target;
			else if (
				pattern.endsWith("/*") &&
				specifier.startsWith(pattern.slice(0, -1))
			) {
				base = target.slice(0, -1) + specifier.slice(pattern.length - 1);
			}
			if (base !== null) break;
		}
		if (base === null && specifier.startsWith(".")) {
			base = posix.join(posix.dirname(from), specifier);
		}
		if (base === null) return null;
		const normalized = posix.normalize(base);
		return (
			EXTENSIONS.map((ext) => normalized + ext).find((c) => files.has(c)) ??
			null
		);
	};
}

function isTestFile(path: string): boolean {
	return /(^|\/)__tests__\/|\.test\.tsx?$/.test(path);
}

/** Each banned matcher in a test that reaches an `aria-disabled` module. */
function violations(
	sources: ReadonlyMap<string, string>,
	aliases: Readonly<Record<string, string>>,
): string[] {
	const modules = new Map<string, Module>();
	for (const [path, source] of sources) {
		modules.set(path, parseModule(path, source));
	}
	const resolve = resolver(new Set(sources.keys()), aliases);
	const out: string[] = [];
	for (const [path, module] of modules) {
		if (!isTestFile(path) || module.matchers.length === 0) continue;
		const seen = new Set<string>([path]);
		const queue = [path];
		let reached: string | null = null;
		while (queue.length > 0 && reached === null) {
			const current = queue.shift() as string;
			const m = modules.get(current);
			if (!m) continue;
			if (m.setsAriaDisabled) {
				reached = current;
				break;
			}
			for (const specifier of m.specifiers) {
				const next = resolve(specifier, current);
				if (next !== null && !seen.has(next)) {
					seen.add(next);
					queue.push(next);
				}
			}
		}
		if (reached === null) continue;
		for (const matcher of module.matchers) {
			out.push(`${path}:${matcher} (reaches ${reached})`);
		}
	}
	return out.sort();
}

function trackedSources(): Map<string, string> {
	const paths = execFileSync("git", ["ls-files", "-z", "--", "src"], {
		cwd: process.cwd(),
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
	})
		.split("\0")
		.filter((path) => /\.(ts|tsx)$/.test(path) && !path.endsWith(".d.ts"));
	const out = new Map<string, string>();
	for (const path of paths) {
		try {
			out.set(path, readFileSync(path, "utf8"));
		} catch {
			// Tracked but deleted in the working tree: nothing to scan.
		}
	}
	return out;
}

describe("no enabled matcher beside aria-disabled (66.2-39 D1)", () => {
	it("flags the matchers in a test that reaches an aria-disabled module (fixtures)", () => {
		const planted = new Map([
			[
				"src/a/export.tsx",
				"export const X = () => <button aria-disabled={true}>x</button>;",
			],
			["src/a/props.ts", 'export const p = { "aria-disabled": true };'],
			["src/a/page.tsx", 'import { X } from "./export";\nexport const P = X;'],
			["src/a/plain.tsx", "export const Y = () => <button>y</button>;"],
			[
				"src/a/__tests__/page.test.tsx",
				'import { P } from "#a/page";\nexpect(a).toBeEnabled();\nexpect(b).not.toBeDisabled();\nexpect(c).toBeDisabled();',
			],
			[
				"src/a/__tests__/props.test.ts",
				'import { p } from "../props";\nexpect(a).toBeEnabled();',
			],
			[
				"src/a/__tests__/plain.test.tsx",
				'import { Y } from "../plain";\nimport type { P } from "../page";\nexpect(a).toBeEnabled();',
			],
		]);
		expect(violations(planted, { "#a/*": "./src/a/*" })).toEqual([
			"src/a/__tests__/page.test.tsx:2 toBeEnabled() (reaches src/a/export.tsx)",
			"src/a/__tests__/page.test.tsx:3 not.toBeDisabled() (reaches src/a/export.tsx)",
			"src/a/__tests__/props.test.ts:2 toBeEnabled() (reaches src/a/props.ts)",
		]);
	});

	it("leaves none in src", () => {
		const sources = trackedSources();
		expect(sources.size).toBeGreaterThan(1000);
		const aliases = (
			JSON.parse(readFileSync("package.json", "utf8")) as {
				imports: Record<string, string>;
			}
		).imports;
		expect(Object.keys(aliases)).toContain("#test/*");
		const found = violations(sources, aliases);
		expect(
			found,
			`use expectAvailable / expectUnavailable (#test/utils/availability):\n${found.join("\n")}`,
		).toEqual([]);
	});
});
