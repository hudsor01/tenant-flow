/**
 * Financial Statements and Tax Documents Type Definitions
 */

import type { Database } from "./supabase";

/**
 * Generic line item for financial statements (balance sheet, cash flow, income)
 * Used for rendering grouped financial data in UI components
 */
export interface FinancialLineItem {
	name: string;
	amount: number;
}

/**
 * Property-level profit & loss summary for income statement views
 * Used across: income-statement.tsx, income-statement-property-table.tsx, profit-loss.tsx
 */
export interface PropertyPL {
	propertyId: string;
	propertyName: string;
	revenue: number;
	expenses: number;
	netIncome: number;
	occupancyRate: number;
}

/**
 * Monthly revenue/expense/income data for trend charts
 * Used across: income-statement.tsx, income-statement-monthly-trend.tsx, profit-loss.tsx
 */
export interface MonthlyData {
	month: string;
	revenue: number;
	expenses: number;
	netIncome: number;
}

/**
 * Income statement revenue breakdown by category
 * Used across: income-statement.tsx, types.ts
 */
export interface IncomeStatementRevenueBreakdown {
	rentCollected: number;
	lateFees: number;
	otherIncome: number;
	total: number;
}

/**
 * Income statement expense breakdown by category
 * Used across: income-statement.tsx, types.ts
 */
export interface IncomeStatementExpenseBreakdown {
	maintenance: number;
	platformFees: number;
	processingFees: number;
	otherExpenses: number;
	total: number;
}

/**
 * Cash flow category (inflow or outflow item with percentage)
 * Used across: cash-flow.tsx, types.ts
 */
export interface CashFlowCategory {
	category: string;
	amount: number;
	percentage: number;
}

/**
 * Monthly cash flow data for trend charts
 * Used across: cash-flow.tsx, types.ts
 */
export interface MonthlyCashFlow {
	month: string;
	inflows: number;
	outflows: number;
	netCashFlow: number;
}

export interface TaxDocumentsData {
	period: { start_date: string; end_date: string; label: string };
	taxYear: number;
	totals: {
		totalIncome: number;
		totalDeductions: number;
		netTaxableIncome: number;
	};
	incomeBreakdown: {
		grossRentalIncome: number;
		totalExpenses: number;
		netOperatingIncome: number;
		depreciation: number;
		mortgageInterest: number;
		taxableIncome: number;
	};
	schedule: {
		scheduleE: {
			grossRentalIncome: number;
			totalExpenses: number;
			depreciation: number;
			netIncome: number;
		};
	};
	expenseCategories: TaxExpenseCategory[];
	propertyDepreciation: TaxPropertyDepreciation[];
}

/**
 * financialTaxQueries.taxDocuments' result. `ledger-unavailable` when the
 * server returns no rent-ledger totals (get_billing_insights before
 * 20261102055449), so no $0 is presented as a tax year's gross income.
 */
export type TaxDocumentsResult =
	| { readonly status: "ready"; readonly documents: TaxDocumentsData }
	| { readonly status: "ledger-unavailable"; readonly taxYear: number };

export interface TaxExpenseCategory {
	category: string;
	amount: number;
	percentage: number;
	deductible: boolean;
	notes?: string;
}

export interface TaxPropertyDepreciation {
	property_id: string;
	propertyName: string;
	propertyValue: number;
	annualDepreciation: number;
	accumulatedDepreciation: number;
	remainingBasis: number;
}

export interface TaxDocumentsQuery {
	taxYear: number;
}

export interface TaxDocumentsMutation {
	taxYear: number;
	data: TaxDocumentsData;
}

export interface TaxReportGenerationRequest {
	user_id: string;
	start_date: string;
	end_date: string;
}

export interface TaxReportGenerationResponse {
	success: boolean;
	message: string;
	reportId?: string;
}

/**
 * The balance sheet as of `period.end_date`, on a rent-ledger basis
 * (financialQueries.balanceSheet). `period.start_date` is January 1 of that
 * date's year, the start of `equity.currentPeriodIncome`.
 */
export interface BalanceSheetData {
	period: { start_date: string; end_date: string; label: string };
	/**
	 * Only the lines the data model records. Nothing records a deposit held
	 * (leases.security_deposit is the amount agreed, not money received), a
	 * property's value or depreciation, a bill owed, an accrual or a loan, so
	 * the sheet has no such lines rather than lines that always read $0.
	 */
	assets: {
		currentAssets: {
			cash: number;
			accountsReceivable: number;
			total: number;
		};
		totalAssets: number;
	};
	liabilities: {
		currentLiabilities: {
			/** Money received that no charge has used yet, held for tenants. */
			tenantCreditBalances: number;
			total: number;
		};
		totalLiabilities: number;
	};
	equity: {
		ownerCapital: number;
		retainedEarnings: number;
		currentPeriodIncome: number;
		totalEquity: number;
	};
	balanceCheck: boolean;
}

/**
 * financialQueries.balanceSheet's result. `ledger-unavailable` when the server
 * returns none of the rent-ledger figures the sheet is built on
 * (get_billing_insights before 20261102055449): the page says so instead of
 * presenting $0 as the owner's cash and receivables.
 */
export type BalanceSheetResult =
	| { readonly status: "ready"; readonly sheet: BalanceSheetData }
	| { readonly status: "ledger-unavailable"; readonly asOfDate: string };

/**
 * The cash flow on a rent-ledger basis (financialQueries.cashFlow): rent
 * received in the period in, the period's expenses out, and the expenses paid
 * as owner funds in, as the balance sheet carries them, so `beginningCash` and
 * `endingCash` are the balance sheet's Cash the day before the period and on
 * its last day.
 */
