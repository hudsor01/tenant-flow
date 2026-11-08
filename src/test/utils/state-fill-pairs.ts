/**
 * The label and fill an element shows in each interactive state, read from one
 * class string (66.2-39 fix round 1, part F; WCAG 1.4.3 in every state).
 *
 * NOT A BARREL FILE. Everything below is declared here and nothing is
 * re-exported (CLAUDE.md zero-tolerance rule 2). This file sits inside the
 * Tailwind source scan, so it names no utility in a class position: the class
 * forms below are assembled from parts.
 *
 * A class string is the unit: a `className` literal, one `cn()` argument, or a
 * cva base or variant string. For each state chain in it (`hover`, `focus`,
 * `focus-visible`, `active`, `data-[state=open|on|active|checked]`,
 * `data-highlighted`, `data-[highlighted]`, `data-[selected=true]`,
 * `aria-selected`, `aria-pressed`, `aria-current`, `group-hover`, and those
 * under a compound selector such as `[a&]:` or `[a]:`), the state's fill is the
 * background the chain sets (else the resting background, else the surface),
 * and its label is the text color the chain sets (else the resting text color,
 * else inherited). `dark:` forms override in dark, as the compiled order makes
 * them. A label-only state is measured against the resting fill.
 * The text keywords `inherit` and `current` set no color of their own: the
 * label they name is the inherited one.
 *
 * A class string cannot see the fills of the elements around it, so
 * `renderedStacks` reads a rendered tree instead (66.2-39 fix round 4, F1,
 * G32): for each element that shows text, the resting fills of it and its
 * ancestors up to the root, composited in order, under its label, at rest and
 * in each state of an element on that chain.
 */

import {
	contrast,
	type LinearRgb,
	oklchToken,
	oklchToLinearSrgb,
	over,
	type Theme,
	themeBlock,
} from "./oklch-contrast";
import { escapeRegExp } from "./regexp-source";

/** A painted color: a theme token at an alpha, or a fixed white or black. */
export interface Paint {
	token: string;
	alpha: number;
}

export interface StatePair {
	/** The state chain, sorted and joined with ":" (no `dark`). */
	state: string;
	theme: Theme;
	/** null: the state paints no fill, so the label sits on the surface. */
	fill: Paint | null;
	/** null: the label color is inherited from the parent. */
	label: Paint | null;
	/** The class tokens that produced this pair, for a failure message. */
	source: string[];
}

const STATE_VARIANTS = new Set([
	"hover",
	"focus",
	"focus-visible",
	"active",
	"group-hover",
	"data-highlighted",
	"data-[highlighted]",
	"data-[state=open]",
	"data-[state=on]",
	"data-[state=active]",
	"data-[state=checked]",
	"data-[selected=true]",
	"data-selected",
	"data-[active=true]",
	"data-active",
	"aria-selected",
	"aria-[selected=true]",
	"aria-pressed",
	"aria-[pressed=true]",
	"aria-current",
	"aria-[current=page]",
]);

/** A variant names a state: one of the set, or a named group-hover. */
function isStateVariant(variant: string): boolean {
	return STATE_VARIANTS.has(variant) || variant.startsWith("group-hover/");
}

/**
 * The fixed colors and the keyword colors; the theme's color names arrive as
 * the `colors` parameter.
 */
const FIXED = new Set(["white", "black"]);
const KEYWORD = new Set(["transparent", "current", "inherit"]);

/** Split a class token into its variants and utility, outside brackets. */
export function splitClass(token: string): {
	variants: string[];
	utility: string;
} {
	const parts: string[] = [];
	let depth = 0;
	let current = "";
	for (const ch of token) {
		if (ch === "[" || ch === "(") depth += 1;
		if (ch === "]" || ch === ")") depth -= 1;
		if (ch === ":" && depth === 0) {
			parts.push(current);
			current = "";
		} else {
			current += ch;
		}
	}
	parts.push(current);
	const utility = parts.pop() ?? "";
	return { variants: parts, utility };
}

const BG = "b" + "g-";
const TEXT = "te" + "xt-";

/**
 * A `bg-<color>[/alpha]` or `text-<color>[/alpha]` utility as a paint, or
 * undefined when it is not a color (a size, an arbitrary value) or the color
 * is not one of `colors`.
 */
