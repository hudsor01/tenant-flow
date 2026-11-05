/**
 * Every rent-ledger write invalidates every query that reads the ledger
 * (66.2-39 fix round 3, F107).
 *
 * The statements, the tax documents, the year-end summary, the payment
 * summary, the lease profitability, the property performance page and each
 * property's Performance card read rent received or what is owed from the
 * ledger. The four ledger writes invalidated only the lease's own ledger and
 * the dashboard, so an owner who recorded a receipt and went back to one of
 * those within its staleTime saw the figures from before it.
 *
 * Each key below comes from its own factory, seeded into the cache; a write
 * must leave every one invalidated and a query that reads no ledger (the blog
 * list) as it was. `LEDGER_READERS` pins the modules in src/hooks/api that
 * call a ledger-backed RPC or fetcher, so a new reader fails here until its
 * keys join the fan-out and this list.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("../query-keys/rent-ledger-mutation-options", () => ({
	rentLedgerMutations: {
		recordReceipt: () => ({ mutationFn: async () => undefined }),
		addLine: () => ({ mutationFn: async () => undefined }),
		startTracking: () => ({ mutationFn: async () => undefined }),
		reverseEntry: () => ({ mutationFn: async () => undefined }),
	},
}));

import { blogQueries } from "../query-keys/blog-keys";
import { financialTaxQueries } from "../query-keys/expense-keys";
import { financialQueries } from "../query-keys/financial-keys";
import { leaseQueries } from "../query-keys/lease-keys";
import { ownerDashboardKeys } from "../query-keys/owner-dashboard-keys";
import { propertyQueries } from "../query-keys/property-keys";
import { rentLedgerQueries } from "../query-keys/rent-ledger-keys";
import { reportAnalyticsQueries } from "../query-keys/report-analytics-keys";
import { analyticsQueries } from "../use-analytics";
import {
	useAddLineMutation,
	useRecordReceiptMutation,
	useReverseEntryMutation,
	useStartTrackingMutation,
} from "../use-rent-ledger";

const LEASE = "11111111-1111-4111-8111-111111111111";
const PERIOD = { start_date: "2026-01-01", end_date: "2026-03-31" };

/** Each ledger-fed query, by the factory that owns its key. */
const LEDGER_FED: ReadonlyArray<readonly [string, readonly unknown[]]> = [
	["ledger summary", rentLedgerQueries.summary(LEASE).queryKey],
	["ledger entries", rentLedgerQueries.entries(LEASE).queryKey],
	["collection rate", ownerDashboardKeys.financial.collectionRate("2026-11")],
	["income statement", financialQueries.incomeStatement(PERIOD).queryKey],
	["cash flow", financialQueries.cashFlow(PERIOD).queryKey],
	["balance sheet", financialQueries.balanceSheet("2026-03-31").queryKey],
	["tax documents", financialTaxQueries.taxDocuments(2025).queryKey],
	["year-end summary", reportAnalyticsQueries.yearEnd(2025).queryKey],
	[
		"property report",
		reportAnalyticsQueries.properties(PERIOD.start_date, PERIOD.end_date)
			.queryKey,
	],
	["payment summary", analyticsQueries.ownerPaymentSummary().queryKey],
	["financial page", analyticsQueries.financialPageData().queryKey],
	["lease profitability", analyticsQueries.leaseProfitability().queryKey],
	[
		"property performance page",
		analyticsQueries.propertyPerformancePageData().queryKey,
	],
	["property Performance card", propertyQueries.performance("p1").queryKey],
];

/** A query no ledger write can change. */
const UNRELATED = blogQueries.related({
	category: "Tips",
	excludeSlug: "a-post",
}).queryKey;

function seeded(): QueryClient {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	for (const [, key] of LEDGER_FED)
		queryClient.setQueryData(key, { seeded: 1 });
	queryClient.setQueryData(UNRELATED, []);
	return queryClient;
}

function wrapperFor(queryClient: QueryClient) {
	return ({ children }: { children: ReactNode }) =>
		createElement(QueryClientProvider, { client: queryClient }, children);
}

function invalidatedAfterWrite(queryClient: QueryClient) {
	return {
		stale: LEDGER_FED.filter(
			([, key]) => !queryClient.getQueryState(key)?.isInvalidated,
		).map(([name]) => name),
		unrelated: queryClient.getQueryState(UNRELATED)?.isInvalidated,
	};
}

