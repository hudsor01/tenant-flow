/**
 * A `CardHeader` given flex classes is a flex container (66.2-39 fix round 4,
 * Part 8e).
 *
 * WHY. The vendored `CardHeader` (`#components/ui/card`) is a grid. A caller
 * that adds `flex-row`, `justify-between` or `flex-wrap` without a flex display
 * gets none of them: tailwind-merge keeps the base `grid`, the children stack
 * in one auto column, and that column is as wide as its widest row. The
 * maintenance request header did this: its actions sat on their own row under
 * the title, and the row's max-content (299.91px: the status select, Edit and
 * Export) sized the column past the card at 320-336px, so the page was 341px
 * wide (WCAG 1.4.10). The `flex-between` utility does not rescue it either: the
 * build emits it before the core `grid` rule, which therefore wins (the
 * maintenance table's header stacked its New Request button the same way).
 *
 * THE RULE. Every `<CardHeader>` whose class strings (a string, a template's
 * text, `cn()`/`clsx()` arguments) hold a flex-only utility at any variant
 * (`flex-row`, `flex-col`, `flex-wrap`, `flex-nowrap` and their reverses, or
 * the `flex-between`/`flex-start`/`flex-center` utilities) also holds the core
 * `flex` or `inline-flex` at that variant. The sources are parsed (oxc,
 * through `rolldown/utils`, as `#test/utils/button-sites` does).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseSync } from "rolldown/utils";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

type Node = { type: string; start: number; [key: string]: unknown };

function isNode(value: unknown): value is Node {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as { type?: unknown }).type === "string"
	);
}

function children(node: Node): Node[] {
	const out: Node[] = [];
	for (const [key, value] of Object.entries(node)) {
		if (key === "type" || key === "start" || key === "end") continue;
		if (Array.isArray(value)) out.push(...value.filter(isNode));
		else if (isNode(value)) out.push(value);
	}
	return out;
}

/** The class strings a `className` value can hold. */
function classStrings(node: unknown): string[] {
	if (!isNode(node)) return [];
	if (node.type === "Literal" && typeof node.value === "string") {
		return [node.value];
	}
	if (node.type === "TemplateLiteral") {
		return ((node.quasis as Node[]) ?? []).map((quasi) =>
			String((quasi.value as { raw?: string }).raw ?? ""),
		);
	}
	if (node.type === "JSXExpressionContainer") {
		return classStrings(node.expression);
	}
	if (node.type === "CallExpression") {
		return ((node.arguments as unknown[]) ?? []).flatMap(classStrings);
	}
	if (node.type === "ConditionalExpression") {
		return [...classStrings(node.consequent), ...classStrings(node.alternate)];
	}
	if (node.type === "LogicalExpression") {
		return [...classStrings(node.left), ...classStrings(node.right)];
	}
	return [];
}

const FLEX_ONLY =
	/^(flex-(row|col)(-reverse)?|flex-(wrap|nowrap|wrap-reverse)|flex-(between|start|center))$/;
const FLEX_DISPLAY = /^(inline-)?flex$/;

interface HeaderSite {
	site: string;
	classes: string[];
}

/** Every `<CardHeader>` in `source`, with its class tokens. */
function cardHeaderSites(path: string, source: string): HeaderSite[] {
	const { program, errors } = parseSync(path, source, { lang: "tsx" });
	if (errors.length > 0) throw new Error(`${path}: ${errors[0]?.message}`);
	const sites: HeaderSite[] = [];
	const walk = (node: Node) => {
		if (node.type === "JSXOpeningElement") {
			const name = node.name as Node;
			if (name.type === "JSXIdentifier" && name.name === "CardHeader") {
				const attribute = ((node.attributes as Node[]) ?? []).find(
					(a) =>
						a.type === "JSXAttribute" && (a.name as Node).name === "className",
				);
				const line = source.slice(0, node.start).split("\n").length;
				sites.push({
					site: `${path}:${line}`,
					classes: classStrings(attribute?.value)
						.join(" ")
						.split(/\s+/)
						.filter(Boolean),
				});
			}
		}
		for (const child of children(node)) walk(child);
	};
	if (isNode(program)) walk(program);
	return sites;
}

/** The sites whose flex-only classes have no flex display at their variant. */
function deadFlexHeaders(sites: HeaderSite[]): string[] {
	const dead: string[] = [];
	for (const { site, classes } of sites) {
		const byVariant = new Map<string, string[]>();
		for (const token of classes) {
			const at = token.lastIndexOf(":");
			const variant = at < 0 ? "" : token.slice(0, at);
			const utility = at < 0 ? token : token.slice(at + 1);
			byVariant.set(variant, [...(byVariant.get(variant) ?? []), utility]);
		}
		for (const [variant, utilities] of byVariant) {
			const flexOnly = utilities.filter((u) => FLEX_ONLY.test(u));
			if (flexOnly.length === 0) continue;
			// A display set at no variant holds at every variant.
			const display = [...utilities, ...(byVariant.get("") ?? [])];
			if (!display.some((u) => FLEX_DISPLAY.test(u))) {
				dead.push(
					`${site}: ${flexOnly.map((u) => (variant ? `${variant}:${u}` : u)).join(" ")} on a grid (no flex display)`,
				);
			}
		}
	}
	return dead;
}

describe("CardHeader flex classes (66.2-39 fix round 4, Part 8e)", () => {
	const files = execFileSync("git", ["ls-files", "-z", "--", "src"], {
		cwd: ROOT,
		encoding: "utf8",
	})
		.split("\0")
		.filter(
			(path) => path.endsWith(".tsx") && !/__tests__|\.test\./.test(path),
		);
	const sites = files.flatMap((path) =>
		cardHeaderSites(path, readFileSync(join(ROOT, path), "utf8")),
	);

	it("reads the CardHeader sites", () => {
		// A parse that found nothing would leave nothing to check.
		expect(sites.length).toBeGreaterThan(60);
		expect(
			sites.filter((s) => s.classes.includes("flex")).length,
		).toBeGreaterThan(5);
	});

	it("gives every CardHeader with flex classes a flex display", () => {
		const dead = deadFlexHeaders(sites);
		expect(dead, dead.join("\n")).toEqual([]);
	});

	it("catches flex classes on the grid, at a variant too (the check is not vacuous)", () => {
		const source = [
			'export const a = <CardHeader className="flex-row items-start justify-between gap-4" />;',
			'export const b = <CardHeader className={cn("flex-between flex-row", x)} />;',
			'export const c = <CardHeader className="flex flex-wrap items-center" />;',
			'export const d = <CardHeader className="grid sm:flex-row" />;',
			'export const e = <CardHeader className="flex-col sm:flex sm:flex-row" />;',
		].join("\n");
		expect(deadFlexHeaders(cardHeaderSites("fixture.tsx", source))).toEqual([
			"fixture.tsx:1: flex-row on a grid (no flex display)",
			"fixture.tsx:2: flex-between flex-row on a grid (no flex display)",
			"fixture.tsx:4: sm:flex-row on a grid (no flex display)",
			"fixture.tsx:5: flex-col on a grid (no flex display)",
		]);
	});
});
