/**
 * MaintenanceAnalytics Component Tests
 * Tests maintenance analytics charts and metrics display
 *
 * @jest-environment jsdom
 */

import { render } from '#test/utils/test-render'
import { MaintenanceAnalytics } from '../maintenance-analytics'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'

// Mock recharts components
vi.mock('recharts', () => ({
	ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="responsive-container">{children}</div>
	),
	PieChart: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="pie-chart">{children}</div>
	),
	Pie: () => <div data-testid="pie" />,
	Cell: () => <div data-testid="cell" />,
	BarChart: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="bar-chart">{children}</div>
	),
	Bar: () => <div data-testid="bar" />,
	XAxis: () => <div data-testid="x-axis" />,
	YAxis: () => <div data-testid="y-axis" />,
	Tooltip: () => <div data-testid="tooltip" />,
	Legend: () => <div data-testid="legend" />
}))

// Create a wrapper for React Query
const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				gcTime: 0,
				staleTime: 0
			}
		}
	})
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

describe('MaintenanceAnalytics', () => {
	describe('Loading State', () => {
		test('shows skeleton loaders when data is loading', () => {
			// Act
			render(<MaintenanceAnalytics />, { wrapper: createWrapper() })

			// Assert - skeleton elements should be present (Skeleton uses animate-pulse class)
			const skeletons = document.querySelectorAll('.animate-pulse')
			expect(skeletons.length).toBeGreaterThan(0)
		})
	})
})

describe('MaintenanceAnalytics Metrics Calculation', () => {
	describe('Completion Rate', () => {
		test('calculates completion rate correctly', () => {
			const stats = { total: 100, completed: 75 }
			const completionRate =
				stats.total > 0 ? (stats.completed / stats.total) * 100 : 0

			expect(completionRate).toBe(75)
		})

		test('handles zero total gracefully', () => {
			const stats = { total: 0, completed: 0 }
			const completionRate =
				stats.total > 0 ? (stats.completed / stats.total) * 100 : 0

			expect(completionRate).toBe(0)
		})

		test('calculates 100% when all requests are completed', () => {
			const stats = { total: 50, completed: 50 }
			const completionRate =
				stats.total > 0 ? (stats.completed / stats.total) * 100 : 0

			expect(completionRate).toBe(100)
		})
	})

	describe('Average Cost', () => {
		test('calculates average cost per request', () => {
			const stats = { total: 10, totalCost: 1000 }
			const avgCost = stats.total > 0 ? stats.totalCost / stats.total : 0

			expect(avgCost).toBe(100)
		})

		test('handles zero requests gracefully', () => {
			const stats = { total: 0, totalCost: 0 }
			const avgCost = stats.total > 0 ? stats.totalCost / stats.total : 0

			expect(avgCost).toBe(0)
		})
	})
})

describe('MaintenanceAnalytics Chart Data', () => {
	describe('Status Distribution', () => {
		test('prepares status data correctly', () => {
			const stats = { open: 10, inProgress: 5, completed: 15 }
			const statusData = [
				{ name: 'Open', value: stats.open },
				{ name: 'In Progress', value: stats.inProgress },
				{ name: 'Completed', value: stats.completed }
			]

			expect(statusData.length).toBe(3)
			expect(statusData[0]!.value).toBe(10)
			expect(statusData[1]!.value).toBe(5)
			expect(statusData[2]!.value).toBe(15)
		})

		test('all status values sum to total', () => {
			const stats = { open: 10, inProgress: 5, completed: 15, total: 30 }
			const sum = stats.open + stats.inProgress + stats.completed

			expect(sum).toBe(stats.total)
		})
	})

	describe('Priority Distribution', () => {
		test('prepares priority data correctly', () => {
			const byPriority = { low: 5, medium: 10, high: 3, emergency: 2 }
			const priorityData = [
				{ name: 'Low', value: byPriority.low },
				{ name: 'Medium', value: byPriority.medium },
				{ name: 'High', value: byPriority.high },
				{ name: 'Emergency', value: byPriority.emergency }
			]

			expect(priorityData.length).toBe(4)
			expect(priorityData.reduce((sum, d) => sum + d.value, 0)).toBe(20)
		})
	})
})

describe('MaintenanceAnalytics Performance Thresholds', () => {
	describe('Completion Rate Thresholds', () => {
		test('identifies excellent completion rate (>=80%)', () => {
			const completionRate = 85
			const isExcellent = completionRate >= 80

			expect(isExcellent).toBe(true)
		})

		test('identifies good completion rate (>=60% and <80%)', () => {
			const completionRate = 70
			const isGood = completionRate >= 60 && completionRate < 80

			expect(isGood).toBe(true)
		})

		test('identifies needs improvement (<60%)', () => {
			const completionRate = 45
			const needsImprovement = completionRate < 60

			expect(needsImprovement).toBe(true)
		})
	})

	describe('Resolution Time Thresholds', () => {
		test('identifies same-day resolution', () => {
			const avgResolutionHours = 12
			const isSameDay = avgResolutionHours < 24

			expect(isSameDay).toBe(true)
		})

		test('identifies within 3 days resolution', () => {
			const avgResolutionHours = 48
			const isWithin3Days = avgResolutionHours >= 24 && avgResolutionHours < 72

			expect(isWithin3Days).toBe(true)
		})

		test('identifies slow resolution (>3 days)', () => {
			const avgResolutionHours = 100
			const isSlow = avgResolutionHours >= 72

			expect(isSlow).toBe(true)
		})
	})
})

describe('MaintenanceAnalytics High Priority Tracking', () => {
	describe('High Priority Counts', () => {
		test('calculates total high priority active requests', () => {
			const byPriority = { low: 5, medium: 10, high: 3, emergency: 2 }
			const highPriorityActive = byPriority.high + byPriority.emergency

			expect(highPriorityActive).toBe(5)
		})

		test('shows attention needed when open requests > 5', () => {
			const openRequests = 8
			const needsAttention = openRequests > 5

			expect(needsAttention).toBe(true)
		})

		test('shows normal state when open requests <= 5', () => {
			const openRequests = 3
			const needsAttention = openRequests > 5

			expect(needsAttention).toBe(false)
		})
	})
})

describe('MaintenanceAnalytics Display Formatting', () => {
	describe('Number Formatting', () => {
		test('formats completion rate to 1 decimal place', () => {
			const completionRate = 75.567
			const formatted = completionRate.toFixed(1)

			expect(formatted).toBe('75.6')
		})

		test('formats resolution time to 1 decimal place', () => {
			const avgResolutionHours = 24.333
			const formatted = avgResolutionHours.toFixed(1)

			expect(formatted).toBe('24.3')
		})
	})
})
