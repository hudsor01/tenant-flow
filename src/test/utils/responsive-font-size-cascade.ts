/**
 * A jsdom harness that decides what font size an element ACTUALLY renders at a
 * given viewport width — by computing the cascade, never by checking that a class
 * is present.
 *
 * NOT A BARREL FILE. Everything below is declared here and nothing is
 * re-exported (CLAUDE.md zero-tolerance rule 2).
 *
 * WHY IT EXISTS. `tailwind-merge` buckets an unmodified utility and a
 * variant-modified one SEPARATELY, so `cn("text-base md:text-sm", "text-xs")`
 * keeps BOTH `md:text-sm` and `text-xs`: only `text-base` loses. The class string
 * then contains `text-xs`, spelled correctly, doing nothing above the `md`
 * breakpoint. This is the same defect family as Phase 65's inert `truncate` and
 * Phase 66's half-cancelled list margins — the class is always there, and the
 * only question is ever whether it wins.
 *
 * A class-presence assertion cannot answer that question. `toContain("text-xs")`
 * passes against the broken build, because the broken build contains `text-xs`.
 * Reading a computed font-size can answer it, and that is what this does.
 *
 * WHAT IT PROVES.
 *   - The sizes come from `src/app/globals.css`'s own `--text-*` scale, read AT
 *     RUN TIME. Retuning the scale retunes what this harness reports, and no test
 *     needs editing to follow.
 *   - The rules are generated ONLY from the classes the component actually
 *     rendered, so a utility nobody wrote emits nothing.
 *   - Every result carries a `baseline` from an unclassed probe of the same tag
 *     in the same document. That is the positive control: a harness that failed
 *     to attach its stylesheet reports the baseline for everything, and the
 *     caller's baseline assertion fails instead of the real one passing
 *     vacuously.
 *
 * THE ONE MODELLING ASSUMPTION, STATED PLAINLY. Tailwind emits a responsive
 * variant AFTER the unvariant form of the same utility, so at equal specificity
 * the variant wins inside its media query. This harness therefore emits matching
 * variants last rather than simulating `@media` (jsdom's `getComputedStyle` only
 * applies media rules whose media list is literally `screen`, so a real
 * `(min-width: 768px)` rule would be silently ignored and every answer would be
 * the mobile one).
 *
 * That assumption is not invented here. `ui/input.tsx`'s own base string is
 * `… text-base … md:text-sm …` — shadcn's 16px-on-mobile / 14px-on-desktop
 * pattern, which prevents iOS zoom-on-focus. It is inert unless `md:text-sm`
 * beats `text-base` at 768px, so every `Input` in this app already depends on the
 * ordering this harness models.
 *
 * WHAT IT DOES NOT PROVE. Not Tailwind's real emitted CSS, not `@layer` order,
 * not geometry, and not the unlayered `@media (max-width: 768px)` block at
 * `globals.css:1536` — that one sets `min-height` and `padding` on inputs and no
 * font size at all, so it does not bear on this, but a future edit to it would
 * not be visible here. A real browser measurement is still the authority.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const GLOBALS_CSS_PATH = resolve(process.cwd(), "src/app/globals.css");

/**
 * Tailwind v4's default breakpoints. `globals.css` defines no `--breakpoint-*`
 * override, so these are the real ones; a future override would need mirroring
 * here, which `assertKnownVariants` makes loud rather than silent.
 */
const BREAKPOINTS = new Map<string, number>([
	["sm", 640],
	["md", 768],
	["lg", 1024],
	["xl", 1280],
	["2xl", 1536],
]);

/**
 * Variants this harness knowingly IGNORES because they do not style the element
 * itself. `file:` targets `::file-selector-button`, and every `Input` in this
 * repo carries `file:text-sm` for it.
 */
const PSEUDO_ELEMENT_VARIANTS = new Set(["file"]);

/** `text-xs`, `md:text-xs`, `file:text-sm`, `dark:text-sm`, … */
const SIZE_UTILITY = /^(?:([a-z0-9-]+):)?text-([a-z0-9-]+)$/;

export interface FontSizeAtWidth {
	/** The size utilities that match at this width, in Tailwind's emission order. */
	applied: string[];
	/** `getComputedStyle().fontSize` on the element under test. */
	computed: string;
	/** The same, on an unclassed probe of the same tag in the same document. */
	baseline: string;
}

