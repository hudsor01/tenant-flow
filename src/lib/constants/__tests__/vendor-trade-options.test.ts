/**
 * The vendor trades the pickers offer, and their labels: one list shared by
 * the vendor form, the vendor list's filter and the maintenance vendor picker
 * (each kept its own copy before vendor assignment).
 */
import { describe, expect, it } from "vitest";
import {
	VENDOR_TRADE_OPTIONS,
	vendorTradeLabel,
} from "#lib/constants/status-types";

describe("the vendor trade options", () => {
	it("are the nine values of the DB CHECK vendors_trade_check", () => {
		expect(VENDOR_TRADE_OPTIONS.map((option) => option.value)).toEqual([
			"plumbing",
			"electrical",
			"hvac",
			"carpentry",
			"painting",
			"landscaping",
			"appliance",
			"general",
			"other",
		]);
	});

	it("label a trade, and pass an unknown one through", () => {
		expect(vendorTradeLabel("hvac")).toBe("HVAC");
		expect(vendorTradeLabel("appliance")).toBe("Appliance Repair");
		expect(vendorTradeLabel("general")).toBe("General Contractor");
		expect(vendorTradeLabel("roofing")).toBe("roofing");
	});
});
