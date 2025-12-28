/**
 * OwnerDashboard Component Tests (TDD)
 *
 * Tests for the main owner dashboard component that displays:
 * - 4 metric cards with sparklines (Occupancy, Tenants, Revenue, Maintenance)
 * - Revenue trend bar chart
 * - Quick actions panel
 * - Date range filtering
 * - Export functionality (CSV/PDF)
 * - Empty state for new users
 * - Loading skeleton
 */

import { render, screen } from '#test/utils/test-render'
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

// Mock useInViewport hook to always return visible
vi.mock('#components/deferred-section', () => ({
	DeferredSection: ({
		children,
		fallback: _fallback,
		priority
	}: {
		children: React.ReactNode
		fallback: React.ReactNode
		priority?: boolean
	}) => (priority ? children : children),
	useInViewport: () => [{ current: null }, true] // Always visible for tests
}))

// Mock React's Activity component (React 19.2 feature)
vi.mock('react', async () => {
	const actual = await vi.importActual('react')
	return {
		...actual,
		// Activity component just renders children in tests
		Activity: ({ children }: { children: React.ReactNode; mode?: string }) =>
			children
	}
})

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
		property: 'Test Property 1',
		address_line1: '123 Main St',
		totalUnits: 10,
		occupiedUnits: 8,
		occupancyRate: 80,
		monthlyRevenue: 1600000
	},
	{
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
		// Default mock for property performance
		mockUsePropertyPerformance.mockReturnValue(
			createMockQueryResult({ data: mockPropertyPerformance }) as ReturnType<
				typeof ownerDashboardHooks.usePropertyPerformance
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

			const { container } = render(<OwnerDashboard />)

			// Should show skeleton elements (Skeleton component uses animate-pulse class)
			const skeletons = container.querySelectorAll('.animate-pulse')
			expect(skeletons.length).toBeGreaterThan(0)
		})

		it('renders skeleton for stat cards during loading', () => {
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

			const { container } = render(<OwnerDashboard />)

			// Should have 4 skeleton stat cards
			const statCardSkeletons = container.querySelectorAll('.grid .bg-card')
			expect(statCardSkeletons.length).toBe(4)
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

			render(<OwnerDashboard />)

			const ctaButton = screen.getByRole('link', {
				name: /Add Your First Property/i
			})
			expect(ctaButton).toBeInTheDocument()
			expect(ctaButton).toHaveAttribute('href', '/properties/new')
		})
	})

	describe('Metric Cards Display', () => {
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
		})

		it('renders all four metric cards', () => {
			render(<OwnerDashboard />)

			expect(screen.getByText('Occupancy')).toBeInTheDocument()
			expect(screen.getByText('Tenants')).toBeInTheDocument()
			// Revenue appears twice (metric card and chart legend), so use getAllByText
			expect(screen.getAllByText('Revenue').length).toBeGreaterThanOrEqual(1)
			// Maintenance appears twice (metric card and quick actions), so use getAllByText
			expect(screen.getAllByText('Maintenance').length).toBeGreaterThanOrEqual(
				1
			)
		})

		it('displays occupancy rate with percentage', () => {
			render(<OwnerDashboard />)

			expect(screen.getByText('92%')).toBeInTheDocument()
		})

		it('displays tenant count', () => {
			render(<OwnerDashboard />)

			expect(screen.getByText('45')).toBeInTheDocument()
		})

		it('formats revenue with K suffix for thousands', () => {
			render(<OwnerDashboard />)

			// $47,250 should display as $47.3K
			expect(screen.getByText('$47.3K')).toBeInTheDocument()
		})

		it('displays maintenance count', () => {
			render(<OwnerDashboard />)

			expect(screen.getByText('4')).toBeInTheDocument()
		})

		it('shows trend indicators with percentage change', () => {
			render(<OwnerDashboard />)

			// Occupancy trend (+3%)
			expect(screen.getByText('+3%')).toBeInTheDocument()
			// Revenue trend (+13%)
			expect(screen.getByText('+13%')).toBeInTheDocument()
		})
	})

	describe('Revenue Chart', () => {
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
		})

		it('renders revenue overview chart section', () => {
			render(<OwnerDashboard />)

			expect(screen.getByText('Revenue Overview')).toBeInTheDocument()
			expect(
				screen.getByText('Monthly revenue for the past 6 months')
			).toBeInTheDocument()
		})

		it('renders chart container', () => {
			const { container } = render(<OwnerDashboard />)

			// Chart container uses h-[360px] class
			expect(container.querySelector('.h-\\[360px\\]')).toBeInTheDocument()
		})
	})

	describe('Quick Actions', () => {
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
		})

		it('renders quick actions section', () => {
			render(<OwnerDashboard />)

			expect(screen.getByText('Quick Actions')).toBeInTheDocument()
		})

		it('renders Add Property action with correct link', () => {
			render(<OwnerDashboard />)

			const addPropertyLink = screen.getByRole('link', {
				name: /Add Property/i
			})
			expect(addPropertyLink).toHaveAttribute('href', '/properties/new')
		})

		it('renders Invite Tenant action with correct link', () => {
			render(<OwnerDashboard />)

			const inviteTenantLink = screen.getByRole('link', {
				name: /Invite Tenant/i
			})
			expect(inviteTenantLink).toHaveAttribute('href', '/tenants/new')
		})

		it('renders Create Lease action with correct link', () => {
			render(<OwnerDashboard />)

			const createLeaseLink = screen.getByRole('link', {
				name: /Create Lease/i
			})
			expect(createLeaseLink).toHaveAttribute('href', '/leases/new')
		})

		it('renders New Request action with correct link', () => {
			render(<OwnerDashboard />)

			const newRequestLink = screen.getByRole('link', {
				name: /New Request.*Create maintenance request/i
			})
			expect(newRequestLink).toHaveAttribute('href', '/maintenance/new')
		})
	})

	describe('Header', () => {
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
		})

		it('renders dashboard title', () => {
			render(<OwnerDashboard />)

			expect(
				screen.getByRole('heading', { name: 'Dashboard' })
			).toBeInTheDocument()
		})

		it('renders portfolio overview subtitle', () => {
			render(<OwnerDashboard />)

			expect(screen.getByText('Portfolio overview')).toBeInTheDocument()
		})

		it('renders tour button', () => {
			render(<OwnerDashboard />)

			expect(screen.getByRole('button', { name: /Tour/i })).toBeInTheDocument()
		})
	})

	describe('Date Range Filtering', () => {
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
		})

		it('renders date range filter presets', () => {
			render(<OwnerDashboard />)

			// Check for date range preset buttons on desktop
			expect(screen.getByText('7D')).toBeInTheDocument()
			expect(screen.getByText('30D')).toBeInTheDocument()
			expect(screen.getByText('90D')).toBeInTheDocument()
			expect(screen.getByText('6M')).toBeInTheDocument()
			expect(screen.getByText('1Y')).toBeInTheDocument()
		})

		it('renders custom date range button', () => {
			render(<OwnerDashboard />)

			expect(
				screen.getByRole('button', { name: /Custom/i })
			).toBeInTheDocument()
		})
	})

	describe('Export Functionality', () => {
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
		})

		it('renders export button', () => {
			render(<OwnerDashboard />)

			// Multiple export buttons may exist in different sections
			const exportButtons = screen.getAllByRole('button', { name: /Export/i })
			expect(exportButtons.length).toBeGreaterThan(0)
		})
	})

	describe('Overview Section', () => {
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
		})

		it('renders OVERVIEW section heading', () => {
			render(<OwnerDashboard />)

			expect(screen.getByText('Overview')).toBeInTheDocument()
		})
	})

	describe('Error Boundary', () => {
		it('renders fallback UI when child component throws', () => {
			// Mock a component that throws
			mockUseDashboardStats.mockImplementation(() => {
				throw new Error('Test error')
			})
			mockUseDashboardCharts.mockReturnValue(
				createMockQueryResult({
					data: undefined
				}) as ReturnType<typeof ownerDashboardHooks.useDashboardCharts>
			)

			render(<OwnerDashboard />)

			expect(screen.getByText('Unable to load dashboard')).toBeInTheDocument()
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
		})

		it('renders stat cards in a grid', () => {
			const { container } = render(<OwnerDashboard />)

			const grid = container.querySelector('.grid.grid-cols-2')
			expect(grid).toBeInTheDocument()
		})

		it('renders chart and quick actions in flex layout', () => {
			const { container } = render(<OwnerDashboard />)

			const flexContainer = container.querySelector(
				'.flex.flex-col.lg\\:flex-row'
			)
			expect(flexContainer).toBeInTheDocument()
		})
	})
})
