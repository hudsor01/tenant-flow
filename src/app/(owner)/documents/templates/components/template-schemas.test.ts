/**
 * The template forms' email checks report exactly what they reported before
 * zod 4's deprecated string-format method was replaced with `z.email()`
 * (66.2-39): the form's message for a string that is not an email, and zod's
 * own type message for a value that is not a string at all.
 */

import { describe, expect, it } from "vitest";
import {
	maintenanceRequestSchema,
	rentalApplicationSchema,
} from "./template-schemas";

const emailOf = {
	rentalApplication: rentalApplicationSchema.shape.email,
	maintenanceRequest: maintenanceRequestSchema.shape.requesterEmail,
};

describe.each(Object.entries(emailOf))("%s email", (_name, schema) => {
	it("accepts an email address", () => {
		expect(schema.safeParse("tenant@example.com").success).toBe(true);
	});

	it.each(["", "not-an-email", "a@b", "mailto:a@b.co"])(
		"rejects %j with the form's message",
		(input) => {
			const result = schema.safeParse(input);
			expect(result.success).toBe(false);
			expect(result.error?.issues).toEqual([
				expect.objectContaining({
					code: "invalid_format",
					format: "email",
					message: "Valid email required",
				}),
			]);
		},
	);

	it.each([
		[undefined, "undefined"],
		[null, "null"],
		[5, "number"],
	])("keeps zod's type message for %j", (input, received) => {
		const result = schema.safeParse(input);
		expect(result.error?.issues).toEqual([
			expect.objectContaining({
				code: "invalid_type",
				message: `Invalid input: expected string, received ${received}`,
			}),
		]);
	});
});
