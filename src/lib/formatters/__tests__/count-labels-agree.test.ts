/**
 * A count and its noun agree wherever the app writes them (66.2-39 fix round
 * 1, part R).
 *
 * The dashboard portfolio read "1 tenants", and the sweep of the class found
 * the same hand-written plural under a count that can be one on sixteen more
 * surfaces: "Expires in 1 days", "1 Bedrooms", "1 of 1 units occupied", "1
 * row have errors", "1 weeks ago", "1 points" read aloud, among them. Each now
 * goes through `formatCount` / `pluralNoun` (#lib/formatters/count).
 *
 * The guard reads every non-test .ts/.tsx file under src/ (comments blanked)
 * and fails on an expression written before a plural count noun, in a
 * template (`${n} days`) or in JSX (`{n} days`, or `{n}` closing a line the
 * noun opens), unless the line or the two before it choose the noun
 * (`=== 1`), or the site is reviewed below with its reason: a constant that
 * is never one (each VALIDATION_LIMITS one is read and checked), a count shown
 * only above a bound, a label that is no count.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { VALIDATION_LIMITS } from "#lib/constants/billing";
import { formatCount, pluralNoun } from "#lib/formatters/count";

const ROOT = process.cwd();

const NOUNS = [
	"days",
	"weeks",
	"months",
	"years",
	"hours",
	"minutes",
	"units",
	"tenants",
	"rows",
	"articles",
	"words",
	"points",
	"bedrooms",
	"bathrooms",
	"characters",
	"files",
	"documents",
	"inspections",
	"images",
	"photos",
	"attempts",
	"properties",
	"leases",
	"requests",
	"vendors",
	"rooms",
	"charges",
	"receipts",
	"applications",
	"expenses",
	"jobs",
	"items",
	"answers",
	"results",
	"records",
];
/** A plural count noun, not a JSX prop name (`units={units}`). */
const NOUN = `(${NOUNS.join("|")})\\b(?!\\s*=)`;
/**
 * `${expr} nouns` in a template, `{expr} nouns` in JSX (a `={expr}` prop
 * value is no text).
 */
const INLINE = new RegExp(
	`(?:\\$\\{([^{}]+)\\}|(?<![$\\w=])\\{([^{}]+)\\}(?:\\{" "\\})?)\\s+${NOUN}`,
	"i",
);
/** `{expr}` (or `{expr}{" "}`) closing a JSX line whose next line opens with the noun. */
const LINE_END = /(?<![$\w=])\{([^{}]+)\}\s*(?:\{" "\})?\s*$/;
const LINE_START = new RegExp(`^\\s*${NOUN}`, "i");
const CHOICE = /[=!]== ?1\b|> ?1\b/;

/** Reviewed sites: the file, the counted expression, and why it is no defect. */
const REVIEWED: readonly { file: string; expr: RegExp; reason: string }[] = [
	{
		file: "src/app/blog/[slug]/page.tsx",
		expr: /^MAX_ATTEMPTS$/,
		reason: "a server error message; the constant is 3 there",
	},
	{
		file: "src/components/settings/category-create-dialog.tsx",
		expr: /^SLUG_MAX$/,
		reason: "the constant is 50",
	},
	{
		file: "src/components/auth/password-strength.tsx",
		expr: /^minLength$/,
		reason: "the prop defaults to 8 and no caller passes another",
	},
	{
		file: "src/lib/validation/rental-applications.ts",
		expr: /^max$/,
		reason: "a field's maximum length; every caller passes a limit above one",
	},
	{
		file: "src/components/settings/billing-settings.tsx",
		expr: /^units$/,
		reason: "a plan's unit limit (5, 25, 100; -1 is written as Unlimited)",
	},
	{
		file: "src/components/landing/feature-backgrounds.tsx",
		expr: /^property\.units$/,
		reason: "the landing art's fixed sample properties (4, 8, 12 and 6 units)",
	},
	{
		file: "src/components/inspections/inspection-list.client.tsx",
		expr: /^total$/,
		reason: "shown only when total > 50",
	},
	{
		file: "src/components/bulk-import/bulk-import-validate-step.tsx",
		expr: /^parseResult\.totalRowCount$/,
		reason: "shown only when the file has more than 100 rows",
	},
	{
		file: "src/components/properties/property-image-gallery.tsx",
		expr: /^images\.length$/,
		reason: "shown only when there are more than 4 images",
	},
	{
		file: "src/components/documents/documents-vault.client.tsx",
		expr: /^(totalCount|BULK_DOWNLOAD_MAX)$/,
		reason:
			"a logger message above the bulk-download warning size, and the 500 cap",
	},
	{
		file: "src/components/ui/dropzone.tsx",
		expr: /^maxFiles$/,
		reason: "vendored; its one caller (PropertyImageDropzone) passes 10",
	},
	{
		file: "src/components/maintenance/cards/maintenance-card.tsx",
		expr: /^days$/,
		reason: "the branches past days <= 3, whose own branch writes '1 day'",
	},
	{
		file: "src/components/maintenance/table/columns.tsx",
		expr: /^days$/,
		reason: "the branches past days <= 3, whose own branch writes '1 day'",
	},
	{
		file: "src/app/blog/category/[category]/page.tsx",
		expr: /^label$/,
		reason: "a category's name in a page title ('Tax Prep Articles & Guides')",
	},
	{
		file: "src/components/ui/file-upload/file-upload-validation.ts",
		expr: /^maxFiles$/,
		reason:
			"vendored; the message reaches only onFileReject, which its one caller logs",
	},
	{
		file: "src/lib/reports/report-data.ts",
		expr: /\.toFixed\(1\)$/,
		reason: "a one-decimal figure ('1.0 hours'): a decimal takes the plural",
	},
	{
		file: "src/hooks/api/query-keys/financial-keys.ts",
		expr: /^what$/,
		reason: "an error context label ('year expenses'), not a count",
	},
	{
		file: "src/components/documents/documents-section.tsx",
		expr: /^entityLabel$/,
		reason: "an aria-label naming the entity ('Upload lease documents')",
	},
];

