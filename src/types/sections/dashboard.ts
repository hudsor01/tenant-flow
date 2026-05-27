// Dashboard Section Types

import type { KpiBentoRowProps } from "#components/dashboard/components/kpi-helpers";
import type {
	MonthlyRevenuePoint,
	TimeSeriesDataPoint,
} from "#types/analytics";

export interface DashboardProps {
	// Phase 3 KPI bento row data (consumed by <KpiBentoRow {...kpiData} />)
	kpiData: KpiBentoRowProps;

	// Phase 4 CHART-01 — Revenue area chart series (30d + 6mo windows)
	monthlyRevenue: TimeSeriesDataPoint[];
	monthlyRevenue6mo: MonthlyRevenuePoint[];

	// Phase 4 CHART-02 — Occupancy donut input (narrowed from UnitStats;
	// the donut consumes only the 3 fields it needs).
	units: { occupied: number; vacant: number; total: number };

	// Property performance
	propertyPerformance: PropertyPerformanceItem[];

	// Recent activity (optional for simplified dashboard)
	activities?: DashboardActivityItem[];

	// Expiring leases (optional for simplified dashboard)
	expiringLeases?: ExpiringLeaseItem[];

	// Callbacks (optional)
	onViewProperty?: (propertyId: string) => void;
	onViewLease?: (leaseId: string) => void;
	onViewPayment?: (paymentId: string) => void;
	onViewMaintenance?: (requestId: string) => void;
	onExportAnalytics?: () => void;
	onDateRangeChange?: (range: DateRange) => void;
}

export interface PropertyPerformanceItem {
	id: string;
	name: string;
	address: string;
	totalUnits: number;
	occupiedUnits: number;
	occupancyRate: number;
	monthlyRevenue: number;
	openMaintenance: number;
}

export interface DashboardActivityItem {
	id: string;
	type: "payment" | "maintenance" | "lease" | "tenant";
	title: string;
	description: string;
	timestamp: string;
	entityId: string;
	status?: "success" | "warning" | "error" | "info";
}

export interface ExpiringLeaseItem {
	id: string;
	tenantName: string;
	propertyName: string;
	unitNumber: string;
	endDate: string;
	daysUntilExpiry: number;
	rentAmount: number;
}

export interface DateRange {
	start: string;
	end: string;
	preset?: "week" | "month" | "quarter" | "year" | "custom";
}