function colorOf(
	utility: string,
	prefix: "bg" | "text",
	colors: ReadonlySet<string>,
): Paint | null | undefined {
	const head = prefix === "bg" ? BG : TEXT;
	const bare = utility.replace(/^!|!$/g, "");
	if (!bare.startsWith(head)) return undefined;
	const [name = "", alphaText] = bare.slice(head.length).split("/");
	if (KEYWORD.has(name)) {
		// The inherit and current text keywords name the inherited label; a
		// fill keyword other than transparent is no color this reads.
		if (name === "transparent") return null;
		return prefix === "text" ? null : undefined;
	}
	if (!colors.has(name) && !FIXED.has(name)) return undefined;
	let alpha = 1;
	if (alphaText !== undefined) {
		if (!/^\d+$/.test(alphaText)) return undefined;
		alpha = Number(alphaText) / 100;
	}
	return { token: name, alpha };
}

interface Slot {
	light?: Paint | null;
	dark?: Paint | null;
	tokens: string[];
}

/** Every state pair one class string produces, in both themes. */
export function statePairs(
	classString: string,
	colors: ReadonlySet<string>,
): StatePair[] {
	const restFill: Slot = { tokens: [] };
	const restLabel: Slot = { tokens: [] };
	const fills = new Map<string, Slot>();
	const labels = new Map<string, Slot>();
	for (const token of classString.split(/\s+/).filter(Boolean)) {
		const { variants, utility } = splitClass(token);
		const dark = variants.includes("dark");
		const others = variants.filter((v) => v !== "dark");
		const stateful = others.some(isStateVariant);
		// A resting color takes no variant but dark; any other variant (a
		// breakpoint, aria-invalid, a disabled state) is a different condition.
		if (!stateful && others.length > 0) continue;
		for (const prefix of ["bg", "text"] as const) {
			const paint = colorOf(utility, prefix, colors);
			if (paint === undefined) continue;
			const key = [...others].sort().join(":");
			const map = prefix === "bg" ? fills : labels;
			const slot = stateful
				? (map.get(key) ?? { tokens: [] })
				: prefix === "bg"
					? restFill
					: restLabel;
			if (dark) slot.dark = paint;
			else slot.light = paint;
			slot.tokens.push(token);
			if (stateful) map.set(key, slot);
		}
	}
	const pick = (slot: Slot | undefined, theme: Theme) =>
		theme === "dark" && slot?.dark !== undefined ? slot.dark : slot?.light;
	// The cascade, approximated: under a state chain, the slot whose chain is
	// the largest subset of it applies (more variants compile later and win),
	// else the resting slot. A descendant variant (`[&_svg…]`, `*:`) paints a
	// child over the element's own fill, so it is dropped for the fill lookup.
	const rank = (v: string) =>
		v.startsWith("data-")
			? 7
			: v.startsWith("aria-")
				? 6
				: v === "active"
					? 5
					: v === "focus-visible"
						? 4
						: v === "focus"
							? 3
							: v === "hover"
								? 2
								: v.startsWith("group-")
									? 1
									: 0;
	const isDescendant = (v: string) =>
		v.startsWith("[&_") || v.startsWith("[&>") || v === "*" || v === "**";
	const best = (
		map: Map<string, Slot>,
		variants: string[],
		theme: Theme,
	): { paint: Paint | null | undefined; slot: Slot | undefined } => {
		let found: Slot | undefined;
		let size = -1;
		for (const [key, slot] of map) {
			const keyVariants = key.split(":").filter(Boolean);
			if (pick(slot, theme) === undefined) continue;
			if (!keyVariants.every((v) => variants.includes(v))) continue;
			// Ties go to the variant Tailwind compiles later (data-* after aria-*
			// after the pseudo-classes), which wins at equal specificity.
			const weight =
				keyVariants.length * 100 + Math.max(0, ...keyVariants.map(rank));
			if (weight > size) {
				found = slot;
				size = weight;
			}
		}
		return { paint: found ? pick(found, theme) : undefined, slot: found };
	};
	const splitKey = (key: string) => splitClass(`${key}:x`).variants;
	const pairs: StatePair[] = [];
	for (const state of new Set([...fills.keys(), ...labels.keys()])) {
		const variants = splitKey(state);
		const fillVariants = variants.filter((v) => !isDescendant(v));
		for (const theme of ["light", "dark"] as const) {
			const stateFill = best(fills, fillVariants, theme);
			const stateLabel = best(labels, variants, theme);
			const fill =
				stateFill.paint !== undefined
					? stateFill.paint
					: (pick(restFill, theme) ?? null);
			const label =
				stateLabel.paint !== undefined
					? stateLabel.paint
					: (pick(restLabel, theme) ?? null);
			pairs.push({
				state,
				theme,
				fill,
				label,
				source: [
					...(stateFill.slot?.tokens ??
						(stateFill.paint === undefined ? restFill.tokens : [])),
					...(stateLabel.slot?.tokens ?? restLabel.tokens),
				],
			});
		}
	}
	return pairs;
}

