/**
 * Every place a shipped source renders the vendored Button, with the variant,
 * the size and the caller's class strings, so a guard can measure the class
 * string the element really gets: Button merges the caller's `className` into
 * the variant's classes with tailwind-merge, which drops a variant class only
 * when the caller sets the same utility under the same modifier chain. A
 * caller's hover label therefore keeps the variant's hover fill, and the
 * variant's `dark:` classes outlive a caller's plain ones (66.2-39 fix round 3,
 * F7, F58, F60).
 *
 * NOT A BARREL FILE. Everything below is declared here and nothing is
 * re-exported (CLAUDE.md zero-tolerance rule 2). This file sits inside the
 * Tailwind source scan, so it names no utility in a class position.
 *
 * The sources are parsed (oxc, through `rolldown/utils`, as in
 * `vivid-text-elements.ts`). A site is:
 * - a `<Button>` element;
 * - a `<Wrapper>` element, where `Wrapper` is a component in `src` whose first
 *   parameter destructures `className` and which renders a `<Button>` whose
 *   own `className` passes that `className` on (the sidebar trigger, a loader
 *   button): the wrapper's own classes come first, the caller's after, once
 *   per such `<Button>` the wrapper renders (one per branch).
 *
 * The variant and size are read from a string attribute, from each branch of a
 * conditional of strings, or, for an identifier, from the wrapper's caller or
 * the parameter's default; unset means `default`. The caller's class strings
 * are the unconditional strings of its `className` (a string, a template's
 * text, `cn()`/`clsx()` arguments, a `buttonVariants({ … })` call's classes),
 * once alone and once with each conditional string
 * added (a `cond && "…"` operand, a conditional's branch, an object key), so
 * every string a caller can hand Button is measured beside the variant.
 */

import { parseSync } from "rolldown/utils";
import { buttonVariants } from "#components/ui/button";
import { cn } from "#lib/utils";

export interface ButtonSite {
	file: string;
	line: number;
	/** `Button`, or the wrapper component the caller renders. */
	element: string;
	variant: string;
	size: string;
	/** Each class string the caller can hand Button (never empty: "" at least). */
	classNames: string[];
	/**
	 * The classes a wrapper adds before the caller's: measured, and checked at
	 * the wrapper's own `<Button>` site. Empty for a `<Button>`.
	 */
	wrapperClasses: string;
	/** A literal `disabled` (here or in the wrapper): no pointer state can match. */
	disabled: boolean;
	/** `asChild`: the classes land on the child element (a link, a trigger). */
	asChild: boolean;
	/**
	 * Under `asChild`, the child element's name and its own classes (every
	 * string, conditional ones included), which Radix Slot appends to Button's
	 * without merging. Null otherwise.
	 */
	child: { element: string; className: string } | null;
}

type ButtonOptions = NonNullable<Parameters<typeof buttonVariants>[0]>;
type Variant = NonNullable<ButtonOptions["variant"]>;
type Size = NonNullable<ButtonOptions["size"]>;

// Button's variant and size names. A site naming another throws, so a new
// variant or size is added here before a guard measures it.
const VARIANTS: ReadonlySet<string> = new Set<Variant>([
	"default",
	"destructive",
	"outline",
	"secondary",
	"ghost",
	"link",
]);
const SIZES: ReadonlySet<string> = new Set<Size>([
	"default",
	"sm",
	"lg",
	"icon",
]);

function isVariant(name: string): name is Variant {
	return VARIANTS.has(name);
}

function isSize(name: string): name is Size {
	return SIZES.has(name);
}

/** The class string Button renders for a variant, a size and a className. */
export function buttonClasses(
	variant: string,
	size: string,
	className = "",
): string {
	if (!isVariant(variant)) throw new Error(`unknown Button variant ${variant}`);
	if (!isSize(size)) throw new Error(`unknown Button size ${size}`);
	return cn(buttonVariants({ variant, size, className }));
}

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

function jsxName(name: unknown): string {
	if (!isNode(name)) return "";
	if (name.type === "JSXIdentifier") return String(name.name);
	if (name.type === "JSXMemberExpression") {
		return `${jsxName(name.object)}.${jsxName(name.property)}`;
	}
	return "";
}

