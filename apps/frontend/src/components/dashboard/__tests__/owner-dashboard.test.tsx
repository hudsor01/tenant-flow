/**
 * OwnerDashboard Component Tests (TDD)
 *
 * Tests for the main owner dashboard component that displays:
 * - Revenue overview chart
 * - Quick actions panel
 * - Portfolio overview table
 * - Loading skeleton
 * - Empty state for new users
 */

import { screen } from '@testing-library/react'
import { render } from '#test/utils/test-render'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { OwnerDashboard } from '../owner-dashboard'
import * as ownerDashboardHooks from '#hooks/api/use-owner-dashboard'

// Mock the dashboard hooks
vi.mock('#hooks/api/use-owner-dashboard', () => ({
	useDashboardStats: vi.fn(),
	useDashboardCharts: vi.fn(),
	useDashboardActivity: vi.fn(),
	usePropertyPerformance: vi.fn(),
	ownerDashboardKeys: {
		all: ['owner-dashboard'],
		analytics: {
			all: () => ['owner-dashboard', 'analytics'],
			stats: () => ['owner-dashboard', 'analytics', 'stats'],
			activity: () => ['owner-dashboard', 'analytics', 'activity']
		},
		properties: {
			performance: () => ['owner-dashboard', 'properties', 'performance']
		}
	}
}))

// Mock the lease hooks
vi.mock('#hooks/api/use-lease', () => ({
	useExpiringLeases: vi.fn(() => ({
		data: [],
		isLoading: false,
		error: null
	}))
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
	useRouter: vi.fn(() => ({
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn()
	}))
}))

const mockUseDashboardStats = vi.mocked(ownerDashboardHooks.useDashboardStats)
const mockUseDashboardCharts = vi.mocked(ownerDashboardHooks.useDashboardCharts)
const mockUseDashboardActivity = vi.mocked(
	ownerDashboardHooks.useDashboardActivity
)
const mockUsePropertyPerformance = vi.mocked(
	ownerDashboardHooks.usePropertyPerformance
)

// Helper to create complete mock query result with all required TanStack Query properties
function createMockQueryResult<T>(overrides: {
	data?: T
	isLoading?: boolean
	error?: Error | null
	status?: 'pending' | 'error' | 'success'
}) {
	const isLoading = overrides.isLoading ?? false
	const status = overrides.status ?? (isLoading ? 'pending' : 'success')
	return {
		data: overrides.data,
		isLoading,
		error: overrides.error ?? null,
		isError: !!overrides.error,
		isPending: status === 'pending',
		isSuccess: status === 'success',
		status,
		// Additional required properties for UseQueryResult
		isLoadingError: false,
		isRefetchError: false,
		isPlaceholderData: false,
		dataUpdatedAt: Date.now(),
		errorUpdatedAt: 0,
		failureCount: 0,
		failureReason: null,
		errorUpdateCount: 0,
		isFetched: !isLoading,
		isFetchedAfterMount: !isLoading,
		isFetching: isLoading,
		isInitialLoading: isLoading,
		isRefetching: false,
		isStale: false,
		refetch: vi.fn(),
		fetchStatus: isLoading ? 'fetching' : 'idle',
		promise: Promise.resolve(overrides.data as T)
	} as unknown
}

// Sample data for tests - matching DashboardStats and MetricTrend types
const mockStats = {
	properties: {
		total: 5,
		occupied: 4,
		vacant: 1,
		occupancyRate: 80,
		totalMonthlyRent: 5000000,
		averageRent: 1000000
	},
	tenants: {
		total: 48,
		active: 45,
		inactive: 3,
		newThisMonth: 2
	},
	units: {
		total: 28,
		occupied: 25,
		vacant: 2,
		maintenance: 1,
		averageRent: 168750,
		available: 2,
		occupancyRate: 92,
		occupancyChange: 3,
		totalPotentialRent: 4725000,
		totalActualRent: 4218750
	},
	leases: {
		total: 45,
		active: 40,
		expired: 3,
		expiringSoon: 2
	},
	revenue: {
		monthly: 4725000, // In cents ($47,250)
		yearly: 56700000,
		growth: 12.5
	},
	maintenance: {
		total: 16,
		open: 4,
		inProgress: 2,
		completed: 10,
		completedToday: 1,
		avgResolutionTime: 48,
		byPriority: {
			low: 2,
			medium: 6,
			high: 5,
			emergency: 3
		}
	}
}

