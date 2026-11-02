/**
 * Financial Query Keys & Options
 * Query factories for the financial statements and the expense summary.
 *
 * Financial data uses existing RPCs:
 * - get_dashboard_stats for the income statement and cash flow revenue
 * - get_expense_summary for expense data
 * - get_billing_insights for the balance sheet's rent-ledger figures
 *
 * The expense list and tax documents are in expense-keys.ts.
 */

import { queryOptions } from "@tanstack/react-query";
import { parseLocalYmd } from "#lib/formatters/date";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { jsonObjectOrEmpty } from "#lib/rpc-shape";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import type { ExpenseCategorySummary } from "#types/analytics";
import type { ApiResponse } from "#types/api-contracts";
import type {
	BalanceSheetData,
	BalanceSheetResult,
	CashFlowData,
	IncomeStatementData,
} from "#types/financial-statements";

export interface ExpenseSummaryData {
	categories: ExpenseCategorySummary[];
	monthly_totals: Array<{ month: string; amount: number }>;
	total_amount: number;
	monthly_average: number;
}

const CACHE = { staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000 } as const;

/**
 * Fetch dashboard + expense RPCs in parallel for authenticated user.
 *
 * When `range` is provided, only the expense side (get_expense_summary) is
 * period-scoped; revenue stays annualized MRR because get_dashboard_stats is
 * point-in-time and the data model has no payment history (see 29-CONTEXT.md).
 */
async function fetchDashAndExpense(
	userId: string,
	range?: { start_date: string; end_date: string },
) {
	const supabase = createClient();
	const [dashResult, expenseResult] = await Promise.all([
		supabase.rpc("get_dashboard_stats", { p_user_id: userId }),
		supabase.rpc(
			"get_expense_summary",
			range
				? {
						p_user_id: userId,
						p_start_date: range.start_date,
						p_end_date: range.end_date,
					}
				: { p_user_id: userId },
		),
	]);
	return { dashResult, expenseResult };
}

/** Extract first dashboard stats row */
function parseDashStats(data: unknown) {
	// get_dashboard_stats RETURNS json (a bare object, supabase.ts `Returns: Json`) —
	// NOT a SETOF/array. supabase-js returns the object directly, so read it as-is
	// (the old `data[0]` was always undefined → every derived value collapsed to 0).
	const stats = data as Record<string, unknown> | null;
	return {
		revenue: stats?.revenue as Record<string, unknown> | undefined,
		units: stats?.units as Record<string, unknown> | undefined,
		// Occupancy lives under `properties.occupancyRate` (camelCase) in the RPC —
		// NOT `units.occupancy_rate`.
		properties: stats?.properties as Record<string, unknown> | undefined,
	};
}

/**
 * The rent ledger as of a date, as get_billing_insights reports it when given
 * only `end_date_param` (20261102055449). Dollars.
 */
interface LedgerPosition {
	/** collectedTotal: every receipt, net of reversals. */
	readonly collected: number;
	/** unpaidTotal: per-lease balances owed, floored at 0. */
	readonly receivable: number;
	/** creditBalanceTotal: per-lease receipts in excess of charges. */
	readonly creditBalances: number;
	/** chargedTotal: every charge, net of reversals and credits. */
	readonly charged: number;
	/** openingTotal: the opening balances among those charges. */
	readonly opening: number;
}

/**
 * Narrow a get_billing_insights payload to the balance sheet's figures. null
 * when any is missing: production's body before 20261102055449 returns none of
 * collectedTotal, creditBalanceTotal, chargedTotal or openingTotal (and a
 * literal 0 for unpaidTotal), and those must not reach the sheet as $0.
 */
function mapLedgerPosition(data: unknown): LedgerPosition | null {
	const raw = jsonObjectOrEmpty<Record<string, unknown>>(data, {});
	const {
		collectedTotal,
		unpaidTotal,
		creditBalanceTotal,
		chargedTotal,
		openingTotal,
	} = raw;
	if (
		typeof collectedTotal !== "number" ||
		typeof unpaidTotal !== "number" ||
		typeof creditBalanceTotal !== "number" ||
		typeof chargedTotal !== "number" ||
		typeof openingTotal !== "number"
	) {
		return null;
	}
	return {
		collected: collectedTotal,
		receivable: unpaidTotal,
		creditBalances: creditBalanceTotal,
		charged: chargedTotal,
		opening: openingTotal,
	};
}

/** get_expense_summary's `total_amount` (dollars); any other shape throws. */
function mapExpenseTotal(data: unknown): number {
	const { total_amount: total } = jsonObjectOrEmpty<Record<string, unknown>>(
		data,
		{},
	);
	if (typeof total !== "number") {
		throw new Error("get_expense_summary returned no total_amount");
	}
	return total;
}

