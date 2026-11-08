/**
 * @vitest-environment jsdom
 * A stat tile holds its figure (66.2-39 fix round 4, Parts 8c and 8d, VD-171,
 * VD-175).
 *
 * Measured on the served build with owner A's figures and with long figures
 * answered in the browser ($1,234,567.00, 100%, 1,234): the /properties tiles
 * left a figure 89px at 390 and the icon beside it shrank to 16x36 past the
 * tile; the Stat primitive's indicator spanned the label and value rows, so a
 * value had the tile less the indicator's column and ran past it; and every
 * row stepped its columns on the viewport, whose width does not say how wide
 * the row is once the rail takes 256px of it. The rendered proof is
 * `tests/e2e/tests/owner/app-shell-sidebar.spec.ts` (owner-axe, /properties
 * with long figures at every rail cell); jsdom lays nothing out, so this file
 * pins the mechanism the fix rests on:
 *   1. the Stat primitive gives the value the tile's width (it spans both
 *      columns under the label and its indicator) and never wraps it;
 *   2. a stat row steps its columns on its own named container, never on a
 *      viewport breakpoint, and every container variant names a container
 *      the same file declares;
 *   3. a stat row's icon with a declared size never shrinks (`shrink-0`): an
 *      icon tile anywhere in a row file, and in a row the source shows, any
 *      sized element (an icon, a chip, a status dot) that shares a flex row
 *      with something else.
 *
 * WHICH ROWS. Every shipped file that imports the Stat primitive, every row
 * the source shows (`statRows` below), and the few the source cannot show
 * (`CUSTOM_ROWS`, each with the reason). A row the source shows is a grid with
 * two or more columns whose items are tiles holding a label and a large
 * figure, read from the parsed JSX (oxc, through `rolldown/utils`, as
 * `#test/utils/button-sites` parses): through fragments, conditionals and
 * `.map()` callbacks, and into the components the file or an imported source
 * defines. So a new stat row is checked without a list edit (Part 8d found
 * the units row and nine others that the hand list had missed). A grid the
 * shape matches that is not a stat row (plan
 * cards, content cards, a page's columns) is named in `NOT_STAT_ROWS` with
 * its reason, and an entry the source no longer shows fails.
 */
import { readFileSync } from "node:fs";
import { join, posix } from "node:path";
import { parseSync } from "rolldown/utils";
import { describe, expect, it } from "vitest";
import { Stat, StatIndicator, StatLabel, StatValue } from "#components/ui/stat";
import { classStrings } from "#test/utils/state-fill-pairs";
import { collectG7SourceTexts } from "#test/utils/tailwind-guards";
import { render } from "#test/utils/test-render";

const ROOT = process.cwd();

/**
 * Rows and loading states the source cannot show as stat rows, each with the
 * reason: a skeleton has no figure, and a row whose cells are not tiles or
 * whose figure's size comes from a utility outside the large type scale
 * reads as no row. The rule is checked on every grid of these files.
 */
const CUSTOM_ROWS: { file: string; reason: string }[] = [
	{
		file: "src/app/(owner)/loading.tsx",
		reason:
			"every owner route's loading fallback, the units page's too (it has none of its own); its stat skeleton's tracks fit its own width",
	},
	{
		file: "src/app/(owner)/properties/components/properties-loading-skeleton.tsx",
		reason: "the /properties stat row's skeleton (no figure)",
	},
	{
		file: "src/components/leases/table/leases-page-skeleton.tsx",
		reason: "the /leases stat cards' skeleton (no figure)",
	},
	{
		file: "src/components/leases/detail/lease-details-skeleton.tsx",
		reason: "the lease page's metrics skeleton (no figure)",
	},
	{
		file: "src/components/dashboard/chart-area-interactive.tsx",
		reason:
			"the chart summary's cells are not tiles and its figures are typography-large",
	},
	{
		file: "src/app/(owner)/analytics/financial/_components/financial-analytics-skeleton.tsx",
		reason: "the financial stat row's skeleton (no figure)",
	},
	{
		file: "src/app/(owner)/analytics/property-performance/property-performance-skeleton.tsx",
		reason: "the performance stat row's skeleton (no figure)",
	},
	{
		file: "src/app/(owner)/tenants/components/tenants-loading-skeleton.tsx",
		reason: "the tenant stat row's skeleton (no figure)",
	},
	{
		file: "src/app/(owner)/reports/balance-sheet/balance-sheet-skeleton.tsx",
		reason: "the balance sheet stat row's skeleton (no figure)",
	},
	{
		file: "src/app/(owner)/reports/cash-flow/cash-flow-loading.tsx",
		reason: "the cash flow stat row's skeleton (no figure)",
	},
	{
		file: "src/app/(owner)/reports/income-statement/income-statement-page-loading.tsx",
		reason: "the income statement stat row's skeleton (no figure)",
	},
	{
		file: "src/app/(owner)/reports/expenses/page.tsx",
		reason: "the expense stat row's skeleton (no figure), in the page",
	},
	{
		file: "src/app/(owner)/analytics/overview/page.tsx",
		reason: "the overview stat row's skeleton (no figure), in the page",
	},
];