describe("a rent-ledger write invalidates every ledger-fed query", () => {
	it("recording a receipt", async () => {
		const queryClient = seeded();
		const { result } = renderHook(() => useRecordReceiptMutation(LEASE), {
			wrapper: wrapperFor(queryClient),
		});
		await result.current.mutateAsync({
			chargeId: "22222222-2222-4222-8222-222222222222",
			leaseId: LEASE,
			amount: 1250,
			method: "check",
			receivedDate: "2026-03-05",
		});
		expect(invalidatedAfterWrite(queryClient)).toEqual({
			stale: [],
			unrelated: false,
		});
	});

	it("adding a line", async () => {
		const queryClient = seeded();
		const { result } = renderHook(() => useAddLineMutation(LEASE), {
			wrapper: wrapperFor(queryClient),
		});
		await result.current.mutateAsync({
			leaseId: LEASE,
			type: "late_fee",
			amount: 50,
			date: "2026-03-06",
			description: "Late fee",
		});
		expect(invalidatedAfterWrite(queryClient)).toEqual({
			stale: [],
			unrelated: false,
		});
	});

	it("reversing an entry", async () => {
		const queryClient = seeded();
		const { result } = renderHook(() => useReverseEntryMutation(LEASE), {
			wrapper: wrapperFor(queryClient),
		});
		await result.current.mutateAsync({
			leaseId: LEASE,
			entryKind: "receipt",
			entryId: "33333333-3333-4333-8333-333333333333",
		});
		expect(invalidatedAfterWrite(queryClient)).toEqual({
			stale: [],
			unrelated: false,
		});
	});

	it("starting tracking, which also refreshes the lease", async () => {
		const queryClient = seeded();
		const leaseKey: readonly unknown[] = leaseQueries.detail(LEASE).queryKey;
		queryClient.setQueryData(leaseKey, { seeded: 1 });
		const { result } = renderHook(() => useStartTrackingMutation(LEASE), {
			wrapper: wrapperFor(queryClient),
		});
		await result.current.mutateAsync({
			leaseId: LEASE,
			startDate: "2026-01-01",
			openingBalance: 0,
		});
		expect(invalidatedAfterWrite(queryClient)).toEqual({
			stale: [],
			unrelated: false,
		});
		expect(queryClient.getQueryState(leaseKey)?.isInvalidated).toBe(true);
	});
});

/** A ledger-backed RPC, or a fetcher built on one, named in source. */
const LEDGER_READ =
	/\b(?:get_billing_insights|get_collection_rate|get_financial_overview|get_property_performance_analytics|get_revenue_trends_optimized|get_lease_ledger(?:_summary)?|fetchRentReceivedInYear|fetchEveryPropertyPerformanceRow)\b/;

/**
 * The modules that read the ledger, with where their keys sit in the fan-out:
 * analytics-keys' revenue fetch (reportQueries.monthlyRevenue) under
 * `reportKeys.all`; expense-keys and financial-keys under `financialKeys.all`;
 * property-keys under `propertyQueries.details()`; property-performance-mappers
 * (read by the report and analytics queries) and report-analytics-keys under
 * `reportKeys.all` and `analyticsQueries.all()`; rent-ledger-keys under
 * `rentLedgerKeys.forLease`; use-analytics under `analyticsQueries.all()`;
 * use-owner-dashboard-financial under `ownerDashboardKeys.all`.
 */
const LEDGER_READERS = [
	"src/hooks/api/query-keys/analytics-keys.ts",
	"src/hooks/api/query-keys/expense-keys.ts",
	"src/hooks/api/query-keys/financial-keys.ts",
	"src/hooks/api/query-keys/property-keys.ts",
	"src/hooks/api/query-keys/property-performance-mappers.ts",
	"src/hooks/api/query-keys/rent-ledger-keys.ts",
	"src/hooks/api/query-keys/report-analytics-keys.ts",
	"src/hooks/api/use-analytics.ts",
	"src/hooks/api/use-owner-dashboard-financial.ts",
];

function productionFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			return entry.name === "__tests__" ? [] : productionFiles(path);
		}
		return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
			? [relative(process.cwd(), path)]
			: [];
	});
}

describe("the ledger readers the fan-out covers", () => {
	it("names every module in src/hooks/api that reads the ledger", () => {
		const readers = productionFiles(join(process.cwd(), "src/hooks/api"))
			.filter((file) =>
				readFileSync(file, "utf8")
					.split("\n")
					.some((line) => {
						const code = line.trim();
						return (
							!code.startsWith("//") &&
							!code.startsWith("*") &&
							!code.startsWith("/*") &&
							LEDGER_READ.test(code)
						);
					}),
			)
			.sort();
		expect(readers).toEqual(LEDGER_READERS);
	});
});
