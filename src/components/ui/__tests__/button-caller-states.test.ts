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
 * Under `asChild`, Radix Slot appends the child's own className to Button's
 * without merging, so a state or dark color there would race the variant's by
 * stylesheet order, which neither check can see: the child carries none.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { cn } from "#lib/utils";
import {
	type ButtonSite,
	buttonClasses,
	buttonSites,
} from "#test/utils/button-sites";
import { splitClass } from "#test/utils/state-fill-pairs";
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
