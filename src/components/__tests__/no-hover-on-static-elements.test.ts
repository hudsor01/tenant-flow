/**
 * A hover or pointer affordance belongs to a control.
 *
 * Stat cards, list rows, marketing cards, a status badge and the dashboard
 * mockup tinted, lifted or recolored on hover although nothing on them was a
 * control (a hover state tells the pointer "this does something"). The
 * 66.2-39 part I AST sweep classified every element of every non-test
 * `src/**\/*.tsx` whose className holds a `hover:` bg, shadow, border,
 * translate, scale, ring, text, opacity, underline, brightness or rotate
 * utility, or `cursor-pointer`: 296 elements, 247 controls, 3 inside a control,
 * 46 neither. 33 of the 46 lost the affordance (with the `group-hover` effects
 * and hover-only layers they drove); the 13 that keep it are REVIEWED below.
 *
 * This guard: an element with such a utility must be a control (by its tag,
 * or a handler, `href`, `htmlFor`, `asChild`, a dropzone's root props, a
 * control role or a tabIndex) or appear in REVIEWED with its reason, and every
 * REVIEWED entry must still be live. A `group-hover:` or `peer-hover:` utility
 * is driven by its group (the nearest `group` ancestor, or `group/<name>`) or
 * its peer (the preceding sibling marked `peer`), so it counts when that
 * driver is neither a control nor inside one (66.2-39 fix round 3, F56: a
 * static stat item scaled its icon tile on hover). A REVIEWED element is a
 * control by context as a driver too. The source is parsed (oxc, through
 * `rolldown/utils`).
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { parseSync } from "rolldown/utils";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");

interface Reviewed {
	file: string;
	tag: string;
	reason: string;
	/**
	 * "hover" (default): the element's own hover utility. "group": a group or
	 * peer that drives `group-hover:`/`peer-hover:` utilities below or beside
	 * it (the tag of the element carrying them when the group is in another
	 * file).
	 */
	kind?: "group";
}

const ROW_WITH_CONTROLS =
	"a table row holding its row's links and actions: the tint tracks the row the pointer acts on";

const REVIEWED: readonly Reviewed[] = [
	{ file: "src/components/ui/table.tsx", tag: "tr", reason: ROW_WITH_CONTROLS },
	{
		file: "src/components/leases/table/leases-table-columns.tsx",
		tag: "tr",
		reason: ROW_WITH_CONTROLS,
	},
	{
		file: "src/components/properties/property-table-row.tsx",
		tag: "tr",
		reason: ROW_WITH_CONTROLS,
	},
	{
		file: "src/components/tenants/tenant-table-row.tsx",
		tag: "tr",
		reason: ROW_WITH_CONTROLS,
	},
	{
		file: "src/app/(owner)/reports/expenses/_components/expense-table.tsx",
		tag: "TableRow",
		reason: "the header row's hover:bg-transparent cancels the row tint",
	},
	{
		file: "src/components/bulk-import/bulk-import-upload-step.tsx",
		tag: "FileUploadDropzone",
		reason: "a dropzone: clicking it opens the file picker",
	},
	{
		file: "src/components/maintenance/cards/maintenance-card.tsx",
		tag: "div",
		reason: "the card body, rendered inside the card's button or Link",
	},
	{
		file: "src/components/ui/bento-grid.tsx",
		tag: "div",
		reason: "the card's hover reveals its link (as focus-within does)",
	},
	{
		file: "src/components/ui/breadcrumb.tsx",
		tag: "Comp",
		reason: "BreadcrumbLink: an <a>, or its child under asChild",
	},
	{
		file: "src/components/ui/sidebar.tsx",
		tag: "Comp",
		reason: "SidebarMenuSubButton: an <a>, or its child under asChild",
	},
	{
		file: "src/components/ui/slider.tsx",
		tag: "SliderPrimitive.Thumb",
		reason: "the slider thumb, a focusable control",
	},
	{
		file: "src/app/resources/page.tsx",
		tag: "div",
		reason: "inside the resource card's Link",
	},
	{
		file: "src/components/maintenance/detail/photos-card.tsx",
		tag: "img",
		reason: "inside the photo's button",
	},
	{
		file: "src/components/shell/user-profile-menu.tsx",
		tag: "span",
		reason: "inside the menu trigger",
	},
	{
		file: "src/components/dashboard/components/portfolio-columns.tsx",
		tag: "div",
		kind: "group",
		reason:
			"the portfolio row (its group, in portfolio-data-table.tsx) reveals the row's Edit and Delete links on hover and focus-within",
	},
	{
		file: "src/components/inspections/inspection-photo-upload.tsx",
		tag: "div",
		kind: "group",
		reason: "a photo tile: its hover reveals the pending photo's Remove button",
	},
	{
		file: "src/components/properties/sections/property-images-create-section.tsx",
		tag: "div",
		kind: "group",
		reason:
			"an image tile: its hover reveals the pending image's Remove button",
	},
	{
		file: "src/components/properties/property-image-gallery.tsx",
		tag: "div",
		kind: "group",
		reason:
			"an image tile under its full-bleed lightbox button, so the tile's hover is the button's; it also reveals the Delete button",
	},
];

function tsxFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const abs = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name !== "__tests__") out.push(...tsxFiles(abs));
		} else if (
			entry.name.endsWith(".tsx") &&
			!/\.(test|spec)\.tsx$/.test(entry.name)
		) {
			out.push(abs);
		}
	}
	return out;
}

const AFFORDANCE =
	/(?:^|[\s"'`{(])(?:[\w-]+:)*(?:hover:(?:bg|shadow|-?translate|border|scale|ring|text|opacity|underline|brightness|-?rotate)\b|cursor-pointer\b)/;
const CONTROL_TAG =
	/^(?:a|button|input|select|textarea|label|summary|Link|Button|NavigationMenuLink|IconButton|Toggle|ToggleGroupItem|Checkbox|Switch|RadioGroupItem|Input|Textarea|SelectTrigger|[A-Z][\w.]*(?:Trigger|Item|Close|Action|Cancel|Link|Button))$/;
const CONTROL_ATTR =
	/\b(?:onClick|onPointerDown|onMouseDown|onKeyDown|onSelect|onDoubleClick|href|htmlFor|asChild)\b|getRootProps\(|role="(?:button|link|tab|menuitem\w*|option|checkbox|radio|switch|combobox|slider)"|tabIndex=\{?(?!-)/;

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

function childNodes(node: Node): Node[] {
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

/** A `group-hover:`/`peer-hover:` utility, with the group's name if any. */
const GROUP_HOVER =
	/(?:^|[\s"'`{(])(?:[\w-]+:)*(group|peer)-hover(?:\/([\w-]+))?:[^\s"'`]+/g;

interface Finding {
	file: string;
	tag: string;
	line: number;
	kind?: "group";
}

/** An element REVIEWED for its own hover is a control by context, as a group too. */
function isReviewedControl(file: string, tag: string): boolean {
	return REVIEWED.some(
		(r) => r.kind === undefined && r.file === file && r.tag === tag,
	);
}

function reviews(r: Reviewed, f: Finding): boolean {
	return r.file === f.file && r.tag === f.tag && r.kind === f.kind;
}

/**
 * Every non-control element whose className holds a hover affordance, and
 * every `group-hover:`/`peer-hover:` utility whose group (its nearest `group`
 * ancestor, or `group/<name>` for a named one) or peer (the preceding sibling
 * marked `peer`) is neither a control nor inside one: the group's own hover
 * drives the effect, so the group is what the pointer is told it can use.
 * A group not found in the same file is a finding too, decided by review.
 */
function staticAffordances(files: ReadonlyMap<string, string>): Finding[] {
	const out: Finding[] = [];
	for (const [file, source] of files) {
		if (!source.includes("className")) continue;
		const { program, errors } = parseSync(file, source, { lang: "tsx" });
		if (errors.length > 0) throw new Error(`${file}: ${errors[0]?.message}`);
		const lineAt = (index: number) => source.slice(0, index).split("\n").length;
		const opening = (el: Node) => el.openingElement as Node;
		const classText = (el: Node) => {
			for (const a of (opening(el).attributes as Node[]) ?? []) {
				if (a.type !== "JSXAttribute" || jsxName(a.name) !== "className") {
					continue;
				}
				const value = a.value as Node | null;
				return value ? source.slice(value.start, value.end) : "";
			}
			return "";
		};
		const hasClass = (el: Node, name: string) =>
			classText(el)
				.split(/[\s"'`{}(),]+/)
				.includes(name);
		const isControl = (el: Node) => {
			const head = opening(el);
			return (
				CONTROL_TAG.test(jsxName(head.name)) ||
				CONTROL_ATTR.test(source.slice(head.start, head.end))
			);
		};
		const report = (el: Node, kind?: "group") =>
			out.push({
				file,
				tag: jsxName(opening(el).name) || "?",
				line: lineAt(el.start),
				...(kind ? { kind } : {}),
			});
		const visit = (node: Node, ancestors: Node[]) => {
			if (node.type === "JSXElement") {
				const text = classText(node);
				const withoutGroup = text.replace(GROUP_HOVER, "");
				if (AFFORDANCE.test(withoutGroup) && !isControl(node)) report(node);
				const drivers = new Set<Node>();
				for (const m of text.matchAll(GROUP_HOVER)) {
					const marker = m[2] ? `${m[1]}/${m[2]}` : (m[1] ?? "");
					let driver: Node | undefined;
					let driverAncestors: Node[] = [];
					if (m[1] === "group") {
						for (let i = ancestors.length - 1; i >= 0; i -= 1) {
							const a = ancestors[i] as Node;
							if (a.type === "JSXElement" && hasClass(a, marker)) {
								driver = a;
								driverAncestors = ancestors.slice(0, i);
								break;
							}
						}
					} else {
						const parent = ancestors.at(-1);
						const siblings = ((parent?.children as Node[]) ?? []).filter(
							(c) => c.type === "JSXElement" && c.end <= node.start,
						);
						driver = siblings.reverse().find((c) => hasClass(c, marker));
						driverAncestors = ancestors;
					}
					const controlled =
						driver !== undefined &&
						(isControl(driver) ||
							isReviewedControl(file, jsxName(opening(driver).name)) ||
							driverAncestors.some(
								(a) => a.type === "JSXElement" && isControl(a),
							));
					if (!controlled) drivers.add(driver ?? node);
				}
				for (const driver of drivers) report(driver, "group");
			}
			const next = [...ancestors, node];
			for (const child of childNodes(node)) visit(child, next);
		};
		const root: unknown = program;
		if (!isNode(root)) throw new Error(`${file}: no program`);
		visit(root, []);
	}
	return out;
}

describe("hover affordances sit on controls", () => {
	const files = new Map(
		tsxFiles(SRC).map((abs) => [
			relative(process.cwd(), abs),
			readFileSync(abs, "utf8"),
		]),
	);
	const findings = staticAffordances(files);
	const isReviewed = (f: Finding) => REVIEWED.some((r) => reviews(r, f));

	it("flags a static card and passes a control", () => {
		const planted = new Map([
			["a.tsx", '<div className="bg-card hover:shadow-md">x</div>'],
			[
				"b.tsx",
				'<div className="group"><span className="group-hover:opacity-100" /></div>',
			],
			["c.tsx", '<button type="button" className="hover:bg-muted">x</button>'],
			["d.tsx", '<div onClick={go} className="cursor-pointer">x</div>'],
			[
				"e.tsx",
				'<p className={cn("text-sm", open && "hover:text-foreground")}>x</p>',
			],
			[
				"f.tsx",
				'<button type="button" className="group"><span className="group-hover:opacity-100" /></button>',
			],
			[
				"g.tsx",
				'<Link href="/x"><div className="group"><span className="group-hover:scale-110" /></div></Link>',
			],
			[
				"h.tsx",
				'<div className="group/row"><a href="/x" className="group/card"><span className="group-hover/row:opacity-100" /></a></div>',
			],
			[
				"i.tsx",
				'<div><input className="peer" /><span className="peer-hover:text-foreground" /></div>',
			],
			[
				"j.tsx",
				'<div><div className="peer" /><span className="peer-hover:text-foreground" /></div>',
			],
		]);
		expect(staticAffordances(planted).map((f) => `${f.file} ${f.tag}`)).toEqual(
			["a.tsx div", "b.tsx div", "e.tsx p", "h.tsx div", "j.tsx div"],
		);
	});

	it("finds none outside the reviewed controls-by-context", () => {
		const unreviewed = findings
			.filter((f) => !isReviewed(f))
			.map((f) => `${f.file}:${f.line} <${f.tag}>${f.kind ? " (group)" : ""}`);
		expect(
			unreviewed,
			`a hover or pointer affordance on an element that is not a control:\n${unreviewed.join("\n")}`,
		).toEqual([]);
	});

	it("keeps every reviewed entry live", () => {
		const stale = REVIEWED.filter(
			(r) => !findings.some((f) => reviews(r, f)),
		).map((r) => `${r.file} <${r.tag}>${r.kind ? " (group)" : ""}`);
		expect(stale).toEqual([]);
	});
});
