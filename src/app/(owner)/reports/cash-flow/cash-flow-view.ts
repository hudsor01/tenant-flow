import { EXPENSES_LABEL } from "#lib/reports/statement-labels";
import type {
	CashFlowCategory,
	CashFlowData,
} from "#types/financial-statements";

/**
 * Everything the cash-flow report renders, derived once from the cached
 * `financialQueries.cashFlow` response. The page renders it and the CSV export
 * writes it, so the file always holds what is on screen.
 */
export interface CashFlowView {
	openingBalance: number;
	netCashFlow: number;
	closingBalance: number;
	inflowItems: CashFlowCategory[];
	outflowItems: CashFlowCategory[];
	totalInflows: number;
	totalOutflows: number;
	netOperatingCash: number;
	netFinancingCash: number;
}

/**
 * Every line with an amount, one below zero included: rent received is the
 * ledger's collected total as of the period's end less as of the day before
 * it, and a reversal is dated the day it is posted, so a period whose
 * reversals outweigh its receipts has negative rent received (OD-9). Shares
 * (and the page's bars) are over the positive lines only; a negative line has
 * none.
 */
function withShares(
	items: { category: string; amount: number }[],
): CashFlowCategory[] {
	const shown = items.filter((i) => i.amount !== 0);
	const positive = shown.reduce(
		(sum, i) => (i.amount > 0 ? sum + i.amount : sum),
		0,
	);
	return shown.map((i) => ({
		...i,
		percentage:
			i.amount > 0 && positive > 0 ? (i.amount / positive) * 100 : null,
	}));
}

export function buildCashFlowView(
	data: CashFlowData | undefined,
): CashFlowView {
	// Rent received from the rent ledger, and the expenses paid, which the
	// balance sheet carries as the owner's own funds (financialQueries.cashFlow).
	const totalInflows = data
		? data.operatingActivities.rentalPaymentsReceived +
			data.financingActivities.ownerContributions
		: 0;
	const totalOutflows = data
		? Math.abs(data.operatingActivities.expensesPaid)
		: 0;
	const inflowItems = data
		? withShares([
				{
					category: "Rent Received",
					amount: data.operatingActivities.rentalPaymentsReceived,
				},
				{
					category: "Owner Funds for Expenses",
					amount: data.financingActivities.ownerContributions,
				},
			])
		: [];
	// One label for expenses on the income statement and here (EXPENSES_LABEL).
	const outflowItems = data
		? withShares([
				{
					category: EXPENSES_LABEL,
					amount: Math.abs(data.operatingActivities.expensesPaid),
				},
			])
		: [];

	return {
		openingBalance: data?.beginningCash || 0,
		netCashFlow: data?.netCashFlow || 0,
		closingBalance: data?.endingCash || 0,
		inflowItems,
		outflowItems,
		// From the data, not the listed lines: they tie, and a total never
		// depends on which lines the list shows.
		totalInflows,
		totalOutflows,
		netOperatingCash: data?.operatingActivities.netOperatingCash || 0,
		netFinancingCash: data?.financingActivities.netFinancingCash || 0,
	};
}
