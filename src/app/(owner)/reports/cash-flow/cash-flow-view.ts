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

function withShares(
	items: { category: string; amount: number }[],
): CashFlowCategory[] {
	const shown = items.filter((i) => i.amount > 0);
	const total = shown.reduce((sum, i) => sum + i.amount, 0);
	return shown.map((i) => ({
		...i,
		percentage: total > 0 ? (i.amount / total) * 100 : 0,
	}));
}

export function buildCashFlowView(
	data: CashFlowData | undefined,
): CashFlowView {
	// Rent received from the rent ledger, and the expenses paid, which the
	// balance sheet carries as the owner's own funds (financialQueries.cashFlow).
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
		totalInflows: inflowItems.reduce((sum, i) => sum + i.amount, 0),
		totalOutflows: outflowItems.reduce((sum, i) => sum + i.amount, 0),
		netOperatingCash: data?.operatingActivities.netOperatingCash || 0,
		netFinancingCash: data?.financingActivities.netFinancingCash || 0,
	};
}