/**
 * The cash flow on the rent ledger's basis. Only the flows the data model
 * records: no purchase, improvement, loan, mortgage payment or distribution is
 * recorded, so there is no investing section and no such line (each read $0).
 */
export interface CashFlowData {
	period: { start_date: string; end_date: string; label: string };
	operatingActivities: {
		rentalPaymentsReceived: number;
		/** The period's expenses (every one is on a maintenance request). */
		expensesPaid: number;
		netOperatingCash: number;
	};
	financingActivities: {
		/** The same expenses, as the owner's own funds (see the balance sheet). */
		ownerContributions: number;
		netFinancingCash: number;
	};
	netCashFlow: number;
	beginningCash: number;
	endingCash: number;
}

/**
 * financialQueries.cashFlow's result. `ledger-unavailable` when the server
 * returns none of the rent-ledger figures the report is built on
 * (get_billing_insights before 20261102055449).
 */
export type CashFlowResult =
	| { readonly status: "ready"; readonly report: CashFlowData }
	| {
			readonly status: "ledger-unavailable";
			readonly period: CashFlowData["period"];
	  };

/**
 * The income statement on a rent-ledger basis (financialQueries.
 * incomeStatement): revenue is what the ledger charged in the period, by
 * entry date and net of reversals, split by ledger type; opening balances are
 * not revenue (the balance sheet carries them in owner capital).
 */
export interface IncomeStatementData {
	period: { start_date: string; end_date: string; label: string };
	revenue: {
		/** Rent charged. */
		rentalIncome: number;
		/** Late fees charged. */
		lateFeesIncome: number;
		/** Manual charges. */
		otherIncome: number;
		/** Credits issued: zero or negative. */
		creditsIssued: number;
		totalRevenue: number;
	};
	/**
	 * The period's expenses: one line, as the expenses page counts them
	 * (get_expense_summary). The data model has no expense category (a
	 * "category" is a vendor name, and every expense is on a maintenance
	 * request), so there is no split by type to show.
	 */
	expenses: {
		totalExpenses: number;
	};
	grossProfit: number;
	operatingIncome: number;
	netIncome: number;
	profitMargin: number;
	previousPeriod?: {
		netIncome: number;
		change: number;
		changePercent: number;
	};
}

/**
 * financialQueries.incomeStatement's result. `ledger-unavailable` when the
 * server returns none of the rent-ledger figures the statement is built on
 * (get_billing_insights before 20261102055449): the page says so instead of
 * presenting $0 as the period's revenue.
 */
export type IncomeStatementResult =
	| { readonly status: "ready"; readonly statement: IncomeStatementData }
	| {
			readonly status: "ledger-unavailable";
			readonly period: IncomeStatementData["period"];
	  };

export interface FinancialPropertyPerformance {
	property_id: string;
	property_name: string;
	occupancy_rate: number; // percentage (0-100)
	total_revenue: number;
	total_expenses: number;
	net_income: number;
	timeframe: string;
}

export interface PropertyOccupancyData {
	property_id: string;
	property_name: string;
	period: string;
	occupancy_rate: number; // percentage (0-100)
	total_units: number;
	occupied_units: number;
	vacant_units: number;
}

export interface PropertyFinancialData {
	property_id: string;
	property_name: string;
	timeframe: string;
	total_revenue: number;
	total_expenses: number;
	net_income: number;
	profit_margin: number; // percentage
}

export interface PropertyMaintenanceData {
	property_id: string;
	property_name: string;
	timeframe: string;
	total_requests: number;
	completed_requests: number;
	total_cost: number;
	average_cost_per_request: number;
}

// Database types for analytics processing
export type AnalyticsMaintenanceRequest =
	Database["public"]["Tables"]["maintenance_requests"]["Row"] & {
		expenses?: Database["public"]["Tables"]["expenses"]["Row"][];
	};

export type AnalyticsUnit = Database["public"]["Tables"]["units"]["Row"] & {
	leases?: AnalyticsLease[];
	maintenance_requests?: AnalyticsMaintenanceRequest[];
};

export type AnalyticsLease = Database["public"]["Tables"]["leases"]["Row"];

export type AnalyticsProperty =
	Database["public"]["Tables"]["properties"]["Row"] & {
		units?: AnalyticsUnit[];
	};

// Simplified types for query results (what Supabase actually returns)
export interface QueryLease {
	id: string;
	lease_status: string;
	start_date: string;
	end_date: string;
}

export interface QueryUnit {
	id: string;
	status: string;
	leases?: QueryLease[];
}

export interface QueryProperty {
	id: string;
	name: string;
	units?: QueryUnit[];
}

// Detailed query types for performance/financial analytics
// (extends-only marker interface — preserves typing parity with QueryLease while
// leaving room for future detail-only fields without touching callers.)
export type DetailedQueryLease = QueryLease;

export interface DetailedQueryUnit extends QueryUnit {
	leases?: DetailedQueryLease[];
	maintenance_requests?: DetailedQueryMaintenanceRequest[];
}

export interface DetailedQueryMaintenanceRequest {
	id: string;
	status: string;
	created_at: string | null;
	estimated_cost: number | null;
	completed_at: string | null;
	expenses?: {
		amount: number;
		expense_date: string;
	}[];
}

export interface DetailedQueryProperty extends QueryProperty {
	units?: DetailedQueryUnit[];
}

export interface MaintenanceQueryUnit {
	id: string;
	maintenance_requests?: DetailedQueryMaintenanceRequest[];
}

export interface MaintenanceQueryProperty {
	id: string;
	name: string;
	units?: MaintenanceQueryUnit[];
}