/**
 * Grids the source shows as stat rows that are not, each with the reason. Its
 * file is not a row file on this grid's account.
 */
const NOT_STAT_ROWS: { file: string; classString: string; reason: string }[] = [
	{
		file: "src/app/(owner)/billing/plans/page.tsx",
		classString: "grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
		reason:
			"plan cards (name, price, feature list, button); prices at one y by ca705f70a's subgrid",
	},
	{
		file: "src/components/pricing/bento-pricing-section.tsx",
		classString: "grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch",
		reason:
			"plan cards (name, price, feature list, button); prices at one y by ca705f70a",
	},
	{
		file: "src/app/(owner)/profile/page.tsx",
		classString: "grid grid-cols-1 gap-6 lg:grid-cols-3",
		reason: "the page's columns: the profile card beside the settings forms",
	},
	{
		file: "src/components/maintenance/detail/maintenance-details.client.tsx",
		classString: "grid grid-cols-1 gap-6 lg:grid-cols-3",
		reason:
			"the page's columns; the cost boxes inside step on their card's container",
	},
	{
		file: "src/components/leases/detail/lease-details.client.tsx",
		classString: "grid grid-cols-1 gap-6 lg:grid-cols-3",
		reason:
			"the page's columns; the metrics and the ledger strip inside step on their own containers",
	},
	{
		file: "src/app/(owner)/reports/balance-sheet/page.tsx",
		classString: "grid grid-cols-1 lg:grid-cols-2 gap-6",
		reason: "the assets and liabilities sections, lists of text-lg line items",
	},
	{
		file: "src/app/compare/page.tsx",
		classString: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6",
		reason: "competitor link cards (a title and a summary), no figure",
	},
	{
		file: "src/app/compare/[competitor]/compare-sections.tsx",
		classString: "grid grid-cols-1 md:grid-cols-2 gap-8",
		reason:
			"the two pricing comparison panels: each a list of tiers and prices",
	},
	{
		file: "src/app/resources/page.tsx",
		classString: "grid grid-cols-1 md:grid-cols-3 gap-8",
		reason: "resource link cards (a title and a description), no figure",
	},
	{
		file: "src/components/sections/how-it-works.tsx",
		classString: "grid grid-cols-1 md:grid-cols-3 gap-8",
		reason: "step cards: a step number, a title and a description",
	},
	{
		file: "src/components/sections/testimonials-section.tsx",
		classString: "grid grid-cols-1 md:grid-cols-2 gap-8",
		reason: "testimonial cards: a quote and its author",
	},
	{
		file: "src/components/sections/hero-section.tsx",
		classString:
			"grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-150 flex flex-col items-center justify-center min-h-100 text-center",
		reason:
			"the hero's two columns, copy beside the dashboard mockup (whose own row steps on its container)",
	},
	{
		file: "src/app/marketing-home.tsx",
		classString:
			"grid grid-cols-1 lg:grid-cols-2 gap-16 items-center lg:min-h-150",
		reason:
			"the hero's two columns, copy beside the dashboard mockup (whose own row steps on its container)",
	},
];

/**
 * Grids in the row files that are not stat rows, each with the reason a
 * viewport step cannot push a figure out of a tile there.
 */
const REVIEWED: { file: string; classString: string; reason: string }[] = [
	{
		file: "src/app/(owner)/reports/balance-sheet/page.tsx",
		classString: "grid grid-cols-1 lg:grid-cols-2 gap-6",
		reason:
			"the assets and liabilities sections, lists whose figures are text-lg line items, not tiles: 0 overflows in the rendered sweep",
	},
	{
		file: "src/components/leases/detail/lease-details.client.tsx",
		classString: "grid grid-cols-1 gap-6 lg:grid-cols-3",
		reason:
			"the page's two-thirds and one-third columns; the metrics inside step on their own container",
	},
	{
		file: "src/components/leases/detail/lease-details-skeleton.tsx",
		classString: "grid grid-cols-1 gap-6 lg:grid-cols-3",
		reason: "the skeleton of the page's two columns, not a stat row",
	},
	{
		file: "src/app/(owner)/analytics/financial/_components/financial-analytics-skeleton.tsx",
		classString: "grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6",
		reason: "the skeleton of the chart cards, not a stat row",
	},
	{
		file: "src/app/(owner)/analytics/property-performance/property-performance-skeleton.tsx",
		classString: "grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6",
		reason: "the skeleton of the chart cards, not a stat row",
	},
	{
		file: "src/app/(owner)/reports/balance-sheet/balance-sheet-skeleton.tsx",
		classString: "grid grid-cols-1 lg:grid-cols-2 gap-6",
		reason: "the skeleton of the two statement sections, not a stat row",
	},
	{
		file: "src/app/(owner)/reports/cash-flow/cash-flow-loading.tsx",
		classString: "grid grid-cols-1 lg:grid-cols-2 gap-6",
		reason: "the skeleton of the two breakdown panels, not a stat row",
	},
	{
		file: "src/app/(owner)/reports/income-statement/income-statement-page-loading.tsx",
		classString: "grid grid-cols-1 lg:grid-cols-2 gap-6",
		reason: "the skeleton of the two breakdown panels, not a stat row",
	},
	{
		file: "src/components/maintenance/maintenance-view.client.tsx",
		classString: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",
		reason: "the loading skeleton of the request cards, not a stat row",
	},
	{
		file: "src/app/(owner)/analytics/overview/page.tsx",
		classString: "grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6",
		reason: "the skeleton of the chart cards, not a stat row",
	},
	{
		file: "src/components/dashboard/chart-area-interactive.tsx",
		classString:
			"grid grid-cols-1 gap-4 p-6 pb-0 @min-[20.25rem]/chart-card:grid-cols-2 lg:@min-[38.5rem]/chart-card:grid-cols-4",
		reason:
			"four columns need the lg viewport AND a 38.5rem card (the overview places it in a narrow column, where four overflowed); the step below it is the card's own",
	},
	{
		file: "src/app/about/page.tsx",
		classString: "grid grid-cols-1 xl:grid-cols-2 gap-16 items-center",
		reason: "the mission section's copy beside its list, not a stat row",
	},
	{
		file: "src/app/compare/[competitor]/page.tsx",
		classString:
			"grid grid-cols-1 gap-3 pl-0 mt-0 mb-0 [&>li]:mb-0 sm:grid-cols-2",
		reason: "a list of reasons to switch (text items), not a stat row",
	},
	{
		file: "src/app/pricing/pricing-content.tsx",
		classString: "grid grid-cols-1 gap-4 lg:grid-cols-2",
		reason: "the FAQ accordions, not a stat row",
	},
	{
		file: "src/app/pricing/pricing-content.tsx",
		classString:
			"grid grid-cols-1 gap-10 overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-10 shadow-sm backdrop-blur md:grid-cols-[1.3fr_1fr] md:p-12",
		reason:
			"the closing call to action's copy beside its buttons, not a stat row",
	},
];

