"use client";

import * as Sentry from "@sentry/nextjs";
import type { PostgrestError } from "@supabase/supabase-js";
import type { DefaultOptions, DehydratedState } from "@tanstack/react-query";
import {
	focusManager,
	HydrationBoundary,
	keepPreviousData,
	onlineManager,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import type { Persister } from "@tanstack/react-query-persist-client";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createLogger } from "#lib/frontend-logger";
import { createQueryErrorHandlers } from "./query-error-handler";

function isClientError(error: unknown): boolean {
	if (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		"message" in error &&
		"details" in error
	) {
		const postgrestError = error as PostgrestError;
		return /^4/.test(postgrestError.code ?? "");
	}
	return false;
}

import { buildPersistOptions, createIdbPersister } from "./query-persistence";

const logger = createLogger({ component: "QueryProvider" });
const queryErrorHandlers = createQueryErrorHandlers(logger);

interface QueryProviderProps {
	children: ReactNode;
	dehydratedState?: DehydratedState;
}

export function QueryProvider({
	children,
	dehydratedState,
}: QueryProviderProps) {
	const [persister, setPersister] = useState<Persister | null>(null);
	const [isPersistenceReady, setIsPersistenceReady] = useState(false);
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						// Structural sharing for automatic re-render optimization
						structuralSharing: true,

						// Stale time - data is fresh for 5 minutes
						staleTime: 5 * 60 * 1000,

						// Cache time - unused data kept in cache for 10 minutes
						gcTime: 10 * 60 * 1000,

						// Advanced retry logic with jittered exponential backoff
						retry: queryErrorHandlers.retry,
						retryDelay: queryErrorHandlers.retryDelay,

						// Smart refetch behavior
						refetchOnWindowFocus: true,
						refetchOnReconnect: "always",
						refetchOnMount: true,

						// Network mode for offline support
						networkMode: "online",

						// Throw errors in render (better error boundaries)
						throwOnError: false,

						// Keep previous data during refetch (official v5 helper)
						placeholderData: keepPreviousData,
					},
					mutations: {
						// Network mode
						networkMode: "online",

						// Global mutation cache
						gcTime: 5 * 60 * 1000,

						// Global mutation events
						onSuccess: queryErrorHandlers.onMutationSuccess,
						onError: queryErrorHandlers.onMutationError,
					},
				},
			}),
	);

	// Configure focus and online managers for advanced UX
	useEffect(() => {
		// Focus manager: refetch queries when window regains focus
		focusManager.setEventListener((handleFocus) => {
			if (typeof window !== "undefined") {
				const handleFocusIn = () => handleFocus(true);
				const handleFocusOut = () => handleFocus(false);

				window.addEventListener("focus", handleFocusIn);
				window.addEventListener("blur", handleFocusOut);

				return () => {
					window.removeEventListener("focus", handleFocusIn);
					window.removeEventListener("blur", handleFocusOut);
				};
			}
			return () => {}; // No-op cleanup for SSR
		});

		// Online manager: pause/resume queries based on network status
		onlineManager.setEventListener((setOnline) => {
			if (typeof window !== "undefined") {
				const handleOnline = () => setOnline(true);
				const handleOffline = () => setOnline(false);

				window.addEventListener("online", handleOnline);
				window.addEventListener("offline", handleOffline);

				// Set initial online status
				setOnline(navigator.onLine);

				return () => {
					window.removeEventListener("online", handleOnline);
					window.removeEventListener("offline", handleOffline);
				};
			}
			return () => {}; // No-op cleanup for SSR
		});
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		let cancelled = false;

		const initializePersister = async () => {
			const idbPersister = await createIdbPersister(logger, QUERY_CACHE_KEY);
			if (cancelled) return;

			if (idbPersister) {
				setPersister(idbPersister);
				setIsPersistenceReady(true);
				return;
			}

			setIsPersistenceReady(false);
		};

		void initializePersister();

		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (
			typeof window === "undefined" ||
			process.env.NODE_ENV === "production"
		) {
			return;
		}

		const defaults = queryClient.getDefaultOptions();
		window.__TENANTFLOW_QUERY_DEFAULTS__ = defaults as Pick<
			DefaultOptions,
			"queries" | "mutations"
		>;
		window.__TENANTFLOW_QUERY_CLIENT__ = queryClient;
		window.__TENANTFLOW_QUERY_CACHE_KEY__ = QUERY_CACHE_KEY;

		return () => {
			delete window.__TENANTFLOW_QUERY_DEFAULTS__;
			delete window.__TENANTFLOW_QUERY_CLIENT__;
			delete window.__TENANTFLOW_QUERY_CACHE_KEY__;
		};
	}, [queryClient]);

	// Capture query and mutation errors to Sentry
	useEffect(() => {
		// Capture query errors to Sentry (skip expected 4xx client errors)
		const queryUnsubscribe = queryClient.getQueryCache().subscribe((event) => {
			if (event.type === "updated" && event.query.state.status === "error") {
				const error = event.query.state.error;
				// 4xx errors are expected (auth errors, validation, not found) - not bugs
				if (isClientError(error)) return;
				Sentry.captureException(error, {
					tags: { source: "react-query" },
					contexts: {
						react_query: {
							queryKey: JSON.stringify(event.query.queryKey),
							queryHash: event.query.queryHash,
						},
					},
				});
			}
		});

		// Capture mutation errors to Sentry (skip expected 4xx client errors)
		const mutationUnsubscribe = queryClient
			.getMutationCache()
			.subscribe((event) => {
				if (
					event.type === "updated" &&
					event.mutation.state.status === "error"
				) {
					const error = event.mutation.state.error;
					// 4xx errors are expected (validation, conflicts) - not bugs
					if (isClientError(error)) return;
					Sentry.captureException(error, {
						tags: { source: "react-query-mutation" },
						contexts: {
							react_query: {
								mutationKey: event.mutation.options.mutationKey
									? JSON.stringify(event.mutation.options.mutationKey)
									: undefined,
							},
						},
					});
				}
			});

		return () => {
			queryUnsubscribe();
			mutationUnsubscribe();
		};
	}, [queryClient]);

	const hydrateContent = (
		<HydrationBoundary state={dehydratedState}>{children}</HydrationBoundary>
	);

	if (persister && isPersistenceReady) {
		return (
			<PersistQueryClientProvider
				client={queryClient}
				persistOptions={buildPersistOptions({
					persister,
					maxAge: QUERY_CACHE_MAX_AGE,
					buster: QUERY_CACHE_BUSTER,
				})}
			>
				{hydrateContent}
			</PersistQueryClientProvider>
		);
	}

	// Conditional rendering based on persister availability
	return (
		<QueryClientProvider client={queryClient}>
			{hydrateContent}
		</QueryClientProvider>
	);
}

