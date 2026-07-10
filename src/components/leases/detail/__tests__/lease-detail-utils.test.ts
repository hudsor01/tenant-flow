import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getDaysUntilExpiry } from "../lease-detail-utils";

describe("getDaysUntilExpiry", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		// Local-component construction so "now" is Jan 15 2026 noon in the
		// runner's own zone — parseLocalYmd is likewise local, so the calendar
		// diff is timezone-independent.
		vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns the calendar days until a future end date", () => {
		expect(getDaysUntilExpiry("2026-01-20")).toBe(5);
	});

	it("returns 0 on the end date itself", () => {
		expect(getDaysUntilExpiry("2026-01-15")).toBe(0);
	});

	it("returns a negative count for a past end date", () => {
		expect(getDaysUntilExpiry("2026-01-10")).toBe(-5);
	});

	it("returns null for a null end date", () => {
		expect(getDaysUntilExpiry(null)).toBeNull();
	});

	it("returns null for a malformed end date", () => {
		expect(getDaysUntilExpiry("not-a-date")).toBeNull();
	});
});
