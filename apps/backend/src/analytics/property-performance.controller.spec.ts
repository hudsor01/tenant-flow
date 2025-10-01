import { UnauthorizedException } from '@nestjs/common'
import { Test, type TestingModule } from '@nestjs/testing'
import type { Request } from 'express'
import { SupabaseService } from '../database/supabase.service'
import { PropertyPerformanceController } from './property-performance.controller'
import { PropertyPerformanceService } from './property-performance.service'

describe('PropertyPerformanceController', () => {
	let controller: PropertyPerformanceController
	let service: Record<string, jest.Mock>
	let supabase: { getUser: jest.Mock }

	const createRequest = (): Partial<Request> => ({
		path: '/analytics/property-performance',
		method: 'GET',
		headers: {},
		cookies: {}
	})

	beforeEach(async () => {
		service = {
			getPropertyPerformance: jest.fn(),
			getPropertyUnits: jest.fn(),
			getUnitStatistics: jest.fn(),
			getVisitorAnalytics: jest.fn(),
			getPropertyPerformancePageData: jest.fn()
		}

		supabase = { getUser: jest.fn() }

		const module: TestingModule = await Test.createTestingModule({
			controllers: [PropertyPerformanceController],
			providers: [
				{
					provide: PropertyPerformanceService,
					useValue: service
				},
				{
					provide: SupabaseService,
					useValue: supabase
				}
			]
		}).compile()

		controller = module.get(PropertyPerformanceController)
	})

	it('requires authentication for property performance data', async () => {
		supabase.getUser.mockResolvedValue(null)
		const request = createRequest()

		await expect(
			controller.getPropertyPerformance(request as Request)
		).rejects.toBeInstanceOf(UnauthorizedException)
	})

	it('returns property performance payload from the service', async () => {
		const request = createRequest()
		supabase.getUser.mockResolvedValue({ id: 'user-42' })
		const payload = [{ propertyId: 'prop-1' }]
		service.getPropertyPerformance.mockResolvedValue(payload)

		const response = await controller.getPropertyPerformance(request as Request)

		expect(service.getPropertyPerformance).toHaveBeenCalledWith('user-42')
		expect(response).toEqual({
			success: true,
			data: payload,
			message: 'Property performance retrieved successfully',
			timestamp: expect.any(Date)
		})
	})

	it('returns property units from the service', async () => {
		const request = createRequest()
		supabase.getUser.mockResolvedValue({ id: 'user-42' })
		const units = [{ unitId: 'unit-9' }]
		service.getPropertyUnits.mockResolvedValue(units)

		const response = await controller.getPropertyUnits(request as Request)

		expect(service.getPropertyUnits).toHaveBeenCalledWith('user-42')
		expect(response).toEqual({
			success: true,
			data: units,
			message: 'Property units retrieved successfully',
			timestamp: expect.any(Date)
		})
	})

	it('returns unit statistics from the service', async () => {
		const request = createRequest()
		supabase.getUser.mockResolvedValue({ id: 'user-42' })
		const stats = [{ label: 'Vacant Units', value: 2 }]
		service.getUnitStatistics.mockResolvedValue(stats)

		const response = await controller.getUnitStatistics(request as Request)

		expect(service.getUnitStatistics).toHaveBeenCalledWith('user-42')
		expect(response).toEqual({
			success: true,
			data: stats,
			message: 'Unit statistics retrieved successfully',
			timestamp: expect.any(Date)
		})
	})

	it('returns visitor analytics from the service', async () => {
		const request = { ...createRequest(), path: '/analytics/visitor-analytics' }
		supabase.getUser.mockResolvedValue({ id: 'user-42' })
		const visitorAnalytics = { summary: { totalVisits: 100 }, timeline: [] }
		service.getVisitorAnalytics.mockResolvedValue(visitorAnalytics)

		const response = await controller.getVisitorAnalytics(request as Request)

		expect(service.getVisitorAnalytics).toHaveBeenCalledWith('user-42')
		expect(response).toEqual({
			success: true,
			data: visitorAnalytics,
			message: 'Visitor analytics retrieved successfully',
			timestamp: expect.any(Date)
		})
	})

	it('returns aggregated page data from the service', async () => {
		const request = {
			...createRequest(),
			path: '/analytics/property-performance/page-data'
		}
		supabase.getUser.mockResolvedValue({ id: 'user-42' })
		const pageData = { metrics: { totalProperties: 2 } }
		service.getPropertyPerformancePageData.mockResolvedValue(pageData)

		const response = await controller.getPropertyPerformancePageData(
			request as Request
		)

		expect(service.getPropertyPerformancePageData).toHaveBeenCalledWith(
			'user-42'
		)
		expect(response).toEqual({
			success: true,
			data: pageData,
			message: 'Property performance analytics retrieved successfully',
			timestamp: expect.any(Date)
		})
	})
})
