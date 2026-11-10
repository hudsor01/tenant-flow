/**
 * Every control that takes its name from markup has one (66.2-39 fix round 4,
 * Part 8h; WCAG 4.1.2, Level A).
 *
 * Radix's Checkbox, Switch, RadioGroupItem, Toggle and ToggleGroupItem are
 * buttons whose only content is an icon; Select's trigger and a combobox input
 * are named by their author, never by their value; Slider names a lone thumb
 * from nothing; an input, a textarea and a select take a name only from a
 * label. With none, a control is announced by its role alone: the /properties
 * table's select-all and row checkboxes read a bare "checkbox", and the
 * template form's "Background check consent" checkbox, the MFA and 2FA code
 * inputs, the renew dialog's new-rent field and three command inputs had no
 * name. No rendered check saw them: owner-axe runs axe on /dashboard and the
 * shell only, and the table view is a client state no URL names.
 *
 * THE SCAN. Every tracked non-test `src/**\/*.tsx`, parsed with oxc
 * (`rolldown/utils`, as the other source guards parse). A site is a JSX element
 * named in `CONTROLS`, or a component that passes its props to one (a wrapper,
 * found to a fixpoint, whose own call sites are then checked). A site is named
 * by any of:
 * - `aria-label` or `aria-labelledby`;
 * - an `id` that a `Label`, `FieldLabel` or `label` `htmlFor` in the same
 *   function names, rendered whenever the control is (the Label sits in no
 *   conditional branch the control is not also in);
 * - a wrapping `Label`, `FieldLabel` or `label`;
 * - for a role named from its content (checkbox, switch, radio, toggle), text
 *   children;
 * - for a `CommandInput`, the `label` of the `Command` or `CommandDialog` it
 *   is in (cmdk labels its input by the Command's hidden label);
 * - `{...getInputProps()}` (react-dropzone's file input carries
 *   `aria-label="file upload"`).
 * A `type="hidden"` input and one hidden by the `hidden` class (display none,
 * outside the accessibility tree) need none. A placeholder or a title is not a
 * name. `NAMED_ELSEWHERE` holds the sites named outside the markup, each with
 * its reason, and fails when one is no longer a hit.
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

/** Controls a caller names, and the primitives the vendored files wrap. */
const CONTROLS: ReadonlySet<string> = new Set([
	"Checkbox",
	"Switch",
	"RadioGroupItem",
	"SelectTrigger",
	"Slider",
	"Toggle",
	"ToggleGroupItem",
	"InputOTP",
	"Input",
	"Textarea",
	"ComboboxInput",
	"CommandInput",
	"input",
	"textarea",
	"select",
	"CheckboxPrimitive.Root",
	"SwitchPrimitive.Root",
	"SelectPrimitive.Trigger",
	"SliderPrimitive.Thumb",
	"RadioGroupPrimitive.Item",
	"TogglePrimitive.Root",
	"ToggleGroupPrimitive.Item",
	"CommandPrimitive.Input",
	"ComboboxPrimitive.Input",
	"OTPInput",
]);

/** Roles named from their content (ARIA 1.2, "Name From: contents"). */
const CONTENT_NAMED: ReadonlySet<string> = new Set([
	"Checkbox",
	"Switch",
	"RadioGroupItem",
	"Toggle",
	"ToggleGroupItem",
	"CheckboxPrimitive.Root",
	"SwitchPrimitive.Root",
	"RadioGroupPrimitive.Item",
	"TogglePrimitive.Root",
	"ToggleGroupPrimitive.Item",
]);

const LABELS: ReadonlySet<string> = new Set(["Label", "FieldLabel", "label"]);
const FUNCTIONS: ReadonlySet<string> = new Set([
	"FunctionDeclaration",
	"FunctionExpression",
	"ArrowFunctionExpression",
]);

/**
 * Sites named outside their markup, each with why. A stale entry fails: the
 * site it names must still be one the markup leaves unnamed.
 */
