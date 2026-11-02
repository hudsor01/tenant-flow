/**
 * export-report / generate-pdf -- the report table writer.
 *
 * WHAT THIS FILE PROVES BY EXECUTION. Section 1 imports
 * `../_shared/report-csv` and runs the real writer: formula neutralization of
 * text cells (never numbers) and RFC 4180 quoting. The specifier carries no
 * `.ts` extension: `tsconfig.json` includes `supabase/functions/__tests__/**`,
 * where an explicit `.ts` specifier is TS5097 (the trap
 * `application-guards.test.ts` documents). The Deno callers import
 * `../_shared/report-csv.ts`.
 *
 * WHAT IT PROVES ONLY STRUCTURALLY. The two Edge Functions cannot be imported
 * here (they import `../_shared/*.ts` with extensions, read the Deno env and
 * call `Deno.serve`), so section 2 reads them off disk, as
 * `premium-report-gate.test.ts` does, and pins that export-report writes every
 * CSV through the leaf and that neither function keeps the deleted row-report
 * path (an RPC's JSON flattened into rows with a header taken from its keys).
 *
 * WHAT NOTHING HERE PROVES. That the deployed functions run this code: Edge
 * Functions deploy by hand from `main` (export-report, generate-pdf).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	csvCell,
	neutralizeCsvFormula,
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
});

const read = (rel: string) =>
	readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

describe("the report Edge Functions use the leaf", () => {
	const exportReport = read("../export-report/index.ts");
	const generatePdf = read("../generate-pdf/index.ts");

	it("export-report writes every CSV through the leaf's table writer", () => {
		expect(exportReport).toContain(
			'import { tableToCsv } from "../_shared/report-csv.ts";',
		);
		expect(exportReport).not.toMatch(/function (rowsToCsv|tableToCsv)\b/);
		expect(exportReport.match(/csv: tableToCsv\(/g)).toHaveLength(2);
	});

	it("neither function keeps the row-report path", () => {
		for (const source of [exportReport, generatePdf]) {
			expect(source).not.toMatch(
				/flattenTo\w*Rows|fetchReportRows|buildReportHtml|reportColumns|get_maintenance_analytics/,
			);
			expect(source).not.toMatch(/Object\.keys\(\s*rows\[0\]\s*\)/);
		}
		expect(generatePdf).not.toContain("report-csv.ts");
	});
});
