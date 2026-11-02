/**
 * export-report / generate-pdf -- the report table writer.
 *
 * WHAT THIS FILE PROVES BY EXECUTION. Section 1 imports
 * `../_shared/report-csv` and runs the real writer: formula neutralization of
 * text cells (never numbers), RFC 4180 quoting, and a column list that is the
 * union of every row's keys, not the first row's. The specifier carries no
 * `.ts` extension: `tsconfig.json` includes `supabase/functions/__tests__/**`,
 * where an explicit `.ts` specifier is TS5097 (the trap
 * `application-guards.test.ts` documents). The Deno callers import
 * `../_shared/report-csv.ts`.
 *
 * WHAT IT PROVES ONLY STRUCTURALLY. The two Edge Functions cannot be imported
 * here (they import `../_shared/*.ts` with extensions, read the Deno env and
 * call `Deno.serve`), so section 2 reads them off disk, as
 * `premium-report-gate.test.ts` does, and pins that both take their columns
 * and CSV from the leaf and no longer derive a header from `rows[0]`.
 *
 * WHAT NOTHING HERE PROVES. That the deployed functions run this code: Edge
 * Functions deploy by hand from `main` (export-report, generate-pdf).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	csvCell,
	EMPTY_REPORT_CSV,
	neutralizeCsvFormula,
	reportColumns,
	rowsToCsv,
	rowsToTable,
	tableToCsv,
} from "../_shared/report-csv";

describe("report CSV writer (export-report)", () => {
	it("prefixes a text cell that starts with a formula trigger", () => {
		for (const trigger of ["=", "+", "-", "@", "\t", "\r"]) {
			expect(neutralizeCsvFormula(`${trigger}SUM(A1:A9)`)).toBe(
				`'${trigger}SUM(A1:A9)`,
			);
		}
		expect(neutralizeCsvFormula("Rent 2026")).toBe("Rent 2026");
		expect(neutralizeCsvFormula("a=b")).toBe("a=b");
	});

	it("never prefixes a number cell, negative or not", () => {
		expect(csvCell(-1200.5)).toBe("-1200.5");
		expect(csvCell(0)).toBe("0");
		expect(csvCell(42)).toBe("42");
		expect(csvCell("-1200.5")).toBe("'-1200.5");
	});

	it("writes null and undefined as empty cells and other values as text", () => {
		expect(csvCell(null)).toBe("");
		expect(csvCell(undefined)).toBe("");
		expect(csvCell(true)).toBe("true");
	});

	it("quotes a cell with a comma, a quote, CR or LF and doubles its quotes", () => {
		expect(csvCell("Smith, Jane")).toBe('"Smith, Jane"');
		expect(csvCell('the "big" unit')).toBe('"the ""big"" unit"');
		expect(csvCell("line one\nline two")).toBe('"line one\nline two"');
		expect(csvCell("a\rb")).toBe('"a\rb"');
		expect(csvCell("\r=1+1")).toBe('"\'\r=1+1"');
	});

	it("takes the union of every row's keys, in first-seen order", () => {
		const rows = [
			{ month: "2026-01", revenue: 1200 },
			{ month: "2026-02", revenue: 1300, expenses: 400 },
			{ notes: "=HYPERLINK(1)", month: "2026-03" },
		];
		expect(reportColumns(rows)).toEqual([
			"month",
			"revenue",
			"expenses",
			"notes",
		]);
		expect(rowsToCsv(rows)).toBe(
			[
				"month,revenue,expenses,notes",
				"2026-01,1200,,",
				"2026-02,1300,400,",
				"2026-03,,,'=HYPERLINK(1)",
			].join("\n"),
		);
	});

	it("neutralizes a header that starts with a formula trigger", () => {
		expect(rowsToCsv([{ "=cmd": "x" }])).toBe("'=cmd\nx");
	});

	it("writes an empty report as the no-data line", () => {
		expect(rowsToCsv([])).toBe(EMPTY_REPORT_CSV);
		expect(reportColumns([])).toEqual([]);
	});

	it("turns rows into a table of every column, with empty cells for gaps", () => {
		const rows = [
			{ month: "2026-01", revenue: 1200 },
			{ month: "2026-02", expenses: 400 },
		];
		expect(rowsToTable(rows)).toEqual({
			header: ["month", "revenue", "expenses"],
			rows: [
				["2026-01", 1200, undefined],
				["2026-02", undefined, 400],
			],
		});
	});

	it("writes a fixed-header table with the same cell rules", () => {
		expect(
			tableToCsv(
				["Section", "Item", "Value"],
				[
					["Overview", "Scheduled", 61200],
					["Expense Breakdown", "=HYPERLINK(1)", -120.5],
					["Expense Breakdown", "Roof, Gutter & Co", null],
				],
			),
		).toBe(
			[
				"Section,Item,Value",
				"Overview,Scheduled,61200",
				"Expense Breakdown,'=HYPERLINK(1),-120.5",
				'Expense Breakdown,"Roof, Gutter & Co",',
			].join("\n"),
		);
		expect(tableToCsv(["Section"], [])).toBe("Section");
	});

	it("writes a row report through the table writer, byte for byte", () => {
		const rows = [{ metric: "open_requests", value: 2 }, { metric: "=x" }];
		const table = rowsToTable(rows);
		expect(rowsToCsv(rows)).toBe(tableToCsv(table.header, table.rows));
	});
});

const read = (rel: string) =>
	readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

describe("the report Edge Functions use the leaf", () => {
	const exportReport = read("../export-report/index.ts");
	const generatePdf = read("../generate-pdf/index.ts");

	it("export-report imports its CSV writer and columns from the leaf", () => {
		expect(exportReport).toMatch(
			/import \{\s*reportColumns,\s*rowsToCsv,\s*rowsToTable,\s*tableToCsv,\s*\} from "\.\.\/_shared\/report-csv\.ts";/,
		);
		expect(exportReport).not.toMatch(/function (rowsToCsv|tableToCsv)\b/);
		expect(exportReport).toMatch(/csv: rowsToCsv\(result\.rows\),/);
		expect(exportReport).toMatch(
			/csv: tableToCsv\(table\.header, table\.rows\),/,
		);
		expect(exportReport).toMatch(/const headers = reportColumns\(rows\);/);
	});

	it("generate-pdf takes its report columns from the leaf", () => {
		expect(generatePdf).toContain(
			'import { reportColumns } from "../_shared/report-csv.ts";',
		);
		expect(generatePdf).toMatch(/const headers = reportColumns\(rows\);/);
	});

	it("neither function derives a header from the first row", () => {
		for (const source of [exportReport, generatePdf]) {
			expect(source).not.toMatch(/Object\.keys\(\s*rows\[0\]\s*\)/);
		}
	});
});
