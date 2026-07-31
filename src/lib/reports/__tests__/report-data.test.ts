import { readFileSync } from "node:fs";
import { join } from "node:path";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { isMissingRelationError, safeFetch } from "../report-data";

/**
 * D-37 regression pin.
 *
 * `executiveKeyMetricsRows` is module-private, so this scans source rather than
 * calling it — the same mechanism `reports-hub-purity.test.ts` uses, which
 * cannot cover this file because its REPORTS_ROOT is `src/app/(owner)/reports`
 * and this lives under `src/lib/reports`.
 *
 * Without this, the excision was pinned by nothing but a prose comment, while
 * its sibling D-35 excision DID carry an absence assertion
 * (`use-financial-overview.test.ts`: `.not.toContain("accounts_receivable")`).
 * That asymmetry reads as coverage that is not there: re-adding the rows would
 * pass the entire suite and put permanently-zero counts back into a
 * customer-facing generated file on every tier, since `executive-monthly` is
 * deliberately not premium.
 */
const REPORT_DATA_SRC = readFileSync(
	join(process.cwd(), "src/lib/reports/report-data.ts"),
	"utf8",
);

/** Comments are stripped so the doc block explaining the rule cannot satisfy it. */
const REPORT_DATA_CODE = REPORT_DATA_SRC.replace(
	/\/\*[\s\S]*?\*\//g,
	"",
).replace(/\/\/.*$/gm, "");

describe("isMissingRelationError", () => {
	it("returns true for Postgres 42P01 by error code", () => {
		expect(isMissingRelationError({ code: "42P01", message: "anything" })).toBe(
			true,
		);
	});

	it("returns true for 42P01 by message regex (no code)", () => {
		expect(
			isMissingRelationError({
				message: 'relation "public.rent_payments" does not exist',
			}),
		).toBe(true);
	});

	it("matches the message regex case-insensitively", () => {
		expect(
			isMissingRelationError({
				message: 'RELATION "x" DOES NOT EXIST',
			}),
		).toBe(true);
	});

	it("returns false for other Postgres error codes", () => {
		expect(
			isMissingRelationError({ code: "23505", message: "duplicate key" }),
		).toBe(false);
		expect(
			isMissingRelationError({ code: "42501", message: "permission denied" }),
		).toBe(false);
	});

	it("returns false for plain Error objects without 42P01 metadata", () => {
		expect(isMissingRelationError(new Error("network failure"))).toBe(false);
	});

	it("returns false for non-object inputs", () => {
		expect(isMissingRelationError(null)).toBe(false);
		expect(isMissingRelationError(undefined)).toBe(false);
		expect(isMissingRelationError("error string")).toBe(false);
		expect(isMissingRelationError(42)).toBe(false);
	});

	it("does not over-match on similar phrases", () => {
		expect(
			isMissingRelationError({
				message: "function does not exist",
			}),
		).toBe(false);
		expect(
			isMissingRelationError({
				message: "relation rent_payments does not exist", // missing quotes
			}),
		).toBe(false);
	});
});

describe("safeFetch", () => {
	const FALLBACK = { rows: [] as Array<{ id: string }> };

	function makeClient(): QueryClient {
		return new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
	}

	it("returns { data, available: true } on success", async () => {
		const qc = makeClient();
		const result = await safeFetch(
			qc,
			{
				queryKey: ["test", "ok"] as const,
				queryFn: async () => ({ rows: [{ id: "1" }] }),
			},
			FALLBACK,
		);
		expect(result.available).toBe(true);
		expect(result.data).toEqual({ rows: [{ id: "1" }] });
	});

	it("returns fallback + available=false on 42P01", async () => {
		const qc = makeClient();
		const result = await safeFetch(
			qc,
			{
				queryKey: ["test", "missing"] as const,
				queryFn: async () => {
					throw { code: "42P01", message: 'relation "x" does not exist' };
				},
			},
			FALLBACK,
		);
		expect(result.available).toBe(false);
		expect(result.data).toBe(FALLBACK);
	});

	it("re-throws on other errors (not 42P01)", async () => {
		const qc = makeClient();
		await expect(
			safeFetch(
				qc,
				{
					queryKey: ["test", "boom"] as const,
					queryFn: async () => {
						throw new Error("network failure");
					},
				},
				FALLBACK,
			),
		).rejects.toMatchObject({ message: expect.stringContaining("network") });
	});

	it("re-throws on permission-denied (42501), not just any error", async () => {
		const qc = makeClient();
		await expect(
			safeFetch(
				qc,
				{
					queryKey: ["test", "perm"] as const,
					queryFn: async () => {
						throw { code: "42501", message: "permission denied" };
					},
				},
				FALLBACK,
			),
		).rejects.toMatchObject({ code: "42501" });
	});
});

describe("D-37: the permanently-zero payment counts stay excised", () => {
	it.each([
		"Total Payments",
		"Successful Payments",
		"PAYMENTS_FALLBACK",
		"paymentAnalytics",
	])("does not reintroduce %s", (token) => {
		expect(REPORT_DATA_CODE).not.toContain(token);
	});

	it.each([
		"total_payments",
		"successful_payments",
		"payments_by_method",
		"payments_by_status",
	])("does not read the broken snake_case key %s", (key) => {
		// The mapper at report-analytics-keys.ts still parses these off a payload
		// that returns only camelCase, so every lookup resolves undefined. It is
		// still live for other consumers; this file must not become one again.
		expect(REPORT_DATA_CODE).not.toContain(key);
	});

	it("still emits the six honest executive key metrics", () => {
		// Absence assertions alone would also pass against an empty function, so
		// pin what must survive.
		for (const label of [
			"Total Income",
			"Total Expenses",
			"Net Income",
			"Cash Flow",
			"Occupancy Rate",
			"Occupied Units",
		]) {
			expect(REPORT_DATA_CODE).toContain(label);
		}
	});
});
