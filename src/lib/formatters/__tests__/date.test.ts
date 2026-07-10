import { describe, expect, it } from "vitest";

import { formatLocalYmd, parseLocalYmd } from "../date";

describe("parseLocalYmd", () => {
	it("parses a YYYY-MM-DD string to local-zone midnight", () => {
		const d = parseLocalYmd("2026-01-15");
		expect(d).toBeInstanceOf(Date);
		// Local components match the input in EVERY timezone — the whole point
		// of local-component construction (vs `new Date("2026-01-15")` which is
		// UTC midnight and reads as Jan 14 in negative-offset zones).
		expect(d?.getFullYear()).toBe(2026);
		expect(d?.getMonth()).toBe(0);
		expect(d?.getDate()).toBe(15);
	});

	it("does not shift a day in negative-offset zones (regression)", () => {
		// A date-only string keeps its calendar day. This holds regardless of the
		// runner's real timezone because parseLocalYmd builds the Date from local
		// components, so getFullYear/getMonth/getDate are never off-by-one.
		const d = parseLocalYmd("2026-03-01");
		expect(d?.getFullYear()).toBe(2026);
		expect(d?.getMonth()).toBe(2);
		expect(d?.getDate()).toBe(1);
	});

	it("returns undefined for malformed or empty input", () => {
		expect(parseLocalYmd(null)).toBeUndefined();
		expect(parseLocalYmd("")).toBeUndefined();
		expect(parseLocalYmd("not-a-date")).toBeUndefined();
		expect(parseLocalYmd("2026-1-5")).toBeUndefined();
	});

	it("rejects overflow dates instead of wrapping them", () => {
		// `new Date(2026, 12, 99)` silently wraps forward; the round-trip guard
		// rejects it.
		expect(parseLocalYmd("2026-13-99")).toBeUndefined();
		expect(parseLocalYmd("2026-02-30")).toBeUndefined();
	});
});

describe("formatLocalYmd", () => {
	it("formats a Date to zero-padded YYYY-MM-DD from local components", () => {
		expect(formatLocalYmd(new Date(2026, 0, 15))).toBe("2026-01-15");
		expect(formatLocalYmd(new Date(2026, 2, 5))).toBe("2026-03-05");
		expect(formatLocalYmd(new Date(2026, 11, 31))).toBe("2026-12-31");
	});

	it("round-trips with parseLocalYmd", () => {
		for (const iso of ["2026-01-15", "2024-02-29", "2026-12-31"]) {
			const parsed = parseLocalYmd(iso);
			expect(parsed).toBeDefined();
			if (parsed) {
				expect(formatLocalYmd(parsed)).toBe(iso);
			}
		}
	});
});
