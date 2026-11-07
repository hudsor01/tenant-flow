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
 * text, `cn()`/`clsx()` arguments, a `buttonVariants({ … })` call's classes,
 * a module-scope `const` of a string, in the file or imported from another
 * source), once alone and once with each conditional string added (a
 * `cond && "…"` operand, a conditional's branch, an object key), so every
 * string a caller can hand Button is measured beside the variant. Under
 * `asChild` the child element's own classes are recorded apart: Radix Slot
 * appends them unmerged. A site records whether it sets `aria-disabled` (any
 * value but a literal false), which leaves its pointer states live.
 */

import { posix } from "node:path";
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
	/**
	 * An `aria-disabled` attribute (here or in the wrapper) other than a
	 * literal false: the control can be off while its pointer states match.
	 */
	ariaDisabled: boolean;
	/**
	 * Under `asChild`, the child element's name and its own classes (every
	 * string, conditional ones included), which Radix Slot appends to Button's
	 * without merging. Null otherwise, and for a wrapper's caller.
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

/** The string a module-scope `const` holds, by name, or null. */
type ConstantLookup = (name: string) => string | null;

const NO_CONSTANTS: ConstantLookup = () => null;

function classParts(
	expression: Node,
	conditional = false,
	lookup: ConstantLookup = NO_CONSTANTS,
): ClassParts {
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
				merge(classParts(e, true, lookup));
			}
		}
		return out;
	}
	switch (expression.type) {
		case "Identifier": {
			out.forwards = expression.name === "className";
			const constant = lookup(String(expression.name));
			if (constant !== null) add(constant, conditional);
			return out;
		}
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
			for (const arg of args) merge(classParts(arg, conditional, lookup));
			return out;
		}
		case "LogicalExpression":
			if (expression.operator !== "&&") {
				merge(classParts(expression.left as Node, true, lookup));
			}
			merge(classParts(expression.right as Node, true, lookup));
			return out;
		case "ConditionalExpression":
			merge(classParts(expression.consequent as Node, true, lookup));
			merge(classParts(expression.alternate as Node, true, lookup));
			return out;
		case "ArrayExpression":
			for (const e of (expression.elements as Node[]) ?? []) {
				if (isNode(e)) merge(classParts(e, conditional, lookup));
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
			return classParts(expression.expression as Node, conditional, lookup);
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
	ariaDisabled: boolean;
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

function classNameParts(
	opening: Node,
	lookup: ConstantLookup = NO_CONSTANTS,
): ClassParts {
	return classParts(
		attributeExpression(attribute(opening, "className")) ?? NO_CLASS,
		false,
		lookup,
	);
}

/** An `aria-disabled` attribute other than a literal false. */
function isAriaDisabled(opening: Node): boolean {
	const value = attribute(opening, "aria-disabled");
	if (value === undefined) return false;
	if (value === null) return true;
	const e = attributeExpression(value);
	return !(e?.type === "Literal" && (e.value === false || e.value === "false"));
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
function slotChild(
	element: Node | undefined,
	lookup: ConstantLookup,
): ButtonSite["child"] {
	if (!element || element.type !== "JSXElement") return null;
	for (const c of (element.children as Node[]) ?? []) {
		if (c.type !== "JSXElement") continue;
		const opening = c.openingElement as Node;
		const parts = classNameParts(opening, lookup);
		return {
			element: jsxName(opening.name),
			className: [...parts.always, ...parts.optional].join(" "),
		};
	}
	return null;
}

/** A file's module-scope `const` names bound to a string, in source order. */
function stringConstants(tree: Node): Map<string, string> {
	const out = new Map<string, string>();
	for (const statement of (tree.body as Node[]) ?? []) {
		const declaration =
			statement.type === "ExportNamedDeclaration"
				? statement.declaration
				: statement;
		if (!isNode(declaration) || declaration.type !== "VariableDeclaration") {
			continue;
		}
		if (declaration.kind !== "const") continue;
		for (const d of (declaration.declarations as Node[]) ?? []) {
			const id = d.id;
			const init = d.init;
			if (!isNode(id) || id.type !== "Identifier" || !isNode(init)) continue;
			if (
				init.type === "TemplateLiteral" &&
				((init.expressions as Node[]) ?? []).length > 0
			) {
				continue;
			}
			const text = stringOf(init);
			if (text !== null) out.set(String(id.name), text);
		}
	}
	return out;
}

/** A file's named imports: local name to the module and the imported name. */
function namedImports(
	tree: Node,
): Map<string, { from: string; imported: string }> {
	const out = new Map<string, { from: string; imported: string }>();
	for (const statement of (tree.body as Node[]) ?? []) {
		if (statement.type !== "ImportDeclaration") continue;
		const from = (statement.source as Node | undefined)?.value;
		if (typeof from !== "string") continue;
		for (const specifier of (statement.specifiers as Node[]) ?? []) {
			if (specifier.type !== "ImportSpecifier") continue;
			const local = specifier.local as Node;
			const imported = specifier.imported as Node;
			const importedName =
				imported.type === "Identifier"
					? String(imported.name)
					: String(imported.value);
			out.set(String(local.name), { from, imported: importedName });
		}
	}
	return out;
}

/** A `#name/…` alias (`src/name/…`) or a relative specifier, as a source. */
function resolveSource(
	specifier: string,
	from: string,
	sources: ReadonlyMap<string, string>,
): string | null {
	const alias = /^#([a-z]+)\/(.+)$/.exec(specifier);
	const base = alias
		? `src/${alias[1]}/${alias[2]}`
		: specifier.startsWith(".")
			? posix.join(posix.dirname(from), specifier)
			: null;
	if (base === null) return null;
	return (
		[base, `${base}.ts`, `${base}.tsx`].find((path) => sources.has(path)) ??
		null
	);
}

/**
 * The string constants a file's class expressions can name: its own, then
 * those it imports by name from another source.
 */
function constantLookup(
	path: string,
	sources: ReadonlyMap<string, string>,
	trees: ReadonlyMap<string, Node>,
	parsed: Map<string, Node>,
): ConstantLookup {
	const treeOf = (file: string): Node | null => {
		const known = trees.get(file) ?? parsed.get(file);
		if (known) return known;
		const text = sources.get(file);
		if (text === undefined || !/\.tsx?$/.test(file)) return null;
		const tree = parse(file, text);
		parsed.set(file, tree);
		return tree;
	};
	const own = treeOf(path);
	if (!own) return NO_CONSTANTS;
	const local = stringConstants(own);
	const imports = namedImports(own);
	return (name) => {
		const mine = local.get(name);
		if (mine !== undefined) return mine;
		const imported = imports.get(name);
		if (!imported) return null;
		const target = resolveSource(imported.from, path, sources);
		const tree = target === null ? null : treeOf(target);
		return tree ? (stringConstants(tree).get(imported.imported) ?? null) : null;
	};
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
	const lookups = new Map<string, ConstantLookup>();
	const constantTrees = new Map<string, Node>();
	const lookupFor = (path: string): ConstantLookup => {
		const known = lookups.get(path);
		if (known) return known;
		const lookup = constantLookup(path, sources, trees, constantTrees);
		lookups.set(path, lookup);
		return lookup;
	};
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
					ariaDisabled:
						isAriaDisabled(opening) || (wrapper?.ariaDisabled ?? false),
					child,
				});
			}
		}
	};
	for (const [path, tree] of trees) {
		visit(tree, [], (node, parents) => {
			if (node.type !== "JSXOpeningElement") return;
			if (jsxName(node.name) !== "Button") return;
			const parts = classNameParts(node, lookupFor(path));
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
				isSet(node, "asChild")
					? slotChild(parents.at(-1), lookupFor(path))
					: null,
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
				ariaDisabled: isAriaDisabled(node),
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
				const caller = classNameParts(node, lookupFor(path));
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
