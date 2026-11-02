/**
 * Where each vivid status color is used as a text color (66.2-39 fix round 1,
 * part F; CLAUDE.md: status-colored TEXT uses the AA `-text` companions, the
 * vivid tokens are for fills and icons).
 *
 * NOT A BARREL FILE. Everything below is declared here and nothing is
 * re-exported (CLAUDE.md zero-tolerance rule 2). This file sits inside the
 * Tailwind source scan, so the utility below is assembled from parts.
 *
 * The source is parsed (oxc, through `rolldown/utils`: vitest runs on vite,
 * which runs on rolldown, so the parser is present wherever a test runs), and
 * every string holding a vivid `text-` color (`success`, `warning`,
 * `destructive`, `info`, `accent`, `primary`, `chart-N`, under any variant,
 * with an optional opacity) is traced to the JSX element its attribute styles:
 * - "icon": a lucide component, an `svg`, an `…Icon` component, or a class
 *   aimed at descendant svgs (`[&_svg]:`, `*:[svg]:`);
 * - "icon-container": an element with children but no visible text below it
 *   (an icon tile, an icon-only button), so the color reaches only icons;
 * - "text": an element that shows text;
 * - "leaf": a childless non-icon element (an input);
 * - "config": a string outside any JSX attribute (a color map, a cva table).
 */

import { parseSync } from "rolldown/utils";

export type VividUseKind =
	| "icon"
	| "icon-container"
	| "text"
	| "leaf"
	| "config";

export interface VividUse {
	line: number;
	token: string;
	kind: VividUseKind;
	/** The JSX element name, or the property or const that holds the string. */
	host: string;
}

const VIVID_TEXT = new RegExp(
	`(?<![\\w-])((?:[^\\s"'\`]+:)?!?${"te"}xt-(?:success|warning|destructive|info|accent|primary|chart-[0-9])(?![\\w-])(?:\\/\\d+)?)`,
	"g",
);
const QUICK = new RegExp(
	`${"te"}xt-(?:success|warning|destructive|info|accent|primary|chart-)`,
);
const ICON_NAME = /Icon$|^(svg|path)$/;
const SVG_VARIANT = /\[&_svg|\*:\[svg\]|\[&>svg\]/;

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

function children(node: Node): Node[] {
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

/** Every vivid text color in `source`, located and classified. */
export function vividTextUses(path: string, source: string): VividUse[] {
	if (!QUICK.test(source)) return [];
	const { program, errors } = parseSync(path, source, {
		lang: path.endsWith(".tsx") ? "tsx" : "ts",
	});
	if (errors.length > 0) throw new Error(`${path}: ${errors[0]?.message}`);
	const lucide = new Set<string>();
	for (const statement of program.body) {
		if (
			statement.type === "ImportDeclaration" &&
			statement.source.value === "lucide-react"
		) {
			for (const s of statement.specifiers) lucide.add(s.local.name);
		}
	}
	const isIconElement = (element: Node) => {
		const name = jsxName((element.openingElement as Node).name);
		return (
			lucide.has(name) || ICON_NAME.test(name) || /(^|\.)icon$/i.test(name)
		);
	};
	const showsText = (element: Node): boolean =>
		((element.children as Node[] | undefined) ?? []).some((c) => {
			if (c.type === "JSXText") return String(c.value).trim() !== "";
			if (c.type === "JSXExpressionContainer") {
				const expression = c.expression as Node;
				if (expression.type === "JSXEmptyExpression") return false;
				return !/icon/i.test(source.slice(expression.start, expression.end));
			}
			if (c.type === "JSXElement") return !isIconElement(c) && showsText(c);
			if (c.type === "JSXFragment") return showsText(c);
			return false;
		});
	const lineOf = (index: number) => source.slice(0, index).split("\n").length;
	const uses: VividUse[] = [];
	const visit = (node: Node, parents: Node[]) => {
		let text: string | null = null;
		if (node.type === "Literal" && typeof node.value === "string")
			text = node.value;
		if (node.type === "TemplateElement") {
			const value = node.value as { cooked?: string; raw?: string };
			text = value.cooked ?? value.raw ?? null;
		}
		if (text !== null && !parents.some((p) => p.type === "ImportDeclaration")) {
			for (const match of text.matchAll(VIVID_TEXT)) {
				const token = match[1] ?? "";
				let attribute: string | null = null;
				let element: Node | null = null;
				let holder = "";
				for (let i = parents.length - 1; i >= 0; i -= 1) {
					const p = parents[i] as Node;
					if (attribute === null && p.type === "JSXAttribute") {
						attribute = jsxName(p.name);
					}
					if (p.type === "JSXElement") {
						element = p;
						break;
					}
					if (!holder && p.type === "Property" && isNode(p.key)) {
						holder = String(p.key.name ?? p.key.value ?? "");
					}
					if (!holder && p.type === "VariableDeclarator" && isNode(p.id)) {
						holder = String(p.id.name ?? "");
					}
				}
				let kind: VividUseKind = "config";
				let host = holder;
				if (element && attribute !== null) {
					host = jsxName((element.openingElement as Node).name);
					if (isIconElement(element) || SVG_VARIANT.test(token)) kind = "icon";
					else if (showsText(element)) kind = "text";
					else if (
						((element.children as Node[] | undefined) ?? []).length > 0
					) {
						kind = "icon-container";
					} else kind = "leaf";
				}
				uses.push({ line: lineOf(node.start), token, kind, host });
			}
		}
		const next = [...parents, node];
		for (const child of children(node)) visit(child, next);
	};
	visit(program as unknown as Node, []);
	return uses;
}
