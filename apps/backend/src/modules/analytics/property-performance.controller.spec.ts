import { Test, type TestingModule } from '@nestjs/testing'
import { PropertyPerformanceController } from './property-performance.controller'
import { PropertyPerformanceService } from './property-performance.service'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

describe('PropertyPerformanceController', () => {
	let controller: PropertyPerformanceController
	let service: Record<string, jest.Mock>

	const TEST_USER_ID = 'user-42'

	// Mock authenticated request
	const mockRequest = {
		user: { id: TEST_USER_ID, email: 'test@example.com' }
	} as unknown as import('../../shared/types/express-request.types').AuthenticatedRequest

	beforeEach(async () => {
		service = {
			getPropertyPerformance: jest.fn(),
			getPropertyUnits: jest.fn(),
			getUnitStatistics: jest.fn(),
			getVisitorAnalytics: jest.fn(),
			getPropertyPerformancePageData: jest.fn()
		}

		const module: TestingModule = await Test.createTestingModule({
			controllers: [PropertyPerformanceController],
			providers: [
				{
					provide: PropertyPerformanceService,
					useValue: service
				},
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		controller = module.get(PropertyPerformanceController)
	})

	it('returns property performance payload from the service', async () => {
		const payload = [{ property_id: 'prop-1' }]
		service.getPropertyPerformance!.mockResolvedValue(payload)

		const response = await controller.getPropertyPerformance(mockRequest)

		expect(service.getPropertyPerformance).toHaveBeenCalledWith(TEST_USER_ID)
		expect(response).toEqual({
			success: true,
			data: payload,
			message: 'Property performance retrieved successfully',
			timestamp: expect.any(Date)
		})
	})

	it('returns property units from the service', async () => {
		const units = [{ unit_id: 'unit-9' }]
		service.getPropertyUnits!.mockResolvedValue(units)

		const response = await controller.getPropertyUnits(mockRequest)

		expect(service.getPropertyUnits).toHaveBeenCalledWith(TEST_USER_ID)
		expect(response).toEqual({
			success: true,
			data: units,
			message: 'Property units retrieved successfully',
			timestamp: expect.any(Date)
		})
	})

	it('returns unit statistics from the service', async () => {
		const stats = [{ label: 'Vacant Units', value: 2 }]
		service.getUnitStatistics!.mockResolvedValue(stats)

		const response = await controller.getUnitStatistics(mockRequest)

		expect(service.getUnitStatistics).toHaveBeenCalledWith(TEST_USER_ID)
		expect(response).toEqual({
			success: true,
			data: stats,
			message: 'Unit statistics retrieved successfully',
			timestamp: expect.any(Date)
		})
	})

	it('returns visitor analytics from the service', async () => {
		const visitorAnalytics = { summary: { totalVisits: 100 }, timeline: [] }
		service.getVisitorAnalytics!.mockResolvedValue(visitorAnalytics)

		const response = await controller.getVisitorAnalytics(mockRequest)

		expect(service.getVisitorAnalytics).toHaveBeenCalledWith(TEST_USER_ID)
		expect(response).toEqual({
			success: true,
			data: visitorAnalytics,
			message: 'Visitor analytics retrieved successfully',
			timestamp: expect.any(Date)
		})
	})

	it('returns aggregated page data from the service', async () => {
		const pageData = { metrics: { totalProperties: 2 } }
		service.getPropertyPerformancePageData!.mockResolvedValue(pageData)

		const response =
			await controller.getPropertyPerformancePageData(mockRequest)

		expect(service.getPropertyPerformancePageData).toHaveBeenCalledWith(
			TEST_USER_ID
		)
		expect(response).toEqual({
			success: true,
			data: pageData,
			message: 'Property performance analytics retrieved successfully',
			timestamp: expect.any(Date)
		})
	})
})
