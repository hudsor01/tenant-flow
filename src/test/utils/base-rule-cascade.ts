/**
 * A jsdom harness that decides whether a rendered list ACTUALLY defeats the
 * unscoped `ul, ol` and `li` base rules in `globals.css` — by reading the
 * computed value, never the class string.
 *
 * NOT A BARREL FILE. Everything below is declared here and nothing is
 * re-exported (CLAUDE.md zero-tolerance rule 2).
 *
 * WHY IT EXISTS. `globals.css` declares `ul, ol { margin: 1rem 0; padding-left:
 * 1.5rem }` inside `@layer base`. `margin: 1rem 0` is a SHORTHAND that writes
 * BOTH `margin-top` and `margin-bottom`, and Phase 66 shipped a neutralizer set
 * — `pl-0 mt-0 [&>li]:mb-0` — that cancelled only the top half on three lists.
 * The guard test could not see it, because it asserted the classes were
 * PRESENT. A class-presence assertion passes against every member of this defect
 * family: the class is always present and spelled correctly, and the only
 * question is ever whether ANYTHING cancels the base declaration at all. Reading
 * the computed value is the assertion that can tell those apart.
 *
 * WHAT IT PROVES.
 *   - The base rules are read from `src/app/globals.css` AT RUN TIME, so they
 *     are the real declarations. Widening `margin: 1rem 0` there widens what
 *     this harness demands, and no test needs editing to follow.
 *   - The utility rules are generated ONLY from the classes the component
 *     actually rendered. A neutralizer that was never written emits no rule, the
 *     base declaration survives into the computed value, and the assertion
 *     fails — which is the whole point.
 *   - Every result carries a `baseline` computed from an unclassed probe list in
 *     the same document. That is the positive control: if the harness failed to
 *     apply its stylesheet at all, `baseline` would read `0px` and the caller's
 *     baseline assertion fails rather than the neutralization assertion silently
 *     passing against nothing.
 *
 * WHAT IT DOES NOT PROVE. Not Tailwind's real emitted CSS, not `@layer` order,
 * not geometry, and not the unlayered `@media (max-width: 768px)` block at
 * `globals.css:1536`. Those stay with plan 66-17's Playwright rows E-17, E-18
 * and E-20, which measure a real browser against the compiled bundle.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const GLOBALS_CSS_PATH = resolve(process.cwd(), "src/app/globals.css");

/**
 * Regex sources, not literal selectors: the rule in `globals.css` is written
 * across two lines (`ul,\n\tol {`) and normalisation leaves one space behind.
 */
const LIST_SELECTOR_SOURCE = "ul,\\s*ol";
const ITEM_SELECTOR_SOURCE = "li";

/**
 * The neutralizer utilities this harness understands, mapped to the declarations
 * Tailwind v4 emits for them. Deliberately SMALL and deliberately PHYSICAL.
 *
 * `my-0` and `mx-0` are absent on purpose. Tailwind v4 emits those as the
 * LOGICAL `margin-block` / `margin-inline`, which jsdom's `cssstyle` does not
 * expand into the physical longhands `getComputedStyle` reports — so a mapping
 * for them would be a claim this harness cannot honour. A list that uses one
 * emits no rule here and fails the assertion, which correctly forces the author
 * to verify the real cascade in a browser instead of trusting jsdom.
 */
const NEUTRALIZER_DECLARATIONS = new Map<string, string>([
	["pl-0", "padding-left: 0px;"],
	["mt-0", "margin-top: 0px;"],
	["mb-0", "margin-bottom: 0px;"],
]);

/** Tailwind's arbitrary child variant as written on every list in this repo. */
const CHILD_LI_VARIANT = /^\[&>li\]:(.+)$/;

export interface ListBoxValues {
	paddingLeft: string;
	marginTop: string;
	marginBottom: string;
	/** `null` when the list rendered no children — a positive control on itself. */
	firstChildTag: string | null;
	firstChildMarginBottom: string | null;
}

