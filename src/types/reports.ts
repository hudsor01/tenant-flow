export interface RevenueData {
	month: string;
	revenue: number;
	expenses: number;
	profit: number;
}

export interface OccupancyMetrics {
	totalUnits: number;
	occupiedUnits: number;
	vacantUnits: number;
	occupancyRate: number;
	byProperty: Array<{
		property_id: string;
		propertyName: string;
		totalUnits: number;
		occupiedUnits: number;
		occupancyRate: number;
	}>;
}

export interface FinancialReport {
	summary: {
		totalIncome: number;
		totalExpenses: number;
		netIncome: number;
		cashFlow: number;
		rentRollOccupancyRate: number;
	};
	monthly: Array<{
		month: string;
		income: number;
		expenses: number;
		net: number;
	}>;
	expenseBreakdown: Array<{
		category: string;
		amount: number;
	}>;
	rentRoll: Array<{
		propertyId: string;
		propertyName: string;
		unitCount: number;
		occupiedUnits: number;
		occupancyRate: number;
		rentPotential: number;
	}>;
}

export interface PropertyReport {
	summary: {
		totalProperties: number;
		totalUnits: number;
		occupiedUnits: number;
		occupancyRate: number;
	};
	byProperty: Array<{
		propertyId: string;
		propertyName: string;
		occupancyRate: number;
		vacantUnits: number;
		revenue: number;
		expenses: number;
		netOperatingIncome: number;
	}>;
	occupancyTrend: Array<{
		month: string;
		occupancyRate: number;
	}>;
	vacancyTrend: Array<{
		month: string;
		vacantUnits: number;
	}>;
}

export interface TenantReport {
	summary: {
		totalTenants: number;
		activeLeases: number;
		leasesExpiringNext90: number;
		turnoverRate: number;
		onTimePaymentRate: number;
	};
	paymentHistory: Array<{
		month: string;
		paymentsReceived: number;
		onTimeRate: number;
	}>;
	leaseExpirations: Array<{
		leaseId: string;
		propertyName: string;
		unitLabel: string;
		endDate: string;
	}>;
	turnover: Array<{
		month: string;
		moveIns: number;
		moveOuts: number;
	}>;
}

/**
 * The maintenance report's figures. No costs: get_maintenance_analytics returns
 * total_cost and average_cost as the literal 0 and monthly_cost and
 * vendor_performance as empty arrays, so the report printed $0.00 and empty
 * cost tables for every owner.
 */
export interface MaintenanceReport {
	summary: {
		totalRequests: number;
		openRequests: number;
		avgResolutionHours: number;
	};
	byStatus: Array<{
		status: string;
		count: number;
	}>;
	byPriority: Array<{
		priority: string;
		count: number;
	}>;
}

export interface YearEndSummary {
	year: number;
	grossRentalIncome: number;
	operatingExpenses: number;
	netIncome: number;
	byProperty: Array<{
		propertyId: string;
		propertyName: string;
		income: number;
		expenses: number;
		netIncome: number;
	}>;
	expenseByCategory: Array<{
		category: string;
		amount: number;
	}>;
}

export interface Year1099Recipient {
	vendorName: string;
	totalPaid: number;
	jobCount: number;
}

export interface Year1099Summary {
	year: number;
	threshold: number;
	recipients: Year1099Recipient[];
	totalReported: number;
}
