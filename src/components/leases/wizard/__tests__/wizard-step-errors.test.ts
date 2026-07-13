import { describe, expect, it } from "vitest";
import {
	selectionStepSchema,
	termsStepSchema,
} from "#lib/validation/lease-wizard.schemas";
import { mapStepErrors } from "../wizard-step-errors";

describe("mapStepErrors", () => {
	it("maps empty selection-step uuid failures to friendly required messages (not 'Invalid UUID format')", () => {
		const result = selectionStepSchema.safeParse({});
		expect(result.success).toBe(false);
		if (result.success) return;
		const errors = mapStepErrors(result.error);
		expect(errors.property_id).toBe("Property is required");
		expect(errors.unit_id).toBe("Unit is required");
		expect(errors.primary_tenant_id).toBe("Primary tenant is required");
		// The raw zod message must not leak to the user.
		expect(Object.values(errors)).not.toContain("Invalid UUID format");
	});

	it("passes through the user-facing message for non-selection fields", () => {
		const result = termsStepSchema.safeParse({
			start_date: "2026-02-01",
			end_date: "2026-01-01",
			rent_amount: 1500,
			security_deposit: 1500,
			payment_day: 1,
		});
		expect(result.success).toBe(false);
		if (result.success) return;
		const errors = mapStepErrors(result.error);
		// end_date carries a real user-facing message from the schema refine.
		expect(errors.end_date).toMatch(/after start date/i);
	});
});