const mockMetricTrends = {
	occupancyRate: { current: 92, previous: 89, change: 3, percentChange: 3.4 },
	activeTenants: { current: 45, previous: 40, change: 5, percentChange: 12.5 },
	monthlyRevenue: {
		current: 4725000,
		previous: 4200000,
		change: 525000,
		percentChange: 12.5
	},
	openMaintenance: { current: 4, previous: 6, change: -2, percentChange: -33.3 }
}

const mockTimeSeries = {
	occupancyRate: [
		{ date: '2024-07-01', value: 88 },
		{ date: '2024-08-01', value: 89 },
		{ date: '2024-09-01', value: 90 },
		{ date: '2024-10-01', value: 89 },
		{ date: '2024-11-01', value: 91 },
		{ date: '2024-12-01', value: 92 }
	],
	monthlyRevenue: [
		{ date: '2024-07-01', value: 3800000 },
		{ date: '2024-08-01', value: 4200000 },
		{ date: '2024-09-01', value: 3950000 },
		{ date: '2024-10-01', value: 4400000 },
		{ date: '2024-11-01', value: 4600000 },
		{ date: '2024-12-01', value: 4725000 }
	]
}

const mockPropertyPerformance = [
	{
		property_id: 'prop-1',
		property: 'Test Property 1',
		address_line1: '123 Main St',
		totalUnits: 10,
		occupiedUnits: 8,
		occupancyRate: 80,
		monthlyRevenue: 1600000
	},
	{
		property_id: 'prop-2',
		property: 'Test Property 2',
		address_line1: '456 Oak Ave',
		totalUnits: 5,
		occupiedUnits: 5,
		occupancyRate: 100,
		monthlyRevenue: 1000000
	}
]

// Empty stats for new user/empty state tests
const emptyStats = {
	properties: {
		total: 0,
		occupied: 0,
		vacant: 0,
		occupancyRate: 0,
		totalMonthlyRent: 0,
		averageRent: 0
	},
	tenants: {
		total: 0,
		active: 0,
		inactive: 0,
		newThisMonth: 0
	},
	units: {
		total: 0,
		occupied: 0,
		vacant: 0,
		maintenance: 0,
		averageRent: 0,
		available: 0,
		occupancyRate: 0,
		occupancyChange: 0,
		totalPotentialRent: 0,
		totalActualRent: 0
	},
	leases: {
		total: 0,
		active: 0,
		expired: 0,
		expiringSoon: 0
	},
	revenue: {
		monthly: 0,
		yearly: 0,
		growth: 0
	},
	maintenance: {
		total: 0,
		open: 0,
		inProgress: 0,
		completed: 0,
		completedToday: 0,
		avgResolutionTime: 0,
		byPriority: {
			low: 0,
			medium: 0,
			high: 0,
			emergency: 0
		}
	}
}

