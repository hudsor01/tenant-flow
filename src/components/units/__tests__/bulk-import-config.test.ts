import { describe, expect, it, vi } from "vitest";
import { buildCsvTemplate } from "#components/bulk-import/parse-csv-with-schema";

const db = vi.hoisted(() => ({
	/** The property's existing units, as the units read returns them. */
	units: [] as { id: string; unit_number: string }[],
	reads: [] as Array<{
		filters: Array<[string, string, string]>;
		range: [number, number];
	}>,
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		from: () => {
			const filters: Array<[string, string, string]> = [];
			const chain = {
				insert: async () => ({ error: null }),
				select: () => chain,
				eq: (column: string, value: string) => {
					filters.push(["eq", column, value]);
					return chain;
				},
				neq: (column: string, value: string) => {
					filters.push(["neq", column, value]);
					return chain;
				},
				order: () => chain,
				range: async (from: number, to: number) => {
					db.reads.push({ filters, range: [from, to] });
					return { data: db.units.slice(from, to + 1), error: null };
				},
			};
			return chain;
		},
	}),
}));
vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: async () => ({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }),
}));

import { unitBulkImportConfig } from "#components/units/bulk-import-config";

const PROPERTY_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("unitBulkImportConfig", () => {
	const config = unitBulkImportConfig(PROPERTY_ID);

	it("sample rows pass validation", () => {
		const csv = buildCsvTemplate(
			config.templateHeaders,
			config.templateSampleRows,
		);
		const result = config.parseAndValidate(csv);
		for (const row of result.rows) {
			expect(row.errors).toEqual([]);
		}
	});

	it("rejects blank rent_amount instead of coercing to $0", () => {
		const csv = buildCsvTemplate(config.templateHeaders, [
			["101", "2", "1", "850", "", "available"],
		]);
		const result = config.parseAndValidate(csv);
		const fields = (result.rows[0]?.errors ?? []).map((e) => e.field);
		expect(fields).toContain("rent_amount");
	});

	it("rejects a fractional (cents) rent_amount instead of a raw 22P02 (FORM-14)", () => {
		const csv = buildCsvTemplate(config.templateHeaders, [
			["101", "2", "1", "850", "1500.50", "available"],
		]);
		const result = config.parseAndValidate(csv);
		const fields = (result.rows[0]?.errors ?? []).map((e) => e.field);
		expect(fields).toContain("rent_amount");
	});

	it("flags duplicate unit_number within same CSV", () => {
		const csv = buildCsvTemplate(config.templateHeaders, [
			["101", "2", "1", "850", "1800", "available"],
			["101", "3", "2", "900", "2000", "available"],
		]);
		const result = config.parseAndValidate(csv);
		// First row wins; second row gets a per-row duplicate error.
		expect(result.rows[0]?.errors).toEqual([]);
		expect(
			(result.rows[1]?.errors ?? []).some((e) =>
				e.message.toLowerCase().includes("duplicate"),
			),
		).toBe(true);
	});

	it("accepts a studio (0 bedrooms)", () => {
		const csv = buildCsvTemplate(config.templateHeaders, [
			["S1", "0", "1", "450", "1100", "available"],
		]);
		const result = config.parseAndValidate(csv);
		expect(result.rows[0]?.errors).toEqual([]);
		expect(result.rows[0]?.parsed?.bedrooms).toBe(0);
	});

	it("holds back a row whose unit_number the property already has", async () => {
		db.units = [
			{ id: "u-1", unit_number: "101" },
			{ id: "u-2", unit_number: "A2" },
		];
		db.reads = [];
		const csv = buildCsvTemplate(config.templateHeaders, [
			["101", "2", "1", "850", "1800", "available"],
			[" a2 ", "1", "1", "600", "1200", "available"],
			["103", "2", "1", "850", "1800", "available"],
		]);
		const resolved = await config.resolveRows?.(config.parseAndValidate(csv));

		expect(
			resolved?.rows.map((row) => row.parsed?.unit_number ?? null),
		).toEqual([null, null, "103"]);
		expect(resolved?.rows[0]?.errors).toEqual([
			{
				field: "unit_number",
				message: 'This property already has a unit "101".',
			},
		]);
		expect(resolved?.rows[1]?.errors[0]?.message).toBe(
			'This property already has a unit "a2".',
		);
		// This property's units only, deleted ones excluded.
		expect(db.reads[0]?.filters).toEqual([
			["eq", "property_id", PROPERTY_ID],
			["neq", "status", "inactive"],
		]);
	});

	it("reads every existing unit, past PostgREST's 1000-row cap", async () => {
		db.units = Array.from({ length: 1001 }, (_, i) => ({
			id: `u-${String(i).padStart(4, "0")}`,
			unit_number: `N${i}`,
		}));
		db.reads = [];
		const csv = buildCsvTemplate(config.templateHeaders, [
			["N1000", "2", "1", "850", "1800", "available"],
		]);
		const resolved = await config.resolveRows?.(config.parseAndValidate(csv));

		expect(db.reads.map((read) => read.range)).toEqual([
			[0, 999],
			[1000, 1999],
		]);
		expect(resolved?.rows[0]?.parsed).toBeNull();
	});

	it("attaches property_id from the caller (not the CSV)", () => {
		const csv = buildCsvTemplate(config.templateHeaders, [
			["101", "2", "1", "850", "1800", "available"],
		]);
		const result = config.parseAndValidate(csv);
		const parsed = result.rows[0]?.parsed;
		expect(parsed?.property_id).toBe(PROPERTY_ID);
	});

	it("rejects an unknown status value (no silent coercion)", () => {
		const csv = buildCsvTemplate(config.templateHeaders, [
			["101", "2", "1", "850", "1800", "bogus"],
		]);
		const result = config.parseAndValidate(csv);
		expect(result.rows[0]?.parsed).toBeNull();
		const fields = (result.rows[0]?.errors ?? []).map((e) => e.field);
		expect(fields).toContain("status");
	});

	it("sample rows must align with header length", () => {
		const headerLen = config.templateHeaders.length;
		for (const row of config.templateSampleRows) {
			expect(row).toHaveLength(headerLen);
		}
	});
});
