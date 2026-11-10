/**
 * A painted svg is either hidden from assistive technology or named (WCAG
 * 1.1.1). Chrome exposes a bare `<svg>` as an image, so one with no
 * aria-hidden, no role="img" + aria-label and no <title> reads as an unnamed
 * graphic. The F1 gaps sweep found five (66.2-39 fix round 4, Part 5c): the
 * Stripe wordmark in the logo cloud (meaningful, now named), the TenantFlow
 * marks on the confirm-email and update-password pages and the tooltip and
 * tour arrows (decorative, now hidden). Lucide icons are aria-hidden by
 * default, so only hand-written svgs and Radix arrows reach this rule.
 */

import { parseSync } from "rolldown/utils";
import { describe, expect, it } from "vitest";
import { collectG7SourceTexts } from "#test/utils/tailwind-guards";

type Node = {
	type: string;
	start: number;
	end: number;
	[key: string]: unknown;
};

const isNode = (value: unknown): value is Node =>
	typeof value === "object" &&
	value !== null &&
	typeof (value as { type?: unknown }).type === "string";

function walk(
	node: Node,
	visit: (n: Node, parents: Node[]) => void,
	parents: Node[] = [],
) {
	visit(node, parents);
	for (const [key, value] of Object.entries(node)) {
		if (key === "type" || key === "start" || key === "end") continue;
		for (const child of Array.isArray(value) ? value : [value])
			if (isNode(child)) walk(child, visit, [...parents, node]);
	}
}

const jsxName = (n: Node | undefined): string =>
	!n
		? ""
		: n.type === "JSXIdentifier"
			? String(n.name)
			: n.type === "JSXMemberExpression"
				? `${jsxName(n.object as Node)}.${jsxName(n.property as Node)}`
				: "";

function attrs(opening: Node): Map<string, string> {
	const out = new Map<string, string>();
	for (const a of (opening.attributes as Node[]) ?? []) {
		if (a.type !== "JSXAttribute") continue;
		const value = a.value as Node | null;
		out.set(
			jsxName(a.name as Node),
			value?.type === "Literal" ? String(value.value) : "{expr}",
		);
	}
	return out;
}

/** Every svg element (or Radix arrow) with no accessible-tree decision. */
function undecided(path: string, source: string): string[] {
	const { program } = parseSync(path, source, { lang: "tsx" });
	if (!isNode(program)) throw new Error(`${path}: no program`);
	const out: string[] = [];
	walk(program, (n, parents) => {
		if (n.type !== "JSXElement") return;
		const opening = n.openingElement as Node;
		const name = jsxName(opening.name as Node);
		if (name !== "svg" && !name.endsWith(".Arrow")) return;
		// An svg nested in another svg is the outer one's content.
		if (
			parents.some(
				(p) =>
					p.type === "JSXElement" &&
					jsxName((p.openingElement as Node).name as Node) === "svg",
			)
		)
			return;
		const a = attrs(opening);
		const hidden =
			a.get("aria-hidden") === "true" || a.get("aria-hidden") === "{expr}";
		const named =
			(a.get("role") === "img" && a.has("aria-label")) ||
			a.has("aria-labelledby");
		const titled = ((n.children as Node[]) ?? []).some(
			(c) =>
				c.type === "JSXElement" &&
				jsxName((c.openingElement as Node).name as Node) === "title",
		);
		if (!hidden && !named && !titled)
			out.push(
				`${path}:${source.slice(0, n.start).split("\n").length} <${name}>`,
			);
	});
	return out;
}

describe("every hand-written svg is hidden or named (WCAG 1.1.1; 66.2-39 fix round 4, Part 5c)", () => {
	const files = collectG7SourceTexts(process.cwd()).filter(({ path }) =>
		path.endsWith(".tsx"),
	);

	it("finds the svgs it rules on", () => {
		const svgs = files.filter(({ text }) => /<svg\b|\.Arrow\b/.test(text));
		expect(svgs.length).toBeGreaterThan(5);
	});

	it("leaves no svg the accessibility tree exposes without a name", () => {
		expect(files.flatMap(({ path, text }) => undecided(path, text))).toEqual(
			[],
		);
	});
});
