/**
 * Every submit button sits inside the form it submits, or names it (66.2-39
 * fix round 4, Part 5d).
 *
 * A `type="submit"` button submits its form owner: the `<form>` that contains
 * it, or the one its `form` attribute names. One that is rendered anywhere
 * else submits nothing, and nothing says so: TenantEditForm built its Save
 * Changes button into CardLayout's `footer` prop, which CardLayout renders in
 * its CardFooter, outside the `<form>`, so `/tenants/[id]/edit` could not
 * save; AddTenantForm rendered its submit button with no `<form>` at all.
 *
 * THE SCAN. Every tracked `src/**\/*.tsx` that is not a test, parsed with oxc
 * (through `rolldown/utils`, as the other source guards parse). For every JSX
 * element that is a submit button (a literal `type="submit"`, or a
 * `…SubmitButton` element), walk up the JSX that holds it, through fragments,
 * conditionals and render-prop or `.map()` callbacks:
 * - an enclosing `<form>` element passes, unless a portalled part (a
 *   `…Content` of a dialog, sheet, popover, menu or select, or a `…Portal`)
 *   sits between them: the portal moves the button out of the form's DOM;
 * - a `form` attribute on the button passes (it names its form);
 * - reaching a prop value (`footer={…}`) or a variable (`const footer = …`)
 *   fails: the slot decides where the button lands;
 * - reaching a component's own return fails unless the file is in
 *   `RENDERED_INSIDE_A_FORM`, and every JSX use of that component in `src`
 *   then passes the same walk (its caller's `<form>` holds it).
 * `src/components/__tests__/submit-buttons-submit-their-form.test.tsx`
 * renders the components the slot shape broke and checks `button.form`.
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

function attribute(element: Node, key: string): Node | undefined {
	const opening = element.openingElement;
	if (!isNode(opening)) return undefined;
	const attributes = Array.isArray(opening.attributes)
		? opening.attributes
		: [];
	return attributes.find(
		(a): a is Node =>
			isNode(a) && a.type === "JSXAttribute" && jsxName(a.name) === key,
	);
}

function elementName(element: Node): string {
	return isNode(element.openingElement)
		? jsxName(element.openingElement.name)
		: "";
}

/** The last segment of a JSX name: `form.SubmitButton` -> `SubmitButton`. */
function baseName(name: string): string {
	return name.split(".").at(-1) ?? name;
}

const PORTALLED =
	/(?:Dialog|AlertDialog|Sheet|Popover|DropdownMenu|Drawer|Select|HoverCard|Tooltip)Content$|Portal$/;

/** Nodes a JSX child passes through on its way up to the JSX that holds it. */
const TRANSPARENT = new Set([
	"JSXFragment",
	"JSXExpressionContainer",
	"ConditionalExpression",
	"LogicalExpression",
	"ParenthesizedExpression",
]);
/** A render-prop or `.map()` callback inside JSX. */
const CALLBACK = new Set([
	"ArrowFunctionExpression",
	"FunctionExpression",
	"BlockStatement",
	"ReturnStatement",
	"CallExpression",
	"MemberExpression",
]);

type Walk =
	| { kind: "form" }
	| { kind: "portal"; through: string }
	| { kind: "slot"; via: string }
	| { kind: "root" };

/** Where the JSX element at the end of `parents` lands, walking up its JSX. */
function walkUp(parents: Node[]): Walk {
	const portals: string[] = [];
	for (let i = parents.length - 1; i >= 0; i--) {
		const p = parents[i];
		if (!p) continue;
		if (p.type === "JSXElement") {
			const name = elementName(p);
			if (name === "form") {
				return portals.length > 0
					? { kind: "portal", through: portals.join(", ") }
					: { kind: "form" };
			}
			if (PORTALLED.test(name)) portals.push(name);
			continue;
		}
		if (TRANSPARENT.has(p.type)) continue;
		if (CALLBACK.has(p.type)) {
			// Keep walking only while this callback sits inside JSX.
			const holder = parents
				.slice(0, i)
				.reverse()
				.find((x) => !CALLBACK.has(x.type));
			if (holder?.type === "JSXExpressionContainer") continue;
			if (p.type === "ReturnStatement" || p.type.endsWith("Expression")) {
				return { kind: "root" };
			}
		}
		if (p.type === "JSXAttribute") {
			const owner = parents[i - 2];
			return {
				kind: "slot",
				via: `the ${jsxName(p.name)} prop of <${owner ? elementName(owner) : "?"}>`,
			};
		}
		if (p.type === "VariableDeclarator") {
			const id = p.id;
			return {
				kind: "slot",
				via: `the variable ${isNode(id) ? String(id.name) : "?"}`,
			};
		}
		return { kind: "root" };
	}
	return { kind: "root" };
}