/**
 * The class strings of a source file: every string and template literal (a
 * template's `${…}` parts are cut out), with its 1-based line. Comments are
 * removed first, so a class named in prose is not read.
 */
export function classStrings(source: string): { text: string; line: number }[] {
	const out: { text: string; line: number }[] = [];
	const lineAt = (index: number) => source.slice(0, index).split("\n").length;
	let i = 0;
	while (i < source.length) {
		const ch = source[i];
		const next = source[i + 1];
		if (ch === "/" && next === "/") {
			while (i < source.length && source[i] !== "\n") i += 1;
			continue;
		}
		if (ch === "/" && next === "*") {
			const end = source.indexOf("*/", i + 2);
			i = end < 0 ? source.length : end + 2;
			continue;
		}
		if (ch === '"' || ch === "'" || ch === "`") {
			const start = i;
			let text = "";
			let depth = 0;
			i += 1;
			while (i < source.length) {
				const c = source[i];
				if (c === "\\") {
					text += source[i + 1] ?? "";
					i += 2;
					continue;
				}
				if (ch === "`" && c === "$" && source[i + 1] === "{" && depth === 0) {
					depth = 1;
					text += " ";
					i += 2;
					continue;
				}
				if (depth > 0) {
					if (c === "{") depth += 1;
					if (c === "}") depth -= 1;
					i += 1;
					continue;
				}
				if (c === ch) break;
				if (ch !== "`" && c === "\n") break;
				text += c;
				i += 1;
			}
			i += 1;
			out.push({ text, line: lineAt(start) });
			continue;
		}
		i += 1;
	}
	return out;
}

/** The surfaces a state fill can sit on: the page, a card, a menu or popover. */
const STATE_SURFACES = ["background", "card", "popover"] as const;

/** A token's linear sRGB in `theme`, following one `var(--x)` alias. */
function themeColor(css: string, theme: Theme, token: string): LinearRgb {
	if (token === "white") return [1, 1, 1];
	if (token === "black") return [0, 0, 0];
	const body = themeBlock(css, theme);
	const property = escapeRegExp(`--${token}:`);
	const alias = new RegExp(`${property}\\s*var\\(--([a-z0-9-]+)\\)`).exec(css);
	const name = new RegExp(`${property}\\s*oklch`).test(body)
		? token
		: alias?.[1];
	if (!name) throw new Error(`--${token} has no ${theme} value`);
	return oklchToLinearSrgb(oklchToken(body, name));
}

function paintOver(
	css: string,
	theme: Theme,
	paint: Paint,
	under: LinearRgb,
): LinearRgb {
	const base = themeColor(css, theme, paint.token);
	return paint.alpha >= 1 ? base : over(base, paint.alpha, under);
}

/**
 * The lowest contrast `pair` shows across the surfaces, with where. An
 * inherited label is read both ways a child label can be: `foreground` and
 * `muted-foreground`. `labelOverride` supplies a label set in another class
 * string of the same element.
 */
export function worstStateContrast(
	css: string,
	pair: StatePair,
	labelOverride?: Paint,
): { ratio: number; at: string } {
	let ratio = Number.POSITIVE_INFINITY;
	let at = "";
	const label = labelOverride ?? pair.label;
	const labels: Paint[] = label
		? [label]
		: [
				{ token: "foreground", alpha: 1 },
				{ token: "muted-foreground", alpha: 1 },
			];
	for (const surfaceName of STATE_SURFACES) {
		const surface = themeColor(css, pair.theme, surfaceName);
		const bg = pair.fill
			? paintOver(css, pair.theme, pair.fill, surface)
			: surface;
		for (const l of labels) {
			const r = contrast(paintOver(css, pair.theme, l, bg), bg);
			if (r < ratio) {
				ratio = r;
				at = `${label ? "" : "inherited "}${l.token}${l.alpha < 1 ? `/${l.alpha * 100}` : ""} on ${pair.fill ? `${pair.fill.token}${pair.fill.alpha < 1 ? `/${Math.round(pair.fill.alpha * 100)}` : ""}` : "no fill"} over ${surfaceName} (${pair.theme})`;
			}
		}
	}
	return { ratio, at };
}

/** One text element of a rendered tree, in one state and theme. */
export interface StackPair {
	/** The element's own text, for a failure message. */
	text: string;
	/** "rest", or `<tag>:<state chain>` of the element whose state paints it. */
	state: string;
	theme: Theme;
	/** The fills under the text, outermost first. */
	layers: Paint[];
	/** null: no element on the chain sets a label; the page's `foreground`. */
	label: Paint | null;
}