const VIEWPORT = /^(?:sm|md|lg|xl|2xl|min-\[[^\]]+\]|max-[a-z0-9[\]-]+):/;
const CONTAINER_VARIANT = /^@[a-z0-9[\].-]*\/([a-z][a-z0-9-]*):/;
const DECLARED_CONTAINER = /^@container\/([a-z][a-z0-9-]*)$/;

/** A grid-cols token a viewport variant applies, or null. */
function viewportColumns(classString: string): string | null {
	const tokens = classString.split(/\s+/).filter(Boolean);
	if (!tokens.some((t) => /(?:^|:)grid-cols-/.test(t))) return null;
	return (
		tokens.find((t) => VIEWPORT.test(t) && /:(?:@[^:]+:)?grid-cols-/.test(t)) ??
		null
	);
}

/**
 * An icon tile (a square box, w-N with h-N or size-N, that centres its icon)
 * that can shrink. A centred block (`mx-auto`, an empty state's medallion) or
 * an avatar (`rounded-full`) sits in no row beside a figure. A bare icon or a
 * dot beside a label is held where the source shows the row it sits in
 * (`statRows`): a class string alone cannot say whether its element is a flex
 * item.
 */
function shrinkableIcon(classString: string): boolean {
	const tokens = classString.split(/\s+/).filter(Boolean);
	const size = tokens.find((t) => /^size-\d+(?:\.\d+)?$/.test(t));
	const width = tokens.find((t) => /^w-\d+(?:\.\d+)?$/.test(t));
	const square =
		size !== undefined ||
		(width !== undefined && tokens.includes(`h-${width.slice(2)}`));
	const centres =
		tokens.includes("justify-center") || tokens.includes("flex-center");
	if (!square || !centres || tokens.includes("shrink-0")) return false;
	return !tokens.some((t) => ["mx-auto", "rounded-full"].includes(t));
}

// ---------------------------------------------------------------------------
// The rows the source shows.
// ---------------------------------------------------------------------------

type AstNode = {
	type: string;
	start: number;
	end: number;
	[key: string]: unknown;
};

interface Rendered {
	element: AstNode;
	source: ParsedSource;
}

interface ParsedSource {
	path: string;
	text: string;
	program: AstNode;
	/** Each capitalised function or const: the JSX it can return. */
	components: Map<string, AstNode[]>;
	/** Each imported name: the module and the name it is exported under. */
	imports: Map<string, { from: string; name: string }>;
	/** Each module-scope const that holds a string: its text. */
	strings: Map<string, string>;
}

interface StatRow {
	file: string;
	line: number;
	classString: string;
	/** Sized elements in a flex row beside something else, without shrink-0. */
	shrinkable: string[];
}

/** A large type size: a figure's, not a label's. */
const LARGE_TYPE = /^(?:text-(?:lg|xl|[2-5]xl)|typography-h[1-4])$/;
/** A grid of two or more columns under some variant. */
const GRID = /(?:^|:)(?:inline-)?grid$/;
const SEVERAL_COLUMNS = /(?:^|:)grid-cols-(?:[2-9]|1[0-2]|\[)/;
/** A box that draws itself: a filled or bordered tile. */
const TILE_UTILITY = /^(?:bg-card|card-standard|showcase-card|border(?:-\d)?)$/;
const FLEX_ROW = /^(?:flex|inline-flex|flex-between|flex-center)$/;
const SIZED = /^(?:size-\d+(?:\.\d+)?|icon-container-(?:sm|md|lg))$/;

function isAstNode(value: unknown): value is AstNode {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as { type?: unknown }).type === "string"
	);
}

