/**
 * The dashboard page hands the portfolio each property's fields the portfolio
 * renders, and no others (66.2-39 fix round 4, G17): `dashboard.tsx` derives a
 * row's occupancy from its occupied and total units (`portfolioOccupancy`), so
 * the page's copy of the RPC's occupancy rate was written and read by nothing.
 */

import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { PropertyPerformance } from "#types/core";
import type { DashboardProps } from "#types/sections/dashboard";

const { hooks, dashboardProps } = vi.hoisted(() => ({
	hooks: {
		useDashboardStats: vi.fn(),
		useDashboardCharts: vi.fn(),
		usePropertyPerformance: vi.fn(),
	},
	dashboardProps: vi.fn(),
}));

vi.mock("#hooks/api/use-dashboard-hooks", () => ({
	useDashboardStats: hooks.useDashboardStats,
	useDashboardCharts: hooks.useDashboardCharts,
	usePropertyPerformance: hooks.usePropertyPerformance,
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
	useSearchParams: () => ({ get: () => null }),
}));

vi.mock("#components/dashboard/dashboard", () => ({
	Dashboard: (props: DashboardProps) => {
		dashboardProps(props);
		return null;
	},
}));

vi.mock("#components/dashboard/expiring-leases-widget", () => ({
	ExpiringLeasesWidget: () => null,
}));

vi.mock("#components/dashboard/dashboard-activity-card", () => ({
	DashboardActivityCard: () => null,
}));

vi.mock("#components/onboarding/onboarding-wizard", () => ({
	OnboardingWizard: () => null,
}));

vi.mock("#components/tours/owner-onboarding-tour", () => ({
	OwnerOnboardingTour: () => null,
}));

vi.mock("#components/error-boundary/error-boundary", () => ({
	ErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import DashboardPage from "../page";

const PROPERTY: PropertyPerformance = {
	property: "Maple Court",
	property_id: "p1",
	totalUnits: 4,
	occupiedUnits: 3,
	vacantUnits: 1,
	occupancyRate: 75,
	revenue: 54000,
	monthlyRevenue: 4500,
	potentialRevenue: 6000,
	address_line1: "1 Maple Ave",
	property_type: "multi_unit",
	status: "PARTIAL",
	open_maintenance: 2,
};

describe("the dashboard page's portfolio rows", () => {
	it("pass each property's rendered fields, and not its occupancy rate", () => {
		hooks.useDashboardStats.mockReturnValue({
			data: {
				stats: { properties: { total: 1 }, tenants: { total: 3 } },
				metricTrends: null,
			},
			isLoading: false,
			isError: false,
		});
		hooks.useDashboardCharts.mockReturnValue({
			data: { timeSeries: { monthlyRevenue: [], monthlyRevenue6mo: [] } },
			isLoading: false,
			isError: false,
		});
		hooks.usePropertyPerformance.mockReturnValue({
			data: [PROPERTY],
			isLoading: false,
		});

		render(<DashboardPage />);

		const props: DashboardProps | undefined = dashboardProps.mock.calls[0]?.[0];
		expect(props?.propertyPerformance).toEqual([
			{
				id: "p1",
				name: "Maple Court",
				address: "1 Maple Ave",
				totalUnits: 4,
				occupiedUnits: 3,
				monthlyRevenue: 4500,
				openMaintenance: 2,
			},
		]);
	});
});
