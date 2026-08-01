import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildIncomeStatementDateRange } from "../income-statement-date-range";

describe("buildIncomeStatementDateRange", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns Jan 1 to Dec 31 for yearly", () => {
		expect(buildIncomeStatementDateRange("yearly", "2026")).toEqual({
			start_date: "2026-01-01",
			end_date: "2026-12-31",
		});
	});

	// COMP-03 regression: quarterly end dates must be real calendar days. A
	// hardcoded `-31` produced 2026-06-31 / 2026-09-31, which Postgres rejects
	// (22008), crashing the income statement during Q2/Q3.
	it("emits a valid month-end for Q2 (June has 30 days)", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 4, 15, 12, 0, 0)); // May -> Q2
		expect(buildIncomeStatementDateRange("quarterly", "2026")).toEqual({
			start_date: "2026-04-01",
			end_date: "2026-06-30",
		});
	});

	it("emits a valid month-end for Q3 (September has 30 days)", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 7, 15, 12, 0, 0)); // August -> Q3
		expect(buildIncomeStatementDateRange("quarterly", "2026")).toEqual({
			start_date: "2026-07-01",
			end_date: "2026-09-30",
		});
	});

	it("emits the 31-day month-ends for Q1 and Q4", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 1, 15, 12, 0, 0)); // February -> Q1
		expect(buildIncomeStatementDateRange("quarterly", "2026")).toEqual({
			start_date: "2026-01-01",
			end_date: "2026-03-31",
		});

		vi.setSystemTime(new Date(2026, 10, 15, 12, 0, 0)); // November -> Q4
		expect(buildIncomeStatementDateRange("quarterly", "2026")).toEqual({
			start_date: "2026-10-01",
			end_date: "2026-12-31",
		});
	});

	describe("monthly", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		it("uses the last day of the current month (30-day month)", () => {
			vi.setSystemTime(new Date(2026, 3, 10, 12, 0, 0)); // April
			expect(buildIncomeStatementDateRange("monthly", "2026")).toEqual({
				start_date: "2026-04-01",
				end_date: "2026-04-30",
			});
		});

		it("uses the last day of the current month (31-day month)", () => {
			vi.setSystemTime(new Date(2026, 6, 10, 12, 0, 0)); // July
			expect(buildIncomeStatementDateRange("monthly", "2026")).toEqual({
				start_date: "2026-07-01",
				end_date: "2026-07-31",
			});
		});
	});
});
