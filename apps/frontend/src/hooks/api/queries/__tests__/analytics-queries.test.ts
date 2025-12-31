/**
 * Analytics Queries Tests (TDD - Testing CORRECT Behavior)
 *
 * Tests analyticsQueries factory for:
 * - Correct query keys generation
 * - Proper queryFn implementation calling real API endpoints
 * - Data transformation handling
 * - Cache configuration
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockResponse } from '#test/unit-setup'
import { analyticsQueries } from '../analytics-queries'
import type {
	FinancialAnalyticsPageData,
	LeaseAnalyticsPageData,
	MaintenanceInsightsPageData,
	OccupancyAnalyticsPageData,
	PropertyPerformancePageData
} from '@repo/shared/types/analytics-page-data'

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock getApiBaseUrl
vi.mock('#lib/api-config', () => ({
	getApiBaseUrl: () => 'http://localhost:4600'
}))

// Mock Supabase client for auth session
const mockGetSession = vi.fn()
vi.mock('#lib/supabase/client', () => ({
	createClient: () => ({
		auth: {
			getSession: mockGetSession
		}
	})
}))

// Mock data factories
const createMockFinancialData = (): FinancialAnalyticsPageData => ({
	metrics: {
		totalRevenue: 50000,
		totalExpenses: 15000,
		netIncome: 35000,
		cashFlow: 28000,
		profitMargin: 0.7,
		revenueTrend: 5.2,
		expenseTrend: -2.1
	},
	breakdown: {
		revenue: [
			{ label: 'Rent', value: 45000, change: 3.5 },
			{ label: 'Fees', value: 5000, change: 1.2 }
		],
		expenses: [
			{ label: 'Maintenance', value: 8000, change: -1.5 },
			{ label: 'Utilities', value: 2000, change: 0.5 }
		],
		totals: {
			revenue: 50000,
			expenses: 10000,
			netIncome: 40000
		}
	},
	netOperatingIncome: [
		{
			property_id: 'prop-1',
			propertyName: 'Property A',
			noi: 15000,
			revenue: 20000,
			expenses: 5000,
			margin: 0.75
		}
	],
	billingInsights: {
		points: [{ period: '2025-01', invoiced: 5000, paid: 4500, overdue: 500 }],
		totals: { invoiced: 5000, paid: 4500, overdue: 500 }
	},
	invoiceSummary: [
		{ status: 'paid', count: 10, amount: 45000 },
		{ status: 'pending', count: 2, amount: 5000 }
	],
	monthlyMetrics: [
		{
			month: 'Jan',
			revenue: 10000,
			expenses: 4000,
			netIncome: 6000,
			cashFlow: 5500
		}
	],
	leaseAnalytics: [
		{
			lease_id: 'lease-1',
			tenantName: 'John Doe',
			propertyName: 'Property A',
			rent_amount: 2000,
			outstandingBalance: 0,
			profitabilityScore: 95
		}
	]
})

const createMockLeaseData = (): LeaseAnalyticsPageData => ({
	metrics: {
		totalLeases: 18,
		activeLeases: 15,
		expiringSoon: 3,
		totalrent_amount: 30000,
		averageLeaseValue: 2000
	},
	profitability: [],
	renewalRates: [],
	vacancyTrends: [],
	leaseDistribution: [],
	lifecycle: [],
	statusBreakdown: []
})

const createMockMaintenanceData = (): MaintenanceInsightsPageData => ({
	metrics: {
		openRequests: 8,
		inProgressRequests: 5,
		completedRequests: 29,
		averageResponseTimeHours: 3.5,
		totalCost: 5000
	},
	categoryBreakdown: [],
	costTrends: [],
	costBreakdown: [],
	trends: [],
	responseTimes: [],
	preventiveMaintenance: []
})

const createMockOccupancyData = (): OccupancyAnalyticsPageData => ({
	metrics: {
		currentOccupancy: 92,
		averageVacancyDays: 15,
		seasonalPeakOccupancy: 98,
		trend: 2.5
	},
	trends: [],
	propertyPerformance: [],
	seasonalPatterns: [],
	vacancyAnalysis: []
})

const createMockPropertyPerformanceData = (): PropertyPerformancePageData => ({
	metrics: {
		totalProperties: 10,
		totalUnits: 45,
		occupiedUnits: 41,
		averageOccupancy: 0.92,
		totalRevenue: 50000
	},
	performance: [],
	units: [],
	unitStats: [],
	visitorAnalytics: {
		summary: {
			totalVisits: 0,
			totalInquiries: 0,
			totalConversions: 0,
			conversionRate: 0
		},
		timeline: []
	},
	revenueTrends: []
})

describe('analyticsQueries', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockFetch.mockReset()
		mockGetSession.mockReset()

		// Setup default session mock
		mockGetSession.mockResolvedValue({
			data: { session: { access_token: 'test-token' } }
		})
	})

	describe('query keys', () => {
		it('should generate base key for all analytics', () => {
			const key = analyticsQueries.all()
			expect(key).toEqual(['analytics'])
		})

		it('should generate financial key extending base key', () => {
			const key = analyticsQueries.financial()
			expect(key).toEqual(['analytics', 'financial'])
		})

		it('should generate lease key extending base key', () => {
			const key = analyticsQueries.lease()
			expect(key).toEqual(['analytics', 'lease'])
		})

		it('should generate maintenance key extending base key', () => {
			const key = analyticsQueries.maintenance()
			expect(key).toEqual(['analytics', 'maintenance'])
		})

		it('should generate occupancy key extending base key', () => {
			const key = analyticsQueries.occupancy()
			expect(key).toEqual(['analytics', 'occupancy'])
		})

		it('should generate overview key extending base key', () => {
			const key = analyticsQueries.overview()
			expect(key).toEqual(['analytics', 'overview'])
		})

		it('should generate property-performance key extending base key', () => {
			const key = analyticsQueries.propertyPerformance()
			expect(key).toEqual(['analytics', 'property-performance'])
		})

		it('should generate payment-summary key extending base key', () => {
			const key = analyticsQueries.paymentSummary()
			expect(key).toEqual(['analytics', 'payment-summary'])
		})
	})

	describe('financialPageData query', () => {
		it('should call correct API endpoint', async () => {
			const mockData = createMockFinancialData()
			mockFetch.mockResolvedValue(createMockResponse(mockData))

			const options = analyticsQueries.financialPageData()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/analytics/financial/page-data',
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer test-token'
					})
				})
			)
		})

		it('should use correct query key', () => {
			const options = analyticsQueries.financialPageData()
			expect(options.queryKey).toEqual(['analytics', 'financial'])
		})

		it('should have 1 minute staleTime', () => {
			const options = analyticsQueries.financialPageData()
			expect(options.staleTime).toBe(60_000)
		})

		it('should return financial analytics data', async () => {
			const mockData = createMockFinancialData()
			mockFetch.mockResolvedValue(createMockResponse(mockData))

			const options = analyticsQueries.financialPageData()
			const result = await options.queryFn!({} as never)

			expect(result).toMatchObject({
				metrics: expect.objectContaining({
					totalRevenue: 50000,
					netIncome: 35000
				}),
				breakdown: expect.objectContaining({
					revenue: expect.any(Array),
					expenses: expect.any(Array)
				})
			})
		})
	})

	describe('leasePageData query', () => {
		it('should call correct API endpoint', async () => {
			const mockData = createMockLeaseData()
			mockFetch.mockResolvedValue(createMockResponse(mockData))

			const options = analyticsQueries.leasePageData()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/analytics/lease/page-data',
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer test-token'
					})
				})
			)
		})

		it('should use correct query key', () => {
			const options = analyticsQueries.leasePageData()
			expect(options.queryKey).toEqual(['analytics', 'lease'])
		})

		it('should have 1 minute staleTime', () => {
			const options = analyticsQueries.leasePageData()
			expect(options.staleTime).toBe(60_000)
		})
	})

	describe('maintenancePageData query', () => {
		it('should call correct API endpoint', async () => {
			const mockData = createMockMaintenanceData()
			mockFetch.mockResolvedValue(createMockResponse(mockData))

			const options = analyticsQueries.maintenancePageData()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/analytics/maintenance/page-data',
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer test-token'
					})
				})
			)
		})

		it('should use correct query key', () => {
			const options = analyticsQueries.maintenancePageData()
			expect(options.queryKey).toEqual(['analytics', 'maintenance'])
		})

		it('should have 1 minute staleTime', () => {
			const options = analyticsQueries.maintenancePageData()
			expect(options.staleTime).toBe(60_000)
		})
	})

	describe('occupancyPageData query', () => {
		it('should call correct API endpoint', async () => {
			const mockData = createMockOccupancyData()
			mockFetch.mockResolvedValue(createMockResponse(mockData))

			const options = analyticsQueries.occupancyPageData()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/owner/tenants/occupancy-trends',
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer test-token'
					})
				})
			)
		})

		it('should use correct query key', () => {
			const options = analyticsQueries.occupancyPageData()
			expect(options.queryKey).toEqual(['analytics', 'occupancy'])
		})

		it('should have 1 minute staleTime', () => {
			const options = analyticsQueries.occupancyPageData()
			expect(options.staleTime).toBe(60_000)
		})

		it('should handle wrapped data response', async () => {
			const mockData = createMockOccupancyData()
			// API returns { data: OccupancyData }
			mockFetch.mockResolvedValue(createMockResponse({ data: mockData }))

			const options = analyticsQueries.occupancyPageData()
			const result = await options.queryFn!({} as never)

			expect(result.metrics.currentOccupancy).toBe(92)
		})

		it('should handle direct data response', async () => {
			const mockData = createMockOccupancyData()
			// API returns OccupancyData directly
			mockFetch.mockResolvedValue(createMockResponse(mockData))

			const options = analyticsQueries.occupancyPageData()
			const result = await options.queryFn!({} as never)

			expect(result.metrics.currentOccupancy).toBe(92)
		})

		it('should provide default values for missing fields', async () => {
			// API returns partial data
			mockFetch.mockResolvedValue(
				createMockResponse({ metrics: null, trends: null })
			)

			const options = analyticsQueries.occupancyPageData()
			const result = await options.queryFn!({} as never)

			expect(result.metrics).toEqual({
				currentOccupancy: 0,
				averageVacancyDays: 0,
				seasonalPeakOccupancy: 0,
				trend: 0
			})
			expect(result.trends).toEqual([])
		})
	})

	describe('overviewPageData query', () => {
		it('should fetch all analytics data in parallel', async () => {
			const financialData = createMockFinancialData()
			const maintenanceData = createMockMaintenanceData()
			const leaseData = createMockLeaseData()

			mockFetch
				.mockResolvedValueOnce(createMockResponse(financialData))
				.mockResolvedValueOnce(createMockResponse(maintenanceData))
				.mockResolvedValueOnce(createMockResponse(leaseData))

			const options = analyticsQueries.overviewPageData()
			const result = await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledTimes(3)
			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/analytics/financial/page-data',
				expect.anything()
			)
			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/analytics/maintenance/page-data',
				expect.anything()
			)
			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/analytics/lease/page-data',
				expect.anything()
			)

			expect(result).toHaveProperty('financial')
			expect(result).toHaveProperty('maintenance')
			expect(result).toHaveProperty('lease')
		})

		it('should use correct query key', () => {
			const options = analyticsQueries.overviewPageData()
			expect(options.queryKey).toEqual(['analytics', 'overview'])
		})

		it('should have 1 minute staleTime', () => {
			const options = analyticsQueries.overviewPageData()
			expect(options.staleTime).toBe(60_000)
		})

		it('should handle wrapped data responses', async () => {
			const financialData = createMockFinancialData()
			const maintenanceData = createMockMaintenanceData()
			const leaseData = createMockLeaseData()

			mockFetch
				.mockResolvedValueOnce(createMockResponse({ data: financialData }))
				.mockResolvedValueOnce(createMockResponse({ data: maintenanceData }))
				.mockResolvedValueOnce(createMockResponse({ data: leaseData }))

			const options = analyticsQueries.overviewPageData()
			const result = await options.queryFn!({} as never)

			expect(result.financial.metrics.totalRevenue).toBe(50000)
			expect(result.maintenance.metrics.openRequests).toBe(8)
			expect(result.lease.metrics.activeLeases).toBe(15)
		})
	})

	describe('propertyPerformancePageData query', () => {
		it('should call correct API endpoint', async () => {
			const mockData = createMockPropertyPerformanceData()
			mockFetch.mockResolvedValue(createMockResponse(mockData))

			const options = analyticsQueries.propertyPerformancePageData()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/analytics/property-performance/page-data',
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer test-token'
					})
				})
			)
		})

		it('should use correct query key', () => {
			const options = analyticsQueries.propertyPerformancePageData()
			expect(options.queryKey).toEqual(['analytics', 'property-performance'])
		})

		it('should have 1 minute staleTime', () => {
			const options = analyticsQueries.propertyPerformancePageData()
			expect(options.staleTime).toBe(60_000)
		})
	})

	describe('ownerPaymentSummary query', () => {
		it('should call correct API endpoint', async () => {
			const mockData = {
				totalReceived: 45000,
				pendingPayments: 5000,
				overdueAmount: 500
			}
			mockFetch.mockResolvedValue(createMockResponse(mockData))

			const options = analyticsQueries.ownerPaymentSummary()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/tenants/payments/summary',
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer test-token'
					})
				})
			)
		})

		it('should use correct query key', () => {
			const options = analyticsQueries.ownerPaymentSummary()
			expect(options.queryKey).toEqual(['analytics', 'payment-summary'])
		})

		it('should have 30 second staleTime for payment data', () => {
			const options = analyticsQueries.ownerPaymentSummary()
			expect(options.staleTime).toBe(30_000)
		})
	})

	describe('error handling', () => {
		it('should propagate fetch errors for financial data', async () => {
			mockFetch.mockResolvedValue(
				createMockResponse({ error: 'Server error' }, false, 500)
			)

			const options = analyticsQueries.financialPageData()

			await expect(options.queryFn!({} as never)).rejects.toThrow()
		})

		it('should propagate fetch errors for lease data', async () => {
			mockFetch.mockResolvedValue(
				createMockResponse({ error: 'Server error' }, false, 500)
			)

			const options = analyticsQueries.leasePageData()

			await expect(options.queryFn!({} as never)).rejects.toThrow()
		})

		it('should propagate fetch errors for maintenance data', async () => {
			mockFetch.mockResolvedValue(
				createMockResponse({ error: 'Server error' }, false, 500)
			)

			const options = analyticsQueries.maintenancePageData()

			await expect(options.queryFn!({} as never)).rejects.toThrow()
		})

		it('should handle network failures', async () => {
			mockFetch.mockRejectedValue(new Error('Network error'))

			const options = analyticsQueries.financialPageData()

			await expect(options.queryFn!({} as never)).rejects.toThrow(
				'Network error'
			)
		})
	})
})
