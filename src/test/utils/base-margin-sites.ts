/**
 * Where the `@layer base` paragraph margin breaks a box's declared spacing
 * (66.2-39 fix round 4, class M, OD-C3-1).
 *
 * NOT A BARREL FILE. Everything below is declared here and nothing is
 * re-exported (CLAUDE.md zero-tolerance rule 2). This file sits inside the
 * Tailwind source scan, so it names no utility in a string or a comment: a
 * class string's effect is read from the CSS Tailwind's own design system
 * emits for it (`candidatesToCss`), in Tailwind's own order (`getClassOrder`).
 *
 * THE RULE IT HOLDS. globals.css' `p { margin-bottom: 1rem }` is prose
 * styling. An app paragraph whose class string declares no bottom margin
 * keeps it, and the 16px breaks the spacing its container declares in four
 * shapes:
 * - (a) the paragraph is a flex or grid item: item margins never collapse,
 *   so the 16px is added to the container's gap;
 * - (b) it can be the last in-flow child of a box that holds its margin in
 *   (bottom padding or border, a minimum height, its own formatting
 *   context): the box is 16px taller below the text than above it;
 * - (c) the next element sibling declares a top margin above 0 and under
 *   16px: the two collapse to 16 where the smaller one is declared;
 * - (d) it can be the last child of a block that holds nothing in, so the
 *   margin collapses through that block onto the block's own position, and
 *   the block is a flex or grid item, a non-last child of a vertical
 *   space utility under 16px, a block shape (c) or (b) describes, or
 *   declares a bottom margin under 16px of its own.
 * A paragraph is exempt when its own class string, its parent's child
 * variant or an ancestor's descendant variant declares its bottom margin,
 * when a vertical space utility on its parent gives it one (any child but
 * the last), when it is out of flow (absolutely or fixed positioned, not
 * displayed, screen-reader only) or inline, and when an ancestor is not
 * displayed or screen-reader only (nothing in it is seen).
 *
 * WHAT IT READS. Every paragraph element of a source, parsed with oxc
 * (through `rolldown/utils`, as `button-sites.ts` parses): a `<p>`, or a
 * component that renders one (a ui `…Description` whose host is a `<p>` or a
 * Radix `Description` part). A container is the nearest enclosing JSX
 * element, read through fragments, conditionals and a `.map()` callback; a
 * child rendered under a condition, or an expression the parser cannot see
 * into (`{children}`), may or may not be there, so it never makes the
 * paragraph certainly not last. A container is an intrinsic element (its
 * tag's default display, its class strings; next/link's `Link` and a
 * `motion.<tag>` render theirs) or a component of `src/components/ui` or of
 * the same file (`componentBoxes`): the element that receives the
 * component's children as its last content, its class strings resolved
 * through `cva` defaults and merged with the caller's as `cn` merges them.
 * Any other component is a box this scan cannot see, and the walk stops
 * there: the rendered sweep (class M2 of the round-4 plan) is the check for
 * those. At a component's root the per-file walk stops too, and
 * `crossFileHits` (below) takes the margin on to the component's callers.
 */

import postcss from "postcss";
import { parseSync } from "rolldown/utils";
import { cn } from "#lib/utils";

/** The subset of Tailwind's design system this scan uses. */
export interface ClassCssReader {
	candidatesToCss(classes: string[]): (string | null)[];
	getClassOrder(classes: string[]): [string, bigint | null][];
}

export type BaseMarginShape = "a" | "b" | "c" | "d";

export interface BaseMarginHit {
	file: string;
	line: number;
	shape: BaseMarginShape;
	/** What holds the margin, e.g. `flex item of <div>` or `last child of <CardContent> > flex item of <Card>`. */
	via: string;
}