/**
 * get_expense_summary's `p_start_date` defaults to January 1 of the current
 * year and has no "from the beginning" value of its own, so the sheet passes
 * Postgres's own unbounded date to count every expense before a date.
 */
const NO_LOWER_DATE_BOUND = "-infinity";

/** Dollars rounded to the cent, with -0 folded into 0 (it formats "-$0.00"). */
function toCents(amount: number): number {
	return Math.round(amount * 100) / 100 + 0;
}

/**
 * The balance sheet on a rent-ledger basis, as of `asOfDate`.
 *
 * Scheduled rent (get_dashboard_stats' revenue) appears nowhere: it is not
 * money, and CLAUDE.md forbids summing it with the ledger's. Every figure is
 * the ledger as of the end of `asOfDate`, or expenses dated on or before it:
 *
 *   Assets
 *     Cash = collectedTotal: money recorded as received (no expense is drawn
 *       from it: the data model records no account an expense was paid from).
 *     Accounts Receivable = unpaidTotal: what tenants still owe, the Payment
 *       Summary's figure as of the date.
 *     Security Deposits, Property Values, Accumulated Depreciation: 0. Nothing
 *       records a deposit received or a property's value.
 *   Liabilities
 *     Tenant Credit Balances = creditBalanceTotal: money received that no charge
 *       has used yet (a lease paid ahead or overpaid), which the owner holds for
 *       the tenant.
 *     Accounts Payable, Security Deposit Liability, Accrued Expenses, Mortgages
 *       Payable: 0. Nothing records a bill owed, a deposit held or a loan.
 *   Equity
 *     Owner Capital = openingTotal + every expense dated on or before the date.
 *       Opening balances are money owed before the ledger began: brought in,
 *       not earned in it. Expenses are paid from outside Cash, which holds only
 *       rent received, so each is carried as the owner's own money put in.
 *     Retained Earnings = what was charged before the date's year (net of
 *       credits, reversals and opening balances) less the expenses dated then.
 *     Year-to-Date Income = the same for January 1 of the date's year through
 *       the date.
 *
 * The sheet balances by the ledger's own partition, not by a plug:
 * collectedTotal + unpaidTotal - creditBalanceTotal = chargedTotal, so assets
 * less liabilities is chargedTotal, and the three equity lines sum to
 * chargedTotal because each expense enters Owner Capital and leaves an
 * earnings line. `balanceCheck` compares the two sides to the cent.
 */
function buildLedgerBalanceSheet(input: {
	asOfDate: string;
	yearStart: string;
	asOf: LedgerPosition;
	atYearStart: LedgerPosition;
	expensesThisYear: number;
	expensesBefore: number;
}): BalanceSheetData {
	const { asOf, atYearStart, expensesThisYear, expensesBefore } = input;
	const earnedBefore = atYearStart.charged - atYearStart.opening;
	const earnedThisYear = asOf.charged - asOf.opening - earnedBefore;
	const cash = toCents(asOf.collected);
	const accountsReceivable = toCents(asOf.receivable);
	const tenantCreditBalances = toCents(asOf.creditBalances);
	const totalAssets = toCents(cash + accountsReceivable);
	const ownerCapital = toCents(
		asOf.opening + expensesBefore + expensesThisYear,
	);
	const retainedEarnings = toCents(earnedBefore - expensesBefore);
	const currentPeriodIncome = toCents(earnedThisYear - expensesThisYear);
	const totalEquity = toCents(
		ownerCapital + retainedEarnings + currentPeriodIncome,
	);
	return {
		period: {
			start_date: input.yearStart,
			end_date: input.asOfDate,
			label: `As of ${input.asOfDate}`,
		},
		assets: {
			currentAssets: {
				cash,
				accountsReceivable,
				security_deposits: 0,
				total: totalAssets,
			},
			fixedAssets: {
				propertyValues: 0,
				accumulatedDepreciation: 0,
				netPropertyValue: 0,
				total: 0,
			},
			totalAssets,
		},
		liabilities: {
			currentLiabilities: {
				accountsPayable: 0,
				tenantCreditBalances,
				security_depositLiability: 0,
				accruedExpenses: 0,
				total: tenantCreditBalances,
			},
			longTermLiabilities: { mortgagesPayable: 0, total: 0 },
			totalLiabilities: tenantCreditBalances,
		},
		equity: {
			ownerCapital,
			retainedEarnings,
			currentPeriodIncome,
			totalEquity,
		},
		balanceCheck: toCents(totalAssets - tenantCreditBalances) === totalEquity,
	};
}