/**
 * Files whose submit button is the root of a component that its callers
 * render inside their own `<form>`. `usedAs`: the JSX name the callers use.
 */
const RENDERED_INSIDE_A_FORM: Record<string, { usedAs: string; why: string }> =
	{
		"src/lib/forms/form-components/submit-button.tsx": {
			usedAs: "SubmitButton",
			why: "the form hook's own submit button (`form.SubmitButton`), rendered by the form that owns it",
		},
		"src/components/properties/sections/property-form-actions.tsx": {
			usedAs: "PropertyFormActions",
			why: "the property form's action row, rendered inside its <form>",
		},
		"src/components/units/unit-form-fields.tsx": {
			usedAs: "UnitFormFields",
			why: "the unit form's fields and actions (a withForm component), rendered inside its <form>",
		},
	};

interface Site {
	file: string;
	line: number;
	name: string;
	walk: Walk;
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

function scan(): { submits: Site[]; uses: Map<string, Site[]> } {
	const submits: Site[] = [];
	const uses = new Map<string, Site[]>();
	const watched = new Set(
		Object.values(RENDERED_INSIDE_A_FORM).map((v) => v.usedAs),
	);
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
			const type = attribute(node, "type");
			const literalSubmit =
				isNode(type?.value) &&
				type.value.type === "Literal" &&
				type.value.value === "submit";
			const base = baseName(name);
			if (literalSubmit || /SubmitButton$/.test(base)) {
				submits.push({
					file,
					line: lineOf(node.start),
					name,
					walk: attribute(node, "form") ? { kind: "form" } : walkUp(parents),
				});
			}
			if (watched.has(base)) {
				const list = uses.get(base) ?? [];
				list.push({
					file,
					line: lineOf(node.start),
					name,
					walk: walkUp(parents),
				});
				uses.set(base, list);
			}
		});
	}
	return { submits, uses };
}

const { submits, uses } = scan();

describe("every submit button sits inside the form it submits, or names it", () => {
	it("finds the submit buttons (the scan is not vacuous)", () => {
		expect(submits.length).toBeGreaterThan(25);
		expect(
			submits.filter((s) => s.walk.kind === "form").length,
		).toBeGreaterThan(25);
	});

	it("renders no submit button through a slot, a variable or a portal out of its form", () => {
		const bad: string[] = [];
		for (const s of submits) {
			const where =
				s.walk.kind === "slot"
					? s.walk.via
					: s.walk.kind === "portal"
						? `the portal ${s.walk.through}`
						: null;
			if (where !== null) {
				bad.push(
					`${s.file}:${s.line} <${s.name}> lands through ${where}, outside any <form>, with no form= attribute`,
				);
			}
		}
		expect(bad).toEqual([]);
	});

	it("renders a submit button at a component's root only where every caller wraps it in a <form>", () => {
		const bad: string[] = [];
		for (const s of submits.filter((x) => x.walk.kind === "root")) {
			const reviewed = RENDERED_INSIDE_A_FORM[s.file];
			if (!reviewed) {
				bad.push(
					`${s.file}:${s.line} <${s.name}> is a component's root with no <form> around it (add the <form>, a form= attribute, or review the file in RENDERED_INSIDE_A_FORM)`,
				);
				continue;
			}
			const callers = uses.get(reviewed.usedAs) ?? [];
			if (callers.length === 0) {
				bad.push(`${s.file}: no caller renders <${reviewed.usedAs}>`);
			}
			for (const c of callers) {
				if (c.walk.kind !== "form") {
					bad.push(
						`${c.file}:${c.line} renders <${c.name}> (a submit button) outside any <form>`,
					);
				}
			}
		}
		expect(bad).toEqual([]);
	});

	it("keeps RENDERED_INSIDE_A_FORM current (each file still renders its submit button at a root)", () => {
		const roots = new Set(
			submits.filter((s) => s.walk.kind === "root").map((s) => s.file),
		);
		const stale = Object.keys(RENDERED_INSIDE_A_FORM).filter(
			(f) => !roots.has(f),
		);
		expect(stale).toEqual([]);
	});
});