function childNodes(node: AstNode): AstNode[] {
	const out: AstNode[] = [];
	for (const [key, value] of Object.entries(node)) {
		if (key === "type" || key === "start" || key === "end") continue;
		if (Array.isArray(value)) {
			for (const v of value) if (isAstNode(v)) out.push(v);
		} else if (isAstNode(value)) {
			out.push(value);
		}
	}
	return out;
}

function jsxName(name: unknown): string {
	if (!isAstNode(name)) return "";
	if (name.type === "JSXIdentifier") return String(name.name);
	if (name.type === "JSXMemberExpression") {
		return `${jsxName(name.object)}.${jsxName(name.property)}`;
	}
	return "";
}

function elementName(element: AstNode): string {
	const opening = element.openingElement;
	return isAstNode(opening) ? jsxName(opening.name) : "";
}

function jsxChildren(element: AstNode): AstNode[] {
	const children = element.children;
	return Array.isArray(children) ? children.filter(isAstNode) : [];
}

/** The children that render something (blank JSX text left out). */
function shownChildren(element: AstNode): AstNode[] {
	return jsxChildren(element).filter(
		(c) =>
			!(c.type === "JSXText" && String(c.value).trim() === "") &&
			!(
				c.type === "JSXExpressionContainer" &&
				isAstNode(c.expression) &&
				c.expression.type === "JSXEmptyExpression"
			),
	);
}

/** The JSX a function can return: its expression body or its returns. */
function returnedJsx(fn: AstNode): AstNode[] {
	const body = fn.body;
	if (!isAstNode(body)) return [];
	if (body.type !== "BlockStatement" && body.type !== "FunctionBody") {
		return [body];
	}
	const out: AstNode[] = [];
	const walk = (node: AstNode) => {
		if (
			node.type === "FunctionDeclaration" ||
			node.type === "FunctionExpression" ||
			node.type === "ArrowFunctionExpression"
		) {
			return;
		}
		if (node.type === "ReturnStatement" && isAstNode(node.argument)) {
			out.push(node.argument);
		}
		for (const child of childNodes(node)) walk(child);
	};
	for (const child of childNodes(body)) walk(child);
	return out;
}

function literalText(node: AstNode): string | null {
	if (node.type === "Literal" && typeof node.value === "string") {
		return node.value;
	}
	if (
		node.type === "TemplateLiteral" &&
		Array.isArray(node.expressions) &&
		node.expressions.length === 0 &&
		Array.isArray(node.quasis)
	) {
		return node.quasis
			.filter(isAstNode)
			.map((q) => {
				const value = q.value as { cooked?: string; raw?: string };
				return value.cooked ?? value.raw ?? "";
			})
			.join("");
	}
	return null;
}

function parseSource(path: string, text: string): ParsedSource {
	const { program, errors } = parseSync(path, text, {
		lang: path.endsWith(".tsx") ? "tsx" : "ts",
	});
	if (errors.length > 0) throw new Error(`${path}: ${errors[0]?.message}`);
	const root: unknown = program;
	if (!isAstNode(root))
		throw new Error(`${path}: the parser returned no program`);
	const source: ParsedSource = {
		path,
		text,
		program: root,
		components: new Map(),
		imports: new Map(),
		strings: new Map(),
	};
	const body = Array.isArray(root.body) ? root.body.filter(isAstNode) : [];
	for (const entry of body) {
		const statement =
			(entry.type === "ExportNamedDeclaration" ||
				entry.type === "ExportDefaultDeclaration") &&
			isAstNode(entry.declaration)
				? entry.declaration
				: entry;
		if (statement.type === "ImportDeclaration") {
			const from = isAstNode(statement.source)
				? String(statement.source.value)
				: "";
			const specifiers = Array.isArray(statement.specifiers)
				? statement.specifiers.filter(isAstNode)
				: [];
			for (const s of specifiers) {
				const local = isAstNode(s.local) ? String(s.local.name) : "";
				const imported =
					s.type === "ImportSpecifier" && isAstNode(s.imported)
						? String(s.imported.name ?? s.imported.value)
						: "default";
				source.imports.set(local, { from, name: imported });
			}
		}
		if (statement.type === "FunctionDeclaration" && isAstNode(statement.id)) {
			const name = String(statement.id.name);
			if (/^[A-Z]/.test(name))
				source.components.set(name, returnedJsx(statement));
		}
		if (statement.type === "VariableDeclaration") {
			const declarations = Array.isArray(statement.declarations)
				? statement.declarations.filter(isAstNode)
				: [];
			for (const d of declarations) {
				if (!isAstNode(d.id) || d.id.type !== "Identifier") continue;
				const name = String(d.id.name);
				const init = d.init;
				if (!isAstNode(init)) continue;
				const value = literalText(init);
				if (value !== null) source.strings.set(name, value);
				// A component, or one wrapped (memo, forwardRef).
				const fn =
					init.type === "CallExpression" && Array.isArray(init.arguments)
						? init.arguments
								.filter(isAstNode)
								.find(
									(a) =>
										a.type === "ArrowFunctionExpression" ||
										a.type === "FunctionExpression",
								)
						: init;
				if (
					/^[A-Z]/.test(name) &&
					fn !== undefined &&
					(fn.type === "ArrowFunctionExpression" ||
						fn.type === "FunctionExpression")
				) {
					source.components.set(name, returnedJsx(fn));
				}
			}
		}
	}
	return source;
}

