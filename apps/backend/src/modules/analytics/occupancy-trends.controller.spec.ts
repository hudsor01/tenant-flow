import { UnauthorizedException } from '@nestjs/common'
import { Test, type TestingModule } from '@nestjs/testing'
import type { Request } from 'express'
import { SupabaseService } from '../../database/supabase.service'
import { OccupancyTrendsController } from './occupancy-trends.controller'
import { OccupancyTrendsService } from './occupancy-trends.service'

describe('OccupancyTrendsController', () => {
	let controller: OccupancyTrendsController
	let service: Record<string, jest.Mock>
	let supabase: { getUser: jest.Mock }

	const createRequest = (): Partial<Request> => ({
		path: '/analytics/occupancy',
		method: 'GET',
		headers: {},
		cookies: {}
	})

	beforeEach(async () => {
		service = {
			getOccupancyTrends: jest.fn(),
			getVacancyAnalysis: jest.fn(),
			getOccupancyAnalyticsPageData: jest.fn()
		}

		supabase = { getUser: jest.fn() }

		const module: TestingModule = await Test.createTestingModule({
			controllers: [OccupancyTrendsController],
			providers: [
				{
					provide: OccupancyTrendsService,
					useValue: service
				},
				{
					provide: SupabaseService,
					useValue: supabase
				}
			]
		}).compile()

		controller = module.get(OccupancyTrendsController)
	})

	it('requires authentication to access occupancy trends', async () => {
		supabase.getUser.mockResolvedValue(null)
		const request = createRequest()

		await expect(
			controller.getTrends(request as Request)
		).rejects.toBeInstanceOf(UnauthorizedException)
	})

	it('returns occupancy trends from the service', async () => {
		const request = createRequest()
		supabase.getUser.mockResolvedValue({ id: 'user-12' })
		const payload = [{ period: '2024-01' }]
		service.getOccupancyTrends!.mockResolvedValue(payload)

		const response = await controller.getTrends(request as Request)

		expect(service.getOccupancyTrends).toHaveBeenCalledWith('user-12')
		expect(response).toEqual({
			success: true,
			data: payload,
			message: 'Occupancy trends retrieved successfully',
			timestamp: expect.any(Date)
		})
	})

	it('returns vacancy analysis from the service', async () => {
		const request = { ...createRequest(), path: '/analytics/vacancy-analysis' }
		supabase.getUser.mockResolvedValue({ id: 'user-12' })
		const vacancy = [{ propertyId: 'prop-9' }]
		service.getVacancyAnalysis!.mockResolvedValue(vacancy)

		const response = await controller.getVacancyAnalysis(request as Request)

		expect(service.getVacancyAnalysis).toHaveBeenCalledWith('user-12')
		expect(response).toEqual({
			success: true,
			data: vacancy,
			message: 'Vacancy analysis retrieved successfully',
			timestamp: expect.any(Date)
		})
	})

	it('returns occupancy page data', async () => {
		const request = {
			...createRequest(),
			path: '/analytics/occupancy/page-data'
		}
		supabase.getUser.mockResolvedValue({ id: 'user-12' })
		const pageData = { metrics: { currentOccupancy: 97 } }
		service.getOccupancyAnalyticsPageData!.mockResolvedValue(pageData)

		const response = await controller.getPageData(request as Request)

		expect(service.getOccupancyAnalyticsPageData).toHaveBeenCalledWith(
			'user-12'
		)
		expect(response).toEqual({
			success: true,
			data: pageData,
			message: 'Occupancy analytics page data retrieved successfully',
			timestamp: expect.any(Date)
		})
	})
})
