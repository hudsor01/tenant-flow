import type {
	BalanceSheetData,
	FinancialLineItem,
} from "#types/financial-statements";

/** A collapsible group of the Assets or Liabilities card. */
export interface BalanceSheetGroup {
	label: string;
	items: FinancialLineItem[];
	subtotal: number;
}

/**
 * Everything the balance sheet renders, derived once from the cached
 * `financialQueries.balanceSheet` response. The page renders it and the CSV
 * export writes it, so the file always holds what is on screen.
 */
export interface BalanceSheetView {
	totalAssets: number;
	totalLiabilities: number;
	totalEquity: number;
	isBalanced: boolean;
	assetGroups: BalanceSheetGroup[];
	liabilityGroups: BalanceSheetGroup[];
	equityItems: FinancialLineItem[];
}

export function buildBalanceSheetView(
	data: BalanceSheetData | undefined,
): BalanceSheetView {
	if (!data) {
		return {
			totalAssets: 0,
			totalLiabilities: 0,
			totalEquity: 0,
			isBalanced: true,
			assetGroups: [],
			liabilityGroups: [],
			equityItems: [],
		};
	}
	const { currentAssets } = data.assets;
	const { currentLiabilities } = data.liabilities;
	return {
		totalAssets: data.assets.totalAssets || 0,
		totalLiabilities: data.liabilities.totalLiabilities || 0,
		totalEquity: data.equity.totalEquity || 0,
		isBalanced: data.balanceCheck !== false,
		assetGroups: [
			{
				label: "Current Assets",
				items: [
					{ name: "Cash", amount: currentAssets.cash },
					{
						name: "Accounts Receivable",
						amount: currentAssets.accountsReceivable,
					},
				],
				subtotal: currentAssets.total,
			},
		],
		liabilityGroups: [
			{
				label: "Current Liabilities",
				items: [
					{
						name: "Tenant Credit Balances",
						amount: currentLiabilities.tenantCreditBalances,
					},
				],
				subtotal: currentLiabilities.total,
			},
		],
		equityItems: [
			{ name: "Owner Capital", amount: data.equity.ownerCapital },
			{ name: "Retained Earnings", amount: data.equity.retainedEarnings },
			{
				name: "Year-to-Date Income",
				amount: data.equity.currentPeriodIncome,
			},
		],
	};
}
