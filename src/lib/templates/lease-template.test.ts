import { describe, expect, it } from "vitest";
import { createDefaultContext } from "#lib/templates/lease-template";

// CRIT-02 regression pin: the lease-template stores money as CENTS internally
// (the builder feeds dollarsToCents into createDefaultContext). These assertions
// fail if the *Cents fields are ever reverted to the dollars-in `formatCurrency`
// formatter (which would render $180,000.00 / $5,000.00 instead of face value).
describe("createDefaultContext money formatting (CRIT-02)", () => {
	it("renders the default rent at face value from cents", () => {
		expect(createDefaultContext().rent_amountFormatted).toBe("$1,800.00");
	});

	it("renders the default security deposit at face value from cents", () => {
		expect(createDefaultContext().security_depositFormatted).toBe("$1,800.00");
	});

	it("renders the default late fee at face value from cents", () => {
		expect(createDefaultContext().late_fee_amountFormatted).toBe("$50.00");
	});

	it("formats an overridden rent value at face value from cents", () => {
		expect(
			createDefaultContext({ rent_amountCents: 250000 }).rent_amountFormatted,
		).toBe("$2,500.00");
	});
});