const QUERY_CACHE_KEY = "tenantflow-query-cache";
// Bump when a persisted query's return shape changes (CLAUDE.md, Data layer).
// v2: financialQueries.balanceSheet returns BalanceSheetResult
// ({ status, sheet }), not ApiResponse<BalanceSheetData>; a v1 entry read back
// from IndexedDB is neither shape the page knows and rendered as a $0 sheet.
// v3: the rent-ledger statements and rent received. financialQueries.
// incomeStatement and .cashFlow return IncomeStatementResult / CashFlowResult
// ({ status, statement | report }), not ApiResponse; reportAnalyticsQueries.
// yearEnd YearEndResult and financialTaxQueries.taxDocuments
// TaxDocumentsResult; propertyQueries.performance a PropertyPerformanceResult;
// and analyticsQueries.propertyPerformancePageData and reportAnalyticsQueries.
// properties name rent received where they held `monthlyRevenue`/`revenue`. A
// v2 entry of any of them would render as an empty or $0 report.
// v4: the computed dashboard, expense and maintenance figures (part M). The
// owner dashboard payload carries portfolioTrends, financialQueries.
// expenseSummary yearOverYear, analyticsQueries.maintenancePageData costs and
// nullable trends, reportAnalyticsQueries.maintenance costs, and the
// financial metrics no cashFlow. A v3 entry would draw the overview's and the
// expenses page's trends as unavailable and crash the insights tab on its
// missing costs until the refetch landed.
// v5: part N's shapes. The owner dashboard payload's metricTrends carry a
// window and a nullable percentChange; analyticsQueries.financialPageData
// carries leaseProfitability (and .leaseProfitability() is new); the income
// statement's expenses, the cash flow's activities and the balance sheet's
// groups lost their no-source lines; reportAnalyticsQueries.yearEnd and
// .properties rows carry `deleted`, .properties lost its literal summary
// counts and trends, .financial is the expenses by vendor alone and .tenants
// the three figures with a source. A v4 entry would read as a sheet, statement
// or table missing the fields the pages now expect until the refetch landed.
// v6: part Q's shapes. financialTaxQueries.taxDocuments' totals are
// totalIncome, totalExpenses and netIncome, and its expense rows lost
// `deductible`, with no Schedule E, depreciation or mortgage-interest fields
// (none had a source); analyticsQueries.propertyPerformancePageData lost its
// visitor analytics and revenue trends and its rows their literal trend, and
// fills its units from the counted units. A v5 entry would read as a page with
// no expenses or net figure, or as "0 of 0" units, until the refetch landed.
// v7: fix round 3 dropped the fields no screen or export reads.
// analyticsQueries' financial, overview, maintenance, occupancy, lease
// profitability and property performance page data, reportKeys.revenue,
// .properties and .yearEnd, and financialQueries.incomeStatement (no gross
// profit, operating income, profit margin or previous period) all lost
// fields. A v6 entry would carry the old shapes until the refetch landed.
const QUERY_CACHE_BUSTER = "tenantflow-cache-v7";
const QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours

declare global {
	interface Window {
		__TENANTFLOW_QUERY_DEFAULTS__?: Pick<
			DefaultOptions,
			"queries" | "mutations"
		>;
		__TENANTFLOW_QUERY_CLIENT__?: QueryClient;
		__TENANTFLOW_QUERY_CACHE_KEY__?: string;
	}
}
