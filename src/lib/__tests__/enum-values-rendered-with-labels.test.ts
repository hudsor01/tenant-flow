/**
 * Drift guard (66.2-39 fix round 1, part K): a status, type or priority value
 * reaches the owner through its label map, never as the stored value.
 *
 * The tenant page printed a lease's status as stored ("pending_signature"),
 * and the sweep that found it found the class in eleven more places: the
 * tenant sheet's lease history, the property page's type, the lease review's
 * utilities, the analytics maintenance table (request statuses under a
 * "Category" header), the admin review queue's blog category, the template
 * builder's field types, the maintenance-request template's priority preview,
 * the profile's account status, the active-units table, the billing history's
 * other invoice statuses and the maintenance report's status and priority
 * tables (and the tax documents page ran vendor names through the same
 * underscore-to-space reformatting). Each now goes through the label map its
 * domain already had, or one that now sits beside the values.
 *
 * What fails here, read from the source text of every non-test .tsx under
 * src/app and src/components (and the report builders in src/lib/reports):
 *  - RAW_RENDER: a JSX child `{x.status}` (or lease_status, subscription_status,
 *    property_type, priority, inspection_type, unit_type, role), and a table
 *    cell `{row.original.category}` / `{row.original.type}`;
 *  - AD_HOC_LABEL: one of those fields (or category/type) run through
 *    `.replace(...)` to make a label, and any `.replace("_", " ")`, which also
 *    only replaces the first underscore;
 *  - RAW_LABEL: a `label:` assigned straight from `.status` or `.priority`;
 *  - RAW_REPORT_CELL: a report row whose first cell is a raw `.status` /
 *    `.priority` / `.lease_status` / `.property_type`.
 * Wholly comment lines are skipped. Attribute values (`value={x.status}`) and
 * template-literal interpolations are not renders and are not matched.
 *
 * Failures list `file:line → snippet`.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const ENUM_FIELDS =
	"status|lease_status|subscription_status|property_type|priority|inspection_type|unit_type|role";

function isTestFile(relPath: string): boolean {
	return /\.(test|spec)\.tsx?$/.test(relPath) || /\/__tests__\//.test(relPath);
}

function collect(dir: string, ext: RegExp): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const abs = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...collect(abs, ext));
		else if (ext.test(entry.name)) out.push(relative(ROOT, abs));
	}
	return out;
}

const TSX = ["src/app", "src/components"]
	.flatMap((root) => collect(join(ROOT, root), /\.tsx$/))
	.filter((f) => !isTestFile(f));
const REPORT_BUILDERS = collect(join(ROOT, "src/lib/reports"), /\.ts$/).filter(
	(f) => !isTestFile(f),
);

/** `file:line → snippet` for every code line matching `pattern`. */
function hits(files: readonly string[], pattern: RegExp): string[] {
	const out: string[] = [];
	for (const file of files) {
		readFileSync(join(ROOT, file), "utf8")
			.split("\n")
			.forEach((text, i) => {
				const trimmed = text.trim();
				if (/^(\/\/|\*|\/\*)/.test(trimmed)) return;
				if (pattern.test(text)) out.push(`${file}:${i + 1} → ${trimmed}`);
			});
	}
	return out;
}

const RAW_RENDER = new RegExp(
	// a JSX child: `{` not opening an attribute value (`=`) or `${`; the value
	// alone or behind a fallback (`{property.status || "Active"}`, part P)
	String.raw`(?:^\s*|[^=$\s]\s*)\{\s*[A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*\??\.(?:${ENUM_FIELDS})\s*(?:\}|\|\||\?\?)|\{\s*row\.original\.(?:category|type)\s*\}`,
);
const AD_HOC_LABEL = new RegExp(
	String.raw`\.(?:${ENUM_FIELDS}|category|type)\??(?:\.toLowerCase\(\))?\.replace\(|\.replace\(\s*["']_["']\s*,\s*["'] ["']\s*\)`,
);
const RAW_LABEL = /\blabel:\s*[A-Za-z_$][\w$]*\.(?:status|priority)\s*[,}]/;
const RAW_REPORT_CELL =
	/\[\s*[A-Za-z_$][\w$]*\.(?:status|priority|lease_status|property_type)\s*,/;

describe("status, type and priority values are rendered through their labels", () => {
	it("scans the UI and the report builders (the sweep is not vacuous)", () => {
		expect(TSX.length).toBeGreaterThan(400);
		expect(REPORT_BUILDERS).toContain("src/lib/reports/report-data.ts");
	});

	it("renders no stored value as a JSX child", () => {
		expect(hits(TSX, RAW_RENDER)).toEqual([]);
	});

	it("builds no label by reformatting a stored value", () => {
		expect(hits(TSX, AD_HOC_LABEL)).toEqual([]);
	});

	it("assigns no stored value as a label", () => {
		expect(hits(TSX, RAW_LABEL)).toEqual([]);
	});

	it("writes no stored value into a report row", () => {
		expect(hits(REPORT_BUILDERS, RAW_REPORT_CELL)).toEqual([]);
	});

	it("names the two values the patterns above cannot see", () => {
		// A bare `{type}` in the template builder's picker, and a category inside
		// a template literal in the admin review queue.
		const builder = readFileSync(
			join(
				ROOT,
				"src/app/(owner)/documents/templates/components/form-builder-panel.tsx",
			),
			"utf8",
		);
		const review = readFileSync(
			join(ROOT, "src/app/(admin)/admin/blog/blog-review-client.tsx"),
			"utf8",
		);
		expect(builder).toContain("{FIELD_TYPE_LABELS[type]}");
		expect(review).toContain("categoryLabel(draft.category)");
	});

	it("catches the shapes it names (positive controls)", () => {
		expect(RAW_RENDER.test("\t\t\t{lease.status}")).toBe(true);
		expect(
			RAW_RENDER.test('<Badge variant="outline">{row.original.status}</Badge>'),
		).toBe(true);
		expect(RAW_RENDER.test("<span>{row.original.category}</span>")).toBe(true);
		expect(RAW_RENDER.test('{property.status || "Active"}')).toBe(true);
		expect(RAW_RENDER.test('{lease.lease_status ?? "draft"}')).toBe(true);
		expect(RAW_RENDER.test("value={lease.status}")).toBe(false);
		expect(RAW_RENDER.test('propertyType={property.property_type ?? ""}')).toBe(
			false,
		);
		expect(RAW_RENDER.test("`${draft.status}`")).toBe(false);
		expect(
			AD_HOC_LABEL.test(
				'property.property_type?.toLowerCase().replace(/_/g, " ")',
			),
		).toBe(true);
		expect(AD_HOC_LABEL.test('{u.replace("_", " ")}')).toBe(true);
		expect(RAW_LABEL.test("\t\tlabel: invoice.status,")).toBe(true);
		expect(
			RAW_REPORT_CELL.test(
				"(s): Array<string | number> => [s.status, fmtNumber(s.count)],",
			),
		).toBe(true);
	});
});
