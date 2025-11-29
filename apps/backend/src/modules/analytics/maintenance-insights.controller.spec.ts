import { Test, type TestingModule } from '@nestjs/testing'
import { MaintenanceInsightsController } from './maintenance-insights.controller'
import { MaintenanceInsightsService } from './maintenance-insights.service'

describe('MaintenanceInsightsController', () => {
	let controller: MaintenanceInsightsController
	let service: Record<string, jest.Mock>

	const TEST_USER_ID = 'user-5'

	beforeEach(async () => {
		service = {
			getMaintenanceMetrics: jest.fn(),
			getMaintenanceAnalytics: jest.fn(),
			getMaintenanceInsightsPageData: jest.fn()
		}

		const module: TestingModule = await Test.createTestingModule({
			controllers: [MaintenanceInsightsController],
			providers: [
				{
					provide: MaintenanceInsightsService,
					useValue: service
				}
			]
		}).compile()

		controller = module.get(MaintenanceInsightsController)
	})

	it('returns maintenance metrics from the service', async () => {
		const metrics = { openRequests: 3 }
		service.getMaintenanceMetrics!.mockResolvedValue(metrics)

		const response = await controller.getMaintenanceMetrics(TEST_USER_ID)

		expect(service.getMaintenanceMetrics).toHaveBeenCalledWith(TEST_USER_ID)
		expect(response).toEqual({
			success: true,
			data: metrics,
			message: 'Maintenance metrics retrieved successfully',
			timestamp: expect.any(Date)
		})
	})

	it('returns maintenance analytics', async () => {
		const analytics = { trends: [] }
		service.getMaintenanceAnalytics!.mockResolvedValue(analytics)

		const response = await controller.getMaintenanceAnalytics(TEST_USER_ID)

		expect(service.getMaintenanceAnalytics).toHaveBeenCalledWith(TEST_USER_ID)
		expect(response).toEqual({
			success: true,
			data: analytics,
			message: 'Maintenance analytics retrieved successfully',
			timestamp: expect.any(Date)
		})
	})

	it('returns maintenance page data', async () => {
		const pageData = { metrics: { openRequests: 2 } }
		service.getMaintenanceInsightsPageData!.mockResolvedValue(pageData)

		const response = await controller.getMaintenancePageData(TEST_USER_ID)

		expect(service.getMaintenanceInsightsPageData).toHaveBeenCalledWith(
			TEST_USER_ID
		)
		expect(response).toEqual({
			success: true,
			data: pageData,
			message: 'Maintenance insights page data retrieved successfully',
			timestamp: expect.any(Date)
		})
	})
})
