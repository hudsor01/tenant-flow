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
	const { currentAssets, fixedAssets } = data.assets;
	const { currentLiabilities, longTermLiabilities } = data.liabilities;
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
					{
						name: "Security Deposits",
						amount: currentAssets.security_deposits,
					},
				],
				subtotal:
					currentAssets.cash +
					currentAssets.accountsReceivable +
					currentAssets.security_deposits,
			},
			{
				label: "Fixed Assets",
				items: [
					{ name: "Property Values", amount: fixedAssets.propertyValues },
					{
						name: "Accumulated Depreciation",
						// Shown as a deduction. `0 - x`, not `-x`: negating 0 gives -0,
						// which formats as "-$0.00" on the page.
						amount: 0 - fixedAssets.accumulatedDepreciation,
					},
					{ name: "Net Property Value", amount: fixedAssets.netPropertyValue },
				],
				subtotal: fixedAssets.netPropertyValue,
			},
		],
		liabilityGroups: [
			{
				label: "Current Liabilities",
				items: [
					{
						name: "Accounts Payable",
						amount: currentLiabilities.accountsPayable,
					},
					{
						name: "Tenant Credit Balances",
						amount: currentLiabilities.tenantCreditBalances,
					},
					{
						name: "Security Deposit Liability",
						amount: currentLiabilities.security_depositLiability,
					},
					{
						name: "Accrued Expenses",
						amount: currentLiabilities.accruedExpenses,
					},
				],
				subtotal:
					currentLiabilities.accountsPayable +
					currentLiabilities.tenantCreditBalances +
					currentLiabilities.security_depositLiability +
					currentLiabilities.accruedExpenses,
			},
			{
				label: "Long-Term Liabilities",
				items: [
					{
						name: "Mortgages Payable",
						amount: longTermLiabilities.mortgagesPayable,
					},
				],
				subtotal: longTermLiabilities.mortgagesPayable,
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
