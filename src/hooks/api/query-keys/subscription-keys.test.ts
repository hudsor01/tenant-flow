import { describe, expect, it } from "vitest";
import { mapSubscriptionStatus } from "./subscription-keys";

describe("mapSubscriptionStatus", () => {
	it.each([
		"active",
		"trialing",
		"canceled",
		"past_due",
		"unpaid",
		"incomplete",
		"incomplete_expired",
		"paused",
		"expired",
	])("passes through the known status %s", (status) => {
		expect(mapSubscriptionStatus(status)).toBe(status);
	});

	it("returns null for null and undefined", () => {
		expect(mapSubscriptionStatus(null)).toBeNull();
		expect(mapSubscriptionStatus(undefined)).toBeNull();
	});

	it("returns null for the dead British 'cancelled' spelling (no writer, BILL-18)", () => {
		expect(mapSubscriptionStatus("cancelled")).toBeNull();
	});

	it("returns null for an unknown string (fails to no-subscription, not a fabricated status)", () => {
		expect(mapSubscriptionStatus("something_else")).toBeNull();
		expect(mapSubscriptionStatus("")).toBeNull();
	});

	it("returns null for non-string inputs", () => {
		expect(mapSubscriptionStatus(42)).toBeNull();
		expect(mapSubscriptionStatus({})).toBeNull();
	});
});
