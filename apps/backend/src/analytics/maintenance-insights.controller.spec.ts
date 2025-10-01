import { UnauthorizedException } from '@nestjs/common'
import { Test, type TestingModule } from '@nestjs/testing'
import type { Request } from 'express'
import { SupabaseService } from '../database/supabase.service'
import { MaintenanceInsightsController } from './maintenance-insights.controller'
import { MaintenanceInsightsService } from './maintenance-insights.service'

describe('MaintenanceInsightsController', () => {
	let controller: MaintenanceInsightsController
	let service: Record<string, jest.Mock>
	let supabase: { getUser: jest.Mock }

	const createRequest = (): Partial<Request> => ({
		path: '/analytics/maintenance',
		method: 'GET',
		headers: {},
		cookies: {}
	})

	beforeEach(async () => {
		service = {
			getMaintenanceMetrics: jest.fn(),
			getMaintenanceAnalytics: jest.fn(),
			getMaintenanceInsightsPageData: jest.fn()
		}

		supabase = { getUser: jest.fn() }

		const module: TestingModule = await Test.createTestingModule({
			controllers: [MaintenanceInsightsController],
			providers: [
				{
					provide: MaintenanceInsightsService,
					useValue: service
				},
				{
					provide: SupabaseService,
					useValue: supabase
				}
			]
		}).compile()

		controller = module.get(MaintenanceInsightsController)
	})

	it('requires authentication to access maintenance metrics', async () => {
		supabase.getUser.mockResolvedValue(null)
		const request = createRequest()

		await expect(
			controller.getMaintenanceMetrics(request as Request)
		).rejects.toBeInstanceOf(UnauthorizedException)
	})

	it('returns maintenance metrics from the service', async () => {
		const request = createRequest()
		supabase.getUser.mockResolvedValue({ id: 'user-5' })
		const metrics = { openRequests: 3 }
		service.getMaintenanceMetrics.mockResolvedValue(metrics)

		const response = await controller.getMaintenanceMetrics(request as Request)

		expect(service.getMaintenanceMetrics).toHaveBeenCalledWith('user-5')
		expect(response).toEqual({
			success: true,
			data: metrics,
			message: 'Maintenance metrics retrieved successfully',
			timestamp: expect.any(Date)
		})
	})

	it('returns maintenance analytics', async () => {
		const request = {
			...createRequest(),
			path: '/analytics/maintenance-analytics'
		}
		supabase.getUser.mockResolvedValue({ id: 'user-5' })
		const analytics = { trends: [] }
		service.getMaintenanceAnalytics.mockResolvedValue(analytics)

		const response = await controller.getMaintenanceAnalytics(
			request as Request
		)

		expect(service.getMaintenanceAnalytics).toHaveBeenCalledWith('user-5')
		expect(response).toEqual({
			success: true,
			data: analytics,
			message: 'Maintenance analytics retrieved successfully',
			timestamp: expect.any(Date)
		})
	})

	it('returns maintenance page data', async () => {
		const request = {
			...createRequest(),
			path: '/analytics/maintenance/page-data'
		}
		supabase.getUser.mockResolvedValue({ id: 'user-5' })
		const pageData = { metrics: { openRequests: 2 } }
		service.getMaintenanceInsightsPageData.mockResolvedValue(pageData)

		const response = await controller.getMaintenancePageData(request as Request)

		expect(service.getMaintenanceInsightsPageData).toHaveBeenCalledWith(
			'user-5'
		)
		expect(response).toEqual({
			success: true,
			data: pageData,
			message: 'Maintenance insights page data retrieved successfully',
			timestamp: expect.any(Date)
		})
	})
})