/** Every string a JSX element's `className` can hold, joined. */
function classText(source: ParsedSource, element: AstNode): string {
	const opening = element.openingElement;
	if (!isAstNode(opening) || !Array.isArray(opening.attributes)) return "";
	const parts: string[] = [];
	const collect = (node: AstNode) => {
		const text = literalText(node);
		if (text !== null) parts.push(text);
		if (node.type === "TemplateElement") {
			const value = node.value as { cooked?: string; raw?: string };
			parts.push(value.cooked ?? value.raw ?? "");
		}
		if (node.type === "Identifier") {
			const held = source.strings.get(String(node.name));
			if (held !== undefined) parts.push(held);
		}
		for (const child of childNodes(node)) collect(child);
	};
	for (const attribute of opening.attributes.filter(isAstNode)) {
		if (attribute.type !== "JSXAttribute") continue;
		if (jsxName(attribute.name) !== "className") continue;
		if (isAstNode(attribute.value)) collect(attribute.value);
	}
	return parts.join(" ").replace(/\s+/g, " ").trim();
}

function tokensOf(classString: string): string[] {
	return classString.split(/\s+/).filter(Boolean);
}

/** The elements a JSX child renders: through fragments, conditionals and `.map()`. */
function renderedBy(node: AstNode, source: ParsedSource): Rendered[] {
	if (node.type === "JSXElement") return [{ element: node, source }];
	const next = (n: unknown): Rendered[] =>
		isAstNode(n) ? renderedBy(n, source) : [];
	if (node.type === "JSXFragment") {
		return jsxChildren(node).flatMap((c) => renderedBy(c, source));
	}
	if (
		node.type === "JSXExpressionContainer" ||
		node.type === "ParenthesizedExpression"
	) {
		return next(node.expression);
	}
	if (node.type === "ConditionalExpression") {
		return [...next(node.consequent), ...next(node.alternate)];
	}
	if (node.type === "LogicalExpression") return next(node.right);
	if (node.type === "ArrayExpression" && Array.isArray(node.elements)) {
		return node.elements
			.filter(isAstNode)
			.flatMap((e) => renderedBy(e, source));
	}
	if (node.type === "CallExpression" && Array.isArray(node.arguments)) {
		return node.arguments
			.filter(isAstNode)
			.filter(
				(a) =>
					a.type === "ArrowFunctionExpression" ||
					a.type === "FunctionExpression",
			)
			.flatMap((fn) => returnedJsx(fn).flatMap((r) => renderedBy(r, source)));
	}
	return [];
}

function childElements(element: AstNode, source: ParsedSource): Rendered[] {
	return jsxChildren(element).flatMap((c) => renderedBy(c, source));
}

