/**
 * Dashboard page branch-render mutual-exclusion regression (Phase 6, POLISH-07).
 *
 * `DashboardContent` (src/app/(owner)/dashboard/page.tsx) early-returns in a
 * fixed order: isLoading -> <DashboardLoadingSkeleton/>; statsError||chartsError
 * -> error block; isEmpty -> <DashboardEmptyState/>; else -> <Dashboard/>.
 *
 * This test pins that exactly ONE of skeleton / error / empty / content renders
 * per state, and — the core invariant — that the skeleton and the empty state
 * are NEVER both in the document at the same time (no double-skeleton / no
 * skeleton-over-empty co-render). The branch logic is already correct; this
 * regression-locks it.
 *
 * The three dashboard query hooks are mocked (no network, no auth, no real
 * data). The heavy content/chrome leaves (Dashboard, ExpiringLeasesWidget,
 * onboarding wizard/tour, ErrorBoundary) are stubbed so only the real
 * DashboardLoadingSkeleton and DashboardEmptyState — the subjects under test —
 * render through the actual branch chain.
 */

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// --- Hoisted mock handles (vi.hoisted per CLAUDE.md, referenced inside vi.mock) ---
const hooks = vi.hoisted(() => ({
	useDashboardStats: vi.fn(),
	useDashboardCharts: vi.fn(),
	usePropertyPerformance: vi.fn(),
}));

vi.mock("#hooks/api/use-dashboard-hooks", () => ({
	useDashboardStats: hooks.useDashboardStats,
	useDashboardCharts: hooks.useDashboardCharts,
	usePropertyPerformance: hooks.usePropertyPerformance,
}));

// Next navigation — DashboardContent reads useRouter + useSearchParams.
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
	}),
	useSearchParams: () => ({
		get: () => null,
	}),
}));

// Stub the loaded-content leaf so we don't pull in recharts/DataTable/dynamic
// imports in jsdom. A distinct testid lets us assert the "content" branch.
vi.mock("#components/dashboard/dashboard", () => ({
	Dashboard: () => <div data-testid="dashboard-content-stub" />,
}));

vi.mock("#components/dashboard/expiring-leases-widget", () => ({
	ExpiringLeasesWidget: () => null,
}));

// Onboarding chrome rendered by the default export — render-null stubs.
vi.mock("#components/onboarding/onboarding-wizard", () => ({
	OnboardingWizard: () => null,
}));

vi.mock("#components/tours/owner-onboarding-tour", () => ({
	OwnerOnboardingTour: () => null,
}));

// Error boundary: pass children straight through (no error thrown in these tests).
vi.mock("#components/error-boundary/error-boundary", () => ({
	ErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import DashboardPage from "../page";

// --- Branch-driving hook return shapes ---

function setLoading() {
	hooks.useDashboardStats.mockReturnValue({
		data: undefined,
		isLoading: true,
		isError: false,
	});
	hooks.useDashboardCharts.mockReturnValue({
		data: undefined,
		isLoading: true,
		isError: false,
	});
	hooks.usePropertyPerformance.mockReturnValue({
		data: undefined,
		isLoading: true,
	});
}

function setError() {
	hooks.useDashboardStats.mockReturnValue({
		data: undefined,
		isLoading: false,
		isError: true,
	});
	hooks.useDashboardCharts.mockReturnValue({
		data: undefined,
		isLoading: false,
		isError: false,
	});
	hooks.usePropertyPerformance.mockReturnValue({
		data: undefined,
		isLoading: false,
	});
}

function setEmpty() {
	hooks.useDashboardStats.mockReturnValue({
		data: {
			stats: {
				properties: { total: 0 },
				tenants: { total: 0 },
			},
			metricTrends: null,
		},
		isLoading: false,
		isError: false,
	});
	hooks.useDashboardCharts.mockReturnValue({
		data: { timeSeries: null },
		isLoading: false,
		isError: false,
	});
	hooks.usePropertyPerformance.mockReturnValue({
		data: [],
		isLoading: false,
	});
}

function setContent() {
	hooks.useDashboardStats.mockReturnValue({
		data: {
			stats: {
				properties: { total: 3 },
				tenants: { total: 5 },
				units: { occupied: 4, vacant: 1, total: 5 },
			},
			metricTrends: null,
		},
		isLoading: false,
		isError: false,
	});
	hooks.useDashboardCharts.mockReturnValue({
		data: {
			timeSeries: { monthlyRevenue: [], monthlyRevenue6mo: [] },
		},
		isLoading: false,
		isError: false,
	});
	hooks.usePropertyPerformance.mockReturnValue({
		data: [],
		isLoading: false,
	});
}

// --- Branch presence probes (stable, mutually-distinct per state) ---

const skeleton = () => document.querySelectorAll('[data-slot="skeleton"]');
const emptyState = () => screen.queryByText("Welcome to TenantFlow");
const errorState = () => screen.queryByText("Unable to load dashboard data");
const content = () => screen.queryByTestId("dashboard-content-stub");

describe("DashboardContent branch render (POLISH-07)", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("renders ONLY the skeleton in the loading state", () => {
		setLoading();
		render(<DashboardPage />);

		expect(skeleton().length).toBeGreaterThan(0);
		expect(emptyState()).toBeNull();
		expect(errorState()).toBeNull();
		expect(content()).toBeNull();
	});

	it("renders ONLY the error block in the error state", () => {
		setError();
		render(<DashboardPage />);

		expect(errorState()).toBeInTheDocument();
		expect(skeleton()).toHaveLength(0);
		expect(emptyState()).toBeNull();
		expect(content()).toBeNull();
	});

	it("renders ONLY the empty state when loaded with no properties and no tenants", () => {
		setEmpty();
		render(<DashboardPage />);

		expect(emptyState()).toBeInTheDocument();
		expect(skeleton()).toHaveLength(0);
		expect(errorState()).toBeNull();
		expect(content()).toBeNull();
	});

	it("renders ONLY the dashboard content when loaded with data", () => {
		setContent();
		render(<DashboardPage />);

		expect(content()).toBeInTheDocument();
		expect(skeleton()).toHaveLength(0);
		expect(emptyState()).toBeNull();
		expect(errorState()).toBeNull();
	});

	it.each([
		["loading", setLoading],
		["error", setError],
		["empty", setEmpty],
		["content", setContent],
	])(
		"never co-renders the skeleton and the empty state (%s state)",
		(_label, setState) => {
			setState();
			render(<DashboardPage />);

			const skeletonPresent = skeleton().length > 0;
			const emptyPresent = emptyState() !== null;

			// The core mutual-exclusion invariant: the loading skeleton and the
			// empty state are never both mounted simultaneously.
			expect(skeletonPresent && emptyPresent).toBe(false);
		},
	);
});
