import { describe, expect, it, vi } from "vitest";
import { buildCsvTemplate } from "#components/bulk-import/parse-csv-with-schema";

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ rpc: async () => ({ error: null }) }),
}));

import { leaseBulkImportConfig } from "#components/leases/bulk-import-config";
import {
	type LeaseImportLookup,
	resolveLeaseRows,
} from "#components/leases/resolve-lease-import";

/**
 * Lease rows name the property, unit and tenant (owner 2026-11-26: the old
 * unit_id / primary_tenant_id columns asked for ids the app never shows).
 * A row: property, unit, tenant_email, start_date, end_date, rent_amount,
 * security_deposit, payment_day, rent_currency.
 */
const row = (overrides: Partial<Record<string, string>> = {}): string[] => {
	const base: Record<string, string> = {
		property: "Maple Street Duplex",
		unit: "A",
		tenant_email: "jordan@example.com",
		start_date: "2026-05-01",
		end_date: "2027-04-30",
		rent_amount: "1800",
		security_deposit: "1800",
		payment_day: "1",
		rent_currency: "USD",
		...overrides,
	};
	return [
		base.property,
		base.unit,
		base.tenant_email,
		base.start_date,
		base.end_date,
		base.rent_amount,
		base.security_deposit,
		base.payment_day,
		base.rent_currency,
	].map((value) => value ?? "");
};

describe("leaseBulkImportConfig", () => {
	const config = leaseBulkImportConfig();
	const parse = (...rows: string[][]) =>
		config.parseAndValidate(buildCsvTemplate(config.templateHeaders, rows));
	const fieldsOf = (result: ReturnType<typeof parse>, i = 0) =>
		(result.rows[i]?.errors ?? []).map((e) => e.field);

	it("asks for names a landlord knows, not internal ids", () => {
		expect(config.templateHeaders.slice(0, 3)).toEqual([
			"property",
			"unit",
			"tenant_email",
		]);
		expect(config.templateHeaders).not.toContain("unit_id");
		expect(config.templateHeaders).not.toContain("primary_tenant_id");
	});

	it("sample rows pass validation", () => {
		const result = config.parseAndValidate(
			buildCsvTemplate(config.templateHeaders, config.templateSampleRows),
		);
		for (const parsed of result.rows) expect(parsed.errors).toEqual([]);
	});

	it("sample rows must align with header length", () => {
		for (const sample of config.templateSampleRows) {
			expect(sample).toHaveLength(config.templateHeaders.length);
		}
	});

	it("rejects a blank property name and an invalid tenant email", () => {
		const fields = fieldsOf(parse(row({ property: "", tenant_email: "nope" })));
		expect(fields).toContain("property");
		expect(fields).toContain("tenant_email");
	});

	it("rejects a date that is not YYYY-MM-DD, or not a real day", () => {
		expect(fieldsOf(parse(row({ start_date: "05/01/2026" })))).toContain(
			"start_date",
		);
		expect(fieldsOf(parse(row({ end_date: "2027-02-30" })))).toContain(
			"end_date",
		);
	});

	it("rejects an end date on or before the start date", () => {
		expect(
			fieldsOf(
				parse(row({ start_date: "2026-05-01", end_date: "2026-05-01" })),
			),
		).toContain("end_date");
	});

	it("rejects blank rent_amount", () => {
		expect(fieldsOf(parse(row({ rent_amount: "" })))).toContain("rent_amount");
	});

	it("rejects a fractional (cents) rent_amount instead of silently rounding (FORM-06)", () => {
		expect(fieldsOf(parse(row({ rent_amount: "1800.50" })))).toContain(
			"rent_amount",
		);
	});

	it("rejects blank security_deposit (no silent $0 coercion)", () => {
		expect(fieldsOf(parse(row({ security_deposit: "" })))).toContain(
			"security_deposit",
		);
	});

	it("rejects explicit payment_day=0 with a schema error", () => {
		expect(fieldsOf(parse(row({ payment_day: "0" })))).toContain("payment_day");
	});

	it("imports a non-USD currency code as-is", () => {
		const result = parse(row({ rent_currency: "EUR" }));
		expect(result.rows[0]?.errors).toEqual([]);
		expect(result.rows[0]?.parsed?.rent_currency).toBe("EUR");
	});

	it("rejects a malformed 2-letter currency code", () => {
		expect(fieldsOf(parse(row({ rent_currency: "US" })))).toContain(
			"rent_currency",
		);
	});

	it("defaults a blank currency cell to USD", () => {
		const result = parse(row({ rent_currency: "" }));
		expect(result.rows[0]?.errors).toEqual([]);
		expect(result.rows[0]?.parsed?.rent_currency).toBe("USD");
	});
});

