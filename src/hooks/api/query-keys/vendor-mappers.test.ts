/**
 * The vendors boundary mapper: NOT-NULL columns throw when a select dropped
 * them, and `trade` and `status` must be among the table's CHECK values
 * (vendors_trade_check, vendors_status_check).
 */
import { describe, expect, it } from "vitest";
import { VENDOR_TRADE_OPTIONS } from "#lib/constants/status-types";
import { mapVendorRow } from "./vendor-mappers";

const ROW = {
	id: "0a0a0a0a-0000-4000-8000-00000000beef",
	owner_user_id: "00000000-0000-0000-0000-0000000000ff",
	name: "Ace Plumbing",
	email: "jobs@aceplumbing.example",
	phone: null,
	trade: "plumbing",
	hourly_rate: 85,
	status: "active",
	notes: null,
	created_at: "2026-11-01T00:00:00Z",
	updated_at: "2026-11-01T00:00:00Z",
};

describe("mapVendorRow", () => {
	it("maps a vendors row", () => {
		expect(mapVendorRow(ROW)).toEqual(ROW);
	});

	it("accepts every trade the pickers offer", () => {
		for (const { value } of VENDOR_TRADE_OPTIONS) {
			expect(mapVendorRow({ ...ROW, trade: value }).trade).toBe(value);
		}
	});

	it("throws on a trade or status outside the table's CHECKs", () => {
		expect(() => mapVendorRow({ ...ROW, trade: "roofing" })).toThrow(/trade/);
		expect(() => mapVendorRow({ ...ROW, status: "archived" })).toThrow(
			/status/,
		);
	});

	it("throws when the select dropped a NOT-NULL column", () => {
		const { name: _omitName, ...withoutName } = ROW;
		expect(() => mapVendorRow(withoutName)).toThrow(/name/);
		expect(() => mapVendorRow(null)).toThrow(/id/);
	});

	it("throws on a nullable column of the wrong type", () => {
		expect(() => mapVendorRow({ ...ROW, hourly_rate: "85" })).toThrow(
			/hourly_rate/,
		);
		expect(() => mapVendorRow({ ...ROW, phone: 5550102000 })).toThrow(/phone/);
	});
});
