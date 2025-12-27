/**
 * Payment Analytics Service Tests
 */

import { Test, TestingModule } from '@nestjs/testing'
import { PaymentAnalyticsService } from './payment-analytics.service'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import { SilentLogger } from '../../__test__/silent-logger'

describe('PaymentAnalyticsService', () => {
	let service: PaymentAnalyticsService

	// Mock Supabase client builder
	const createMockQueryBuilder = (data: unknown = [], error: unknown = null) => {
		const builder = {
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			in: jest.fn().mockReturnThis(),
			gte: jest.fn().mockReturnThis(),
			lte: jest.fn().mockReturnThis(),
			lt: jest.fn().mockReturnThis(),
			order: jest.fn().mockReturnThis(),
			limit: jest.fn().mockReturnThis(),
			single: jest.fn().mockResolvedValue({ data, error }),
			maybeSingle: jest.fn().mockResolvedValue({ data, error }),
			then: jest.fn().mockImplementation((resolve) => resolve({ data, error }))
		}
		// Make it thenable for Promise-like behavior
		Object.defineProperty(builder, 'then', {
			value: jest.fn().mockImplementation((resolve) => resolve({ data, error }))
		})
		return builder
	}

	const mockUserClient = {
		from: jest.fn()
	}

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PaymentAnalyticsService,
				{
					provide: SupabaseService,
					useValue: {
						getUserClient: jest.fn().mockReturnValue(mockUserClient)
					}
				},
				{
					provide: AppLogger,
					useClass: SilentLogger
				}
			]
		}).compile()

		service = module.get<PaymentAnalyticsService>(PaymentAnalyticsService)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('getPaymentAnalytics', () => {
		it('should return zero totals when no payments exist', async () => {
			const queryBuilder = createMockQueryBuilder([])
			mockUserClient.from.mockReturnValue(queryBuilder)

			const result = await service.getPaymentAnalytics('test-token')

			expect(result.totalCollected).toBe(0)
			expect(result.totalPending).toBe(0)
			expect(result.totalOverdue).toBe(0)
			expect(result.collectionRate).toBe(0)
			expect(result.averagePaymentTime).toBe(0)
			expect(result.onTimePaymentRate).toBe(0)
			// Monthly trend will still have entries (4 months) but with zero values
			expect(Array.isArray(result.monthlyTrend)).toBe(true)
		})

		it('should calculate correct collection metrics', async () => {
			const mockPayments = [
				{ id: '1', amount: 100000, status: 'succeeded', due_date: new Date().toISOString(), paid_date: new Date().toISOString(), created_at: new Date().toISOString(), lease_id: 'l1' },
				{ id: '2', amount: 100000, status: 'succeeded', due_date: new Date().toISOString(), paid_date: new Date().toISOString(), created_at: new Date().toISOString(), lease_id: 'l2' },
				{ id: '3', amount: 100000, status: 'pending', due_date: new Date().toISOString(), created_at: new Date().toISOString(), lease_id: 'l3' }
			]

			const queryBuilder = createMockQueryBuilder(mockPayments)
			mockUserClient.from.mockReturnValue(queryBuilder)

			const result = await service.getPaymentAnalytics('test-token')

			expect(result.totalCollected).toBe(200000)
			expect(result.totalPending).toBe(100000)
			expect(result.collectionRate).toBeCloseTo(66.7, 0)
		})

		it('should handle database errors gracefully', async () => {
			const queryBuilder = createMockQueryBuilder(null, { message: 'Database error' })
			mockUserClient.from.mockReturnValue(queryBuilder)

			const result = await service.getPaymentAnalytics('test-token')

			expect(result.totalCollected).toBe(0)
			expect(result.totalPending).toBe(0)
			expect(result.totalOverdue).toBe(0)
		})
	})

	describe('getMonthlyTrend', () => {
		it('should return trends for specified number of months', async () => {
			const mockPayments = [
				{ amount: 100000, status: 'succeeded' }
			]

			const queryBuilder = createMockQueryBuilder(mockPayments)
			mockUserClient.from.mockReturnValue(queryBuilder)

			const result = await service.getMonthlyTrend('test-token', 3)

			expect(result.length).toBe(3)
			expect(result[0]).toHaveProperty('month')
			expect(result[0]).toHaveProperty('monthNumber')
			expect(result[0]).toHaveProperty('collected')
			expect(result[0]).toHaveProperty('pending')
			expect(result[0]).toHaveProperty('failed')
		})
	})

	describe('getUpcomingPayments', () => {
		it('should return empty array when no active leases', async () => {
			const queryBuilder = createMockQueryBuilder([])
			mockUserClient.from.mockReturnValue(queryBuilder)

			const result = await service.getUpcomingPayments('test-token')

			expect(result).toEqual([])
		})
	})

	describe('getOverduePayments', () => {
		it('should return overdue payments with days calculation', async () => {
			const fiveDaysAgo = new Date()
			fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)

			const mockPayments = [
				{
					id: 'p1',
					amount: 100000,
					due_date: fiveDaysAgo.toISOString(),
					late_fee_amount: 5000,
					tenant_id: 't1',
					lease_id: 'l1',
					leases: {
						id: 'l1',
						unit_id: 'u1',
						units: {
							id: 'u1',
							unit_number: '101',
							property_id: 'pr1',
							properties: { id: 'pr1', name: 'Test Property' }
						}
					},
					tenants: {
						id: 't1',
						user_id: 'user1',
						users: { id: 'user1', first_name: 'John', last_name: 'Doe', email: 'john@test.com' }
					}
				}
			]

			const queryBuilder = createMockQueryBuilder(mockPayments)
			mockUserClient.from.mockReturnValue(queryBuilder)

			const result = await service.getOverduePayments('test-token')

			expect(result.length).toBe(1)
			expect(result[0].daysOverdue).toBeGreaterThanOrEqual(4)
			expect(result[0].tenantName).toBe('John Doe')
			expect(result[0].propertyName).toBe('Test Property')
		})
	})

	describe('exportPaymentsCSV', () => {
		it('should generate valid CSV format', async () => {
			const mockPayments = [
				{
					id: 'p1',
					amount: 100000,
					status: 'succeeded',
					due_date: '2024-01-15',
					paid_date: '2024-01-15',
					payment_method_type: 'card',
					late_fee_amount: 0,
					created_at: '2024-01-15',
					tenant_id: 't1',
					lease_id: 'l1',
					leases: {
						units: {
							unit_number: '101',
							properties: { name: 'Test Property' }
						}
					},
					tenants: {
						users: { first_name: 'John', last_name: 'Doe', email: 'john@test.com' }
					}
				}
			]

			const queryBuilder = createMockQueryBuilder(mockPayments)
			mockUserClient.from.mockReturnValue(queryBuilder)

			const result = await service.exportPaymentsCSV('test-token')

			expect(result).toContain('Payment ID')
			expect(result).toContain('Tenant Name')
			expect(result).toContain('Amount')
			expect(result).toContain('Status')
			expect(result).toContain('John Doe')
			expect(result).toContain('1000.00')
		})

		it('should apply filters correctly', async () => {
			const queryBuilder = createMockQueryBuilder([])
			mockUserClient.from.mockReturnValue(queryBuilder)

			await service.exportPaymentsCSV('test-token', {
				status: 'succeeded',
				startDate: '2024-01-01',
				endDate: '2024-12-31'
			})

			expect(queryBuilder.eq).toHaveBeenCalledWith('status', 'succeeded')
			expect(queryBuilder.gte).toHaveBeenCalledWith('due_date', '2024-01-01')
			expect(queryBuilder.lte).toHaveBeenCalledWith('due_date', '2024-12-31')
		})
	})
})
