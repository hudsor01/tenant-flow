/**
 * The year-end report lists no vendor as needing a 1099 (66.2-39 fix round 1,
 * part R).
 *
 * The page carried a "1099-NEC Vendors" section ("Vendors paid $600+ — may
 * require 1099-NEC filing"), a 1099 CSV, and the exports a `1099` report type
 * and a Jobs and a Status ("1099 Required") column. get_expense_summary emits
 * no `vendor_payments`, so the section always said no vendor exceeded the
 * threshold. And TenantFlow does not determine which vendors need a 1099: that
 * turns on the vendor and on a threshold tax law sets for each year, and the
 * app records neither. The section went from the screen, the page's CSVs, the
 * shared year-end table and both Edge exports' report types.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { YearEndReportSection } from "#components/reports/sections/year-end-report-section";
import { PREMIUM_REPORT_SLUGS } from "#lib/reports/premium-report-slugs";
import type { YearEndSummary } from "#types/reports";
import {
	TAX_YEAR_REPORT_TYPES,
	YEAR_END_HEADER,
} from "../../../../../supabase/functions/_shared/tax-year-reports";
import * as yearEndCsv from "../year-end/year-end-csv";

const ROOT = process.cwd();

const SUMMARY: YearEndSummary = {
	year: 2025,
	rentReceived: 61200.25,
	operatingExpenses: 11120.5,
	netIncome: 50079.75,
	byProperty: [
		{
			propertyId: "p1",
			propertyName: "Maple Court",
			deleted: false,
			rentReceived: 61200.25,
			expenses: 11120.5,
			netIncome: 50079.75,
		},
	],
	expenseByCategory: [{ category: "Acme Plumbing", amount: 11120.5 }],
};

/** A claim that a vendor needs a 1099, or a filing threshold. */
const CLAIM = /1099|\$600\b|filing threshold/i;

/** Lines that name a 1099 and are no claim: each with its reason. */
const REVIEWED: readonly { file: string; line: RegExp; reason: string }[] = [
	{
		file: "src/app/compare/[competitor]/compare-data.ts",
		line: /Mature full-service accounting with 1099 e-filing/,
		reason: "a competitor's strength on the comparison page, not TenantFlow's",
	},
	{
		file: "supabase/functions/_shared/tax-year-reports.ts",
		line: /No file names a vendor as needing a 1099|TenantFlow records neither\. The 1099-NEC section/,
		reason: "the note recording the section's removal",
	},
];

function collect(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const abs = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (!["__tests__", "tests", "node_modules"].includes(entry.name)) {
				out.push(...collect(abs));
			}
		} else if (
			/\.(tsx?|txt)$/.test(entry.name) &&
			!/\.(test|spec)\./.test(entry.name) &&
			entry.name !== "supabase.ts"
		) {
			out.push(relative(ROOT, abs));
		}
	}
	return out;
}

describe("the year-end report's vendors", () => {
	it("are listed by what was spent with them, never as needing a 1099", () => {
		render(
			<YearEndReportSection
				year={2025}
				yearEndData={SUMMARY}
				ledgerUnavailable={false}
				isLoadingYearEnd={false}
				onDownloadYearEndCsv={vi.fn()}
				isExportingYearEnd={false}
			/>,
		);
		expect(screen.getByText("Acme Plumbing")).toBeInTheDocument();
		expect(document.body.textContent).not.toMatch(CLAIM);
		expect(document.body.textContent).not.toMatch(/threshold/i);
		expect(screen.queryByRole("columnheader", { name: "Jobs" })).toBeNull();
		expect(screen.queryByRole("columnheader", { name: "Status" })).toBeNull();
		expect(
			screen.getAllByRole("button", { name: /download csv/i }),
		).toHaveLength(1);
	});

	it("are written to no 1099 CSV", () => {
		expect(Object.keys(yearEndCsv).sort()).toEqual([
			"YEAR_END_CSV_HEADER",
			"buildYearEndCsv",
		]);
	});

	it("take no Jobs or Status column in the exports, and no 1099 report type", () => {
		expect([...YEAR_END_HEADER]).toEqual([
			"Section",
			"Item",
			"Amount",
			"Rent Received",
			"Expenses",
			"Net Income",
		]);
		expect([...TAX_YEAR_REPORT_TYPES]).toEqual(["year-end", "financial"]);
		expect(PREMIUM_REPORT_SLUGS.has("1099")).toBe(false);
	});

	it("are claimed as needing a 1099 nowhere in the app or the Edge Functions", () => {
		const files = [
			...collect(join(ROOT, "src")),
			...collect(join(ROOT, "supabase/functions")),
		];
		expect(files.length).toBeGreaterThan(950);
		const claims = files.flatMap((file) =>
			readFileSync(join(ROOT, file), "utf8")
				.split("\n")
				.map((line, at) => ({ line, at }))
				.filter(
					({ line }) =>
						CLAIM.test(line) &&
						!REVIEWED.some((r) => r.file === file && r.line.test(line)),
				)
				.map(({ at, line }) => `${file}:${at + 1}: ${line.trim()}`),
		);
		expect(claims).toEqual([]);
	});

	it("catches the shapes it names, and each reviewed line still exists", () => {
		expect(CLAIM.test("1099-NEC Vendors (2025)")).toBe(true);
		expect(CLAIM.test("Vendors paid $600+")).toBe(true);
		expect(CLAIM.test("the IRS filing threshold")).toBe(true);
		expect(CLAIM.test("Save over $1,600/year")).toBe(false);
		for (const reviewed of REVIEWED) {
			const text = readFileSync(join(ROOT, reviewed.file), "utf8");
			expect(text, reviewed.file).toMatch(reviewed.line);
		}
	});
});
