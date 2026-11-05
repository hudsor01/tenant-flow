/**
 * Financial Query Keys & Options
 * Query factories for the financial statements and the expense summary.
 *
 * The three statements are on one basis, the rent ledger, so they tie:
 * - get_billing_insights as of a date (end_date_param alone, 20261102055449)
 *   for every ledger figure: the balance sheet's as of its date, the income
 *   statement's and the cash flow's as of a period's end less as of the day
 *   before it (the rows dated in the period)
 * - get_expense_summary for expense data
 * Scheduled rent (get_dashboard_stats' revenue) is in none of them: it is not
 * money, and CLAUDE.md forbids summing it with the ledger's.
 *
 * The expense list and tax documents are in expense-keys.ts.
 */

import { queryOptions } from "@tanstack/react-query";
import { formatLocalYmd, parseLocalYmd } from "#lib/formatters/date";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { jsonObjectOrEmpty } from "#lib/rpc-shape";
import { parseStatedWindow } from "#lib/stated-window";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import type {
	ExpenseCategorySummary,
	ExpenseYearOverYear,
} from "#types/analytics";
import type {
	BalanceSheetData,
	BalanceSheetResult,
	CashFlowData,
	CashFlowResult,
	IncomeStatementData,
	IncomeStatementResult,
} from "#types/financial-statements";
import { expenseVendorLabel } from "../../../../supabase/functions/_shared/tax-year-reports";

export interface ExpenseSummaryData {
	categories: ExpenseCategorySummary[];
	monthly_totals: Array<{ month: string; amount: number }>;
	total_amount: number;
	monthly_average: number;
	yearOverYear: ExpenseYearOverYear;
}

/**
 * get_expense_summary's year over year (20261102184502): ready only beside
 * the prior period it states. The body before returns the change as the
 * literal null with no period, which is no figure.
 */
function mapExpenseYearOverYear(summary: unknown): ExpenseYearOverYear {
	const s = jsonObjectOrEmpty<Record<string, unknown>>(summary, {});
	const priorPeriod = parseStatedWindow(s["year_over_year_prior_period"]);
	const change = s["year_over_year_change"];
	if (priorPeriod === null) return { status: "unavailable" };
	return {
		status: "ready",
		change:
			typeof change === "number" && Number.isFinite(change) ? change : null,
		priorPeriod,
	};
}

const CACHE = { staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000 } as const;

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

/**
 * What the rent ledger had charged as of a date, by type, for the income
 * statement: the four by-type keys get_billing_insights returns with
 * end_date_param alone (20261102055449), and openingTotal. With it they sum to
 * chargedTotal, the balance sheet's figure. Dollars.
 */
interface LedgerCharges {
	/** rentChargedTotal. */
	readonly rent: number;
	/** lateFeeChargedTotal. */
	readonly lateFees: number;
	/** manualChargedTotal. */
	readonly manual: number;
	/** creditTotal: zero or negative. */
	readonly credits: number;
}

/**
 * Narrow a get_billing_insights payload to the income statement's figures;
 * null when any is missing (the body before 20261102055449), so none of them
 * reaches the statement as $0.
 */
function mapLedgerCharges(data: unknown): LedgerCharges | null {
	const raw = jsonObjectOrEmpty<Record<string, unknown>>(data, {});
	const {
		rentChargedTotal,
		lateFeeChargedTotal,
		manualChargedTotal,
		creditTotal,
	} = raw;
	if (
		typeof rentChargedTotal !== "number" ||
		typeof lateFeeChargedTotal !== "number" ||
		typeof manualChargedTotal !== "number" ||
		typeof creditTotal !== "number"
	) {
		return null;
	}
	return {
		rent: rentChargedTotal,
		lateFees: lateFeeChargedTotal,
		manual: manualChargedTotal,
		credits: creditTotal,
	};
}

/**
 * The calendar day before a local YYYY-MM-DD date: the as-of date a period's
 * figures are differenced against, so the period counts its first day.
 */
function dayBefore(ymd: string): string {
	const date = parseLocalYmd(ymd);
	if (!date) throw new Error(`Invalid statement date: ${ymd}`);
	date.setDate(date.getDate() - 1);
	return formatLocalYmd(date);
}

/** A statement period's `period` block. */
function statementPeriod(params: { start_date: string; end_date: string }) {
	return {
		start_date: params.start_date,
		end_date: params.end_date,
		label: `${params.start_date} to ${params.end_date}`,
	};
}