/** `#x/*` subpath imports, from package.json (as in tsconfig.json). */
const SUBPATHS: [string, string][] = Object.entries(
	(
		JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
			imports: Record<string, string>;
		}
	).imports,
)
	.filter(([key]) => key.endsWith("/*"))
	.map(([key, target]): [string, string] => [
		key.slice(0, -1),
		target.replace(/^\.\//, "").slice(0, -1),
	]);

class SourceIndex {
	private readonly parsed = new Map<string, ParsedSource>();
	constructor(readonly texts: Map<string, string>) {}

	get(path: string): ParsedSource | null {
		const cached = this.parsed.get(path);
		if (cached) return cached;
		const text = this.texts.get(path);
		if (text === undefined) return null;
		const source = parseSource(path, text);
		this.parsed.set(path, source);
		return source;
	}

	resolve(from: string, specifier: string): string | null {
		let base: string | null = null;
		for (const [prefix, target] of SUBPATHS) {
			if (specifier.startsWith(prefix)) {
				base = target + specifier.slice(prefix.length);
			}
		}
		if (base === null && specifier.startsWith(".")) {
			base = posix.normalize(posix.join(posix.dirname(from), specifier));
		}
		if (base === null) return null;
		for (const ending of ["", ".tsx", ".ts", "/index.tsx", "/index.ts"]) {
			if (this.texts.has(base + ending)) return base + ending;
		}
		return null;
	}

	/**
	 * What a component element renders: its definition's JSX, in this file
	 * or an imported source. The vendored ui primitives are read by name
	 * (a Card or a Stat is a tile, a StatValue a figure), not opened.
	 */
	expand(
		element: AstNode,
		source: ParsedSource,
		seen: Set<string>,
	): Rendered[] {
		const name = elementName(element);
		if (!/^[A-Z]/.test(name) || name.includes(".")) return [];
		let target: ParsedSource | null = source;
		let exported = name;
		if (!source.components.has(name)) {
			const imported = source.imports.get(name);
			if (!imported) return [];
			const path = this.resolve(source.path, imported.from);
			if (!path || path.startsWith("src/components/ui/")) return [];
			target = this.get(path);
			exported = imported.name;
		}
		if (!target) return [];
		const key = `${target.path}#${exported}`;
		if (seen.has(key)) return [];
		seen.add(key);
		const roots = target.components.get(exported) ?? [];
		const into = target;
		return roots.flatMap((r) => renderedBy(r, into));
	}
}

/** A figure prints data: an expression, or a component that prints its own (a ticker). */
function printsData(element: AstNode, depth = 0): boolean {
	const children = jsxChildren(element);
	if (depth === 0 && children.length === 0) {
		return /^[A-Z]/.test(elementName(element));
	}
	return children.some((c) => {
		if (c.type === "JSXExpressionContainer") {
			return (
				isAstNode(c.expression) && c.expression.type !== "JSXEmptyExpression"
			);
		}
		if (c.type === "JSXElement") {
			if (jsxChildren(c).length === 0) return /^[A-Z]/.test(elementName(c));
			return depth < 3 && printsData(c, depth + 1);
		}
		return false;
	});
}

function showsText(element: AstNode): boolean {
	return shownChildren(element).some(
		(c) => c.type === "JSXText" || c.type === "JSXExpressionContainer",
	);
}

function declaresSize(tokens: string[]): boolean {
	if (tokens.some((t) => SIZED.test(t))) return true;
	const width = tokens.find((t) => /^w-\d+(?:\.\d+)?$/.test(t));
	return width !== undefined && tokens.includes(`h-${width.slice(2)}`);
}

function lineOf(source: ParsedSource, index: number): number {
	return source.text.slice(0, index).split("\n").length;
}

/**
 * One grid item: whether it is a tile holding a label and a figure, and the
 * sized elements it puts in a flex row beside something else without
 * shrink-0. `parent` is the classes of the element it sits in and how many
 * children that element shows.
 */
function readItem(
	index: SourceIndex,
	item: Rendered,
): { stat: boolean; shrinkable: string[] } {
	let tile = false;
	let figure = false;
	let label = false;
	const shrinkable: string[] = [];
	const seen = new Set<string>();
	const walk = (
		{ element, source }: Rendered,
		depth: number,
		parent: { tokens: string[]; shown: number },
	) => {
		if (depth > 16) return;
		const name = elementName(element);
		const classString = classText(source, element);
		const tokens = tokensOf(classString);
		if (
			depth <= 3 &&
			(name === "Card" ||
				name === "Stat" ||
				tokens.some((t) => TILE_UTILITY.test(t)) ||
				(tokens.some((t) => t.startsWith("rounded")) &&
					tokens.some((t) => /^p-\d/.test(t))))
		) {
			tile = true;
		}
		if (
			name === "StatValue" ||
			(tokens.some((t) => LARGE_TYPE.test(t)) && printsData(element))
		) {
			figure = true;
		} else if (showsText(element)) {
			label = true;
		}
		if (
			declaresSize(tokens) &&
			parent.shown > 1 &&
			parent.tokens.some((t) => FLEX_ROW.test(t)) &&
			!tokens.includes("shrink-0") &&
			!tokens.includes("flex-none")
		) {
			shrinkable.push(
				`${source.path}:${lineOf(source, element.start)} <${name} className="${classString}">`,
			);
		}
		const here = { tokens, shown: shownChildren(element).length };
		for (const child of childElements(element, source)) {
			walk(child, depth + 1, here);
		}
		for (const inner of index.expand(element, source, seen)) {
			walk(inner, depth + 1, parent);
		}
	};
	walk(item, 0, { tokens: [], shown: 0 });
	return { stat: tile && figure && label, shrinkable };
}

/** Every grid in the shipped sources whose items are tiles with a label and a figure. */
function statRows(texts: Map<string, string>): StatRow[] {
	const index = new SourceIndex(texts);
	const rows: StatRow[] = [];
	for (const path of texts.keys()) {
		if (!path.endsWith(".tsx") || path.startsWith("src/components/ui/")) {
			continue;
		}
		const source = index.get(path);
		if (!source) continue;
		const visit = (node: AstNode) => {
			if (node.type === "JSXElement") {
				const classString = classText(source, node);
				const tokens = tokensOf(classString);
				if (
					tokens.some((t) => GRID.test(t)) &&
					tokens.some((t) => SEVERAL_COLUMNS.test(t))
				) {
					const items = childElements(node, source).map((item) =>
						readItem(index, item),
					);
					const stat = items.filter((i) => i.stat);
					if (stat.length > 0) {
						rows.push({
							file: path,
							line: lineOf(source, node.start),
							classString,
							shrinkable: [...new Set(stat.flatMap((i) => i.shrinkable))],
						});
					}
				}
			}
			for (const child of childNodes(node)) visit(child);
		};
		visit(source.program);
	}
	return rows;
}

const SHIPPED = collectG7SourceTexts(ROOT);
const TEXTS = new Map(SHIPPED.map(({ path, text }) => [path, text]));
const DETECTED = statRows(TEXTS);

function isExcluded(row: { file: string; classString: string }): boolean {
	return NOT_STAT_ROWS.some(
		(n) => n.file === row.file && n.classString === row.classString,
	);
}

const SHOWN_ROWS = DETECTED.filter((row) => !isExcluded(row));

function rowFiles(): { path: string; text: string }[] {
	const listed = new Set(CUSTOM_ROWS.map((r) => r.file));
	const shown = new Set(SHOWN_ROWS.map((r) => r.file));
	return SHIPPED.filter(
		({ path, text }) =>
			path.endsWith(".tsx") &&
			path !== "src/components/ui/stat.tsx" &&
			(listed.has(path) ||
				shown.has(path) ||
				text.includes('from "#components/ui/stat"')),
	);
}

describe("stat tiles hold their figures", () => {
	it("give a Stat value the tile's width, under its label and indicator, unwrapped", () => {
		render(
			<Stat>
				<StatLabel>Scheduled</StatLabel>
				<StatValue>$1,234,567</StatValue>
				<StatIndicator variant="icon">i</StatIndicator>
			</Stat>,
		);
		const stat = document.querySelector("[data-slot=stat]");
		const tokens = stat?.className.split(/\s+/) ?? [];
		expect(tokens).toContain("grid-cols-[minmax(0,1fr)_auto]");
		expect(tokens).toContain("**:data-[slot=stat-value]:col-span-2");
		expect(tokens).toContain("**:data-[slot=stat-indicator]:row-start-1");
		expect(tokens).not.toContain("**:data-[slot=stat-indicator]:row-span-2");
		expect(tokens).not.toContain("**:data-[slot=stat-value]:col-span-1");
		const value = document.querySelector("[data-slot=stat-value]");
		expect(value?.className.split(/\s+/)).toContain("whitespace-nowrap");
	});

	it("finds the stat rows in the source, and only where the list cannot", () => {
		const shown = SHOWN_ROWS.map((r) => `${r.file}:${r.line}`);
		// Controls: rows the source shows in each shape the walk follows.
		for (const expected of [
			// tiles written out in the grid
			"src/app/(owner)/properties/units/page.tsx",
			"src/components/properties/property-stats-section.tsx",
			// a .map() over tiles
			"src/app/(owner)/leases/leases-stat-cards.tsx",
			// a component of the same file (StatCard, MetricCard)
			"src/components/bulk-import/bulk-import-result-panel.tsx",
			"src/components/ledger/ledger-balance-strip.tsx",
			// a grid whose class string is a module const
			"src/app/(owner)/reports/reports-summary-strip.tsx",
			// unbordered filled tiles
			"src/app/(owner)/reports/cash-flow/cash-flow-activity.tsx",
			// a Stat row
			"src/components/tenants/tenant-stats.tsx",
		]) {
			expect(
				shown.some((s) => s.startsWith(`${expected}:`)),
				expected,
			).toBe(true);
		}
		// And not a grid of plain text (the wizard's review terms).
		expect(
			DETECTED.some(
				(r) => r.file === "src/components/leases/wizard/review-step.tsx",
			),
		).toBe(false);
		const listedButShown = CUSTOM_ROWS.filter((r) =>
			SHOWN_ROWS.some((s) => s.file === r.file),
		).map(
			(r) => `${r.file}: the source shows its row; drop it from CUSTOM_ROWS`,
		);
		expect(listedButShown).toEqual([]);
		const stale = NOT_STAT_ROWS.filter(
			(n) =>
				!DETECTED.some(
					(r) => r.file === n.file && r.classString === n.classString,
				),
		).map((n) => `${n.file}: ${n.classString}`);
		expect(stale).toEqual([]);
	});

	it("step every stat row's columns on its own container, never the viewport", () => {
		const files = rowFiles();
		// Controls: the scan reaches the Stat rows, the listed and the shown
		// rows, and every row the hand list held before the source showed them.
		expect(files.map((f) => f.path)).toEqual(
			expect.arrayContaining([
				"src/components/tenants/tenant-stats.tsx",
				"src/app/(owner)/analytics/financial/_components/financial-overview-stats.tsx",
				"src/components/properties/property-stats-section.tsx",
				"src/app/(owner)/leases/leases-stat-cards.tsx",
				"src/components/leases/detail/lease-details.client.tsx",
				"src/components/ledger/ledger-balance-strip.tsx",
				"src/components/properties/property-performance-section.tsx",
				"src/app/(owner)/reports/tax-documents/page.tsx",
				"src/components/reports/sections/year-end-report-section.tsx",
				"src/components/analytics/owner-payment-summary.tsx",
				"src/components/sections/hero-dashboard-mockup.tsx",
				"src/app/(owner)/properties/units/page.tsx",
			]),
		);
		for (const { file } of CUSTOM_ROWS) {
			expect(
				files.map((f) => f.path),
				`${file} is shipped`,
			).toContain(file);
		}
		const unreviewed: string[] = [];
		const undeclared: string[] = [];
		for (const { path, text } of files) {
			const declared = new Set<string>();
			const used: { name: string; line: number }[] = [];
			for (const literal of classStrings(text)) {
				for (const token of literal.text.split(/\s+/)) {
					const d = DECLARED_CONTAINER.exec(token);
					if (d?.[1]) declared.add(d[1]);
					const u = CONTAINER_VARIANT.exec(token);
					if (u?.[1]) used.push({ name: u[1], line: literal.line });
				}
				const step = viewportColumns(literal.text);
				if (
					step !== null &&
					!REVIEWED.some(
						(r) => r.file === path && r.classString === literal.text,
					)
				) {
					unreviewed.push(`${path}:${literal.line} ${step}`);
				}
			}
			for (const { name, line } of used) {
				// `chart-card` is the Card's own container (chart-area-interactive).
				if (!declared.has(name) && name !== "card-header") {
					undeclared.push(`${path}:${line} @…/${name}`);
				}
			}
		}
		expect(unreviewed).toEqual([]);
		expect(undeclared).toEqual([]);
	});

	it("keeps every reviewed grid live", () => {
		const files = rowFiles();
		const stale = REVIEWED.filter(
			(r) =>
				!files.some(
					(f) =>
						f.path === r.file &&
						classStrings(f.text).some((l) => l.text === r.classString),
				),
		).map((r) => `${r.file}: ${r.classString}`);
		expect(stale).toEqual([]);
	});

	it("never lets a stat row's sized icon shrink", () => {
		const shrinkable: string[] = [];
		for (const { path, text } of rowFiles()) {
			for (const literal of classStrings(text)) {
				if (shrinkableIcon(literal.text)) {
					shrinkable.push(`${path}:${literal.line} "${literal.text}"`);
				}
			}
		}
		expect(shrinkable).toEqual([]);
		// In a row the source shows: an icon, a chip or a dot in a flex row
		// beside a label or a figure.
		expect(SHOWN_ROWS.flatMap((r) => r.shrinkable)).toEqual([]);
	});

	it("reads a viewport step and a shrinkable icon the way a class string writes them (fixtures)", () => {
		expect(viewportColumns("grid grid-cols-2 lg:grid-cols-4")).toBe(
			"lg:grid-cols-4",
		);
		expect(
			viewportColumns("grid grid-cols-1 @min-[25rem]/rows:grid-cols-2"),
		).toBeNull();
		expect(viewportColumns("grid grid-cols-1 lg:@xl/card:grid-cols-4")).toBe(
			"lg:@xl/card:grid-cols-4",
		);
		expect(
			shrinkableIcon("w-9 h-9 rounded-sm flex items-center justify-center"),
		).toBe(true);
		expect(
			shrinkableIcon(
				"w-9 h-9 shrink-0 rounded-sm flex items-center justify-center",
			),
		).toBe(false);
		expect(shrinkableIcon("size-8 rounded-lg flex-center")).toBe(true);
		expect(shrinkableIcon("size-4 text-primary")).toBe(false);
		expect(shrinkableIcon("h-8 w-12 flex justify-center")).toBe(false);
		expect(
			shrinkableIcon("w-16 h-16 flex items-center justify-center mx-auto"),
		).toBe(false);
	});

	it("reads a stat row from JSX the way the source writes one (fixtures)", () => {
		const rows = (text: string) =>
			statRows(new Map([["src/fixture.tsx", text]]));
		const tile = (figure: string, dot: string) => `
			export function Row({ n }: { n: number }) {
				return (
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						{[1, 2].map((k) => (
							<div key={k} className="p-4 rounded-lg border bg-card">
								<div className="flex-between gap-2">
									<h3>Label</h3>
									<div className="${dot}" />
								</div>
								<div className="${figure}">{n}</div>
							</div>
						))}
					</div>
				);
			}`;
		const [row] = rows(tile("typography-h3", "size-2 rounded-full"));
		expect(row?.line).toBe(4);
		expect(row?.shrinkable).toEqual([
			'src/fixture.tsx:9 <div className="size-2 rounded-full">',
		]);
		expect(
			rows(tile("typography-h3", "size-2 shrink-0 rounded-full"))[0]
				?.shrinkable,
		).toEqual([]);
		// A figure in the body type is a label, not a figure: no row.
		expect(rows(tile("text-sm", "size-2"))).toEqual([]);
		// A tile drawn by a component of the same file, figure from a ticker.
		expect(
			rows(`
				function Tile({ n }: { n: number }) {
					return (
						<div className="rounded-lg p-3 flex items-center gap-3">
							<div className="icon-container-sm" />
							<div>
								<NumberTicker className="text-xl" value={n} />
								<p>Imported</p>
							</div>
						</div>
					);
				}
				export function Row() {
					return <div className="grid grid-cols-2"><Tile n={1} /><Tile n={2} /></div>;
				}`)[0]?.shrinkable,
		).toEqual(['src/fixture.tsx:5 <div className="icon-container-sm">']);
		// One column is no row.
		expect(
			rows(tile("typography-h3", "size-2").replace("md:grid-cols-4", "")),
		).toEqual([]);
	});
});
