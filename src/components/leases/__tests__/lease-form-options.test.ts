import { describe, expect, it } from "vitest";
import { validationSchema } from "../lease-form-options";

const validLease = {
	unit_id: "unit-1",
	primary_tenant_id: "tenant-1",
	start_date: "2026-01-01",
	end_date: "2026-12-31",
	rent_amount: 1500,
	security_deposit: 1500,
	rent_currency: "USD",
	payment_day: 1,
	lease_status: "draft",
};

describe("lease-form validationSchema", () => {
	it("accepts a valid lease with end after start", () => {
		expect(validationSchema.safeParse(validLease).success).toBe(true);
	});

	it("rejects an end date on/before the start date (FORM-07)", () => {
		const reversed = validationSchema.safeParse({
			...validLease,
			start_date: "2026-02-01",
			end_date: "2026-01-01",
		});
		expect(reversed.success).toBe(false);
		if (!reversed.success) {
			const endIssue = reversed.error.issues.find(
				(i) => i.path[0] === "end_date",
			);
			expect(endIssue?.message).toMatch(/after start date/i);
		}

		// Equal dates are also rejected (strictly after).
		expect(
			validationSchema.safeParse({
				...validLease,
				start_date: "2026-01-01",
				end_date: "2026-01-01",
			}).success,
		).toBe(false);
	});

	it("rejects a fractional (cents) rent amount", () => {
		expect(
			validationSchema.safeParse({ ...validLease, rent_amount: 1500.5 })
				.success,
		).toBe(false);
	});
});
