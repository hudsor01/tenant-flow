import { EXPENSES_LABEL } from "#lib/reports/statement-labels";
import type { IncomeStatementData } from "#types/financial-statements";

/** One breakdown line: its amount and its share of the section total, in %. */
export interface IncomeStatementLine {
	label: string;
	amount: number;
	share: number;
}

/**
 * Everything the income statement renders, derived once from the cached
 * `financialQueries.incomeStatement` response. The page renders it and the
 * CSV export writes it, so the file always holds what is on screen.
 */
export interface IncomeStatementView {
	totalRevenue: number;
	totalExpenses: number;
	netIncome: number;
	/** Net income as a % of revenue; 0 with no revenue. */
	profitMargin: number;
	/** Every revenue line, zero amounts included, as the page lists them. */
	revenueItems: IncomeStatementLine[];
	/** The one expense line, when there were expenses (no category to split). */
	expenseItems: IncomeStatementLine[];
}

function withShares(
	items: { label: string; amount: number }[],
	total: number,
): IncomeStatementLine[] {
	return items.map((item) => ({
		...item,
		share: total > 0 ? (item.amount / total) * 100 : 0,
	}));
}

export function buildIncomeStatementView(
	data: IncomeStatementData | undefined,
): IncomeStatementView {
	const totalRevenue = data?.revenue.totalRevenue || 0;
	const totalExpenses = data?.expenses.totalExpenses || 0;
	const netIncome = data?.netIncome || 0;

	// What the rent ledger charged in the period, by type (financialQueries.
	// incomeStatement); credits issued lower it and are shown negative.
	const revenueItems = withShares(
		[
			{ label: "Rent Charged", amount: data?.revenue.rentalIncome || 0 },
			{ label: "Late Fees Charged", amount: data?.revenue.lateFeesIncome || 0 },
			{ label: "Other Charges", amount: data?.revenue.otherIncome || 0 },
			{ label: "Credits Issued", amount: data?.revenue.creditsIssued || 0 },
		],
		totalRevenue,
	);
	const expenseItems = withShares(
		[{ label: EXPENSES_LABEL, amount: totalExpenses }].filter(
			(item) => item.amount > 0,
		),
		totalExpenses,
	);

	return {
		totalRevenue,
		totalExpenses,
		netIncome,
		profitMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,
		revenueItems,
		expenseItems,
	};
}
