import { describe, expect, it } from "vitest";
import type { Property, Unit } from "#types/core";
import {
	calculateSummary,
	transformToPropertyItem,
} from "../property-transforms";

// Regression: MONEY-01 — monthlyRevenue must be in whole DOLLARS (rendered with
// formatCurrency/formatCompactCurrency, which expect dollars). A prior `* 100`
// overstated the properties-list revenue column 100x.

const property: Property = {
	acquisition_cost: null,
	acquisition_date: null,
	address_line1: "1 Main St",
	address_line2: null,
	city: "Austin",
	country: "US",
	created_at: "2026-01-01T00:00:00Z",
	date_sold: null,
	id: "prop-1",
	name: "Test Property",
	owner_user_id: "owner-1",
	postal_code: "78701",
	property_type: "multi_family",
	sale_price: null,
	search_vector: null,
	state: "TX",
	status: "active",
	updated_at: "2026-01-01T00:00:00Z",
};

function unit(overrides: Partial<Unit>): Unit {
	return {
		id: "unit-x",
		property_id: "prop-1",
		owner_user_id: "owner-1",
		unit_number: "101",
		bedrooms: 2,
		bathrooms: 1,
		square_feet: 850,
		rent_amount: 1500,
		rent_currency: "USD",
		rent_period: "month",
		status: "occupied",
		created_at: "2026-01-01T00:00:00Z",
		updated_at: "2026-01-01T00:00:00Z",
		...overrides,
	};
}

describe("transformToPropertyItem monthlyRevenue", () => {
	it("sums occupied units' rent in whole dollars (not 100x)", () => {
		const units = [
			unit({ id: "u1", rent_amount: 1500, status: "occupied" }),
			unit({ id: "u2", rent_amount: 2000, status: "occupied" }),
			unit({ id: "u3", rent_amount: 1100, status: "available" }), // excluded
		];

		const item = transformToPropertyItem(property, units, undefined);

		// 1500 + 2000 occupied dollars — NOT 350000 (the old cents-conversion bug).
		expect(item.monthlyRevenue).toBe(3500);
	});

	it("is 0 when no units are occupied", () => {
		const item = transformToPropertyItem(
			property,
			[unit({ id: "u1", status: "available" })],
			undefined,
		);
		expect(item.monthlyRevenue).toBe(0);
	});
});

describe("calculateSummary totalMonthlyRevenue", () => {
	it("sums per-property dollar revenue without re-scaling", () => {
		const a = transformToPropertyItem(
			property,
			[unit({ id: "a1", rent_amount: 1500, status: "occupied" })],
			undefined,
		);
		const b = transformToPropertyItem(
			{ ...property, id: "prop-2" },
			[unit({ id: "b1", rent_amount: 2500, status: "occupied" })],
			undefined,
		);

		expect(calculateSummary([a, b]).totalMonthlyRevenue).toBe(4000);
	});
});