function stripComments(css: string): string {
	return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * The `--text-*` type scale, by utility suffix.
 *
 * Doubles as the disambiguator between a font-size utility and a colour one:
 * `text-foreground` resolves through `--color-foreground` and has no `--text-`
 * entry, so it is correctly not a size.
 */
function readTypeScale(): Map<string, string> {
	const css = stripComments(readFileSync(GLOBALS_CSS_PATH, "utf8"));
	const scale = new Map<string, string>();
	for (const match of css.matchAll(/--text-([a-z0-9-]+):\s*([^;]+);/g)) {
		const name = match[1];
		const value = match[2];
		if (name && value) scale.set(name, value.trim());
	}
	if (scale.size === 0) {
		throw new Error(
			"responsive-font-size-cascade: found no --text-* tokens in globals.css",
		);
	}
	return scale;
}

/** CSS identifier escaping, so `md:text-xs` becomes a usable selector. */
function escapeClassName(name: string): string {
	return name.replace(/[^A-Za-z0-9_-]/g, (character) => `\\${character}`);
}

interface SizeUtility {
	className: string;
	/** `null` for an unvariant utility. */
	breakpoint: number | null;
	value: string;
}

/**
 * Every font-size utility on the element, ordered the way Tailwind emits them:
 * unvariant first, then responsive variants by ascending breakpoint.
 *
 * THROWS on a font-size utility carrying a variant this harness does not model
 * (`dark:text-sm`, `hover:text-lg`, an unknown breakpoint). Silently dropping one
 * would return a confident answer computed from an incomplete cascade, which is
 * exactly the kind of quietly-wrong test this file exists to replace.
 */
function sizeUtilitiesOf(element: Element, scale: Map<string, string>) {
	const classNames = (element.getAttribute("class") ?? "")
		.split(/\s+/)
		.filter((name) => name !== "");

	const utilities: SizeUtility[] = [];
	for (const className of classNames) {
		const match = SIZE_UTILITY.exec(className);
		if (!match) continue;
		const variant = match[1];
		const token = match[2];
		if (token === undefined) continue;
		const value = scale.get(token);
		// Not a size utility at all — `text-foreground`, `text-center`, …
		if (value === undefined) continue;
		if (variant === undefined) {
			utilities.push({ className, breakpoint: null, value });
			continue;
		}
		if (PSEUDO_ELEMENT_VARIANTS.has(variant)) continue;
		const breakpoint = BREAKPOINTS.get(variant);
		if (breakpoint === undefined) {
			throw new Error(
				`responsive-font-size-cascade: cannot model the variant in \`${className}\`. Add it to BREAKPOINTS, or verify this cascade in a real browser.`,
			);
		}
		utilities.push({ className, breakpoint, value });
	}

	return utilities.sort((a, b) => (a.breakpoint ?? -1) - (b.breakpoint ?? -1));
}

/**
 * Compute the element's rendered font size at `viewportWidth`.
 *
 * The stylesheet and the probe are removed before returning, so repeated calls
 * across a suite never accumulate rules.
 */
export function computeFontSizeAt(
	element: Element,
	viewportWidth: number,
): FontSizeAtWidth {
	const scale = readTypeScale();
	const matching = sizeUtilitiesOf(element, scale).filter(
		(utility) =>
			utility.breakpoint === null || utility.breakpoint <= viewportWidth,
	);

	const doc = element.ownerDocument;
	const view = doc.defaultView;
	if (!view) {
		throw new Error(
			"responsive-font-size-cascade: element is not attached to a window",
		);
	}

	const style = doc.createElement("style");
	style.textContent = matching
		.map(
			(utility) =>
				`.${escapeClassName(utility.className)} { font-size: ${utility.value}; }`,
		)
		.join("\n");
	doc.head.appendChild(style);

	const probe = doc.createElement(element.tagName.toLowerCase());
	doc.body.appendChild(probe);

	try {
		return {
			applied: matching.map((utility) => utility.className),
			computed: view.getComputedStyle(element).fontSize,
			baseline: view.getComputedStyle(probe).fontSize,
		};
	} finally {
		probe.remove();
		style.remove();
	}
}