function parse(path: string, source: string): Node {
	const { program, errors } = parseSync(path, source, {
		lang: path.endsWith(".tsx") ? "tsx" : "ts",
	});
	if (errors.length > 0) throw new Error(`${path}: ${errors[0]?.message}`);
	const root: unknown = program;
	if (!isNode(root)) throw new Error(`${path}: the parser returned no program`);
	return root;
}

function visit(node: Node, parents: Node[], fn: (n: Node, p: Node[]) => void) {
	fn(node, parents);
	const next = [...parents, node];
	for (const child of childNodes(node)) visit(child, next, fn);
}

/** A class string's parts: always applied, or applied under a condition. */
interface ClassParts {
	always: string[];
	optional: string[];
	/** The expression passes the enclosing component's `className` on. */
	forwards: boolean;
}

function stringOf(node: Node): string | null {
	if (node.type === "Literal" && typeof node.value === "string") {
		return node.value;
	}
	if (node.type === "TemplateLiteral") {
		return ((node.quasis as Node[]) ?? [])
			.map((q) => {
				const value = q.value as { cooked?: string; raw?: string };
				return value.cooked ?? value.raw ?? "";
			})
			.join(" ");
	}
	return null;
}

function propertyName(property: Node): string {
	const key = property.key;
	if (!isNode(key)) return "";
	if (key.type === "Identifier") return String(key.name);
	if (key.type === "Literal") return String(key.value);
	return "";
}

function classParts(expression: Node, conditional = false): ClassParts {
	const out: ClassParts = { always: [], optional: [], forwards: false };
	const add = (text: string, isConditional: boolean) => {
		if (text.trim() === "") return;
		(isConditional ? out.optional : out.always).push(text);
	};
	const merge = (parts: ClassParts) => {
		out.always.push(...parts.always);
		out.optional.push(...parts.optional);
		out.forwards ||= parts.forwards;
	};
	const text = stringOf(expression);
	if (text !== null) {
		add(text, conditional);
		if (expression.type === "TemplateLiteral") {
			for (const e of (expression.expressions as Node[]) ?? []) {
				merge(classParts(e, true));
			}
		}
		return out;
	}
	switch (expression.type) {
		case "Identifier":
			out.forwards = expression.name === "className";
			return out;
		case "CallExpression": {
			const callee = expression.callee as Node;
			const args = (expression.arguments as Node[]) ?? [];
			if (callee.type === "Identifier" && callee.name === "buttonVariants") {
				const options = args[0];
				const read = (key: string) => {
					if (!options || options.type !== "ObjectExpression") return "default";
					for (const p of (options.properties as Node[]) ?? []) {
						if (p.type === "Property" && propertyName(p) === key) {
							const value = stringOf(p.value as Node);
							if (value !== null) return value;
						}
					}
					return "default";
				};
				add(buttonClasses(read("variant"), read("size")), conditional);
				return out;
			}
			for (const arg of args) merge(classParts(arg, conditional));
			return out;
		}
		case "LogicalExpression":
			if (expression.operator !== "&&") {
				merge(classParts(expression.left as Node, true));
			}
			merge(classParts(expression.right as Node, true));
			return out;
		case "ConditionalExpression":
			merge(classParts(expression.consequent as Node, true));
			merge(classParts(expression.alternate as Node, true));
			return out;
		case "ArrayExpression":
			for (const e of (expression.elements as Node[]) ?? []) {
				if (isNode(e)) merge(classParts(e, conditional));
			}
			return out;
		case "ObjectExpression":
			for (const p of (expression.properties as Node[]) ?? []) {
				if (p.type === "Property") add(propertyName(p), true);
			}
			return out;
		case "TSAsExpression":
		case "TSSatisfiesExpression":
		case "ParenthesizedExpression":
			return classParts(expression.expression as Node, conditional);
		default:
			return out;
	}
}