function collect(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const abs = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name !== "__tests__") out.push(...collect(abs));
		} else if (
			/\.tsx?$/.test(entry.name) &&
			!/\.(test|spec)\./.test(entry.name) &&
			entry.name !== "supabase.ts"
		) {
			out.push(relative(ROOT, abs));
		}
	}
	return out;
}

/** Comments blanked, line breaks kept, so line numbers hold. */
function withoutComments(source: string): string {
	return source
		.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
		.replace(
			/(^|[^:"'`\\])\/\/[^\n]*/g,
			(line, lead: string) => `${lead}${" ".repeat(line.length - lead.length)}`,
		);
}

interface Hit {
	file: string;
	line: number;
	expr: string;
	text: string;
}

/** Every count written before a plural noun with no choice of the noun. */
function hitsIn(file: string, source: string): Hit[] {
	const lines = withoutComments(source).split("\n");
	const hits: Hit[] = [];
	for (const [at, line] of lines.entries()) {
		const window = lines.slice(Math.max(0, at - 2), at + 1).join("\n");
		const inline = INLINE.exec(line);
		const expr =
			inline?.[1] ??
			inline?.[2] ??
			(LINE_START.test(lines[at + 1] ?? "")
				? (LINE_END.exec(line)?.[1] ?? undefined)
				: undefined);
		if (expr === undefined || CHOICE.test(window)) continue;
		if (/^VALIDATION_LIMITS\.\w+$/.test(expr.trim())) continue;
		hits.push({ file, line: at + 1, expr: expr.trim(), text: line.trim() });
	}
	return hits;
}

describe("a count and its noun", () => {
	it("agree: one is singular, every other number plural", () => {
		expect(formatCount(1, "day")).toBe("1 day");
		expect(formatCount(0, "day")).toBe("0 days");
		expect(formatCount(2, "day")).toBe("2 days");
		expect(formatCount(1.5, "Bathroom")).toBe("1.5 Bathrooms");
		expect(formatCount(1, "property", "properties")).toBe("1 property");
		expect(formatCount(3, "property", "properties")).toBe("3 properties");
		expect(pluralNoun(1, "unit")).toBe("unit");
		expect(pluralNoun(4, "unit")).toBe("units");
	});

	it("are written through the helpers everywhere in src/, or reviewed", () => {
		const files = collect(join(ROOT, "src"));
		expect(files.length).toBeGreaterThan(900);
		const unreviewed = files.flatMap((file) =>
			hitsIn(file, readFileSync(join(ROOT, file), "utf8"))
				.filter(
					(hit) =>
						!REVIEWED.some((r) => r.file === hit.file && r.expr.test(hit.expr)),
				)
				.map((hit) => `${hit.file}:${hit.line}: ${hit.text}`),
		);
		expect(unreviewed).toEqual([]);
	});

	it("are written with a VALIDATION_LIMITS constant only when it is above one", () => {
		const used = new Set<string>();
		for (const file of collect(join(ROOT, "src"))) {
			const source = withoutComments(readFileSync(join(ROOT, file), "utf8"));
			for (const m of source.matchAll(
				new RegExp(
					`VALIDATION_LIMITS\\.(\\w+)\\}(?:\\{" "\\})?\\s+${NOUN}`,
					"gi",
				),
			)) {
				if (m[1]) used.add(m[1]);
			}
		}
		expect(used.size).toBeGreaterThan(5);
		const limits: Record<string, unknown> = VALIDATION_LIMITS;
		for (const name of used) {
			expect(limits[name], name).toBeGreaterThan(1);
		}
	});

	it("catches the shapes it names, and each reviewed site still exists", () => {
		const hits = (source: string) => hitsIn("x.tsx", source).map((h) => h.expr);
		expect(hits("<p>Expires in {daysUntilExpiry} days</p>")).toEqual([
			"daysUntilExpiry",
		]);
		expect(hits("const s = `${n} units occupied`;")).toEqual(["n"]);
		expect(hits('<b>\n{count}{" "}\nrows\n</b>')).toEqual(["count"]);
		expect(hits('label: n === 1 ? "1 day" : `${n} days`,')).toEqual([]);
		expect(hits('const s = `${formatCount(n, "day")} ago`;')).toEqual([]);
		expect(hits("// `${n} days` in a comment")).toEqual([]);
		for (const reviewed of REVIEWED) {
			const source = readFileSync(join(ROOT, reviewed.file), "utf8");
			expect(
				hitsIn(reviewed.file, source).some((h) => reviewed.expr.test(h.expr)),
				reviewed.file,
			).toBe(true);
		}
	});
});