describe("resolveLeaseRows", () => {
	const config = leaseBulkImportConfig();
	const lookup: LeaseImportLookup = {
		properties: [
			{ id: "p-duplex", name: "Maple Street Duplex" },
			{ id: "p-house", name: "Oak Avenue House" },
			{ id: "p-twin-1", name: "Twin Pines" },
			{ id: "p-twin-2", name: "twin pines " },
			{ id: "p-empty", name: "Empty Lot" },
		],
		units: [
			{ id: "u-a", unit_number: "A", property_id: "p-duplex" },
			{ id: "u-b", unit_number: "B", property_id: "p-duplex" },
			{ id: "u-house", unit_number: "1", property_id: "p-house" },
		],
		tenants: [
			{ id: "t-jordan", email: "Jordan@Example.com" },
			{ id: "t-sam", email: "sam@example.com" },
			{ id: "t-dup-1", email: "dup@example.com" },
			{ id: "t-dup-2", email: "dup@example.com" },
		],
	};
	const resolve = (...rows: string[][]) =>
		resolveLeaseRows(
			config.parseAndValidate(buildCsvTemplate(config.templateHeaders, rows)),
			lookup,
		);
	const errorsOf = (result: ReturnType<typeof resolve>, i = 0) =>
		result.rows[i]?.errors ?? [];

	it("matches the property, unit and tenant to ids, ignoring case and spaces", () => {
		const result = resolve(
			row({
				property: " maple street duplex ",
				unit: "b",
				tenant_email: "JORDAN@example.com",
			}),
		);
		expect(errorsOf(result)).toEqual([]);
		expect(result.rows[0]?.parsed?.unit_id).toBe("u-b");
		expect(result.rows[0]?.parsed?.primary_tenant_id).toBe("t-jordan");
	});

	it("takes a property's only unit when the unit cell is blank", () => {
		const result = resolve(
			row({
				property: "Oak Avenue House",
				unit: "",
				tenant_email: "sam@example.com",
			}),
		);
		expect(errorsOf(result)).toEqual([]);
		expect(result.rows[0]?.parsed?.unit_id).toBe("u-house");
	});

	it("asks for the unit when the property has several", () => {
		const result = resolve(row({ unit: "" }));
		expect(result.rows[0]?.parsed).toBeNull();
		expect(errorsOf(result)).toEqual([
			{
				field: "unit",
				message: '"Maple Street Duplex" has 2 units: name the unit',
			},
		]);
	});

	it("names a property with no units yet", () => {
		const result = resolve(row({ property: "Empty Lot", unit: "" }));
		expect(errorsOf(result)[0]?.message).toBe(
			'"Empty Lot" has no units yet: add one on its page first',
		);
	});

	it("names what did not match", () => {
		const result = resolve(
			row({ property: "Elm Court" }),
			row({ unit: "C" }),
			row({ tenant_email: "nobody@example.com" }),
		);
		expect(errorsOf(result, 0)).toEqual([
			{ field: "property", message: 'No property named "Elm Court"' },
		]);
		expect(errorsOf(result, 1)).toEqual([
			{ field: "unit", message: '"Maple Street Duplex" has no unit "C"' },
		]);
		expect(errorsOf(result, 2)).toEqual([
			{
				field: "tenant_email",
				message:
					"No tenant with the email nobody@example.com: add the tenant first",
			},
		]);
		for (const r of result.rows) expect(r.parsed).toBeNull();
	});

	it("refuses an ambiguous property name or tenant email", () => {
		const result = resolve(
			row({ property: "Twin Pines", unit: "" }),
			row({ tenant_email: "dup@example.com" }),
		);
		expect(errorsOf(result, 0)[0]?.message).toBe(
			'2 properties are named "Twin Pines": rename one so each name is unique',
		);
		expect(errorsOf(result, 1)[0]?.message).toBe(
			"2 tenants have the email dup@example.com",
		);
	});

	it("leaves a row that failed parsing as it was", () => {
		const result = resolve(row({ rent_amount: "" }));
		expect(result.rows[0]?.parsed).toBeNull();
		expect(errorsOf(result).map((e) => e.field)).toContain("rent_amount");
	});
});
