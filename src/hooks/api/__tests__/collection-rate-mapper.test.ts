/**
 * Pin the `get_collection_rate` boundary mapper (LEDGER-08, D-00, D-08).
 *
 * `scheduled` / `collected` are DOLLARS and `rate` is already a 0-100 percent
 * from SQL. The mapper coerces and nothing else — any scaling here would be the
 * v8.0 MONEY-01/02 hundredfold bug reappearing on the dashboard KPI.
 */

import { describe, expect, it } from "vitest";
import { ownerDashboardKeys } from "#hooks/api/query-keys/owner-dashboard-keys";
import { mapCollectionRateRow } from "#hooks/api/use-owner-dashboard-financial";

describe("mapCollectionRateRow", () => {
	it("reads numeric-as-string dollars without scaling them", () => {
		expect(
			mapCollectionRateRow({
				scheduled: "1500.00",
				collected: "1200.50",
				rate: "80.0",
			}),
		).toEqual({ scheduled: 1500, collected: 1200.5, rate: 80 });
	});

	it("does not multiply the already-percent rate", () => {
		const mapped = mapCollectionRateRow({
			scheduled: 2000,
			collected: 1900,
			rate: 95,
		});
		expect(mapped.rate).toBe(95);
		expect(mapped.rate).not.toBe(9500);
	});

	it("keeps an honest zero when nothing is scheduled", () => {
		expect(
			mapCollectionRateRow({ scheduled: 0, collected: 0, rate: 0 }),
		).toEqual({ scheduled: 0, collected: 0, rate: 0 });
	});

	it.each(["scheduled", "collected", "rate"])(
		"throws when '%s' is missing rather than reading it as zero",
		(field) => {
			const row: Record<string, unknown> = {
				scheduled: 1000,
				collected: 900,
				rate: 90,
			};
			delete row[field];
			expect(() => mapCollectionRateRow(row)).toThrow(new RegExp(`'${field}'`));
		},
	);

	it("throws on a non-finite value", () => {
		expect(() =>
			mapCollectionRateRow({ scheduled: "abc", collected: 0, rate: 0 }),
		).toThrow(/scheduled/);
	});
});

describe("ownerDashboardKeys.financial.collectionRate", () => {
	it("nests under the financial branch so ledger mutations flush it", () => {
		expect(ownerDashboardKeys.financial.collectionRate("2026-07")).toEqual([
			"owner-dashboard",
			"financial",
			"collection-rate",
			"2026-07",
		]);
	});

	it("buckets by month so a month rollover cannot serve a stale rate", () => {
		expect(ownerDashboardKeys.financial.collectionRate("2026-07")).not.toEqual(
			ownerDashboardKeys.financial.collectionRate("2026-08"),
		);
	});
});
