import { format } from "date-fns";
import { describe, expect, it } from "vitest";
import { startOfMonthsBack } from "#components/reports/reports-utils";

const iso = (date: Date) => format(date, "yyyy-MM-dd");

describe("startOfMonthsBack", () => {
	it("returns the first day of the target month (no month-end overflow)", () => {
		// Jan 31 minus 2 months must land on Nov 1, not spill into Dec.
		// The buggy ordering (setMonth before pinning the day) would produce
		// Dec 1 because Nov has only 30 days and Date normalizes Nov 31 forward.
		expect(iso(startOfMonthsBack(new Date(2026, 0, 31), 2))).toBe("2025-11-01");
	});

	it("pins the day before shifting so a short target month cannot overflow", () => {
		// Mar 31 minus 1 month must land on Feb 1. The buggy ordering (setMonth
		// before pinning the day) sets the month to Feb while the day is still
		// 31; Feb 2026 has 28 days, so Date normalizes Feb 31 -> Mar 3, and the
		// later setDate(1) then wrongly yields Mar 1.
		expect(iso(startOfMonthsBack(new Date(2026, 2, 31), 1))).toBe("2026-02-01");
	});

	it("is unaffected by the day-of-month for mid-month dates", () => {
		expect(iso(startOfMonthsBack(new Date(2026, 6, 10), 2))).toBe("2026-05-01");
	});

	it("crosses the year boundary correctly", () => {
		// Feb 28 minus 3 months -> Nov 1 of the prior year.
		expect(iso(startOfMonthsBack(new Date(2026, 1, 28), 3))).toBe("2025-11-01");
	});
});