const NAMED_ELSEWHERE: Readonly<Record<string, string>> = {
	"src/components/ui/slider.tsx SliderPrimitive.Thumb":
		"Radix names a thumb by its place when the Slider holds two values or more (Minimum, Maximum; Value 1 of 3) and the only Slider, data-table-slider-filter.tsx, holds a [min, max] range; a lone thumb takes aria-label from its own props, which Slider does not pass",
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

function elementName(name: unknown): string {
	if (!isNode(name)) return "";
	if (name.type === "JSXIdentifier") return String(name.name);
	if (name.type === "JSXMemberExpression") {
		const property = isNode(name.property) ? String(name.property.name) : "";
		return `${elementName(name.object)}.${property}`;
	}
	return "";
}

interface Attributes {
	values: Map<string, string>;
	spread: string | null;
}

/** An element's attributes, each value as its source text. */
function attributesOf(opening: Node, source: string): Attributes {
	const values = new Map<string, string>();
	let spread: string | null = null;
	const list = Array.isArray(opening.attributes) ? opening.attributes : [];
	for (const attribute of list) {
		if (!isNode(attribute)) continue;
		if (attribute.type === "JSXSpreadAttribute") {
			spread = source.slice(attribute.start, attribute.end);
			continue;
		}
		const name = elementName(attribute.name);
		const value = attribute.value;
		if (!isNode(value)) values.set(name, "true");
		else if (value.type === "Literal")
			values.set(name, JSON.stringify(value.value));
		else if (
			value.type === "JSXExpressionContainer" &&
			isNode(value.expression)
		)
			values.set(
				name,
				source
					.slice(value.expression.start, value.expression.end)
					.replace(/\s+/g, " "),
			);
	}
	return { values, spread };
}

interface Branch {
	scope: number;
	conditions: string[];
}

/** The nearest function, and the conditional branches the node renders under in it. */
function branchOf(node: Node, parents: Node[]): Branch {
	const conditions: string[] = [];
	let child: Node = node;
	for (let i = parents.length - 1; i >= 0; i -= 1) {
		const parent = parents[i] as Node;
		if (FUNCTIONS.has(parent.type)) return { scope: parent.start, conditions };
		if (parent.type === "ConditionalExpression" && child !== parent.test)
			conditions.push(
				`${parent.start}:${child === parent.consequent ? "then" : "else"}`,
			);
		if (parent.type === "LogicalExpression" && child === parent.right)
			conditions.push(`${parent.start}:right`);
		child = parent;
	}
	return { scope: -1, conditions };
}

/** A Label is rendered whenever its control is: same function, and no branch the control is not in. */
function rendersWith(label: Branch, control: Branch): boolean {
	return (
		label.scope === control.scope &&
		label.conditions.every((c) => control.conditions.includes(c))
	);
}

function enclosingComponent(parents: Node[]): string | null {
	for (let i = parents.length - 1; i >= 0; i -= 1) {
		const parent = parents[i] as Node;
		if (parent.type === "FunctionDeclaration" && isNode(parent.id))
			return String(parent.id.name);
		if (
			parent.type === "VariableDeclarator" &&
			isNode(parent.id) &&
			parent.id.type === "Identifier" &&
			/^[A-Z]/.test(String(parent.id.name))
		)
			return String(parent.id.name);
	}
	return null;
}

interface Source {
	file: string;
	source: string;
	program: Node;
}

interface Site {
	site: string;
	element: string;
	component: string;
	resolution: string;
}

function parse(file: string, source: string): Source {
	const { program, errors } = parseSync(file, source, { lang: "tsx" });
	if (errors.length > 0) throw new Error(`${file}: ${errors[0]?.message}`);
	const root: unknown = program;
	if (!isNode(root)) throw new Error(`${file}: no program`);
	return { file, source, program: root };
}

/** Every control site in the sources, each with how it is named or that it is not. */
function controlSites(sources: Source[]): Site[] {
	const controls = new Set(CONTROLS);
	const sites: Site[] = [];
	const seen = new Set<string>();
	for (let round = 0; round < 8; round += 1) {
		const before = controls.size;
		for (const { file, source, program } of sources) {
			const lineOf = (pos: number) => source.slice(0, pos).split("\n").length;
			const labelFor = new Map<string, Branch[]>();
			visit(program, [], (node, parents) => {
				if (node.type !== "JSXOpeningElement") return;
				if (!LABELS.has(elementName(node.name))) return;
				const target = attributesOf(node, source).values.get("htmlFor");
				if (target === undefined) return;
				labelFor.set(target, [
					...(labelFor.get(target) ?? []),
					branchOf(node, parents),
				]);
			});
			visit(program, [], (node, parents) => {
				if (node.type !== "JSXOpeningElement") return;
				const element = elementName(node.name);
				if (!controls.has(element)) return;
				const key = `${file}:${node.start}`;
				if (seen.has(key)) return;
				seen.add(key);
				const { values, spread } = attributesOf(node, source);
				const component = enclosingComponent(parents);
				const jsxParents = parents.filter(
					(p): p is Node & { openingElement: Node } =>
						p.type === "JSXElement" && isNode(p.openingElement),
				);
				const parent = parents.at(-1);
				const text =
					parent?.type === "JSXElement" && Array.isArray(parent.children)
						? parent.children.filter(
								(c: unknown) =>
									isNode(c) &&
									((c.type === "JSXText" && String(c.value).trim() !== "") ||
										(c.type === "JSXExpressionContainer" &&
											isNode(c.expression) &&
											c.expression.type !== "JSXEmptyExpression")),
							)
						: [];
				const id = values.get("id");
				const className = values.get("className") ?? "";
				let resolution: string;
				if (values.get("type") === '"hidden"')
					resolution = "exempt: type hidden";
				else if (spread && /getInputProps\(/.test(spread))
					resolution = "named: react-dropzone's file upload label";
				else if (
					/(^|[\s"'`])hidden([\s"'`]|$)/.test(className) &&
					!className.includes("sr-only")
				)
					resolution = "exempt: display none";
				else if (values.has("aria-label")) resolution = "named: aria-label";
				else if (values.has("aria-labelledby"))
					resolution = "named: aria-labelledby";
				else if (
					id !== undefined &&
					(labelFor.get(id) ?? []).some((b) =>
						rendersWith(b, branchOf(node, parents)),
					)
				)
					resolution = "named: its Label";
				else if (
					jsxParents.some((p) => LABELS.has(elementName(p.openingElement.name)))
				)
					resolution = "named: a wrapping label";
				else if (CONTENT_NAMED.has(element) && text.length > 0)
					resolution = "named: its text";
				else if (
					element === "CommandInput" &&
					jsxParents.some(
						(p) =>
							["Command", "CommandDialog"].includes(
								elementName(p.openingElement.name),
							) && attributesOf(p.openingElement, source).values.has("label"),
					)
				)
					resolution = "named: its Command's label";
				else if (spread && component && !controls.has(component)) {
					controls.add(component);
					resolution = `wrapper: ${component} is named at its call sites`;
				} else if (spread && component && controls.has(component))
					resolution = `definition of ${component}`;
				else
					resolution =
						id !== undefined && labelFor.has(id)
							? "UNNAMED: its Label renders in another branch or function"
							: "UNNAMED";
				sites.push({
					site: `${file}:${lineOf(node.start)}`,
					element,
					component: component ?? "-",
					resolution,
				});
			});
		}
		if (controls.size === before) break;
	}
	return sites;
}

function trackedSources(): Source[] {
	return execFileSync("git", ["ls-files", "src"], { encoding: "utf8" })
		.split("\n")
		.filter(
			(f) =>
				f.endsWith(".tsx") &&
				!/\.(test|spec)\.tsx$/.test(f) &&
				!f.includes("/__tests__/") &&
				!f.startsWith("src/test/"),
		)
		.map((file) => parse(file, readFileSync(file, "utf8")));
}

const unnamed = (sites: Site[]) =>
	sites
		.filter((s) => s.resolution.startsWith("UNNAMED"))
		.map((s) => `${s.site} ${s.element} (${s.component}): ${s.resolution}`);

describe("the scan names each control shape (fixtures)", () => {
	const scan = (source: string) =>
		controlSites([parse("src/fixture.tsx", source)]).map(
			(s) => `${s.element}: ${s.resolution}`,
		);

	it("finds a control with no name, and one whose Label renders in another branch", () => {
		expect(
			scan(`export function F({ kind, rows }) {
				return (
					<div>
						<Checkbox checked />
						<input placeholder="Search" title="Search" />
						{kind !== "check" ? <Label htmlFor="a">A</Label> : null}
						{kind === "check" ? <Checkbox id="a" /> : <Input id="a" />}
						{rows.map((r) => <Checkbox key={r} />)}
					</div>
				);
			}`),
		).toEqual([
			"Checkbox: UNNAMED",
			"input: UNNAMED",
			"Checkbox: UNNAMED: its Label renders in another branch or function",
			"Input: UNNAMED: its Label renders in another branch or function",
			"Checkbox: UNNAMED",
		]);
	});

	it("leaves every named shape alone", () => {
		expect(
			scan(`export function F({ open }) {
				return (
					<div>
						<Checkbox aria-label="Select all properties" />
						<SelectTrigger aria-labelledby="unit-label" />
						<Label htmlFor="rent">Rent</Label>
						{open && <Input id="rent" />}
						<label>Notes <textarea /></label>
						<Switch>On</Switch>
						<Command label="Search columns"><CommandInput /></Command>
						<input {...getInputProps()} />
						<input type="hidden" name="token" />
						<input type="file" className="hidden" />
					</div>
				);
			}`),
		).toEqual([
			"Checkbox: named: aria-label",
			"SelectTrigger: named: aria-labelledby",
			"Input: named: its Label",
			"textarea: named: a wrapping label",
			"Switch: named: its text",
			"CommandInput: named: its Command's label",
			"input: named: react-dropzone's file upload label",
			"input: exempt: type hidden",
			"input: exempt: display none",
		]);
	});

	it("follows a wrapper to its call sites", () => {
		expect(
			scan(`function MoneyInput(props) { return <Input {...props} />; }
			export function F() {
				return (
					<div>
						<MoneyInput aria-label="Rent" />
						<MoneyInput placeholder="Deposit" />
					</div>
				);
			}`),
		).toEqual([
			"Input: wrapper: MoneyInput is named at its call sites",
			"MoneyInput: named: aria-label",
			"MoneyInput: UNNAMED",
		]);
	});
});

describe("every control in src has a name", () => {
	const sites = controlSites(trackedSources());

	it("reads the controls the app renders", () => {
		// Positive control: the scan sees the app's controls, so an empty hit list
		// is a finding, not a scan that read nothing.
		expect(sites.length).toBeGreaterThan(200);
		expect(
			sites.filter((s) => s.resolution.startsWith("named")).length,
		).toBeGreaterThan(200);
	});

	it("leaves no control unnamed", () => {
		const hits = unnamed(sites).filter(
			(hit) =>
				!Object.keys(NAMED_ELSEWHERE).some((key) => {
					const [file, element] = key.split(" ");
					return hit.startsWith(`${file}:`) && hit.includes(` ${element} `);
				}),
		);
		expect(hits).toEqual([]);
	});

	it("keeps each named-elsewhere entry a live site", () => {
		const stale = Object.keys(NAMED_ELSEWHERE).filter((key) => {
			const [file, element] = key.split(" ");
			return !unnamed(sites).some(
				(hit) => hit.startsWith(`${file}:`) && hit.includes(` ${element} `),
			);
		});
		expect(stale).toEqual([]);
	});
});
