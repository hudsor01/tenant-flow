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
 * REVIEWED entry must still be live. `group-hover:` and `peer-hover:` are not
 * counted: their parent's own state drives them.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");

interface Reviewed {
	file: string;
	tag: string;
	reason: string;
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

/** The value of the attribute that starts at `at` (`"..."` or `{...}`). */
function attributeValue(source: string, at: number): string {
	const open = source[at];
	if (open === '"' || open === "'") {
		return source.slice(at, source.indexOf(open, at + 1) + 1);
	}
	let depth = 0;
	for (let i = at; i < source.length; i++) {
		if (source[i] === "{") depth++;
		else if (source[i] === "}") {
			depth--;
			if (depth === 0) return source.slice(at, i + 1);
		}
	}
	return "";
}

interface Finding {
	file: string;
	tag: string;
	line: number;
}

/** Every non-control element whose className holds a hover affordance. */
function staticAffordances(files: ReadonlyMap<string, string>): Finding[] {
	const out: Finding[] = [];
	for (const [file, source] of files) {
		for (const match of source.matchAll(/\bclassName=/g)) {
			const value = attributeValue(source, match.index + match[0].length);
			const withoutGroup = value.replace(
				/(?:[\w-]+:)*(?:group|peer)-hover(?:\/[\w-]+)?:[^\s"'`]+/g,
				"",
			);
			if (!AFFORDANCE.test(withoutGroup)) continue;
			const head = source.slice(0, match.index);
			// The nearest `<Name` before the attribute (a `<` before a letter, so a
			// comparison such as `a < b` in an attribute is not a tag).
			let tagStart = head.length;
			do {
				tagStart = head.lastIndexOf("<", tagStart - 1);
			} while (tagStart > 0 && !/[A-Za-z]/.test(head[tagStart + 1] ?? ""));
			const tagMatch = /^<([A-Za-z][\w.]*)/.exec(head.slice(tagStart));
			const tag = tagMatch?.[1] ?? "?";
			const opening = source.slice(
				tagStart,
				match.index + match[0].length + value.length,
			);
			const rest = source.slice(
				match.index,
				source.indexOf(">", match.index + match[0].length + value.length) + 1,
			);
			if (CONTROL_TAG.test(tag) || CONTROL_ATTR.test(opening + rest)) continue;
			out.push({ file, tag, line: head.split("\n").length });
		}
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
	const isReviewed = (f: Finding) =>
		REVIEWED.some((r) => r.file === f.file && r.tag === f.tag);

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
		]);
		expect(staticAffordances(planted).map((f) => `${f.file} ${f.tag}`)).toEqual(
			["a.tsx div", "e.tsx p"],
		);
	});

	it("finds none outside the reviewed controls-by-context", () => {
		const unreviewed = findings
			.filter((f) => !isReviewed(f))
			.map((f) => `${f.file}:${f.line} <${f.tag}>`);
		expect(
			unreviewed,
			`a hover or pointer affordance on an element that is not a control:\n${unreviewed.join("\n")}`,
		).toEqual([]);
	});

	it("keeps every reviewed entry live", () => {
		const stale = REVIEWED.filter(
			(r) => !findings.some((f) => f.file === r.file && f.tag === r.tag),
		).map((r) => `${r.file} <${r.tag}>`);
		expect(stale).toEqual([]);
	});
});
