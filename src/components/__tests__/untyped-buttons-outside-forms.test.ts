/**
 * No button without a `type` sits in a form (66.2-39 fix round 4, Part 8f).
 *
 * A `<button>` with no `type` attribute is `type="submit"`, and the Button
 * primitive sets none, so an untyped button that a `<form>` holds submits it
 * on every click. The property edit page renders its image gallery and its
 * dropzone inside the property form: Part 8f's states sweep opened Delete
 * image there and saw the form's update (`PATCH properties`) go out with it,
 * and the dropzone's Remove and Upload files did the same.
 *
 * THE SCAN. Every tracked `src/**\/*.tsx` that is not a test, parsed with oxc
 * (`rolldown/utils`, as `submit-buttons-inside-a-form.test.ts` parses). An
 * untyped `button` or `Button` (no `type`, no `asChild`) fails when a `<form>`
 * holds it: one that encloses it in its own file with no portalled part (a
 * `…Content` of a dialog, sheet, popover, menu or select, or a `…Portal`)
 * between them, or, when it sits at its component's root with no portal on
 * the way, a `<form>` around a JSX use of that component (or of a component
 * that renders it, five levels up) anywhere in `src`.
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

function jsxName(name: unknown): string {
	if (!isNode(name)) return "";
	if (name.type === "JSXIdentifier") return String(name.name);
	if (name.type === "JSXMemberExpression") {
		return `${jsxName(name.object)}.${jsxName(name.property)}`;
	}
	return "";
}

function elementName(element: Node): string {
	const opening = element.openingElement;
	return isNode(opening) ? jsxName(opening.name) : "";
}

function hasAttribute(element: Node, key: string): boolean {
	const opening = element.openingElement;
	if (!isNode(opening) || !Array.isArray(opening.attributes)) return false;
	return opening.attributes.some(
		(a) => isNode(a) && a.type === "JSXAttribute" && jsxName(a.name) === key,
	);
}

const PORTALLED =
	/(?:Dialog|AlertDialog|Sheet|Popover|DropdownMenu|Drawer|Select|HoverCard|Tooltip)Content$|Portal$/;

/** Where an element lands: a `<form>` in its file, a portal, or its component's root. */
type Place = "form" | "portal" | "root";

function placeOf(parents: Node[]): Place {
	let portalled = false;
	for (let i = parents.length - 1; i >= 0; i--) {
		const p = parents[i];
		if (!p) continue;
		if (p.type === "JSXElement") {
			const name = elementName(p);
			if (name === "form") return portalled ? "portal" : "form";
			if (PORTALLED.test(name)) portalled = true;
		}
		if (p.type === "FunctionDeclaration") break;
	}
	return portalled ? "portal" : "root";
}

/** The capitalized function or variable the element is rendered by. */
function componentOf(parents: Node[]): string | null {
	for (let i = parents.length - 1; i >= 0; i--) {
		const p = parents[i];
		if (!p) continue;
		if (
			(p.type === "FunctionDeclaration" || p.type === "VariableDeclarator") &&
			isNode(p.id) &&
			/^[A-Z]/.test(String(p.id.name))
		) {
			return String(p.id.name);
		}
	}
	return null;
}

interface Site {
	file: string;
	line: number;
	name: string;
	place: Place;
	component: string | null;
}

function trackedSources(): string[] {
	return execFileSync("git", ["ls-files", "src"], { encoding: "utf8" })
		.split("\n")
		.filter(
			(f) =>
				f.endsWith(".tsx") &&
				!/\.test\.tsx$/.test(f) &&
				!f.includes("/__tests__/") &&
				!f.startsWith("src/test/"),
		);
}

function scan(): { untyped: Site[]; uses: Map<string, Site[]> } {
	const untyped: Site[] = [];
	const uses = new Map<string, Site[]>();
	for (const file of trackedSources()) {
		const source = readFileSync(file, "utf8");
		const { program, errors } = parseSync(file, source, { lang: "tsx" });
		if (errors.length > 0) throw new Error(`${file}: ${errors[0]?.message}`);
		const root: unknown = program;
		if (!isNode(root)) throw new Error(`${file}: no program`);
		const lineOf = (pos: number) => source.slice(0, pos).split("\n").length;
		visit(root, [], (node, parents) => {
			if (node.type !== "JSXElement") return;
			const name = elementName(node);
			const site = {
				file,
				line: lineOf(node.start),
				name,
				place: placeOf(parents),
				component: componentOf(parents),
			};
			if (name === "button" || name === "Button") {
				if (!hasAttribute(node, "type") && !hasAttribute(node, "asChild")) {
					untyped.push(site);
				}
				return;
			}
			if (/^[A-Z]/.test(name)) {
				const base = name.split(".").at(-1) ?? name;
				uses.set(base, [...(uses.get(base) ?? []), site]);
			}
		});
	}
	return { untyped, uses };
}

const { untyped, uses } = scan();

/** The `<form>` that holds a component's root, through its callers, if any. */
function formAround(
	component: string,
	depth = 0,
	seen = new Set<string>(),
): string | null {
	if (depth > 5 || seen.has(component)) return null;
	seen.add(component);
	for (const use of uses.get(component) ?? []) {
		if (use.place === "form") return `${use.file}:${use.line} <${use.name}>`;
		if (use.place === "root" && use.component) {
			const up = formAround(use.component, depth + 1, seen);
			if (up) return `${use.file}:${use.line} <${use.name}> in ${up}`;
		}
	}
	return null;
}

describe("no button without a type sits in a form", () => {
	it("finds the untyped buttons (the scan is not vacuous)", () => {
		expect(untyped.length).toBeGreaterThan(100);
		expect(uses.size).toBeGreaterThan(100);
	});

	it("leaves no untyped button where a form holds it, in its file or through its callers", () => {
		const bad: string[] = [];
		for (const site of untyped) {
			if (site.place === "form") {
				bad.push(
					`${site.file}:${site.line} <${site.name}> has no type, inside a <form>`,
				);
			} else if (site.place === "root" && site.component) {
				const holder = formAround(site.component);
				if (holder) {
					bad.push(
						`${site.file}:${site.line} <${site.name}> has no type, and ${site.component} renders inside a <form> (${holder})`,
					);
				}
			}
		}
		expect(bad).toEqual([]);
	});
});
