/**
 * A caller's Button colors hold in both themes and in every pointer state
 * (66.2-39 fix round 3, F7, OD-2).
 *
 * Button merges a caller's className into its variant with `cn`
 * (tailwind-merge), which drops a variant class only for the same utility
 * under the same modifier chain. The outline, ghost, default and destructive
 * variants carry `dark:` classes (the CP-2 dark fills and
 * `dark:hover:text-foreground`), and Tailwind emits each `dark:` rule after
 * the plain one at equal specificity. So a caller's plain `hover:bg-…`,
 * `hover:text-…`, `border-…` or `bg-…` loses to the variant's `dark:` form of
 * the same utility in dark mode: a destructive hover turns neutral or emerald,
 * a muted icon brightens, a tinted border turns gray.
 *
 * For every Button site in shipped src (`#test/utils/button-sites`):
 * - a caller class whose `dark:` form the variant still sets to another value
 *   is a violation: the caller twins it (`dark:hover:bg-destructive/10`), and
 *   tailwind-merge then drops the variant's;
 * - on ghost and outline, a status-colored caller label (destructive, success,
 *   warning, info) that the variant's hover label replaces is a violation: the
 *   caller states its hover label, so the status hue survives the pointer.
 * A site with a literal `disabled` skips pointer states, which cannot match.
 *
 * A site that sets `aria-disabled` keeps its pointer states (66.2-39 fix
 * round 4, G15): the reports' off exports turned emerald under the pointer
 * in light. Each such site's merged classes are compiled by Tailwind's own
 * compiler (`compileCandidates`) and resolved by jsdom's cascade on an
 * `aria-disabled` button, hovered and not, in both themes: the hovered fill
 * and label must be the resting ones. The utilities layer is read with its
 * hover media and `@supports` blocks opened and `:hover` as an attribute, the
 * preflight's button reset restated, and each fill or label value swapped for
 * an opaque color of its own, so the cascade's winner reads back by identity
 * whether or not jsdom resolves the theme's variables.
 *
 * Under `asChild`, Radix Slot appends the child's own className to Button's
 * without merging, so a state or dark color there would race the variant's by
 * stylesheet order, which neither check can see: the child carries none.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss, { type AtRule } from "postcss";
import { describe, expect, it } from "vitest";
import { cn } from "#lib/utils";
import {
	type ButtonSite,
	buttonClasses,
	buttonSites,
} from "#test/utils/button-sites";
import { splitClass } from "#test/utils/state-fill-pairs";
import { compileCandidates } from "#test/utils/tailwind-engine";
import { collectG7SourceTexts } from "#test/utils/tailwind-guards";

const POINTER = new Set(["hover", "active"]);
const STATUS_LABEL =
	/^(?:te)xt-(?:destructive|success|warning|info)(?:-text)?(?:\/\d+)?$/;
const HOVER_LABEL = /^(?:te)xt-/;

function siteViolations(site: ButtonSite): string[] {
	const out: string[] = [];
	const variantTokens = buttonClasses(site.variant, site.size).split(" ");
	const own = new Set(variantTokens);
	const inherited = new Set(site.wrapperClasses.split(/\s+/));
	const where = `${site.file}:${site.line} <${site.element} variant="${site.variant}">`;
	for (const className of site.classNames) {
		const merged = new Set(
			buttonClasses(site.variant, site.size, className).split(" "),
		);
		const surviving = variantTokens.filter((t) => merged.has(t));
		const callerTokens = className
			.split(/\s+/)
			.filter((t) => t !== "" && !own.has(t) && !inherited.has(t));
		const callerDark = callerTokens.filter((t) =>
			splitClass(t).variants.includes("dark"),
		);
		// A variant `dark:` class the caller did not restate (a caller `dark:`
		// class of the same utility replaces it, or repeats it on purpose).
		const darkSurvivors = surviving.filter(
			(t) =>
				splitClass(t).variants.includes("dark") &&
				!callerDark.some((c) => c === t || cn(t, c) === c),
		);
		for (const token of callerTokens) {
			const { variants } = splitClass(token);
			if (variants.includes("dark")) continue;
			if (site.disabled && variants.some((v) => POINTER.has(v))) continue;
			const twin = `dark:${token}`;
			for (const survivor of darkSurvivors) {
				if (survivor === twin) continue;
				if (cn(survivor, twin) !== twin) continue;
				out.push(`${where} ${token} loses to ${survivor} in dark`);
			}
		}
		if (site.disabled) continue;
		if (site.variant !== "ghost" && site.variant !== "outline") continue;
		const restStatus = callerTokens.filter(
			(t) => splitClass(t).variants.length === 0 && STATUS_LABEL.test(t),
		);
		const hoverLabel = surviving.filter((t) => {
			const { variants, utility } = splitClass(t);
			return (
				variants.length === 1 &&
				variants[0] === "hover" &&
				HOVER_LABEL.test(utility)
			);
		});
		for (const label of restStatus) {
			for (const replaced of hoverLabel) {
				out.push(`${where} ${label} turns ${replaced} on hover`);
			}
		}
	}
	return [...new Set(out)];
}

const COLOR_UTILITY = /^!?(?:bg|text|border|ring|outline|fill|stroke)-/;

/** A Slot child's own state or dark color classes, which Slot never merges. */
function slotChildViolations(site: ButtonSite): string[] {
	if (!site.child) return [];
	return site.child.className
		.split(/\s+/)
		.filter((token) => {
			const { variants, utility } = splitClass(token);
			return variants.length > 0 && COLOR_UTILITY.test(utility);
		})
		.map(
			(token) =>
				`${site.file}:${site.line} <${site.child?.element}> under Button asChild sets ${token}`,
		);
}