/**
 * Read the ledger as of a period's end and as of the day before it starts,
 * and the period's expenses: the three calls the income statement and the
 * cash flow make, the balance sheet's, over the period. Errors surface.
 */
async function fetchLedgerPeriod(
	userId: string,
	params: { start_date: string; end_date: string },
	what: string,
) {
	const supabase = createClient();
	const [endResult, beforeResult, expenseResult] = await Promise.all([
		supabase.rpc("get_billing_insights", {
			owner_id_param: userId,
			end_date_param: params.end_date,
		}),
		supabase.rpc("get_billing_insights", {
			owner_id_param: userId,
			end_date_param: dayBefore(params.start_date),
		}),
		supabase.rpc("get_expense_summary", {
			p_user_id: userId,
			p_start_date: params.start_date,
			p_end_date: params.end_date,
		}),
	]);
	if (endResult.error) handlePostgrestError(endResult.error, `${what} ledger`);
	if (beforeResult.error)
		handlePostgrestError(beforeResult.error, `${what} ledger`);
	if (expenseResult.error)
		handlePostgrestError(expenseResult.error, `${what} expenses`);
	return {
		end: endResult.data,
		before: beforeResult.data,
		expenses: expenseResult.data,
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
 *     No other asset line: nothing records a deposit received
 *       (leases.security_deposit is the amount agreed, not money held) or a
 *       property's value or depreciation, so the sheet shows none rather than
 *       $0 lines.
 *   Liabilities
 *     Tenant Credit Balances = creditBalanceTotal: money received that no charge
 *       has used yet (a lease paid ahead or overpaid), which the owner holds for
 *       the tenant.
 *     No other liability line: nothing records a bill owed, a deposit held, an
 *       accrual or a loan.
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
				total: totalAssets,
			},
			totalAssets,
		},
		liabilities: {
			currentLiabilities: {
				tenantCreditBalances,
				total: tenantCreditBalances,
			},
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

/**
 * The income statement on a rent-ledger basis, for a period.
 *
 * Revenue is what the ledger charged in the period: each by-type figure as of
 * the period's end less the same as of the day before it starts, so every
 * charge counts in the period of its ledger entry date, a reversal (a row like
 * any other, net of the charge it reverses within its type) in its own, and a
 * credit lowers revenue. Opening balances are not revenue: money owed before
 * the ledger began, which the balance sheet carries in owner capital.
 * Expenses are the period's (get_expense_summary), one line: there is no
 * category to split them by.
 *
 * It ties to the balance sheet by construction: the by-type figures and
 * openingTotal partition chargedTotal, so this net income for January 1 to a
 * date is the balance sheet's Year-to-Date Income as of it, and for any start
 * before the ledger to December 31 its Retained Earnings the year after.
 */
function buildLedgerIncomeStatement(input: {
	period: IncomeStatementData["period"];
	end: LedgerCharges;
	before: LedgerCharges;
	expenses: number;
}): IncomeStatementData {
	const { end, before } = input;
	const rentalIncome = toCents(end.rent - before.rent);
	const lateFeesIncome = toCents(end.lateFees - before.lateFees);
	const otherIncome = toCents(end.manual - before.manual);
	const creditsIssued = toCents(end.credits - before.credits);
	const totalRevenue = toCents(
		rentalIncome + lateFeesIncome + otherIncome + creditsIssued,
	);
	const totalExpenses = toCents(input.expenses);
	const net = toCents(totalRevenue - totalExpenses);
	return {
		period: input.period,
		revenue: {
			rentalIncome,
			lateFeesIncome,
			otherIncome,
			creditsIssued,
			totalRevenue,
		},
		expenses: { totalExpenses },
		netIncome: net,
	};
}

/**
 * The cash flow on a rent-ledger basis, for a period.
 *
 * Cash is the balance sheet's: money recorded as received on the ledger, which
 * no expense is drawn from (the data model records no account an expense was
 * paid from), so the balance sheet carries every expense as the owner's own
 * money put in. On that basis:
 *   Operating: rent received in the period (collectedTotal as of its end less
 *     as of the day before it: every receipt by received date, a reversal on
 *     the day it was posted) in, the period's expenses out.
 *   Financing: the same expenses in, as owner funds.
 *   No investing section and no purchase, improvement, loan, mortgage or
 *   distribution line: the data model records none of them.
 *   Net cash flow is the rent received, and the opening and closing balances
 *   are the balance sheet's Cash the day before the period and on its last
 *   day.
 */
function buildLedgerCashFlow(input: {
	period: CashFlowData["period"];
	end: LedgerPosition;
	before: LedgerPosition;
	expenses: number;
}): CashFlowData {
	const beginningCash = toCents(input.before.collected);
	const endingCash = toCents(input.end.collected);
	const rentReceived = toCents(endingCash - beginningCash);
	const expensesPaid = toCents(input.expenses);
	return {
		period: input.period,
		operatingActivities: {
			rentalPaymentsReceived: rentReceived,
			expensesPaid,
			netOperatingCash: toCents(rentReceived - expensesPaid),
		},
		financingActivities: {
			ownerContributions: expensesPaid,
			netFinancingCash: expensesPaid,
		},
		netCashFlow: rentReceived,
		beginningCash,
		endingCash,
	};
}

/**
 * Rent received in a calendar year, from the rent ledger: collectedTotal as of
 * December 31 of the year less as of December 31 of the year before, so every
 * receipt counts in the year it was received and a reversal in the year it
 * was posted (cash basis, the year-end report's and the tax documents'). null
 * when the server returns no ledger totals (get_billing_insights before
 * 20261102055449), so no $0 reaches a tax figure. Dollars.
 */
export async function fetchRentReceivedInYear(
	userId: string,
	year: number,
	what: string,
): Promise<number | null> {
	const supabase = createClient();
	const [atYearEnd, atPriorYearEnd] = await Promise.all([
		supabase.rpc("get_billing_insights", {
			owner_id_param: userId,
			end_date_param: `${year}-12-31`,
		}),
		supabase.rpc("get_billing_insights", {
			owner_id_param: userId,
			end_date_param: `${year - 1}-12-31`,
		}),
	]);
	if (atYearEnd.error) handlePostgrestError(atYearEnd.error, `${what} ledger`);
	if (atPriorYearEnd.error)
		handlePostgrestError(atPriorYearEnd.error, `${what} ledger`);
	const end = jsonObjectOrEmpty<Record<string, unknown>>(atYearEnd.data, {});
	const before = jsonObjectOrEmpty<Record<string, unknown>>(
		atPriorYearEnd.data,
		{},
	);
	if (
		typeof end.collectedTotal !== "number" ||
		typeof before.collectedTotal !== "number"
	) {
		return null;
	}
	return toCents(end.collectedTotal - before.collectedTotal);
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
						yearOverYear: { status: "unavailable" },
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
						category: expenseVendorLabel(c.category),
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
					yearOverYear: mapExpenseYearOverYear(data),
				};
			},
			...CACHE,
		}),

	incomeStatement: (params: { start_date: string; end_date: string }) =>
		queryOptions({
			queryKey: financialKeys.incomeStatement(params),
			queryFn: async (): Promise<IncomeStatementResult> => {
				const user = await getCachedUser();
				if (!user?.id) throw new Error("Not authenticated");
				const period = statementPeriod(params);
				const { end, before, expenses } = await fetchLedgerPeriod(
					user.id,
					params,
					"income statement",
				);
				const atEnd = mapLedgerCharges(end);
				const atStart = mapLedgerCharges(before);
				if (atEnd === null || atStart === null) {
					return { status: "ledger-unavailable", period };
				}
				return {
					status: "ready",
					statement: buildLedgerIncomeStatement({
						period,
						end: atEnd,
						before: atStart,
						expenses: mapExpenseTotal(expenses),
					}),
				};
			},
			...CACHE,
		}),

	cashFlow: (params: { start_date: string; end_date: string }) =>
		queryOptions({
			queryKey: financialKeys.cashFlow(params),
			queryFn: async (): Promise<CashFlowResult> => {
				const user = await getCachedUser();
				if (!user?.id) throw new Error("Not authenticated");
				const period = statementPeriod(params);
				const { end, before, expenses } = await fetchLedgerPeriod(
					user.id,
					params,
					"cash flow",
				);
				const atEnd = mapLedgerPosition(end);
				const atStart = mapLedgerPosition(before);
				if (atEnd === null || atStart === null) {
					return { status: "ledger-unavailable", period };
				}
				return {
					status: "ready",
					report: buildLedgerCashFlow({
						period,
						end: atEnd,
						before: atStart,
						expenses: mapExpenseTotal(expenses),
					}),
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
