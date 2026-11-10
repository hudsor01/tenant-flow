/**
 * A menu item paints its focus (keyboard or pointer highlight) on the accent
 * fill and restates its own label and unclassed icons as accent-foreground.
 * A call site that colors an item itself keeps that color on the accent fill:
 * the F1 gaps sweep read a hand-colored "Delete Unit" at 1.87:1 light and
 * 1.16:1 dark, and the column sort menu's checked indicator, forced muted by
 * `[&_svg]:text-muted-foreground`, at 1.85:1 and 1.07:1 (66.2-39 fix round 4,
 * Part 5c; states the earlier sweep measured empty). So a destructive item uses
 * the primitive's destructive variant (its focus fill is destructive/10 under
 * destructive-text), and an item that recolors its icons restates them for
 * focus.
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

function walk(node: Node, visit: (n: Node) => void) {
	visit(node);
	for (const [key, value] of Object.entries(node)) {
		if (key === "type" || key === "start" || key === "end") continue;
		for (const child of Array.isArray(value) ? value : [value])
			if (isNode(child)) walk(child, visit);
	}
}

function literals(value: Node | null): string[] {
	const out: string[] = [];
	if (!value) return out;
	walk(value, (n) => {
		if (n.type === "Literal" && typeof n.value === "string") out.push(n.value);
	});
	return out;
}

const ITEM =
	/^(DropdownMenu|ContextMenu|Menubar)(Item|CheckboxItem|RadioItem|SubTrigger)$/;

function findings(path: string, source: string) {
	const { program } = parseSync(path, source, { lang: "tsx" });
	if (!isNode(program)) throw new Error(`${path}: no program`);
	const destructive: string[] = [];
	const icons: string[] = [];
	walk(program, (n) => {
		if (n.type !== "JSXOpeningElement") return;
		const nameNode = n.name as Node;
		const name = nameNode.type === "JSXIdentifier" ? String(nameNode.name) : "";
		if (!ITEM.test(name)) return;
		let variant = "";
		let classes: string[] = [];
		for (const a of (n.attributes as Node[]) ?? []) {
			if (a.type !== "JSXAttribute") continue;
			const attr = String((a.name as Node).name);
			if (attr === "variant")
				variant = literals(a.value as Node | null).join(" ");
			if (attr === "className")
				classes = literals(a.value as Node | null)
					.join(" ")
					.split(/\s+/);
		}
		const at = `${path}:${source.slice(0, n.start).split("\n").length} <${name}>`;
		if (
			variant !== "destructive" &&
			classes.some((t) => /^(focus:)?text-destructive(-text)?$/.test(t))
		)
			destructive.push(at);
		if (
			classes.some((t) => /^\[&_svg\]:text-/.test(t)) &&
			!classes.includes("focus:[&_svg]:text-accent-foreground")
		)
			icons.push(at);
	});
	return { destructive, icons };
}

describe("a menu item keeps its label and icons legible on its focus fill (66.2-39 fix round 4, Part 5c)", () => {
	const files = collectG7SourceTexts(process.cwd()).filter(({ path }) =>
		path.endsWith(".tsx"),
	);
	const all = files.map(({ path, text }) => findings(path, text));

	it("finds the menu items it rules on", () => {
		expect(
			files.filter(({ text }) => /<DropdownMenu(Checkbox)?Item\b/.test(text))
				.length,
		).toBeGreaterThan(5);
	});

	it("colors a destructive item only through the destructive variant", () => {
		expect(
			all.flatMap((f) => f.destructive),
			"items colored destructive by hand",
		).toEqual([]);
	});

	it("restates recolored icons as accent-foreground on focus", () => {
		expect(
			all.flatMap((f) => f.icons),
			"items whose icons keep their color on the accent focus fill",
		).toEqual([]);
	});
});
