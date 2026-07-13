import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { validateMoveOutDate } from "../move-out-validation";

describe("validateMoveOutDate", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		// Local noon on 2026-07-11 in the runner's own zone. parseLocalYmd is
		// likewise local, so the today-boundary check is timezone-independent.
		vi.setSystemTime(new Date(2026, 6, 11, 12, 0, 0));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// COMP-08 regression: today's date must be accepted. Parsing the picker
	// value with `new Date("2026-07-11")` yields UTC midnight, which reads as
	// "yesterday" against a local-midnight `today` west of UTC, wrongly
	// rejecting today.
	it("accepts today's date", () => {
		expect(() => validateMoveOutDate("2026-07-11")).not.toThrow();
	});

	it("accepts a future date", () => {
		expect(() => validateMoveOutDate("2026-07-12")).not.toThrow();
	});

	it("rejects a past date", () => {
		expect(() => validateMoveOutDate("2026-07-10")).toThrow(
			"Move out date cannot be in the past",
		);
	});

	it("rejects an empty string", () => {
		expect(() => validateMoveOutDate("")).toThrow("Move out date is required");
	});

	it("rejects a malformed date", () => {
		expect(() => validateMoveOutDate("not-a-date")).toThrow(
			"Invalid date format",
		);
	});

	it("rejects an overflow date", () => {
		expect(() => validateMoveOutDate("2026-13-40")).toThrow(
			"Invalid date format",
		);
	});
});
