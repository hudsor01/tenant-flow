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
 *   - The sizes and the breakpoints come from Tailwind's own design system,
 *     loaded AT RUN TIME from the real `src/app/globals.css` (Tailwind's default
 *     theme plus the project `@theme`). A size that only Tailwind's defaults
 *     define still resolves, and a retuned or deleted token is followed with no
 *     test edit.
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
 * not geometry, and not the touch-target rule (D-08). That rule lives in
 * `@layer base` inside `@media (width < 48rem)` as zero-specificity `:where(...)`
 * rules that set `min-height`/`min-width` and no font size at all, so it does
 * not bear on this, but a future edit to it would not be visible here. A real
 * browser measurement is still the authority.
 */

import {
	loadProjectDesignSystem,
	type TailwindDesignSystem,
} from "#test/utils/tailwind-engine";

/** One design system per test file: loading it is the slow step. */
let designSystemPromise: Promise<TailwindDesignSystem> | undefined;

function designSystem(): Promise<TailwindDesignSystem> {
	designSystemPromise ??= loadProjectDesignSystem();
	return designSystemPromise;
}

/** Pixels per `rem`, for a breakpoint in a document with no root font-size override. */
const ROOT_FONT_SIZE_PX = 16;

/** A length jsdom can compute without layout: `0.75rem`, `14px`, `1em`. */
const PLAIN_LENGTH = /^-?\d*\.?\d+(rem|px|em)$/;

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

/**
 * The size a `text-<token>` utility sets, or `undefined` when the utility is not
 * a font size at all.
 *
 * Doubles as the disambiguator between a font-size utility and a colour one:
 * `text-foreground` resolves through `--color-foreground` and has no `--text-`
 * entry, so it is correctly not a size.
 */
function sizeOf(
	ds: TailwindDesignSystem,
	className: string,
	token: string,
): string | undefined {
	if (token.includes("--")) return undefined;
	const value = ds.resolveThemeValue(`--text-${token}`);
	if (value === undefined) return undefined;
	if (!PLAIN_LENGTH.test(value)) {
		throw new Error(
			`responsive-font-size-cascade: \`${className}\` resolves to "${value}", which jsdom cannot compute. Verify it in a real browser.`,
		);
	}
	return value;
}

/** The min-width of the responsive variant `variant`, in px. */
function breakpointOf(
	ds: TailwindDesignSystem,
	className: string,
	variant: string,
): number {
	const value = ds.resolveThemeValue(`--breakpoint-${variant}`);
	const match =
		value === undefined ? null : /^(\d*\.?\d+)(rem|px)$/.exec(value);
	if (!match?.[1]) {
		throw new Error(
			`responsive-font-size-cascade: cannot model the variant in \`${className}\`. The design system has no --breakpoint-${variant}; verify this cascade in a real browser.`,
		);
	}
	const size = Number(match[1]);
	return match[2] === "rem" ? size * ROOT_FONT_SIZE_PX : size;
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
function sizeUtilitiesOf(element: Element, ds: TailwindDesignSystem) {
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
		const value = sizeOf(ds, className, token);
		// Not a size utility at all — `text-foreground`, `text-center`, …
		if (value === undefined) continue;
		if (variant === undefined) {
			utilities.push({ className, breakpoint: null, value });
			continue;
		}
		if (PSEUDO_ELEMENT_VARIANTS.has(variant)) continue;
		const breakpoint = breakpointOf(ds, className, variant);
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
export async function computeFontSizeAt(
	element: Element,
	viewportWidth: number,
): Promise<FontSizeAtWidth> {
	const ds = await designSystem();
	const matching = sizeUtilitiesOf(element, ds).filter(
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