export interface ListCascadeResult {
	/** The list under test, carrying only the neutralizers it actually rendered. */
	neutralized: ListBoxValues;
	/** An unclassed probe list of the same tag in the same document. */
	baseline: ListBoxValues;
}

function stripComments(css: string): string {
	return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * The declaration body of the ONE rule matching `selectorSource`. Throws when
 * there is not exactly one, because a second `ul, ol` rule would mean this
 * harness is silently testing against the wrong half of the cascade.
 */
function extractBaseDeclarations(selectorSource: string): string {
	const css = stripComments(readFileSync(GLOBALS_CSS_PATH, "utf8")).replace(
		/\s+/g,
		" ",
	);
	const pattern = new RegExp(
		`[{}]\\s*${selectorSource}\\s*\\{([^{}]*)\\}`,
		"g",
	);
	const bodies = [...css.matchAll(pattern)].map((match) => match[1] ?? "");
	const body = bodies[0];
	if (bodies.length !== 1 || body === undefined) {
		throw new Error(
			`base-rule-cascade: expected exactly one \`${selectorSource}\` rule in globals.css, found ${bodies.length}`,
		);
	}
	return body.trim();
}

/** CSS identifier escaping for Tailwind's bracketed arbitrary-variant classes. */
function escapeClassName(name: string): string {
	return name.replace(/[^A-Za-z0-9_-]/g, (character) => `\\${character}`);
}

/**
 * One rule per neutralizer the element actually carries. Classes outside the map
 * (`flex`, `gap-2`, …) contribute nothing: they set no property the base rules
 * set, so they cannot change the answer either way.
 */
function utilityRules(element: Element): string {
	const classNames = (element.getAttribute("class") ?? "")
		.split(/\s+/)
		.filter((name) => name !== "");
	const rules: string[] = [];
	for (const className of classNames) {
		const escaped = escapeClassName(className);
		const childVariant = CHILD_LI_VARIANT.exec(className);
		if (childVariant) {
			const declaration = NEUTRALIZER_DECLARATIONS.get(childVariant[1] ?? "");
			if (declaration) rules.push(`.${escaped} > li { ${declaration} }`);
			continue;
		}
		const declaration = NEUTRALIZER_DECLARATIONS.get(className);
		if (declaration) rules.push(`.${escaped} { ${declaration} }`);
	}
	return rules.join("\n");
}

function readValues(list: Element): ListBoxValues {
	const view = list.ownerDocument.defaultView;
	if (!view) {
		throw new Error("base-rule-cascade: element is not attached to a window");
	}
	const style = view.getComputedStyle(list);
	const first = list.firstElementChild;
	return {
		paddingLeft: style.paddingLeft,
		marginTop: style.marginTop,
		marginBottom: style.marginBottom,
		firstChildTag: first ? first.tagName.toLowerCase() : null,
		firstChildMarginBottom: first
			? view.getComputedStyle(first).marginBottom
			: null,
	};
}

/**
 * Apply the real base rules plus the element's own neutralizers, then read both
 * the element and an unclassed probe of the same tag.
 *
 * The stylesheet and the probe are removed before returning, so a suite that
 * calls this more than once never accumulates rules across renders.
 */
export function computeListCascade(list: Element): ListCascadeResult {
	const tag = list.tagName.toLowerCase();
	if (tag !== "ul" && tag !== "ol") {
		throw new Error(
			`base-rule-cascade: expected a ul or ol, received <${tag}>`,
		);
	}
	const doc = list.ownerDocument;
	const style = doc.createElement("style");
	style.textContent = [
		`ul, ol { ${extractBaseDeclarations(LIST_SELECTOR_SOURCE)} }`,
		`li { ${extractBaseDeclarations(ITEM_SELECTOR_SOURCE)} }`,
		utilityRules(list),
	].join("\n");
	doc.head.appendChild(style);

	const probe = doc.createElement(tag);
	probe.appendChild(doc.createElement("li"));
	doc.body.appendChild(probe);

	try {
		return { neutralized: readValues(list), baseline: readValues(probe) };
	} finally {
		probe.remove();
		style.remove();
	}
}
