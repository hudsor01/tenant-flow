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
	netInvestingCash: number;
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
	const inflowItems = data
		? withShares([
				{
					category: "Rental Payments Received",
					amount: data.operatingActivities.rentalPaymentsReceived,
				},
				{
					category: "Loan Proceeds",
					amount: data.financingActivities.loanProceeds,
				},
				{
					category: "Owner Contributions",
					amount: data.financingActivities.ownerContributions,
				},
			])
		: [];
	const outflowItems = data
		? withShares([
				{
					category: "Operating Expenses Paid",
					amount: Math.abs(data.operatingActivities.operatingExpensesPaid),
				},
				{
					category: "Maintenance Paid",
					amount: Math.abs(data.operatingActivities.maintenancePaid),
				},
				{
					category: "Property Acquisitions",
					amount: Math.abs(data.investingActivities.propertyAcquisitions),
				},
				{
					category: "Property Improvements",
					amount: Math.abs(data.investingActivities.propertyImprovements),
				},
				{
					category: "Mortgage Payments",
					amount: Math.abs(data.financingActivities.mortgagePayments),
				},
				{
					category: "Owner Distributions",
					amount: Math.abs(data.financingActivities.ownerDistributions),
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
		netInvestingCash: data?.investingActivities.netInvestingCash || 0,
		netFinancingCash: data?.financingActivities.netFinancingCash || 0,
	};
}