describe('OwnerDashboard', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		// Reset mock implementations (clearAllMocks only clears calls, not implementations)
		mockUseDashboardStats.mockReset()
		mockUseDashboardCharts.mockReset()
		mockUseDashboardActivity.mockReset()
		mockUsePropertyPerformance.mockReset()
		// Default mock for activity - empty activities
		mockUseDashboardActivity.mockReturnValue(
			createMockQueryResult({ data: { activities: [] } }) as ReturnType<
				typeof ownerDashboardHooks.useDashboardActivity
			>
		)
	})

	describe('Loading State', () => {
		it('renders loading skeleton when data is loading', () => {
			mockUseDashboardStats.mockReturnValue(
				createMockQueryResult({
					data: undefined,
					isLoading: true,
					status: 'pending'
				}) as ReturnType<typeof ownerDashboardHooks.useDashboardStats>
			)
			mockUseDashboardCharts.mockReturnValue(
				createMockQueryResult({
					data: undefined,
					isLoading: true,
					status: 'pending'
				}) as ReturnType<typeof ownerDashboardHooks.useDashboardCharts>
			)
			mockUsePropertyPerformance.mockReturnValue(
				createMockQueryResult({
					data: undefined,
					isLoading: true,
					status: 'pending'
				}) as ReturnType<typeof ownerDashboardHooks.usePropertyPerformance>
			)

			const { container } = render(<OwnerDashboard />)

			// Should show skeleton elements (Skeleton component uses animate-pulse class)
			const skeletons = container.querySelectorAll('.animate-pulse')
			expect(skeletons.length).toBeGreaterThan(0)
		})

		it('renders skeleton for header during loading', () => {
			mockUseDashboardStats.mockReturnValue(
				createMockQueryResult({
					data: undefined,
					isLoading: true,
					status: 'pending'
				}) as ReturnType<typeof ownerDashboardHooks.useDashboardStats>
			)
			mockUseDashboardCharts.mockReturnValue(
				createMockQueryResult({
					data: undefined,
					isLoading: true,
					status: 'pending'
				}) as ReturnType<typeof ownerDashboardHooks.useDashboardCharts>
			)
			mockUsePropertyPerformance.mockReturnValue(
				createMockQueryResult({
					data: undefined,
					isLoading: true,
					status: 'pending'
				}) as ReturnType<typeof ownerDashboardHooks.usePropertyPerformance>
			)

			const { container } = render(<OwnerDashboard />)

			// Should have skeleton elements for header
			const skeletons = container.querySelectorAll('.animate-pulse')
			expect(skeletons.length).toBeGreaterThan(0)
		})
	})

	describe('Empty State', () => {
		it('renders welcome message for new users with no data', () => {
			mockUseDashboardStats.mockReturnValue(
				createMockQueryResult({
					data: {
						stats: emptyStats,
						metricTrends: {
							occupancyRate: null,
							activeTenants: null,
							monthlyRevenue: null,
							openMaintenance: null
						}
					}
				}) as ReturnType<typeof ownerDashboardHooks.useDashboardStats>
			)
			mockUseDashboardCharts.mockReturnValue(
				createMockQueryResult({
					data: {
						timeSeries: {
							occupancyRate: [],
							monthlyRevenue: []
						}
					}
				}) as ReturnType<typeof ownerDashboardHooks.useDashboardCharts>
			)
			mockUsePropertyPerformance.mockReturnValue(
				createMockQueryResult({
					data: []
				}) as ReturnType<typeof ownerDashboardHooks.usePropertyPerformance>
			)

			render(<OwnerDashboard />)

			expect(screen.getByText('Welcome to TenantFlow')).toBeInTheDocument()
			expect(
				screen.getByText(/Get started by adding your first property/)
			).toBeInTheDocument()
		})

		it('shows Add Your First Property CTA in empty state', () => {
			mockUseDashboardStats.mockReturnValue(
				createMockQueryResult({
					data: {
						stats: emptyStats,
						metricTrends: {
							occupancyRate: null,
							activeTenants: null,
							monthlyRevenue: null,
							openMaintenance: null
						}
					}
				}) as ReturnType<typeof ownerDashboardHooks.useDashboardStats>
			)
			mockUseDashboardCharts.mockReturnValue(
				createMockQueryResult({
					data: {
						timeSeries: {
							occupancyRate: [],
							monthlyRevenue: []
						}
					}
				}) as ReturnType<typeof ownerDashboardHooks.useDashboardCharts>
			)
			mockUsePropertyPerformance.mockReturnValue(
				createMockQueryResult({
					data: []
				}) as ReturnType<typeof ownerDashboardHooks.usePropertyPerformance>
			)

			render(<OwnerDashboard />)

			const ctaButton = screen.getByRole('link', {
				name: /Add Your First Property/i
			})
			expect(ctaButton).toBeInTheDocument()
			expect(ctaButton).toHaveAttribute('href', '/properties/new')
		})
	})

	describe('Dashboard Content', () => {
		beforeEach(() => {
			mockUseDashboardStats.mockReturnValue(
				createMockQueryResult({
					data: {
						stats: mockStats,
						metricTrends: mockMetricTrends
					}
				}) as ReturnType<typeof ownerDashboardHooks.useDashboardStats>
			)
			mockUseDashboardCharts.mockReturnValue(
				createMockQueryResult({
					data: {
						timeSeries: mockTimeSeries
					}
				}) as ReturnType<typeof ownerDashboardHooks.useDashboardCharts>
			)
			mockUsePropertyPerformance.mockReturnValue(
				createMockQueryResult({
					data: mockPropertyPerformance
				}) as ReturnType<typeof ownerDashboardHooks.usePropertyPerformance>
			)
		})

		it('renders dashboard title', () => {
			render(<OwnerDashboard />)

			expect(
				screen.getByRole('heading', { name: 'Dashboard' })
			).toBeInTheDocument()
		})

		it('renders Revenue Overview chart section', () => {
			render(<OwnerDashboard />)

			expect(screen.getByText('Revenue Overview')).toBeInTheDocument()
			expect(
				screen.getByText('Monthly revenue for the past 6 months')
			).toBeInTheDocument()
		})

		it('renders Quick Actions section', () => {
			render(<OwnerDashboard />)

			expect(screen.getByText('Quick Actions')).toBeInTheDocument()
		})

		it('renders Add Property action button', () => {
			render(<OwnerDashboard />)

			expect(screen.getByText('Add Property')).toBeInTheDocument()
			expect(screen.getByText('Register a new property')).toBeInTheDocument()
		})

		it('renders Create Lease action button', () => {
			render(<OwnerDashboard />)

			expect(screen.getByText('Create Lease')).toBeInTheDocument()
			expect(
				screen.getByText('Draft a new lease agreement')
			).toBeInTheDocument()
		})

		it('renders Invite Tenant action button', () => {
			render(<OwnerDashboard />)

			expect(screen.getByText('Invite Tenant')).toBeInTheDocument()
			expect(screen.getByText('Send tenant invitation')).toBeInTheDocument()
		})

		it('renders Record Payment action button', () => {
			render(<OwnerDashboard />)

			expect(screen.getByText('Record Payment')).toBeInTheDocument()
			expect(screen.getByText('Log a rent payment')).toBeInTheDocument()
		})

		it('renders New Request action button', () => {
			render(<OwnerDashboard />)

			expect(screen.getByText('New Request')).toBeInTheDocument()
			expect(
				screen.getByText('Create maintenance request')
			).toBeInTheDocument()
		})
	})

	describe('Portfolio Overview Table', () => {
		beforeEach(() => {
			mockUseDashboardStats.mockReturnValue(
				createMockQueryResult({
					data: {
						stats: mockStats,
						metricTrends: mockMetricTrends
					}
				}) as ReturnType<typeof ownerDashboardHooks.useDashboardStats>
			)
			mockUseDashboardCharts.mockReturnValue(
				createMockQueryResult({
					data: {
						timeSeries: mockTimeSeries
					}
				}) as ReturnType<typeof ownerDashboardHooks.useDashboardCharts>
			)
			mockUsePropertyPerformance.mockReturnValue(
				createMockQueryResult({
					data: mockPropertyPerformance
				}) as ReturnType<typeof ownerDashboardHooks.usePropertyPerformance>
			)
		})

		it('renders property data in the table', () => {
			render(<OwnerDashboard />)

			// Check for property names
			expect(screen.getByText('Test Property 1')).toBeInTheDocument()
			expect(screen.getByText('Test Property 2')).toBeInTheDocument()
		})

		it('renders property addresses', () => {
			render(<OwnerDashboard />)

			expect(screen.getByText('123 Main St')).toBeInTheDocument()
			expect(screen.getByText('456 Oak Ave')).toBeInTheDocument()
		})

		it('renders search input for filtering', () => {
			render(<OwnerDashboard />)

			expect(
				screen.getByPlaceholderText('Search properties...')
			).toBeInTheDocument()
		})

		it('renders view mode toggle buttons', () => {
			render(<OwnerDashboard />)

			expect(screen.getByText('Grid')).toBeInTheDocument()
			expect(screen.getByText('Table')).toBeInTheDocument()
		})

		it('renders table headers', () => {
			render(<OwnerDashboard />)

			expect(screen.getByText('Property')).toBeInTheDocument()
			expect(screen.getByText('Units')).toBeInTheDocument()
			expect(screen.getByText('Tenants')).toBeInTheDocument()
			expect(screen.getByText('Lease Status')).toBeInTheDocument()
			expect(screen.getByText('Monthly Rent')).toBeInTheDocument()
		})
	})

	describe('Responsive Layout', () => {
		beforeEach(() => {
			mockUseDashboardStats.mockReturnValue(
				createMockQueryResult({
					data: {
						stats: mockStats,
						metricTrends: mockMetricTrends
					}
				}) as ReturnType<typeof ownerDashboardHooks.useDashboardStats>
			)
			mockUseDashboardCharts.mockReturnValue(
				createMockQueryResult({
					data: {
						timeSeries: mockTimeSeries
					}
				}) as ReturnType<typeof ownerDashboardHooks.useDashboardCharts>
			)
			mockUsePropertyPerformance.mockReturnValue(
				createMockQueryResult({
					data: mockPropertyPerformance
				}) as ReturnType<typeof ownerDashboardHooks.usePropertyPerformance>
			)
		})

		it('renders chart and quick actions in grid layout', () => {
			const { container } = render(<OwnerDashboard />)

			const grid = container.querySelector('.grid.lg\\:grid-cols-4')
			expect(grid).toBeInTheDocument()
		})
	})
})
