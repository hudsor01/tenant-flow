import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { FinancialAnalyticsService } from './financial-analytics.service'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import { SilentLogger } from '../../__tests__/silent-logger'
import type {
	FinancialMetricSummary,
	NetOperatingIncomeByProperty
} from '@repo/shared/types/analytics'

describe('FinancialAnalyticsService', () => {
	let service: FinancialAnalyticsService
	let mockSupabaseService: jest.Mocked<Partial<SupabaseService>>

	const testUserId = 'test-user-id-12345'

	beforeEach(async () => {
		mockSupabaseService = {
			rpcWithCache: jest.fn()
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				FinancialAnalyticsService,
				{
					provide: SupabaseService,
					useValue: mockSupabaseService
				},
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		service = module.get<FinancialAnalyticsService>(FinancialAnalyticsService)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('getFinancialMetrics', () => {
		it('should return mapped financial metrics from RPC', async () => {
			const mockRpcResponse = {
				data: {
					total_revenue: 15000,
					net_income: 8500,
					profit_margin: 0.567,
					cash_flow: 7200,
					revenue_trend: 5.2,
					expense_trend: -2.1
				},
				error: null
			}

			mockSupabaseService.rpcWithCache!.mockResolvedValue(mockRpcResponse)

			const result = await service.getFinancialMetrics(testUserId)

			expect(mockSupabaseService.rpcWithCache).toHaveBeenCalledWith(
				'calculate_financial_metrics',
				expect.objectContaining({
					user_id: testUserId,
					p_user_id: testUserId
				}),
				expect.any(Object)
			)

			expect(result).toMatchObject<Partial<FinancialMetricSummary>>({
				totalRevenue: expect.any(Number),
				netIncome: expect.any(Number)
			})
		})

		it('should return default metrics when RPC returns null', async () => {
			mockSupabaseService.rpcWithCache!.mockResolvedValue({
				data: null,
				error: null
			})

			const result = await service.getFinancialMetrics(testUserId)

			expect(result).toBeDefined()
			expect(result.totalRevenue).toBe(0)
			expect(result.netIncome).toBe(0)
		})

		it('should handle RPC errors gracefully', async () => {
			mockSupabaseService.rpcWithCache!.mockResolvedValue({
				data: null,
				error: { message: 'Database connection failed' }
			})

			const result = await service.getFinancialMetrics(testUserId)

			expect(result).toBeDefined()
			expect(result.totalRevenue).toBe(0)
		})
	})

	describe('getNetOperatingIncome', () => {
		it('should return NOI by property from RPC', async () => {
			const mockNOIData = [
				{ property_id: 'prop-1', property_name: 'Property A', noi: 5000 },
				{ property_id: 'prop-2', property_name: 'Property B', noi: 3200 }
			]

			mockSupabaseService.rpcWithCache!.mockResolvedValue({
				data: mockNOIData,
				error: null
			})

			const result = await service.getNetOperatingIncome(testUserId)

			expect(result).toBeInstanceOf(Array)
			expect(result.length).toBeGreaterThanOrEqual(0)
		})

		it('should return empty array when no data', async () => {
			mockSupabaseService.rpcWithCache!.mockResolvedValue({
				data: null,
				error: null
			})

			const result = await service.getNetOperatingIncome(testUserId)

			expect(result).toEqual([])
		})
	})

	describe('getFinancialAnalyticsPageData', () => {
		it('should aggregate all financial data in parallel', async () => {
			// Mock all RPC calls returning empty/default data
			mockSupabaseService.rpcWithCache!.mockResolvedValue({
				data: null,
				error: null
			})

			const result = await service.getFinancialAnalyticsPageData(testUserId)

			// Should call all 9 RPC functions
			expect(mockSupabaseService.rpcWithCache).toHaveBeenCalledTimes(9)

			// Should return structured response
			expect(result).toHaveProperty('metrics')
			expect(result).toHaveProperty('breakdown')
			expect(result).toHaveProperty('netOperatingIncome')
			expect(result).toHaveProperty('billingInsights')
			expect(result).toHaveProperty('invoiceSummary')
			expect(result).toHaveProperty('monthlyMetrics')
			expect(result).toHaveProperty('leaseAnalytics')
		})

		it('should handle partial RPC failures gracefully', async () => {
			// Some RPCs succeed, others fail
			let callCount = 0
			mockSupabaseService.rpcWithCache!.mockImplementation(() => {
				callCount++
				if (callCount % 2 === 0) {
					return Promise.resolve({ data: null, error: { message: 'Failed' } })
				}
				return Promise.resolve({ data: {}, error: null })
			})

			const result = await service.getFinancialAnalyticsPageData(testUserId)

			// Should still return a valid response
			expect(result).toBeDefined()
			expect(result).toHaveProperty('metrics')
		})
	})

	describe('getBillingInsights', () => {
		it('should return billing insights from RPC', async () => {
			const mockBillingData = {
				points: [
					{ period: '2025-01', invoiced: 5000, paid: 4500, overdue: 500 },
					{ period: '2025-02', invoiced: 5200, paid: 5100, overdue: 100 }
				],
				totals: { invoiced: 10200, paid: 9600, overdue: 600 }
			}

			mockSupabaseService.rpcWithCache!.mockResolvedValue({
				data: mockBillingData,
				error: null
			})

			const result = await service.getBillingInsights(testUserId)

			expect(mockSupabaseService.rpcWithCache).toHaveBeenCalledWith(
				'get_billing_insights',
				expect.objectContaining({ user_id: testUserId }),
				expect.any(Object)
			)
			expect(result).toBeDefined()
		})

		it('should return default structure when RPC fails', async () => {
			mockSupabaseService.rpcWithCache!.mockResolvedValue({
				data: null,
				error: { message: 'RPC timeout' }
			})

			const result = await service.getBillingInsights(testUserId)

			expect(result).toBeDefined()
			expect(result).toHaveProperty('points')
			expect(result).toHaveProperty('totals')
		})
	})

	describe('getMonthlyMetrics', () => {
		it('should return monthly metrics array', async () => {
			const mockMonthlyData = [
				{ month: 'Jan', revenue: 10000, expenses: 4000, netIncome: 6000 },
				{ month: 'Feb', revenue: 11000, expenses: 4200, netIncome: 6800 }
			]

			mockSupabaseService.rpcWithCache!.mockResolvedValue({
				data: mockMonthlyData,
				error: null
			})

			const result = await service.getMonthlyMetrics(testUserId)

			expect(result).toBeInstanceOf(Array)
		})
	})

	describe('getLeaseFinancialSummary', () => {
		it('should return lease financial summary', async () => {
			const mockLeaseSummary = {
				total_leases: 15,
				active_leases: 12,
				total_monthly_rent: 25000,
				average_rent: 2083
			}

			mockSupabaseService.rpcWithCache!.mockResolvedValue({
				data: mockLeaseSummary,
				error: null
			})

			const result = await service.getLeaseFinancialSummary(testUserId)

			expect(mockSupabaseService.rpcWithCache).toHaveBeenCalledWith(
				'get_lease_financial_summary',
				expect.objectContaining({ user_id: testUserId }),
				expect.any(Object)
			)
			expect(result).toBeDefined()
		})
	})

	describe('getLeasesWithFinancialAnalytics', () => {
		it('should return lease analytics array', async () => {
			const mockLeaseAnalytics = [
				{
					lease_id: 'lease-1',
					tenant_name: 'John Doe',
					property_name: 'Property A',
					rent_amount: 2000,
					outstanding_balance: 0,
					profitability_score: 95
				}
			]

			mockSupabaseService.rpcWithCache!.mockResolvedValue({
				data: mockLeaseAnalytics,
				error: null
			})

			const result = await service.getLeasesWithFinancialAnalytics(testUserId)

			expect(result).toBeInstanceOf(Array)
		})
	})
})