/** The resting fill and label one class string sets in `theme`. */
function restingPaints(
	classString: string,
	colors: ReadonlySet<string>,
	theme: Theme,
): { fill: Paint | null | undefined; label: Paint | null | undefined } {
	const found = {
		light: { fill: undefined, label: undefined },
		dark: { fill: undefined, label: undefined },
	} as Record<
		Theme,
		{ fill: Paint | null | undefined; label: Paint | null | undefined }
	>;
	for (const token of classString.split(/\s+/).filter(Boolean)) {
		const { variants, utility } = splitClass(token);
		if (variants.some((v) => v !== "dark")) continue;
		const slot = variants.includes("dark") ? found.dark : found.light;
		const fill = colorOf(utility, "bg", colors);
		if (fill !== undefined) slot.fill = fill;
		const label = colorOf(utility, "text", colors);
		if (label !== undefined) slot.label = label;
	}
	if (theme === "light") return found.light;
	return {
		fill: found.dark.fill !== undefined ? found.dark.fill : found.light.fill,
		label:
			found.dark.label !== undefined ? found.dark.label : found.light.label,
	};
}

const OPACITY = new RegExp(`^${"op"}acity-`);
const HIDDEN = new Set([`${"sr"}-only`, `${"hid"}den`, `${"in"}visible`]);

/**
 * Every text element under `root` as it paints: the resting fills of the
 * element and its ancestors (from `root` down) composited in order, and the
 * nearest label on that chain, at rest; then, for each element on the chain
 * whose class string has a state chain (`statePairs`), that state's fill in
 * place of the element's resting one and its label unless an element nearer
 * the text sets its own. Text an element hides (the screen-reader-only,
 * display-none or visibility-hidden class, on it or an ancestor) is skipped.
 * A resting opacity utility on the chain throws: a faded layer is not a fill
 * this composites.
 */
export function renderedStacks(
	root: Element,
	colors: ReadonlySet<string>,
): StackPair[] {
	const pairs: StackPair[] = [];
	const classOf = (el: Element) => el.getAttribute("class") ?? "";
	for (const el of [root, ...root.querySelectorAll("*")]) {
		const text = [...el.childNodes]
			.filter((node) => node.nodeType === 3)
			.map((node) => node.textContent ?? "")
			.join("")
			.trim();
		if (!text) continue;
		const chain: Element[] = [];
		for (let at: Element | null = el; at; at = at.parentElement) {
			chain.unshift(at);
			if (at === root) break;
		}
		const classes = chain.map(classOf);
		if (classes.some((c) => c.split(/\s+/).some((t) => HIDDEN.has(t)))) {
			continue;
		}
		const faded = classes.find((c) =>
			c.split(/\s+/).some((t) => OPACITY.test(t)),
		);
		if (faded !== undefined) {
			throw new Error(`"${text}" sits under a resting opacity: ${faded}`);
		}
		for (const theme of ["light", "dark"] as const) {
			const rest = classes.map((c) => restingPaints(c, colors, theme));
			/** The nearest label from index `from` down to `to` (inherit skips). */
			const labelBetween = (from: number, to: number): Paint | null => {
				for (let i = from; i >= to; i -= 1) {
					const label = rest[i]?.label;
					if (label) return label;
				}
				return null;
			};
			const layersWith = (index: number, fill: Paint | null | undefined) =>
				rest
					.map((r, i) => (i === index ? fill : r.fill))
					.filter((f): f is Paint => f !== null && f !== undefined);
			pairs.push({
				text,
				state: "rest",
				theme,
				layers: layersWith(-1, undefined),
				label: labelBetween(chain.length - 1, 0),
			});
			chain.forEach((host, index) => {
				for (const pair of statePairs(classes[index] ?? "", colors)) {
					if (pair.theme !== theme) continue;
					// A descendant variant paints a child, not this text's chain.
					if (/\[&|\*/.test(pair.state)) continue;
					pairs.push({
						text,
						state: `${host.tagName.toLowerCase()}:${pair.state}`,
						theme,
						layers: layersWith(index, pair.fill),
						label:
							labelBetween(chain.length - 1, index + 1) ??
							pair.label ??
							labelBetween(index - 1, 0),
					});
				}
			});
		}
	}
	return pairs;
}

/**
 * The contrast of `pair`'s label over its layers composited on `surface` (a
 * theme token: the page, a card), as `worstStateContrast` paints a layer.
 */
export function stackContrast(
	css: string,
	surface: string,
	pair: StackPair,
): number {
	let bg = themeColor(css, pair.theme, surface);
	for (const layer of pair.layers) bg = paintOver(css, pair.theme, layer, bg);
	const label = pair.label ?? { token: "foreground", alpha: 1 };
	return contrast(paintOver(css, pair.theme, label, bg), bg);
}