export const financialKeys = {
	all: ["financials"] as const,
	expenseSummary: () => [...financialKeys.all, "expense-summary"] as const,
	incomeStatement: (params: { start_date: string; end_date: string }) =>
		[...financialKeys.all, "income-statement", params] as const,
	cashFlow: (params: { start_date: string; end_date: string }) =>
		[...financialKeys.all, "cash-flow", params] as const,
	balanceSheet: (asOfDate: string) =>
		[...financialKeys.all, "balance-sheet", asOfDate] as const,
};

export const financialQueries = {
	expenseSummary: () =>
		queryOptions({
			queryKey: financialKeys.expenseSummary(),
			queryFn: async (): Promise<ExpenseSummaryData> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user?.id)
					return {
						categories: [],
						monthly_totals: [],
						total_amount: 0,
						monthly_average: 0,
					};
				const { data, error } = await supabase.rpc("get_expense_summary", {
					p_user_id: user.id,
				});
				if (error) handlePostgrestError(error, "expense summary");
				const s = data as Record<string, unknown> | null;
				return {
					categories: (
						(s?.categories ?? []) as Array<Record<string, unknown>>
					).map((c) => ({
						category: String(c.category ?? ""),
						amount: Number(c.amount ?? 0),
						percentage: Number(c.percentage ?? 0),
					})) as ExpenseCategorySummary[],
					monthly_totals: (
						(s?.monthly_totals ?? []) as Array<Record<string, unknown>>
					).map((m) => ({
						month: String(m.month ?? ""),
						amount: Number(m.amount ?? 0),
					})),
					total_amount: Number(s?.total_amount ?? 0),
					monthly_average: Number(s?.monthly_average ?? 0),
				};
			},
			...CACHE,
		}),

	incomeStatement: (params: { start_date: string; end_date: string }) =>
		queryOptions({
			queryKey: financialKeys.incomeStatement(params),
			queryFn: async (): Promise<ApiResponse<IncomeStatementData>> => {
				const user = await getCachedUser();
				if (!user?.id) {
					const empty: IncomeStatementData = {
						period: {
							start_date: params.start_date,
							end_date: params.end_date,
							label: `${params.start_date} to ${params.end_date}`,
						},
						revenue: {
							rentalIncome: 0,
							lateFeesIncome: 0,
							otherIncome: 0,
							totalRevenue: 0,
						},
						expenses: {
							propertyManagement: 0,
							maintenance: 0,
							utilities: 0,
							insurance: 0,
							propertyTax: 0,
							mortgage: 0,
							other: 0,
							totalExpenses: 0,
						},
						grossProfit: 0,
						operatingIncome: 0,
						netIncome: 0,
						profitMargin: 0,
					};
					return { success: true, data: empty };
				}
				// Only the expense side is period-scoped; revenue remains annualized
				// MRR (get_dashboard_stats is point-in-time — no payment history).
				const { dashResult, expenseResult } = await fetchDashAndExpense(
					user.id,
					{ start_date: params.start_date, end_date: params.end_date },
				);
				if (dashResult.error)
					handlePostgrestError(dashResult.error, "income statement");
				if (expenseResult.error)
					handlePostgrestError(
						expenseResult.error,
						"income statement expenses",
					);
				const { revenue } = parseDashStats(dashResult.data);
				const totalRevenue = Number(revenue?.yearly ?? 0);
				const totalExpenses = Number(
					(expenseResult.data as Record<string, unknown> | null)
						?.total_amount ?? 0,
				);
				const net = totalRevenue - totalExpenses;
				return {
					success: true,
					data: {
						period: {
							start_date: params.start_date,
							end_date: params.end_date,
							label: `${params.start_date} to ${params.end_date}`,
						},
						revenue: {
							rentalIncome: totalRevenue,
							lateFeesIncome: 0,
							otherIncome: 0,
							totalRevenue,
						},
						expenses: {
							propertyManagement: 0,
							maintenance: 0,
							utilities: 0,
							insurance: 0,
							propertyTax: 0,
							mortgage: 0,
							other: totalExpenses,
							totalExpenses,
						},
						grossProfit: net,
						operatingIncome: net,
						netIncome: net,
						profitMargin: totalRevenue > 0 ? (net / totalRevenue) * 100 : 0,
					},
				};
			},
			...CACHE,
		}),

	cashFlow: (params: { start_date: string; end_date: string }) =>
		queryOptions({
			queryKey: financialKeys.cashFlow(params),
			queryFn: async (): Promise<ApiResponse<CashFlowData>> => {
				const user = await getCachedUser();
				if (!user?.id) {
					return {
						success: true,
						data: {
							period: {
								start_date: params.start_date,
								end_date: params.end_date,
								label: `${params.start_date} to ${params.end_date}`,
							},
							operatingActivities: {
								rentalPaymentsReceived: 0,
								operatingExpensesPaid: 0,
								maintenancePaid: 0,
								netOperatingCash: 0,
							},
							investingActivities: {
								propertyAcquisitions: 0,
								propertyImprovements: 0,
								netInvestingCash: 0,
							},
							financingActivities: {
								mortgagePayments: 0,
								loanProceeds: 0,
								ownerContributions: 0,
								ownerDistributions: 0,
								netFinancingCash: 0,
							},
							netCashFlow: 0,
							beginningCash: 0,
							endingCash: 0,
						},
					};
				}
				// Only the expense side is period-scoped; revenue remains annualized
				// MRR (get_dashboard_stats is point-in-time — no payment history).
				const { dashResult, expenseResult } = await fetchDashAndExpense(
					user.id,
					{ start_date: params.start_date, end_date: params.end_date },
				);
				if (dashResult.error)
					handlePostgrestError(dashResult.error, "cash flow");
				if (expenseResult.error)
					handlePostgrestError(expenseResult.error, "cash flow expenses");
				const { revenue } = parseDashStats(dashResult.data);
				const monthlyRevenue = Number(revenue?.monthly ?? 0);
				const monthlyExpenses = Number(
					(expenseResult.data as Record<string, unknown> | null)
						?.monthly_average ?? 0,
				);
				const net = monthlyRevenue - monthlyExpenses;
				return {
					success: true,
					data: {
						period: {
							start_date: params.start_date,
							end_date: params.end_date,
							label: `${params.start_date} to ${params.end_date}`,
						},
						operatingActivities: {
							rentalPaymentsReceived: monthlyRevenue,
							operatingExpensesPaid: monthlyExpenses,
							maintenancePaid: 0,
							netOperatingCash: net,
						},
						investingActivities: {
							propertyAcquisitions: 0,
							propertyImprovements: 0,
							netInvestingCash: 0,
						},
						financingActivities: {
							mortgagePayments: 0,
							loanProceeds: 0,
							ownerContributions: 0,
							ownerDistributions: 0,
							netFinancingCash: 0,
						},
						netCashFlow: net,
						beginningCash: 0,
						endingCash: net,
					},
				};
			},
			...CACHE,
		}),

	balanceSheet: (asOfDate: string) =>
		queryOptions({
			queryKey: financialKeys.balanceSheet(asOfDate),
			queryFn: async (): Promise<BalanceSheetResult> => {
				const user = await getCachedUser();
				if (!user?.id) throw new Error("Not authenticated");
				const year = parseLocalYmd(asOfDate)?.getFullYear();
				if (year === undefined) {
					throw new Error(`Invalid balance sheet date: ${asOfDate}`);
				}
				const yearStart = `${year}-01-01`;
				const priorYearEnd = `${year - 1}-12-31`;
				const supabase = createClient();
				const [asOfResult, priorYearResult, thisYearResult, beforeResult] =
					await Promise.all([
						supabase.rpc("get_billing_insights", {
							owner_id_param: user.id,
							end_date_param: asOfDate,
						}),
						supabase.rpc("get_billing_insights", {
							owner_id_param: user.id,
							end_date_param: priorYearEnd,
						}),
						supabase.rpc("get_expense_summary", {
							p_user_id: user.id,
							p_start_date: yearStart,
							p_end_date: asOfDate,
						}),
						supabase.rpc("get_expense_summary", {
							p_user_id: user.id,
							p_start_date: NO_LOWER_DATE_BOUND,
							p_end_date: priorYearEnd,
						}),
					]);
				if (asOfResult.error)
					handlePostgrestError(asOfResult.error, "balance sheet ledger");
				if (priorYearResult.error)
					handlePostgrestError(priorYearResult.error, "balance sheet ledger");
				if (thisYearResult.error)
					handlePostgrestError(thisYearResult.error, "balance sheet expenses");
				if (beforeResult.error)
					handlePostgrestError(beforeResult.error, "balance sheet expenses");
				const asOf = mapLedgerPosition(asOfResult.data);
				const atYearStart = mapLedgerPosition(priorYearResult.data);
				if (asOf === null || atYearStart === null) {
					return { status: "ledger-unavailable", asOfDate };
				}
				return {
					status: "ready",
					sheet: buildLedgerBalanceSheet({
						asOfDate,
						yearStart,
						asOf,
						atYearStart,
						expensesThisYear: mapExpenseTotal(thisYearResult.data),
						expensesBefore: mapExpenseTotal(beforeResult.data),
					}),
				};
			},
			...CACHE,
		}),
};
