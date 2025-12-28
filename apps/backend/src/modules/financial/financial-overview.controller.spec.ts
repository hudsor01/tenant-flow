/**
 * Financial Overview Controller Tests
 */

import { Test, TestingModule } from '@nestjs/testing'
import { UnauthorizedException } from '@nestjs/common'
import { FinancialOverviewController } from './financial-overview.controller'
import { FinancialService } from './financial.service'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import type { Request } from 'express'

describe('FinancialOverviewController', () => {
	let controller: FinancialOverviewController
	let financialService: jest.Mocked<FinancialService>
	let supabaseService: jest.Mocked<SupabaseService>

	const mockToken = 'mock-jwt-token'
	const mockRequest = {
		path: '/api/v1/financials/overview',
		headers: {
			authorization: `Bearer ${mockToken}`
		}
	} as unknown as Request

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [FinancialOverviewController],
			providers: [
				{
					provide: FinancialService,
					useValue: {
						getOverview: jest.fn(),
						getRevenueTrends: jest.fn(),
						getExpenseSummary: jest.fn()
					}
				},
				{
					provide: SupabaseService,
					useValue: {
						getTokenFromRequest: jest.fn(),
						getUserClient: jest.fn()
					}
				},
				{
					provide: AppLogger,
					useValue: {
						log: jest.fn(),
						warn: jest.fn(),
						error: jest.fn()
					}
				}
			]
		}).compile()

		controller = module.get<FinancialOverviewController>(
			FinancialOverviewController
		)
		financialService = module.get(FinancialService)
		supabaseService = module.get(SupabaseService)
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})

	describe('getOverview', () => {
		it('should return financial overview data', async () => {
			supabaseService.getTokenFromRequest.mockReturnValue(mockToken)
			financialService.getOverview.mockResolvedValue({
				summary: {
					totalRevenue: 50000,
					totalExpenses: 12500,
					netIncome: 37500,
					roi: 75,
					occupancyRate: 94
				}
			})

			const result = await controller.getOverview(mockRequest)

			expect(result.success).toBe(true)
			expect(result.data.overview.total_revenue).toBe(50000)
			expect(result.data.overview.net_income).toBe(37500)
			expect(financialService.getOverview).toHaveBeenCalledWith(mockToken)
		})

		it('should throw UnauthorizedException when no token', async () => {
			supabaseService.getTokenFromRequest.mockReturnValue(null)

			await expect(controller.getOverview(mockRequest)).rejects.toThrow(
				UnauthorizedException
			)
		})

		it('should include highlights in response', async () => {
			supabaseService.getTokenFromRequest.mockReturnValue(mockToken)
			financialService.getOverview.mockResolvedValue({
				summary: {
					totalRevenue: 60000,
					totalExpenses: 15000,
					netIncome: 45000,
					roi: 75,
					occupancyRate: 90
				}
			})

			const result = await controller.getOverview(mockRequest)

			expect(result.data.highlights).toHaveLength(3)
			expect(result.data.highlights[0].label).toBe('Monthly Revenue')
			expect(result.data.highlights[1].label).toBe('Operating Margin')
			expect(result.data.highlights[2].label).toBe('Occupancy Rate')
		})
	})

	describe('getMonthlyMetrics', () => {
		it('should return monthly metrics data', async () => {
			supabaseService.getTokenFromRequest.mockReturnValue(mockToken)
			// Mock returns the same structure as FinancialRevenueService.getRevenueTrends
			financialService.getRevenueTrends.mockResolvedValue([
				{
					period: '2024-01',
					revenue: 4000,
					expenses: 1000,
					netIncome: 3000,
					profitMargin: 75
				},
				{
					period: '2024-02',
					revenue: 4200,
					expenses: 1100,
					netIncome: 3100,
					profitMargin: 73.81
				},
				{
					period: '2024-03',
					revenue: 4300,
					expenses: 1050,
					netIncome: 3250,
					profitMargin: 75.58
				}
			])

			const result = await controller.getMonthlyMetrics(mockRequest)

			expect(result.success).toBe(true)
			expect(result.data).toHaveLength(3)
			expect(result.data[0].month).toBe('2024-01')
			expect(result.data[0].net_income).toBe(3000)
		})

		it('should accept year query parameter', async () => {
			supabaseService.getTokenFromRequest.mockReturnValue(mockToken)
			financialService.getRevenueTrends.mockResolvedValue([])

			await controller.getMonthlyMetrics(mockRequest, '2023')

			expect(financialService.getRevenueTrends).toHaveBeenCalledWith(
				mockToken,
				2023
			)
		})

		it('should default to current year when no year provided', async () => {
			supabaseService.getTokenFromRequest.mockReturnValue(mockToken)
			financialService.getRevenueTrends.mockResolvedValue([])

			await controller.getMonthlyMetrics(mockRequest)

			expect(financialService.getRevenueTrends).toHaveBeenCalledWith(
				mockToken,
				new Date().getFullYear()
			)
		})
	})

	describe('getExpenseSummary', () => {
		it('should return expense summary data', async () => {
			supabaseService.getTokenFromRequest.mockReturnValue(mockToken)
			financialService.getExpenseSummary.mockResolvedValue({
				categories: [
					{ category: 'maintenance', amount: 5000, percentage: 40 },
					{ category: 'utilities', amount: 2500, percentage: 20 }
				],
				total_amount: 12500,
				monthly_average: 1041
			})

			const result = await controller.getExpenseSummary(mockRequest)

			expect(result.success).toBe(true)
			expect(result.data.categories).toHaveLength(2)
			expect(result.data.total_amount).toBe(12500)
		})
	})

	describe('getExpenses', () => {
		it('should return list of expenses', async () => {
			supabaseService.getTokenFromRequest.mockReturnValue(mockToken)

			// Create separate mock builders for each table
			const expensesQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				gte: jest.fn().mockReturnThis(),
				lte: jest.fn().mockReturnThis(),
				order: jest.fn().mockResolvedValue({
					data: [
						{
							id: 'exp-1',
							amount: 5000,
							expense_date: '2024-12-20',
							vendor_name: 'Test Vendor',
							maintenance_request_id: 'mr-1',
							created_at: '2024-12-20T00:00:00Z',
							// description comes from maintenance_requests, not expense directly
							maintenance_requests: {
								description: 'Repair',
								category: 'maintenance',
								units: { property_id: 'prop-1' }
							}
						}
					],
					error: null
				})
			}

			const propertiesQueryBuilder = {
				select: jest.fn().mockResolvedValue({
					data: [{ id: 'prop-1', name: 'Test Property' }],
					error: null
				})
			}

			const mockClient = {
				from: jest.fn((table: string) => {
					if (table === 'properties') {
						return propertiesQueryBuilder
					}
					return expensesQueryBuilder
				})
			}

			supabaseService.getUserClient.mockReturnValue(mockClient as never)

			const result = await controller.getExpenses(mockRequest)

			expect(result.success).toBe(true)
			expect(result.data).toHaveLength(1)
			expect(result.data[0].description).toBe('Repair')
			expect(result.data[0].property_name).toBe('Test Property')
		})

		it('should return empty array when no properties', async () => {
			supabaseService.getTokenFromRequest.mockReturnValue(mockToken)

			const mockClient = {
				from: jest.fn().mockReturnValue({
					select: jest.fn().mockResolvedValue({
						data: [],
						error: null
					})
				})
			}

			supabaseService.getUserClient.mockReturnValue(mockClient as never)

			const result = await controller.getExpenses(mockRequest)

			expect(result.success).toBe(true)
			expect(result.data).toEqual([])
		})
	})
})