function attribute(opening: Node, name: string): Node | null | undefined {
	for (const a of (opening.attributes as Node[]) ?? []) {
		if (a.type === "JSXAttribute" && jsxName(a.name) === name) {
			return (a.value as Node | null) ?? null;
		}
	}
	return undefined;
}

function attributeExpression(value: Node | null | undefined): Node | null {
	if (!value) return null;
	if (value.type === "JSXExpressionContainer") {
		const e = value.expression as Node;
		return e.type === "JSXEmptyExpression" ? null : e;
	}
	return value;
}

/** A prop's string values: a literal, a conditional's literal branches. */
function stringValues(expression: Node | null): string[] | { name: string } {
	if (!expression) return ["default"];
	const text = stringOf(expression);
	if (text !== null) return [text];
	if (expression.type === "ConditionalExpression") {
		const a = stringValues(expression.consequent as Node);
		const b = stringValues(expression.alternate as Node);
		if (Array.isArray(a) && Array.isArray(b)) return [...a, ...b];
	}
	if (expression.type === "Identifier")
		return { name: String(expression.name) };
	throw new Error(
		`button-sites: unsupported prop expression ${expression.type}`,
	);
}

interface Wrapper {
	file: string;
	variant: string[] | { name: string };
	size: string[] | { name: string };
	base: string[];
	disabled: boolean;
	asChild: boolean;
	/** Each destructured parameter's string default. */
	defaults: Map<string, string>;
}

/** The enclosing component (a declared or assigned function) of `parents`. */
function enclosingComponent(
	parents: Node[],
): { name: string; params: Node[] } | null {
	for (let i = parents.length - 1; i >= 0; i -= 1) {
		const p = parents[i] as Node;
		if (p.type === "FunctionDeclaration" && isNode(p.id)) {
			return { name: String(p.id.name), params: (p.params as Node[]) ?? [] };
		}
		if (
			(p.type === "ArrowFunctionExpression" ||
				p.type === "FunctionExpression") &&
			parents[i - 1]?.type === "VariableDeclarator"
		) {
			const declarator = parents[i - 1] as Node;
			if (isNode(declarator.id)) {
				return {
					name: String(declarator.id.name),
					params: (p.params as Node[]) ?? [],
				};
			}
		}
	}
	return null;
}

function parameterDefaults(params: Node[]): {
	names: Set<string>;
	defaults: Map<string, string>;
} {
	const names = new Set<string>();
	const defaults = new Map<string, string>();
	const first = params[0];
	if (!first || first.type !== "ObjectPattern") return { names, defaults };
	for (const p of (first.properties as Node[]) ?? []) {
		if (p.type !== "Property") continue;
		const name = propertyName(p);
		names.add(name);
		const value = p.value as Node;
		if (value.type === "AssignmentPattern") {
			const text = stringOf(value.right as Node);
			if (text !== null) defaults.set(name, text);
		}
	}
	return { names, defaults };
}

function alternatives(parts: ClassParts): string[] {
	const always = parts.always.join(" ");
	return [
		always,
		...parts.optional.map((o) => (always ? `${always} ${o}` : o)),
	];
}

/** A boolean attribute written bare or as `{true}`. */
function isSet(opening: Node, name: string): boolean {
	const value = attribute(opening, name);
	if (value === undefined) return false;
	if (value === null) return true;
	const e = attributeExpression(value);
	return e?.type === "Literal" && e.value === true;
}

const NO_CLASS: Node = { type: "Literal", value: "", start: 0, end: 0 };

function classNameParts(opening: Node): ClassParts {
	return classParts(
		attributeExpression(attribute(opening, "className")) ?? NO_CLASS,
	);
}

function propValues(opening: Node, name: string): string[] | { name: string } {
	return stringValues(attributeExpression(attribute(opening, name)) ?? null);
}

/**
 * A prop's values: its strings, or for an identifier the strings the
 * wrapper's caller passes under that name, else the parameter's default, else
 * Button's `default`.
 */
function resolveProp(
	values: string[] | { name: string },
	caller: Node | null,
	defaults: ReadonlyMap<string, string>,
): string[] {
	if (Array.isArray(values)) return values;
	if (caller && attribute(caller, values.name) !== undefined) {
		const passed = propValues(caller, values.name);
		if (Array.isArray(passed)) return passed;
	}
	return [defaults.get(values.name) ?? "default"];
}

