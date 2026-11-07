/**
 * Regression tests for bulk-import-result-error-list helpers.
 *
 * Targets cycle-4 LOW finding: when the mutation throws and
 * `useBulkImportMutation.onError` populates a synthetic `row: 0` error,
 * the previous buildFailedRowsCsv branched on `parseResult` non-null and
 * emitted a header-only CSV (filter on `r.row === 0` matched zero data
 * rows). These tests call the exported helper: it falls through to the
 * synthetic `row,error` shape when every error is row-0, and keeps the
 * original headers for a real row's error.
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { buildFailedRowsCsv } from "../bulk-import-result-error-list";
import { buildCsvTemplate, parseCsvWithSchema } from "../parse-csv-with-schema";

const schema = z.object({ name: z.string(), count: z.number() });
const mapRow = (raw: Record<string, string>) => ({
	name: raw.name ?? "",
	count: Number(raw.count ?? 0),
});

describe("failed-rows CSV download", () => {
	it("with parseResult and a real per-row error, emits original headers + cells + _error column", () => {
		const csv = buildCsvTemplate(
			["name", "count"],
			[
				["alpha", "1"],
				["beta", "2"],
			],
		);
		const result = parseCsvWithSchema(csv, { schema, mapRow });
		// Row 3 (CSV line 3 = beta) failed.
		expect(
			buildFailedRowsCsv(
				[{ row: 3, error: "simulated DB error" }],
				result,
			).split("\n"),
		).toEqual(['"name","count","_error"', '"beta","2","simulated DB error"']);
	});

	it("with only synthetic row-0 errors, falls through to the row,error shape (regression scenario)", () => {
		const csv = buildCsvTemplate(["name", "count"], [["alpha", "1"]]);
		const result = parseCsvWithSchema(csv, { schema, mapRow });
		// No parsed row has line 0, so the original-headers shape would be the
		// header alone; the helper writes each synthetic error instead.
		expect(
			buildFailedRowsCsv([{ row: 0, error: "network blowup" }], result),
		).toBe('"row","error"\n"0","network blowup"\n');
	});
});

// 66.2-39 fix round 1 part E: Papa's header mode leaves the fields a short row
// lacks off its object, so a header taken from the first row alone dropped,
// from every row of the failed-rows download, each column that row was short
// of. The header is every parsed row's keys in first-seen order.
describe("buildFailedRowsCsv headers", () => {
	it("keeps a column the first data row is short of", () => {
		const result = parseCsvWithSchema("name,count\nalpha\nbeta,2\n", {
			schema,
			mapRow,
		});
		const csv = buildFailedRowsCsv(
			[
				{ row: 2, error: "count is required" },
				{ row: 3, error: "simulated DB error" },
			],
			result,
		);
		expect(csv.split("\n")).toEqual([
			'"name","count","_error"',
			'"alpha","","count is required"',
			'"beta","2","simulated DB error"',
		]);
	});

	it("writes no column for Papa's extra-fields array", () => {
		const result = parseCsvWithSchema("name,count\nalpha,1,stray\n", {
			schema,
			mapRow,
		});
		const csv = buildFailedRowsCsv([{ row: 2, error: "bad row" }], result);
		expect(csv.split("\n")).toEqual([
			'"name","count","_error"',
			'"alpha","1","bad row"',
		]);
	});
});