function violations(sources: ReadonlyMap<string, string>): string[] {
	return buttonSites(sources).flatMap(siteViolations).sort();
}

const HOVERED = "data-guard-hover";
const INHERITED = "rgb(1, 2, 3)";
const KEPT_VALUES = new Set(["inherit", "currentcolor", "transparent"]);
/** Lightning CSS writes `transparent` as `#0000`. */
const TRANSPARENT = /^(?:transparent|#0000|#00000000)$/i;

/** A compiled stylesheet as jsdom can resolve it, and each swapped value. */
function guardSheet(compiled: string): {
	css: string;
	named: (painted: string) => string;
} {
	const swapped = new Map<string, string>();
	const original = new Map<string, string>([[INHERITED, "inherited"]]);
	const opaque = (value: string) => {
		const known = swapped.get(value);
		if (known) return known;
		const n = swapped.size + 10;
		const color = `rgb(${n % 256}, ${Math.floor(n / 256)}, 200)`;
		swapped.set(value, color);
		original.set(color, value);
		return color;
	};
	const out = postcss.root();
	// Preflight's reset, as its base layer sits under the utilities.
	out.append(
		postcss.parse("button { color: inherit; background-color: transparent; }"),
	);
	postcss.parse(compiled).walkAtRules("layer", (layer) => {
		if (layer.params !== "utilities") return;
		const copy = layer.clone();
		const opens = (at: AtRule) =>
			at.name === "supports" ||
			(at.name === "media" && /^\(hover:\s*hover\)$/.test(at.params));
		for (let open = true; open; ) {
			open = false;
			copy.walkAtRules((at) => {
				if (!opens(at)) return;
				at.replaceWith([...(at.nodes ?? [])]);
				open = true;
				return false;
			});
		}
		// The pseudo-class only: a class name's escaped `\:hover` stays.
		copy.walkRules((rule) => {
			rule.selector = rule.selector.replace(/(?<!\\):hover\b/g, `[${HOVERED}]`);
		});
		copy.walkDecls(/^(?:background-color|color)$/, (decl) => {
			if (TRANSPARENT.test(decl.value)) decl.value = "transparent";
			else if (!KEPT_VALUES.has(decl.value)) decl.value = opaque(decl.value);
		});
		// A copy of the list: append moves each node out of `copy`.
		out.append([...(copy.nodes ?? [])]);
	});
	return {
		css: out.toString(),
		named: (painted) =>
			painted
				.split(" | ")
				.map((part) => original.get(part) ?? part)
				.join(" | "),
	};
}

/** The fill and label jsdom's cascade gives an aria-disabled button. */
function paint(classes: string, dark: boolean, hovered: boolean): string {
	const root = document.documentElement;
	root.classList.toggle("dark", dark);
	const parent = document.createElement("div");
	parent.style.color = INHERITED;
	const button = document.createElement("button");
	button.className = classes;
	button.setAttribute("aria-disabled", "true");
	if (hovered) button.setAttribute(HOVERED, "");
	parent.append(button);
	document.body.append(parent);
	const style = getComputedStyle(button);
	const painted = `${style.backgroundColor} | ${style.color}`;
	parent.remove();
	root.classList.remove("dark");
	return painted;
}

/** Each aria-disabled site whose hover paints other than its rest. */
async function ariaDisabledHoverViolations(
	sites: readonly ButtonSite[],
): Promise<string[]> {
	const measured = sites
		.filter((site) => site.ariaDisabled)
		.flatMap((site) =>
			site.classNames.map((className) => ({
				site,
				classes: buttonClasses(site.variant, site.size, className),
			})),
		);
	const candidates = [
		...new Set(measured.flatMap(({ classes }) => classes.split(" "))),
	];
	const { css, named } = guardSheet(await compileCandidates(candidates));
	const sheet = document.createElement("style");
	sheet.textContent = css;
	document.head.append(sheet);
	const out: string[] = [];
	try {
		for (const { site, classes } of measured) {
			for (const dark of [false, true]) {
				const rest = paint(classes, dark, false);
				const hover = paint(classes, dark, true);
				if (hover === rest) continue;
				out.push(
					`${site.file}:${site.line} <${site.element} variant="${site.variant}"> ${dark ? "dark" : "light"} hover paints ${named(hover)} over ${named(rest)}`,
				);
			}
		}
	} finally {
		sheet.remove();
	}
	return [...new Set(out)].sort();
}

describe("a caller's Button colors hold in both themes (66.2-39 F7)", () => {
	it("flags an untwinned caller class and passes a twinned one (fixtures)", () => {
		const planted = new Map([
			[
				"a.tsx",
				'<Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" />',
			],
			[
				"b.tsx",
				'<Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 dark:hover:text-destructive dark:hover:bg-destructive/10" />',
			],
			[
				"c.tsx",
				'<Button variant="outline" className="text-destructive-text border-destructive/20 hover:bg-destructive/10" />',
			],
			[
				"d.tsx",
				[
					"export function Trigger({ className }: Props) {",
					'  return <Button variant="ghost" size="icon" className={cn("size-7", className)} />;',
					"}",
					'const x = <Trigger className="hover:text-muted-foreground" />;',
				].join("\n"),
			],
			["e.tsx", '<Button variant="secondary" className="hover:bg-muted" />'],
			["f.tsx", '<Button variant="ghost" className="hover:text-foreground" />'],
			[
				"g.tsx",
				'<Button variant="outline" disabled className="text-success-text border-success/20 hover:bg-muted" />',
			],
			[
				"h.tsx",
				'<Button variant="ghost" className={cn("p-0", open && "hover:bg-muted/50")} />',
			],
		]);
		expect(violations(planted)).toEqual([
			'a.tsx:1 <Button variant="ghost"> hover:bg-destructive/10 loses to dark:hover:bg-accent/50 in dark',
			'a.tsx:1 <Button variant="ghost"> hover:text-destructive loses to dark:hover:text-foreground in dark',
			'c.tsx:1 <Button variant="outline"> border-destructive/20 loses to dark:border-input in dark',
			'c.tsx:1 <Button variant="outline"> hover:bg-destructive/10 loses to dark:hover:bg-input/50 in dark',
			'c.tsx:1 <Button variant="outline"> text-destructive-text turns hover:text-accent-foreground on hover',
			'd.tsx:4 <Trigger variant="ghost"> hover:text-muted-foreground loses to dark:hover:text-foreground in dark',
			'g.tsx:1 <Button variant="outline"> border-success/20 loses to dark:border-input in dark',
			'h.tsx:1 <Button variant="ghost"> hover:bg-muted/50 loses to dark:hover:bg-accent/50 in dark',
		]);
	});

	it("flags a state color on a Slot child and passes its layout (fixtures)", () => {
		const planted = new Map([
			[
				"a.tsx",
				'<Button asChild variant="ghost"><Link href="/x" className="flex-1 hover:text-destructive">x</Link></Button>',
			],
			[
				"b.tsx",
				'<Button asChild variant="outline"><Link href="/x" className="no-underline text-foreground">x</Link></Button>',
			],
		]);
		expect(buttonSites(planted).flatMap(slotChildViolations)).toEqual([
			"a.tsx:1 <Link> under Button asChild sets hover:text-destructive",
		]);
	});

	it("leaves a Slot child's own classes free of state colors in shipped src", () => {
		const sources = new Map(
			collectG7SourceTexts(process.cwd()).map((s) => [s.path, s.text]),
		);
		const sites = buttonSites(sources).filter((site) => site.child !== null);
		expect(sites.length).toBeGreaterThan(70);
		expect(sites.flatMap(slotChildViolations)).toEqual([]);
	});

	it("cancels the variant's hover on an aria-disabled Button (fixtures)", async () => {
		const unavailable = "src/components/shared/unavailable-outline-button.ts";
		const planted = new Map([
			[unavailable, readFileSync(resolve(process.cwd(), unavailable), "utf8")],
			[
				"a.tsx",
				'<Button variant="outline" aria-disabled className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50" />',
			],
			[
				"b.tsx",
				`import { UNAVAILABLE_OUTLINE_BUTTON_CLASSES } from "#components/shared/unavailable-outline-button";\nconst x = <Button variant="outline" size="sm" aria-disabled={off || undefined} className={cn("gap-1.5", UNAVAILABLE_OUTLINE_BUTTON_CLASSES)} />;`,
			],
			[
				"c.tsx",
				'<Button variant="outline" aria-disabled="true" className="aria-disabled:hover:bg-background aria-disabled:hover:text-inherit" />',
			],
			[
				"d.tsx",
				'<Button variant="ghost" aria-disabled="true" className="text-muted-foreground hover:bg-transparent hover:text-muted-foreground dark:hover:bg-transparent dark:hover:text-muted-foreground" />',
			],
			["e.tsx", '<Button variant="outline" aria-disabled={false} />'],
		]);
		const sites = buttonSites(planted);
		expect(sites.map((site) => site.ariaDisabled)).toEqual([
			true,
			true,
			true,
			true,
			false,
		]);
		expect(await ariaDisabledHoverViolations(sites)).toEqual([
			'a.tsx:1 <Button variant="outline"> dark hover paints color-mix(in oklab, var(--input) 50%, transparent) | var(--foreground) over color-mix(in oklab, var(--input) 30%, transparent) | inherited',
			'a.tsx:1 <Button variant="outline"> light hover paints var(--accent) | var(--accent-foreground) over var(--background) | inherited',
			'c.tsx:1 <Button variant="outline"> dark hover paints var(--background) | inherited over color-mix(in oklab, var(--input) 30%, transparent) | inherited',
		]);
	}, 30_000);

	it("cancels the variant's hover on every aria-disabled Button in shipped src", async () => {
		const sources = new Map(
			collectG7SourceTexts(process.cwd()).map((s) => [s.path, s.text]),
		);
		const sites = buttonSites(sources).filter((site) => site.ariaDisabled);
		expect(sites.length).toBeGreaterThanOrEqual(5);
		expect(await ariaDisabledHoverViolations(sites)).toEqual([]);
	}, 30_000);

	it("leaves no caller class to a variant's dark class in shipped src", () => {
		const root = process.cwd();
		const sources = new Map(
			collectG7SourceTexts(root).map((s) => [s.path, s.text]),
		);
		expect(sources.size).toBeGreaterThan(500);
		expect(
			readFileSync(resolve(root, "src/components/ui/button.tsx"), "utf8"),
		).toContain("dark:hover:text-foreground");
		expect(violations(sources)).toEqual([]);
	});
});
