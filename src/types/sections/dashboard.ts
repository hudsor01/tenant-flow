// Dashboard Section Types

import type { KpiBentoRowProps } from "#components/dashboard/components/kpi-helpers";

export interface DashboardProps {
	// Phase 3 KPI bento row data (consumed by <KpiBentoRow {...kpiData} />)
	kpiData: KpiBentoRowProps;

	// Revenue trend data
	revenueTrend: RevenueTrendPoint[];

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

export interface RevenueTrendPoint {
	month: string;
	revenue: number;
	projected?: number;
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
