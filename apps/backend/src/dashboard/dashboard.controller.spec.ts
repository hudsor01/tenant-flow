import { NotFoundException, UnauthorizedException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { authUser } from '@repo/shared'
import type { Request } from 'express'
import { SupabaseService } from '../database/supabase.service'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'
import { createMockUser, createMockDashboardStats, createMockPropertyStats, createMockPropertyRequest, createMockTenantRequest, createMockUnitRequest } from '../test-utils/mocks'

// Mock the services
jest.mock('./dashboard.service', () => {
	return {
		DashboardService: jest.fn().mockImplementation(() => ({
			getStats: jest.fn(),
			getActivity: jest.fn(),
			getBillingInsights: jest.fn(),
			isBillingInsightsAvailable: jest.fn(),
			getPropertyPerformance: jest.fn(),
			getUptime: jest.fn()
		}))
	}
})

jest.mock('../database/supabase.service', () => {
	return {
		SupabaseService: jest.fn().mockImplementation(() => ({
			getUser: jest.fn()
		}))
	}
})

describe('DashboardController', () => {
	let controller: DashboardController
	let mockDashboardServiceInstance: jest.Mocked<DashboardService>
	let mockSupabaseServiceInstance: jest.Mocked<SupabaseService>

	const mockUser = createMockUser({ id: 'user-123' })

	const mockRequest = {
		headers: {
			origin: 'http://localhost:3000',
			referer: 'http://localhost:3000/dashboard'
		},
		cookies: {},
		path: '/api/v1/dashboard',
		method: 'GET'
	} as unknown as Request

	beforeEach(async () => {
		jest.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			controllers: [DashboardController],
			providers: [DashboardService, SupabaseService]
		}).compile()

		controller = module.get<DashboardController>(DashboardController)
		mockDashboardServiceInstance = module.get(
			DashboardService
		) as jest.Mocked<DashboardService>
		mockSupabaseServiceInstance = module.get(
			SupabaseService
		) as jest.Mocked<SupabaseService>
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})

	describe('getStats', () => {
		it('should return dashboard stats for authenticated user', async () => {
			const mockStats = createMockDashboardStats()

			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockDashboardServiceInstance.getStats.mockResolvedValue(mockStats)

			const result = await controller.getStats(mockRequest)

			expect(mockSupabaseServiceInstance.getUser).toHaveBeenCalledWith(
				mockRequest
			)
			expect(mockDashboardServiceInstance.getStats).toHaveBeenCalledWith(
				mockUser.id
			)
			expect(result).toEqual({
				success: true,
				data: mockStats,
				message: 'Dashboard statistics retrieved successfully',
				timestamp: expect.any(Date)
			})
		})

		it('should throw UnauthorizedException when user validation fails', async () => {
			mockSupabaseServiceInstance.getUser.mockResolvedValue(null)

			await expect(controller.getStats(mockRequest)).rejects.toThrow(
				UnauthorizedException
			)
		})

	})

	describe('getActivity', () => {
		it('should return dashboard activity for authenticated user', async () => {
			const mockActivity = [
				{
					id: 'activity-1',
					type: 'maintenance_request',
					description: 'New maintenance request submitted',
					timestamp: new Date()
				}
			]

			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockDashboardServiceInstance.getActivity.mockResolvedValue({
				activities: mockActivity
			})

			const result = await controller.getActivity(mockRequest)

			expect(mockSupabaseServiceInstance.getUser).toHaveBeenCalledWith(
				mockRequest
			)
			expect(mockDashboardServiceInstance.getActivity).toHaveBeenCalledWith(
				mockUser.id
			)
			expect(result).toEqual({
				success: true,
				data: { activities: mockActivity },
				message: 'Dashboard activity retrieved successfully',
				timestamp: expect.any(Date)
			})
		})

		it('should throw UnauthorizedException when user validation fails', async () => {
			mockSupabaseServiceInstance.getUser.mockResolvedValue(null)

			await expect(controller.getActivity(mockRequest)).rejects.toThrow(
				UnauthorizedException
			)
		})
	})

	describe('getBillingInsights', () => {
		it('should return billing insights with valid date range', async () => {
			const mockInsights = {
				totalRevenue: 50000,
				churnRate: 0.05,
				mrr: 12000
			}

			mockDashboardServiceInstance.getBillingInsights.mockResolvedValue(
				mockInsights
			)

			const result = await controller.getBillingInsights(
				'2024-01-01',
				'2024-01-31'
			)

			expect(mockDashboardServiceInstance.getBillingInsights).toHaveBeenCalledWith(
				new Date('2024-01-01'),
				new Date('2024-01-31')
			)
			expect(result).toEqual({
				success: true,
				data: mockInsights,
				message: 'Billing insights retrieved successfully from Stripe Sync Engine',
				timestamp: expect.any(Date)
			})
		})

		it('should return billing insights without date range', async () => {
			const mockInsights = {
				totalRevenue: 50000,
				churnRate: 0.05,
				mrr: 12000
			}

			mockDashboardServiceInstance.getBillingInsights.mockResolvedValue(
				mockInsights
			)

			const result = await controller.getBillingInsights()

			expect(mockDashboardServiceInstance.getBillingInsights).toHaveBeenCalledWith(
				undefined,
				undefined
			)
			expect(result.success).toBe(true)
		})

		it('should return error for invalid date format', async () => {
			const result = await controller.getBillingInsights(
				'invalid-date',
				'2024-01-31'
			)

			expect(result).toEqual({
				success: false,
				data: null,
				message: 'Invalid date format. Use ISO date strings.',
				timestamp: expect.any(Date)
			})
		})

	})

	describe('getBillingHealth', () => {
		it('should return billing health status when available', async () => {
			mockDashboardServiceInstance.isBillingInsightsAvailable.mockResolvedValue(
				true
			)

			const result = await controller.getBillingHealth()

			expect(
				mockDashboardServiceInstance.isBillingInsightsAvailable
			).toHaveBeenCalled()
			expect(result).toEqual({
				success: true,
				data: {
					available: true,
					service: 'Stripe Sync Engine',
					capabilities: [
						'Revenue Analytics',
						'Churn Analysis',
						'Customer Lifetime Value',
						'MRR Tracking',
						'Subscription Status Breakdown'
					]
				},
				message: 'Billing insights are available',
				timestamp: expect.any(Date)
			})
		})

		it('should return billing health status when not available', async () => {
			mockDashboardServiceInstance.isBillingInsightsAvailable.mockResolvedValue(
				false
			)

			const result = await controller.getBillingHealth()

			expect(result).toEqual({
				success: true,
				data: {
					available: false,
					service: 'Stripe Sync Engine',
					capabilities: []
				},
				message: 'Billing insights not available - Stripe Sync Engine not configured',
				timestamp: expect.any(Date)
			})
		})
	})

	describe('getPropertyPerformance', () => {
		it('should return property performance for authenticated user', async () => {
			const mockPerformance = [
				{
					property: 'Property A',
					propertyId: 'prop-1',
					units: 20,
					totalUnits: 20,
					occupiedUnits: 19,
					vacantUnits: 1,
					occupancy: '95%',
					occupancyRate: 95.0,
					revenue: 8000,
					monthlyRevenue: 8000,
					potentialRevenue: 8400,
					address: '123 Main St',
					propertyType: 'APARTMENT',
					status: 'PARTIAL' as const
				}
			]

			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockDashboardServiceInstance.getPropertyPerformance.mockResolvedValue(
				mockPerformance
			)

			const result = await controller.getPropertyPerformance(mockRequest)

			expect(mockSupabaseServiceInstance.getUser).toHaveBeenCalledWith(
				mockRequest
			)
			expect(
				mockDashboardServiceInstance.getPropertyPerformance
			).toHaveBeenCalledWith(mockUser.id)
			expect(result).toEqual({
				success: true,
				data: mockPerformance,
				message: 'Property performance retrieved successfully',
				timestamp: expect.any(Date)
			})
		})

		it('should throw UnauthorizedException when user validation fails', async () => {
			mockSupabaseServiceInstance.getUser.mockResolvedValue(null)

			await expect(
				controller.getPropertyPerformance(mockRequest)
			).rejects.toThrow(UnauthorizedException)
		})
	})

	describe('getUptime', () => {
		it('should return system uptime metrics', async () => {
			const mockUptime = {
				uptime: '99.9%',
				uptimePercentage: 99.9,
				sla: '99.5%',
				slaStatus: 'excellent' as const,
				status: 'operational' as const,
				lastIncident: null,
				responseTime: 150,
				timestamp: new Date().toISOString()
			}

			mockDashboardServiceInstance.getUptime.mockResolvedValue(mockUptime)

			const result = await controller.getUptime()

			expect(mockDashboardServiceInstance.getUptime).toHaveBeenCalled()
			expect(result).toEqual({
				success: true,
				data: mockUptime,
				message: 'System uptime retrieved successfully',
				timestamp: expect.any(Date)
			})
		})

	})

})