/** A component of `src/components/ui`: the box its children land in. */
export interface ComponentBox {
	/** The host element's tag, or `p` for a Radix `Description` part. */
	tag: string;
	/** Class strings always applied (cva base and default variants included). */
	classes: string[];
	/** Per variant prop, per value, the cva classes (for a caller's literal). */
	variants: Map<string, Map<string, string>>;
	/** Each variant prop's default value. */
	defaults: Map<string, string>;
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

function stringOf(node: Node | undefined): string | null {
	if (!node) return null;
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

interface ClassParts {
	always: string[];
	optional: string[];
}

type Lookup = (name: string) => Node | null;

/** A class expression's strings: always applied, or under a condition. */
function classParts(
	expression: Node | null | undefined,
	lookup: Lookup,
	conditional = false,
	seen: Set<string> = new Set(),
): ClassParts {
	const out: ClassParts = { always: [], optional: [] };
	if (!expression) return out;
	const add = (text: string, isConditional: boolean) => {
		if (text.trim() !== "")
			(isConditional ? out.optional : out.always).push(text);
	};
	const merge = (parts: ClassParts) => {
		out.always.push(...parts.always);
		out.optional.push(...parts.optional);
	};
	const text = stringOf(expression);
	if (text !== null) {
		add(text, conditional);
		for (const e of (expression.expressions as Node[] | undefined) ?? []) {
			merge(classParts(e, lookup, true, seen));
		}
		return out;
	}
	switch (expression.type) {
		case "Identifier": {
			const name = String(expression.name);
			if (seen.has(name)) return out;
			const value = lookup(name);
			if (value)
				merge(classParts(value, lookup, conditional, new Set([...seen, name])));
			return out;
		}
		case "CallExpression":
			for (const arg of (expression.arguments as Node[]) ?? []) {
				merge(classParts(arg, lookup, conditional, seen));
			}
			return out;
		case "LogicalExpression":
			if (expression.operator !== "&&") {
				merge(classParts(expression.left as Node, lookup, true, seen));
			}
			merge(classParts(expression.right as Node, lookup, true, seen));
			return out;
		case "ConditionalExpression":
			merge(classParts(expression.consequent as Node, lookup, true, seen));
			merge(classParts(expression.alternate as Node, lookup, true, seen));
			return out;
		case "ArrayExpression":
			for (const e of (expression.elements as Node[]) ?? []) {
				if (isNode(e)) merge(classParts(e, lookup, conditional, seen));
			}
			return out;
		case "ObjectExpression":
			for (const p of (expression.properties as Node[]) ?? []) {
				if (p.type === "Property") add(propertyName(p), true);
			}
			return out;
		case "TSAsExpression":
		case "TSSatisfiesExpression":
		case "TSNonNullExpression":
		case "ParenthesizedExpression":
			return classParts(
				expression.expression as Node,
				lookup,
				conditional,
				seen,
			);
		default:
			return out;
	}
}

function attributeValue(opening: Node, name: string): Node | null | undefined {
	for (const a of (opening.attributes as Node[]) ?? []) {
		if (a.type === "JSXAttribute" && jsxName(a.name) === name) {
			const value = (a.value as Node | null) ?? null;
			if (value?.type === "JSXExpressionContainer") {
				const e = value.expression as Node;
				return e.type === "JSXEmptyExpression" ? null : e;
			}
			return value;
		}
	}
	return undefined;
}

/** Module-scope `const NAME = …` initializers, for class strings held in a const. */
function moduleConstants(program: Node): Lookup {
	const constants = new Map<string, Node>();
	for (const statement of (program.body as Node[]) ?? []) {
		const declaration =
			statement.type === "ExportNamedDeclaration"
				? (statement.declaration as Node | null)
				: statement;
		if (declaration?.type !== "VariableDeclaration") continue;
		for (const d of (declaration.declarations as Node[]) ?? []) {
			const id = d.id as Node;
			if (id.type === "Identifier" && isNode(d.init)) {
				constants.set(String(id.name), d.init);
			}
		}
	}
	return (name) => constants.get(name) ?? null;
}

// ---------------------------------------------------------------------------
// Class strings to box properties, through the CSS Tailwind emits.

interface TokenEffect {
	/** Declarations at rest, in emitted order. */
	rest: [string, string][];
	/** Declarations under a width or container query. */
	atWidth: [string, string][];
	/** Declarations under `:last-child`. */
	whenLast: [string, string][];
	/** A vertical space utility's gap for every child but the last, in px. */
	spaceY: number | null;
	/** A bottom margin set on child paragraphs, or on descendant ones. */
	childMargin: boolean;
	descendantMargin: boolean;
}

export interface BoxStyle {
	display: string | null;
	/** Flex or grid at rest or at some width. */
	flexOrGrid: boolean;
	outOfFlow: boolean;
	/** Not displayed under a width or container query: absent at some widths. */
	hiddenAtWidth: boolean;
	/** Not displayed, or clipped to nothing (screen-reader only): nothing in it is seen. */
	unseen: boolean;
	inline: boolean;
	/** Holds a last child's bottom margin in. */
	holdsMargin: boolean;
	marginTop: number | null;
	marginBottom: number | null;
	marginBottomWhenLast: number | null;
	spaceY: number | null;
	childMargin: boolean;
	descendantMargin: boolean;
}

/** A CSS length in px (`NaN` when it rests on a variable this scan cannot read). */
function px(value: string): number {
	const v = value.trim();
	if (v === "0") return 0;
	let m = /^(-?[\d.]+)px$/.exec(v);
	if (m) return Number(m[1]);
	m = /^(-?[\d.]+)rem$/.exec(v);
	if (m) return Number(m[1]) * 16;
	if (v === "var(--spacing)") return 4;
	m = /^calc\(var\(--spacing\) \* (-?[\d.]+)\)$/.exec(v);
	if (m) return Number(m[1]) * 4;
	m =
		/^calc\(calc\(var\(--spacing\) \* (-?[\d.]+)\) \* calc\(1 - var\(--tw-space-y-reverse\)\)\)$/.exec(
			v,
		);
	if (m) return Number(m[1]) * 4;
	m =
		/^calc\(var\(--spacing\) \* calc\(1 - var\(--tw-space-y-reverse\)\)\)$/.exec(
			v,
		);
	if (m) return 4;
	return Number.NaN;
}

function shorthand(value: string, index: 0 | 1 | 2 | 3): string {
	const parts = value.trim().split(/\s+(?![^(]*\))/);
	if (parts.length === 1) return parts[0] ?? "";
	if (parts.length === 2) return parts[index % 2] ?? "";
	if (parts.length === 3) return parts[index === 3 ? 1 : index] ?? "";
	return parts[index] ?? "";
}

/** The bottom or top component of a margin or padding declaration, if it sets one. */
function sideOf(
	prop: string,
	value: string,
	family: "margin" | "padding" | "border",
	side: "top" | "bottom",
): string | null {
	const suffix = family === "border" ? "-width" : "";
	if (prop === `${family}${suffix}`)
		return shorthand(value, side === "top" ? 0 : 2);
	if (prop === `${family}-block${suffix}`) {
		return shorthand(value, side === "top" ? 0 : 1);
	}
	if (family === "border" && prop === "border-block-width") return value;
	if (prop === `${family}-${side}${suffix}`) return value;
	if (prop === `${family}-block-${side === "top" ? "start" : "end"}${suffix}`)
		return value;
	return null;
}

const HOLDING_OVERFLOW = /^(hidden|auto|scroll)$/;
const HOLDING_DISPLAY =
	/^(flow-root|inline-block|table|table-cell|inline-table|flex|inline-flex|grid|inline-grid)$/;

export function createBoxReader(
	reader: ClassCssReader,
): (classes: string[]) => BoxStyle {
	const cache = new Map<string, TokenEffect | null>();
	const effectOf = (token: string): TokenEffect | null => {
		if (cache.has(token)) return cache.get(token) ?? null;
		const css = reader.candidatesToCss([token])[0] ?? null;
		let effect: TokenEffect | null = null;
		if (css) {
			effect = {
				rest: [],
				atWidth: [],
				whenLast: [],
				spaceY: null,
				childMargin: false,
				descendantMargin: false,
			};
			const root = postcss.parse(css);
			root.walkRules((rule) => {
				let condition: "rest" | "width" | "other" = "rest";
				for (let p = rule.parent; p && p.type !== "root"; p = p.parent) {
					if (p.type !== "atrule") continue;
					const at = p as postcss.AtRule;
					if (at.name === "property") return;
					if (at.name === "container")
						condition = condition === "other" ? "other" : "width";
					else if (
						at.name === "media" &&
						/\bwidth\b/.test(at.params) &&
						!/hover|prefers|print/.test(at.params)
					) {
						condition = condition === "other" ? "other" : "width";
					} else if (at.name !== "supports") condition = "other";
				}
				if (condition === "other") return;
				const selector = rule.selector
					.replace(/\.((?:\\[\s\S]|[\w-])+)/, "&")
					.trim();
				const decls: [string, string][] = [];
				rule.walkDecls((d) => {
					decls.push([d.prop, d.value]);
				});
				const target = condition === "width" ? effect?.atWidth : effect?.rest;
				if (!effect || !target) return;
				if (selector === "&") target.push(...decls);
				else if (selector === "&:last-child") effect.whenLast.push(...decls);
				else if (selector === ":where(& > :not(:last-child))") {
					for (const [prop, value] of decls) {
						if (prop === "margin-block-end") effect.spaceY = px(value);
					}
				} else if (/^(?::is\()?& > (?:p|\*)\)?$/.test(selector)) {
					if (
						decls.some(
							([prop, value]) =>
								sideOf(prop, value, "margin", "bottom") !== null,
						)
					) {
						effect.childMargin = true;
					}
				} else if (/^(?::is\()?& (?:p|\*)\)?$/.test(selector)) {
					if (
						decls.some(
							([prop, value]) =>
								sideOf(prop, value, "margin", "bottom") !== null,
						)
					) {
						effect.descendantMargin = true;
					}
				}
			});
		}
		cache.set(token, effect);
		return effect;
	};
	return (classes: string[]): BoxStyle => {
		const tokens = [...new Set(classes.join(" ").split(/\s+/).filter(Boolean))];
		const ordered = reader
			.getClassOrder(tokens)
			.filter((entry): entry is [string, bigint] => entry[1] !== null)
			.sort((x, y) => (x[1] < y[1] ? -1 : x[1] > y[1] ? 1 : 0))
			.map(([token]) => token);
		const style: BoxStyle = {
			display: null,
			flexOrGrid: false,
			outOfFlow: false,
			hiddenAtWidth: false,
			unseen: false,
			inline: false,
			holdsMargin: false,
			marginTop: null,
			marginBottom: null,
			marginBottomWhenLast: null,
			spaceY: null,
			childMargin: false,
			descendantMargin: false,
		};
		let position: string | null = null;
		let clipped = false;
		let paddingBottom: number | null = null;
		let borderBottom: number | null = null;
		let overflow: string | null = null;
		let minHeight: number | null = null;
		let widthHolds = false;
		for (const token of ordered) {
			const effect = effectOf(token);
			if (!effect) continue;
			for (const [prop, value] of effect.rest) {
				if (prop === "display") style.display = value;
				if (prop === "position") position = value;
				if (prop === "clip-path") clipped = value === "inset(50%)";
				if (
					prop === "overflow" ||
					prop === "overflow-y" ||
					prop === "overflow-x"
				) {
					overflow = HOLDING_OVERFLOW.test(value) ? value : overflow;
				}
				if (prop === "min-height" || prop === "min-block-size")
					minHeight = px(value);
				const mt = sideOf(prop, value, "margin", "top");
				if (mt !== null) style.marginTop = px(mt);
				const mb = sideOf(prop, value, "margin", "bottom");
				if (mb !== null) style.marginBottom = px(mb);
				const pb = sideOf(prop, value, "padding", "bottom");
				if (pb !== null) paddingBottom = px(pb);
				const bb = sideOf(prop, value, "border", "bottom");
				if (bb !== null) borderBottom = px(bb);
			}
			for (const [prop, value] of effect.atWidth) {
				if (prop === "display" && /flex|grid/.test(value))
					style.flexOrGrid = true;
				if (prop === "display" && value === "none") style.hiddenAtWidth = true;
				const pb = sideOf(prop, value, "padding", "bottom");
				const bb = sideOf(prop, value, "border", "bottom");
				if ((pb !== null && px(pb) !== 0) || (bb !== null && px(bb) !== 0))
					widthHolds = true;
				if (
					(prop === "min-height" || prop === "min-block-size") &&
					px(value) !== 0
				)
					widthHolds = true;
			}
			for (const [prop, value] of effect.whenLast) {
				const mb = sideOf(prop, value, "margin", "bottom");
				if (mb !== null) style.marginBottomWhenLast = px(mb);
			}
			if (effect.spaceY !== null) style.spaceY = effect.spaceY;
			style.childMargin ||= effect.childMargin;
			style.descendantMargin ||= effect.descendantMargin;
		}
		if (style.display && /flex|grid/.test(style.display))
			style.flexOrGrid = true;
		style.outOfFlow =
			position === "absolute" ||
			position === "fixed" ||
			style.display === "none";
		style.inline = style.display === "inline";
		style.unseen = style.display === "none" || (clipped && style.outOfFlow);
		const nonZero = (n: number | null) => n !== null && n !== 0;
		style.holdsMargin =
			nonZero(paddingBottom) ||
			nonZero(borderBottom) ||
			overflow !== null ||
			nonZero(minHeight) ||
			widthHolds ||
			(style.display !== null && HOLDING_DISPLAY.test(style.display));
		return style;
	};
}

// ---------------------------------------------------------------------------
// The components of src/components/ui as boxes.

function returnedJsx(fn: Node): Node[] {
	const out: Node[] = [];
	const body = fn.body as Node | undefined;
	if (!body) return out;
	if (body.type !== "BlockStatement") {
		out.push(body);
		return out;
	}
	const walk = (node: Node) => {
		if (node.type === "ReturnStatement" && isNode(node.argument)) {
			out.push(node.argument);
			return;
		}
		if (/Function/.test(node.type)) return;
		for (const c of childNodes(node)) walk(c);
	};
	walk(body);
	return out;
}

function unwrap(node: Node): Node {
	let n = node;
	while (n.type === "ParenthesizedExpression") n = n.expression as Node;
	return n;
}

/** The JSX element of `root` whose children are the component's own. */
function childrenHost(root: Node): Node | null {
	let found: Node | null = null;
	const walk = (node: Node) => {
		if (found) return;
		if (node.type === "JSXElement") {
			const opening = node.openingElement as Node;
			const spreads = ((opening.attributes as Node[]) ?? []).some(
				(a) => a.type === "JSXSpreadAttribute",
			);
			const kids = ((node.children as Node[]) ?? []).filter(
				(c) => !(c.type === "JSXText" && String(c.value).trim() === ""),
			);
			const at = kids.findIndex(
				(c) =>
					c.type === "JSXExpressionContainer" &&
					/^(props\.)?children$/.test(jsxText(c.expression as Node)),
			);
			// The children are the host's last in-flow content: anything after
			// them is rendered under a condition (a close control), never always.
			const passes =
				at >= 0 &&
				kids.slice(at + 1).every((c) => c.type === "JSXExpressionContainer");
			if (passes || (spreads && kids.length === 0)) {
				found = node;
				return;
			}
		}
		for (const c of childNodes(node)) walk(c);
	};
	walk(root);
	return found;
}

function jsxText(node: Node): string {
	if (node.type === "Identifier") return String(node.name);
	if (node.type === "MemberExpression") {
		return `${jsxText(node.object as Node)}.${jsxText(node.property as Node)}`;
	}
	return "";
}

interface CvaConfig {
	base: string;
	variants: Map<string, Map<string, string>>;
	defaults: Map<string, string>;
}

function cvaConfigs(program: Node): Map<string, CvaConfig> {
	const out = new Map<string, CvaConfig>();
	const lookup = moduleConstants(program);
	for (const statement of (program.body as Node[]) ?? []) {
		const declaration =
			statement.type === "ExportNamedDeclaration"
				? (statement.declaration as Node | null)
				: statement;
		if (declaration?.type !== "VariableDeclaration") continue;
		for (const d of (declaration.declarations as Node[]) ?? []) {
			const init = d.init as Node | null;
			const id = d.id as Node;
			if (
				init?.type !== "CallExpression" ||
				jsxText(init.callee as Node) !== "cva" ||
				id.type !== "Identifier"
			) {
				continue;
			}
			const [baseArg, options] = (init.arguments as Node[]) ?? [];
			const config: CvaConfig = {
				base: classParts(baseArg, lookup).always.join(" "),
				variants: new Map(),
				defaults: new Map(),
			};
			for (const p of (options?.properties as Node[] | undefined) ?? []) {
				if (p.type !== "Property") continue;
				const value = p.value as Node;
				if (
					propertyName(p) === "variants" &&
					value.type === "ObjectExpression"
				) {
					for (const v of (value.properties as Node[]) ?? []) {
						if (
							v.type !== "Property" ||
							(v.value as Node).type !== "ObjectExpression"
						)
							continue;
						const values = new Map<string, string>();
						for (const option of ((v.value as Node).properties as Node[]) ??
							[]) {
							if (option.type !== "Property") continue;
							values.set(
								propertyName(option),
								classParts(option.value as Node, lookup).always.join(" "),
							);
						}
						config.variants.set(propertyName(v), values);
					}
				}
				if (
					propertyName(p) === "defaultVariants" &&
					value.type === "ObjectExpression"
				) {
					for (const v of (value.properties as Node[]) ?? []) {
						if (v.type !== "Property") continue;
						const text = stringOf(v.value as Node);
						if (text !== null) config.defaults.set(propertyName(v), text);
					}
				}
			}
			out.set(String(id.name), config);
		}
	}
	return out;
}

/**
 * The box each component of `sources` (the files of `src/components/ui`)
 * puts its children in, by component name. A component whose children land in
 * an element this scan cannot classify is absent.
 */
export function componentBoxes(
	sources: readonly { path: string; source: string }[],
): Map<string, ComponentBox> {
	const out = new Map<string, ComponentBox>();
	for (const { path, source } of sources) {
		const program = parse(path, source);
		const lookup = moduleConstants(program);
		const cvas = cvaConfigs(program);
		const functions: [string, Node][] = [];
		for (const statement of (program.body as Node[]) ?? []) {
			const declaration =
				statement.type === "ExportNamedDeclaration"
					? (statement.declaration as Node | null)
					: statement;
			if (
				declaration?.type === "FunctionDeclaration" &&
				isNode(declaration.id)
			) {
				functions.push([String(declaration.id.name), declaration]);
			}
			if (declaration?.type === "VariableDeclaration") {
				for (const d of (declaration.declarations as Node[]) ?? []) {
					const init = d.init as Node | null;
					if (
						init &&
						/Function/.test(init.type) &&
						(d.id as Node).type === "Identifier"
					) {
						functions.push([String((d.id as Node).name), init]);
					}
				}
			}
		}
		for (const [name, fn] of functions) {
			if (!/^[A-Z]/.test(name)) continue;
			for (const returned of returnedJsx(fn)) {
				const host = childrenHost(unwrap(returned));
				if (!host) continue;
				const opening = host.openingElement as Node;
				const tagName = jsxName(opening.name);
				const tag = /^[a-z]/.test(tagName)
					? tagName
					: /\.Description$/.test(tagName)
						? "p"
						: "div";
				const expression = attributeValue(opening, "className");
				const box: ComponentBox = {
					tag,
					classes: classParts(expression, lookup).always,
					variants: new Map(),
					defaults: new Map(),
				};
				const visitCalls = (node: Node) => {
					if (node.type === "CallExpression") {
						const config = cvas.get(jsxText(node.callee as Node));
						if (config) {
							box.classes.push(config.base);
							for (const [key, values] of config.variants)
								box.variants.set(key, values);
							for (const [key, value] of config.defaults)
								box.defaults.set(key, value);
						}
					}
					for (const c of childNodes(node)) visitCalls(c);
				};
				if (expression) visitCalls(expression);
				out.set(name, box);
				break;
			}
		}
	}
	return out;
}

// ---------------------------------------------------------------------------
// The scan.

const BLOCK_TAGS = new Set([
	"div",
	"section",
	"article",
	"header",
	"footer",
	"main",
	"aside",
	"nav",
	"form",
	"li",
	"fieldset",
	"details",
	"summary",
	"dd",
	"dt",
	"dl",
	"blockquote",
	"figure",
	"figcaption",
	"address",
	"hgroup",
	"search",
]);
const HOLDING_TAGS = new Set(["button", "td", "th", "caption"]);

interface Slot {
	kind: "element" | "text" | "unknown";
	node: Node | null;
	conditional: boolean;
	repeated: boolean;
	/**
	 * A branch of a ternary that renders an element whichever way it goes
	 * (`a ? <A /> : b ? <B /> : <C />`): conditional as a sibling, but one of
	 * its branches is always there.
	 */
	alwaysOne?: boolean;
	/** The ternary whose branch this is: its other branches never render beside it. */
	branchOf?: Node;
}

/** Whether `expression` renders an element on every branch. */
function alwaysRendersElement(expression: Node): boolean {
	const n = unwrap(expression);
	if (n.type === "JSXElement") return true;
	if (n.type === "JSXFragment") {
		return ((n.children as Node[]) ?? []).some(
			(c) =>
				c.type === "JSXElement" ||
				(c.type === "JSXExpressionContainer" &&
					alwaysRendersElement(c.expression as Node)),
		);
	}
	if (n.type === "ConditionalExpression") {
		return (
			alwaysRendersElement(n.consequent as Node) &&
			alwaysRendersElement(n.alternate as Node)
		);
	}
	return false;
}

function callbackJsx(call: Node): Node[] {
	const callee = call.callee as Node;
	if (callee.type !== "MemberExpression") return [];
	const method = jsxText(callee.property as Node);
	if (method !== "map" && method !== "flatMap") return [];
	const fn = ((call.arguments as Node[]) ?? [])[0];
	if (!fn || !/Function/.test(fn.type)) return [];
	return returnedJsx(fn).map(unwrap);
}

function slotsOf(
	nodes: Node[],
	conditional: boolean,
	repeated: boolean,
): Slot[] {
	const out: Slot[] = [];
	const expression = (e: Node, cond: boolean, rep: boolean) => {
		const n = unwrap(e);
		switch (n.type) {
			case "JSXEmptyExpression":
				return;
			case "JSXElement":
				out.push({
					kind: "element",
					node: n,
					conditional: cond,
					repeated: rep,
				});
				return;
			case "JSXFragment":
				out.push(...slotsOf((n.children as Node[]) ?? [], cond, rep));
				return;
			case "LogicalExpression":
				if (n.operator !== "&&") expression(n.left as Node, true, rep);
				expression(n.right as Node, true, rep);
				return;
			case "ConditionalExpression": {
				const from = out.length;
				expression(n.consequent as Node, true, rep);
				expression(n.alternate as Node, true, rep);
				const always = alwaysRendersElement(n);
				for (const slot of out.slice(from)) {
					slot.branchOf = n;
					if (always) slot.alwaysOne = true;
				}
				return;
			}
			case "CallExpression": {
				const returned = callbackJsx(n);
				if (returned.length === 0) {
					out.push({
						kind: "unknown",
						node: null,
						conditional: true,
						repeated: rep,
					});
					return;
				}
				for (const r of returned) expression(r, true, true);
				return;
			}
			case "Literal":
				if (n.value === null || typeof n.value === "boolean") return;
				out.push({
					kind: "text",
					node: null,
					conditional: cond,
					repeated: rep,
				});
				return;
			case "TemplateLiteral":
				out.push({
					kind: "text",
					node: null,
					conditional: cond,
					repeated: rep,
				});
				return;
			default:
				out.push({
					kind: "unknown",
					node: null,
					conditional: true,
					repeated: rep,
				});
		}
	};
	for (const child of nodes) {
		if (child.type === "JSXText") {
			if (String(child.value).trim() !== "") {
				out.push({ kind: "text", node: null, conditional, repeated });
			}
		} else if (child.type === "JSXExpressionContainer") {
			expression(child.expression as Node, conditional, repeated);
		} else if (child.type === "JSXElement") {
			out.push({ kind: "element", node: child, conditional, repeated });
		} else if (child.type === "JSXFragment") {
			out.push(
				...slotsOf((child.children as Node[]) ?? [], conditional, repeated),
			);
		}
	}
	return out;
}

const PASS_THROUGH = new Set([
	"JSXFragment",
	"JSXExpressionContainer",
	"LogicalExpression",
	"ConditionalExpression",
	"ParenthesizedExpression",
	"ArrowFunctionExpression",
	"FunctionExpression",
	"BlockStatement",
	"ReturnStatement",
	"CallExpression",
	"IfStatement",
]);

interface Context {
	file: string;
	source: string;
	lookup: Lookup;
	components: ReadonlyMap<string, ComponentBox>;
	box: (classes: string[]) => BoxStyle;
	/** Local names that render an intrinsic element (`Link` from next/link renders an anchor). */
	intrinsic: ReadonlyMap<string, string>;
}

/** The intrinsic tag a JSX name renders: its own, a next/link `Link`'s anchor, a `motion.<tag>`. */
function intrinsicTag(name: string, ctx: Context): string | null {
	if (/^[a-z]/.test(name)) return name;
	const motion = /^motion\.([a-z]+)$/.exec(name);
	if (motion) return motion[1] ?? null;
	return ctx.intrinsic.get(name) ?? null;
}

/** Local names bound to next/link's default export. */
function linkImports(program: Node): Map<string, string> {
	const out = new Map<string, string>();
	for (const statement of (program.body as Node[]) ?? []) {
		if (statement.type !== "ImportDeclaration") continue;
		if ((statement.source as Node).value !== "next/link") continue;
		for (const s of (statement.specifiers as Node[]) ?? []) {
			if (s.type === "ImportDefaultSpecifier")
				out.set(String((s.local as Node).name), "a");
		}
	}
	return out;
}

interface ElementInfo {
	name: string;
	style: BoxStyle;
}

function elementInfo(element: Node, ctx: Context): ElementInfo | null {
	const opening = element.openingElement as Node;
	const name = jsxName(opening.name);
	const parts = classParts(attributeValue(opening, "className"), ctx.lookup);
	const caller = [...parts.always, ...parts.optional];
	const tag = intrinsicTag(name, ctx);
	if (tag) {
		const style = ctx.box(caller);
		if (style.display === null) {
			if (BLOCK_TAGS.has(tag)) style.display = "block";
			else if (HOLDING_TAGS.has(tag)) {
				style.display = tag === "button" ? "inline-block" : "table-cell";
				style.holdsMargin = true;
			} else if (tag === "p" || tag === "ul" || tag === "ol")
				style.display = "block";
			// An inline element with bottom padding or a border is a card (a
			// whole-card link): its flex or grid parent blockifies it.
			else if (style.holdsMargin) style.display = "block";
			else return null;
		}
		return { name, style };
	}
	const component = ctx.components.get(name);
	if (!component) return null;
	const variantClasses: string[] = [];
	for (const [key, values] of component.variants) {
		const literal = stringOf(attributeValue(opening, key) ?? undefined);
		const value = literal ?? component.defaults.get(key);
		const classes = value === undefined ? undefined : values.get(value);
		if (classes) variantClasses.push(classes);
	}
	const merged = cn(...component.classes, ...variantClasses, ...caller);
	const style = ctx.box([merged]);
	if (style.display === null) {
		style.display = component.tag === "span" ? "inline" : "block";
		if (style.display === "inline") return null;
	}
	return { name, style };
}

interface Placement {
	parent: Node;
	slots: Slot[];
	index: number;
}

/** The element `node` sits in, and its place among the parent's child slots. */
function placementOf(node: Node, parents: Node[]): Placement | null {
	let child = node;
	for (let i = parents.length - 1; i >= 0; i -= 1) {
		const p = parents[i] as Node;
		if (p.type === "JSXElement") {
			if (child === p.openingElement || child === p.closingElement) return null;
			const slots = slotsOf((p.children as Node[]) ?? [], false, false);
			const index = slots.findIndex((s) => s.node === node);
			return index < 0 ? null : { parent: p, slots, index };
		}
		if (!PASS_THROUGH.has(p.type)) return null;
		if (p.type === "CallExpression" && child === p.callee) return null;
		child = p;
	}
	return null;
}

function mayBeLast(placement: Placement, ctx: Context): boolean {
	const after = placement.slots.slice(placement.index + 1);
	const own = placement.slots[placement.index]?.branchOf;
	if (
		after.some(
			(s) =>
				s.alwaysOne &&
				s.kind === "element" &&
				(own === undefined || s.branchOf !== own),
		)
	) {
		return false;
	}
	return after.every((s) => {
		if (s.conditional || s.kind === "unknown") return true;
		if (s.kind === "text") return false;
		const info = s.node ? elementInfo(s.node, ctx) : null;
		return info?.style.outOfFlow === true || info?.style.hiddenAtWidth === true;
	});
}

function certainlyNotLast(placement: Placement, ctx: Context): boolean {
	return !mayBeLast(placement, ctx);
}

/** The top margin of an element that can follow `placement`'s node, under 16px and above 0. */
function shortNextMargin(placement: Placement, ctx: Context): string | null {
	const self = placement.slots[placement.index];
	if (self?.repeated) return null;
	for (const s of placement.slots.slice(placement.index + 1)) {
		if (s.kind === "text") return null;
		if (s.kind === "unknown" || !s.node) continue;
		const info = elementInfo(s.node, ctx);
		if (info?.style.outOfFlow) continue;
		const top = info?.style.marginTop ?? null;
		if (top !== null && top > 0 && top < 16) return `<${info?.name}> ${top}px`;
		if (!s.conditional) return null;
	}
	return null;
}

interface Walk {
	parents: Node[];
	node: Node;
}

function ancestorsOf(walk: Walk): { node: Node; parents: Node[] }[] {
	const out: { node: Node; parents: Node[] }[] = [];
	for (let i = walk.parents.length - 1; i >= 0; i -= 1) {
		const p = walk.parents[i] as Node;
		if (p.type === "JSXElement")
			out.push({ node: p, parents: walk.parents.slice(0, i) });
	}
	return out;
}

/**
 * Where a 16px bottom margin that reaches the bottom edge of `node`'s box goes,
 * as a hit description, or null when it lands nowhere a declaration is broken.
 */
function leak(
	node: Node,
	parents: Node[],
	ctx: Context,
	depth: number,
): string | null {
	if (depth > 12) return null;
	const placement = placementOf(node, parents);
	if (!placement) {
		const root = componentRoot(parents);
		return root ? `${ROOT_MARK}${root}` : null;
	}
	const parentParents = parents.slice(0, parents.lastIndexOf(placement.parent));
	const parent = elementInfo(placement.parent, ctx);
	if (!parent || parent.style.inline) return null;
	if (parent.style.flexOrGrid) return `flex or grid item of <${parent.name}>`;
	if (parent.style.spaceY !== null && certainlyNotLast(placement, ctx)) {
		const space = parent.style.spaceY;
		return Number.isFinite(space) && space < 16
			? `${space}px vertical space child of <${parent.name}>`
			: null;
	}
	const next = shortNextMargin(placement, ctx);
	if (next) return `collapses with ${next}`;
	if (!mayBeLast(placement, ctx)) return null;
	if (parent.style.holdsMargin)
		return `last child of <${parent.name}>, which holds it in`;
	const own = parent.style.marginBottom;
	if (own !== null && Number.isFinite(own) && own >= 16) return null;
	if (own !== null && own > 0) {
		const outer = leak(placement.parent, parentParents, ctx, depth + 1);
		return `last child of <${parent.name}> (bottom margin ${own}px)${outer ? ` > ${outer}` : ""}`;
	}
	const outer = leak(placement.parent, parentParents, ctx, depth + 1);
	return outer ? `last child of <${parent.name}> > ${outer}` : null;
}

/** Every paragraph of `source` the base margin reaches in shape (a)-(d). */
export function baseMarginHits(
	file: string,
	source: string,
	components: ReadonlyMap<string, ComponentBox>,
	box: (classes: string[]) => BoxStyle,
): BaseMarginHit[] {
	return scanFile(file, source, components, box)?.hits ?? [];
}

interface FileScan {
	program: Node;
	ctx: Context;
	hits: BaseMarginHit[];
	/** Paragraphs whose margin reaches their component's bottom edge (`ROOT_MARK` in `via`). */
	reaches: BaseMarginHit[];
}

function scanFile(
	file: string,
	source: string,
	components: ReadonlyMap<string, ComponentBox>,
	box: (classes: string[]) => BoxStyle,
): FileScan | null {
	if (!/<[A-Za-z.]*[\s>]/.test(source)) return null;
	const program = parse(file, source);
	const ctx: Context = {
		file,
		source,
		lookup: moduleConstants(program),
		components: new Map([
			...components,
			...componentBoxes([{ path: file, source }]),
		]),
		box,
		intrinsic: linkImports(program),
	};
	const isParagraph = (name: string) =>
		name === "p" || (!/^[a-z]/.test(name) && components.get(name)?.tag === "p");
	const hits: BaseMarginHit[] = [];
	const reaches: BaseMarginHit[] = [];
	const visit = (node: Node, parents: Node[]) => {
		if (
			node.type === "JSXElement" &&
			isParagraph(jsxName((node.openingElement as Node).name))
		) {
			const hit = paragraphHit({ node, parents }, ctx);
			if (hit) {
				const record = { file, line: lineOf(source, node.start), ...hit };
				(hit.via.includes(ROOT_MARK) ? reaches : hits).push(record);
			}
		}
		const next = [...parents, node];
		for (const c of childNodes(node)) visit(c, next);
	};
	visit(program, []);
	return { program, ctx, hits, reaches };
}

function lineOf(source: string, index: number): number {
	return source.slice(0, index).split("\n").length;
}

function paragraphHit(
	walk: Walk,
	ctx: Context,
): { shape: BaseMarginShape; via: string } | null {
	const self = elementInfo(walk.node, ctx);
	if (!self) return null;
	const style = self.style;
	if (style.outOfFlow || style.inline) return null;
	if (style.marginBottom !== null) return null;
	const placement = placementOf(walk.node, walk.parents);
	if (!placement) {
		const root = componentRoot(walk.parents);
		if (!root || style.marginBottomWhenLast !== null) return null;
		return { shape: "d", via: `${ROOT_MARK}${root}` };
	}
	for (const ancestor of ancestorsOf(walk)) {
		const info = elementInfo(ancestor.node, ctx);
		if (info?.style.descendantMargin || info?.style.unseen) return null;
	}
	const parent = elementInfo(placement.parent, ctx);
	if (!parent || parent.style.inline) return null;
	if (parent.style.childMargin) return null;
	const last = mayBeLast(placement, ctx);
	if (parent.style.spaceY !== null && !last) return null;
	if (parent.style.flexOrGrid)
		return { shape: "a", via: `flex or grid item of <${parent.name}>` };
	const next =
		parent.style.spaceY !== null ? null : shortNextMargin(placement, ctx);
	if (next) return { shape: "c", via: `collapses with ${next}` };
	if (!last || style.marginBottomWhenLast !== null) return null;
	if (parent.style.holdsMargin) {
		return {
			shape: "b",
			via: `last child of <${parent.name}>, which holds it in`,
		};
	}
	const own = parent.style.marginBottom;
	if (own !== null && Number.isFinite(own) && own >= 16) return null;
	const parentParents = walk.parents.slice(
		0,
		walk.parents.lastIndexOf(placement.parent),
	);
	if (own !== null && own > 0) {
		return {
			shape: "d",
			via: `last child of <${parent.name}>, whose ${own}px bottom margin it replaces`,
		};
	}
	const outer = leak(placement.parent, parentParents, ctx, 0);
	return outer
		? { shape: "d", via: `last child of <${parent.name}> > ${outer}` }
		: null;
}

// ---------------------------------------------------------------------------
// Across files (66.2-39 fix round 4, Part 8b).
//
// The walk above stops at a component's root: where the margin goes from
// there depends on where the component is rendered, which is another file.
// Part 5c's rendered sweep found the case the per-file scan cannot see: the
// bulk import's "Closing automatically" note is the last child of
// `BulkImportConfirmStep`'s root, and the stepper renders that component as
// the only child of a `StepperContent`, a flex item of `StepperRoot`.
// `crossFileHits` follows such a reach to every JSX call site of the
// component in the files it is given (named and default imports resolved
// through the `#` subpath aliases and relative paths, and calls in the same
// file) and runs the same walk from the call site, through further component
// roots up to four levels. The root must be one element: a component that
// returns a fragment places its children in the caller's box one by one, and
// the walk does not follow it. A component rendered by reference (a config
// value, a prop) and a page or layout Next renders have no JSX call site to
// follow; the rendered sweep is the check for those.

/** Marks a margin that reached a component's bottom edge: the callers decide where it lands. */
const ROOT_MARK = "\u0000root:";

/**
 * The component whose returned root is the element these `parents` hold, or
 * null: the chain must reach a named function through conditionals, a
 * `return` and parentheses only (a fragment or a `.map()` breaks it).
 */
function componentRoot(parents: Node[]): string | null {
	for (let i = parents.length - 1; i >= 0; i -= 1) {
		const p = parents[i] as Node;
		if (p.type === "JSXFragment" || p.type === "CallExpression") return null;
		if (PASS_THROUGH.has(p.type)) continue;
		const id = p.id as Node | undefined;
		if (
			(p.type === "FunctionDeclaration" || p.type === "VariableDeclarator") &&
			id?.type === "Identifier" &&
			/^[A-Z]/.test(String(id.name))
		) {
			return String(id.name);
		}
		return null;
	}
	return null;
}

const ALIASES: readonly [string, string][] = [
	["#app/", "src/app/"],
	["#components/", "src/components/"],
	["#lib/", "src/lib/"],
	["#hooks/", "src/hooks/"],
	["#stores/", "src/stores/"],
	["#types/", "src/types/"],
	["#providers/", "src/providers/"],
	["#config/", "src/config/"],
];

/** The repo path an import specifier names, among `known`, or null. */
function resolveImport(
	from: string,
	specifier: string,
	known: ReadonlySet<string>,
): string | null {
	let base: string | null = null;
	for (const [alias, dir] of ALIASES) {
		if (specifier.startsWith(alias)) base = dir + specifier.slice(alias.length);
	}
	if (specifier.startsWith(".")) {
		const parts = from.split("/").slice(0, -1);
		for (const part of specifier.split("/")) {
			if (part === "..") parts.pop();
			else if (part !== ".") parts.push(part);
		}
		base = parts.join("/");
	}
	if (base === null) return null;
	for (const candidate of [base, `${base}.tsx`, `${base}/index.tsx`]) {
		if (known.has(candidate)) return candidate;
	}
	return null;
}

interface CallSite {
	file: string;
	node: Node;
	parents: Node[];
	ctx: Context;
}

/** Default-exported component names of a program. */
function defaultExport(program: Node): string | null {
	for (const statement of (program.body as Node[]) ?? []) {
		if (statement.type !== "ExportDefaultDeclaration") continue;
		const d = statement.declaration as Node;
		if (d.type === "Identifier") return String(d.name);
		const id = d.id as Node | undefined;
		if (id?.type === "Identifier") return String(id.name);
	}
	return null;
}

/**
 * Hits the per-file scan cannot see: a paragraph whose margin reaches its
 * component's root, placed by the component's callers in a box it breaks.
 * Each paragraph is reported once, at its own line, with the first call site
 * that breaks a box.
 */
export function crossFileHits(
	sources: readonly { path: string; source: string }[],
	components: ReadonlyMap<string, ComponentBox>,
	box: (classes: string[]) => BoxStyle,
): BaseMarginHit[] {
	const scans = new Map<string, FileScan>();
	for (const { path, source } of sources) {
		const scan = scanFile(path, source, components, box);
		if (scan) scans.set(path, scan);
	}
	const known = new Set(scans.keys());
	// "<defining file>#<component>" -> its JSX call sites
	const calls = new Map<string, CallSite[]>();
	const defaults = new Map<string, string>();
	for (const [file, scan] of scans) {
		const name = defaultExport(scan.program);
		if (name) defaults.set(file, name);
	}
	for (const [file, scan] of scans) {
		const bindings = new Map<string, string>();
		for (const statement of (scan.program.body as Node[]) ?? []) {
			if (statement.type !== "ImportDeclaration") continue;
			const target = resolveImport(
				file,
				String((statement.source as Node).value),
				known,
			);
			if (!target) continue;
			for (const s of (statement.specifiers as Node[]) ?? []) {
				const local = String((s.local as Node).name);
				if (s.type === "ImportSpecifier") {
					bindings.set(local, `${target}#${String((s.imported as Node).name)}`);
				} else if (s.type === "ImportDefaultSpecifier") {
					const name = defaults.get(target);
					if (name) bindings.set(local, `${target}#${name}`);
				}
			}
		}
		const visit = (node: Node, parents: Node[]) => {
			if (node.type === "JSXElement") {
				const name = jsxName((node.openingElement as Node).name);
				if (/^[A-Z][A-Za-z0-9]*$/.test(name)) {
					const key = bindings.get(name) ?? `${file}#${name}`;
					const list = calls.get(key) ?? [];
					list.push({ file, node, parents, ctx: scan.ctx });
					calls.set(key, list);
				}
			}
			const next = [...parents, node];
			for (const c of childNodes(node)) visit(c, next);
		};
		visit(scan.program, []);
	}

	const found = new Map<string, BaseMarginHit>();
	interface Reach {
		hit: BaseMarginHit;
		/** The file whose component the margin reached the root of. */
		at: string;
		depth: number;
	}
	const queue: Reach[] = [];
	for (const [file, scan] of scans) {
		for (const hit of scan.reaches) queue.push({ hit, at: file, depth: 0 });
	}
	while (queue.length > 0) {
		const reach = queue.shift() as Reach;
		const mark = reach.hit.via.indexOf(ROOT_MARK);
		const component = reach.hit.via.slice(mark + ROOT_MARK.length);
		const before = reach.hit.via.slice(0, mark);
		// The paragraph itself is the root: the caller's box places it directly.
		// A ui component whose host is a paragraph is read at each call site by
		// the per-file scan already, with the caller's classes merged in.
		const isRoot = mark === 0 && reach.depth === 0;
		if (isRoot && reach.at.startsWith("src/components/ui/")) continue;
		for (const site of calls.get(`${reach.at}#${component}`) ?? []) {
			const key = `${reach.hit.file}:${reach.hit.line}`;
			if (found.has(key)) break;
			const placement = placementOf(site.node, site.parents);
			const parent = placement ? elementInfo(placement.parent, site.ctx) : null;
			if (isRoot && parent?.style.childMargin) continue;
			// The caller's own classes land on the root paragraph (the component
			// forwards them): a declared bottom margin there is the paragraph's.
			if (isRoot) {
				const opening = site.node.openingElement as Node;
				const caller = classParts(
					attributeValue(opening, "className"),
					site.ctx.lookup,
				);
				if (site.ctx.box([...caller.always]).marginBottom !== null) continue;
			}
			if (
				ancestorsOf({ node: site.node, parents: site.parents }).some((a) => {
					const info = elementInfo(a.node, site.ctx);
					return info?.style.descendantMargin || info?.style.unseen;
				})
			) {
				continue;
			}
			const outer = leak(site.node, site.parents, site.ctx, 0);
			if (!outer) continue;
			if (isRoot && /vertical space child/.test(outer)) continue;
			const where = `${before}root of <${component}>, rendered at ${site.file}:${lineOf(site.ctx.source, site.node.start)} as `;
			if (outer.includes(ROOT_MARK)) {
				if (reach.depth < 4) {
					queue.push({
						hit: { ...reach.hit, via: `${where}${outer}` },
						at: site.file,
						depth: reach.depth + 1,
					});
				}
				continue;
			}
			const shape: BaseMarginShape = !isRoot
				? "d"
				: /^flex or grid item/.test(outer)
					? "a"
					: /^collapses with/.test(outer)
						? "c"
						: /^last child of <[^>]+>, which holds it in$/.test(outer)
							? "b"
							: "d";
			found.set(key, { ...reach.hit, shape, via: `${where}${outer}` });
		}
	}
	return [...found.values()];
}