/** The first element child of a `<Button asChild>`, with its classes. */
function slotChild(element: Node | undefined): ButtonSite["child"] {
	if (!element || element.type !== "JSXElement") return null;
	for (const c of (element.children as Node[]) ?? []) {
		if (c.type !== "JSXElement") continue;
		const opening = c.openingElement as Node;
		const parts = classNameParts(opening);
		return {
			element: jsxName(opening.name),
			className: [...parts.always, ...parts.optional].join(" "),
		};
	}
	return null;
}

/**
 * Every Button site in `sources` (path to text). Throws on a wrapper name
 * declared in two files, or a variant or size expression it cannot read, so a
 * new shape is decided rather than skipped.
 */
export function buttonSites(
	sources: ReadonlyMap<string, string>,
): ButtonSite[] {
	const trees = new Map<string, Node>();
	for (const [path, text] of sources) {
		if (!/\.tsx?$/.test(path) || !text.includes("Button")) continue;
		trees.set(path, parse(path, text));
	}
	const lineOf = (path: string, index: number) =>
		(sources.get(path) ?? "").slice(0, index).split("\n").length;
	const wrappers = new Map<string, Wrapper[]>();
	const sites: ButtonSite[] = [];
	const push = (
		path: string,
		opening: Node,
		element: string,
		props: { variants: string[]; sizes: string[] },
		parts: ClassParts,
		wrapper?: Wrapper,
		child: ButtonSite["child"] = null,
	) => {
		for (const variant of props.variants) {
			for (const size of props.sizes) {
				sites.push({
					file: path,
					line: lineOf(path, opening.start),
					element,
					variant,
					size,
					classNames: alternatives(parts),
					wrapperClasses: wrapper ? wrapper.base.join(" ") : "",
					disabled: isSet(opening, "disabled") || (wrapper?.disabled ?? false),
					asChild: isSet(opening, "asChild") || (wrapper?.asChild ?? false),
					child,
				});
			}
		}
	};
	for (const [path, tree] of trees) {
		visit(tree, [], (node, parents) => {
			if (node.type !== "JSXOpeningElement") return;
			if (jsxName(node.name) !== "Button") return;
			const parts = classNameParts(node);
			const component = enclosingComponent(parents);
			const { names, defaults } = component
				? parameterDefaults(component.params)
				: { names: new Set<string>(), defaults: new Map<string, string>() };
			push(
				path,
				node,
				"Button",
				{
					variants: resolveProp(propValues(node, "variant"), null, defaults),
					sizes: resolveProp(propValues(node, "size"), null, defaults),
				},
				parts,
				undefined,
				isSet(node, "asChild") ? slotChild(parents.at(-1)) : null,
			);
			if (!parts.forwards || !component || !names.has("className")) return;
			if (!/^[A-Z]/.test(component.name)) return;
			const known = wrappers.get(component.name) ?? [];
			if (known.some((w) => w.file !== path)) {
				throw new Error(
					`button-sites: two Button wrappers named ${component.name}`,
				);
			}
			known.push({
				file: path,
				variant: propValues(node, "variant"),
				size: propValues(node, "size"),
				base: parts.always,
				disabled: isSet(node, "disabled"),
				asChild: isSet(node, "asChild"),
				defaults,
			});
			wrappers.set(component.name, known);
		});
	}
	for (const [path, tree] of trees) {
		visit(tree, [], (node) => {
			if (node.type !== "JSXOpeningElement") return;
			const name = jsxName(node.name);
			for (const wrapper of wrappers.get(name) ?? []) {
				const caller = classNameParts(node);
				push(
					path,
					node,
					name,
					{
						variants: resolveProp(wrapper.variant, node, wrapper.defaults),
						sizes: resolveProp(wrapper.size, node, wrapper.defaults),
					},
					{
						always: [...wrapper.base, ...caller.always],
						optional: caller.optional,
						forwards: false,
					},
					wrapper,
				);
			}
		});
	}
	return sites;
}
