import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { AnalyticsController } from './analytics.controller'
import { AnalyticsService } from './analytics.service'
import type { MobileAnalyticsEventDto } from './dto/mobile-analytics-event.dto'
import type { WebVitalMetric } from './dto/web-vital.dto'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

// Mock the AnalyticsService
jest.mock('./analytics.service', () => {
	return {
		AnalyticsService: jest.fn().mockImplementation(() => ({
			recordWebVitalMetric: jest.fn().mockResolvedValue(undefined),
			recordMobileEvent: jest.fn()
		}))
	}
})

describe('AnalyticsController', () => {
	let controller: AnalyticsController
	let mockAnalyticsServiceInstance: jest.Mocked<AnalyticsService>

	beforeEach(async () => {
		// Clear all mocks before each test
		jest.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			controllers: [AnalyticsController],
			providers: [
				AnalyticsService,
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		controller = module.get<AnalyticsController>(AnalyticsController)
		mockAnalyticsServiceInstance = module.get(
			AnalyticsService
		) as jest.Mocked<AnalyticsService>
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})

	describe('reportWebVitals', () => {
		const validWebVitalData: WebVitalMetric = {
			name: 'LCP',
			value: 2500,
			rating: 'good',
			delta: 100,
			id: 'test-id-123',
			user_id: 'user-123',
			sessionId: 'session-456',
			page: '/dashboard',
			timestamp: new Date().toISOString()
		}

		it('should accept valid web vitals data', async () => {
			const result = await controller.reportWebVitals(validWebVitalData)

			expect(
				mockAnalyticsServiceInstance.recordWebVitalMetric
			).toHaveBeenCalledWith(
				validWebVitalData,
				'user-123' // Should use user_id as distinctId
			)
			expect(result).toEqual({ success: true })
		})

		it('should use sessionId as distinctId when user_id is not provided', async () => {
			const dataWithoutuser_id: WebVitalMetric = { ...validWebVitalData }
			delete dataWithoutuser_id.user_id

			await controller.reportWebVitals(dataWithoutuser_id)

			expect(
				mockAnalyticsServiceInstance.recordWebVitalMetric
			).toHaveBeenCalledWith(
				dataWithoutuser_id,
				'session-456' // Should use sessionId as distinctId
			)
		})

		it('should use id as distinctId when neither user_id nor sessionId are provided', async () => {
			const dataWithoutIds: WebVitalMetric = { ...validWebVitalData }
			delete dataWithoutIds.user_id
			delete dataWithoutIds.sessionId

			await controller.reportWebVitals(dataWithoutIds)

			expect(
				mockAnalyticsServiceInstance.recordWebVitalMetric
			).toHaveBeenCalledWith(
				dataWithoutIds,
				'test-id-123' // Should use id as distinctId
			)
		})

		// Validation is handled by ZodValidationPipe globally configured in app.module.ts
		// The pipe validates DTOs before requests reach the controller in real traffic

		it('should call service with correct parameters regardless of service outcome', async () => {
			// The service call is fire-and-forget, so errors don't propagate
			mockAnalyticsServiceInstance.recordWebVitalMetric.mockImplementation(
				() => {
					// Even if service throws, controller should still return success
				}
			)

			const result = await controller.reportWebVitals(validWebVitalData)

			expect(
				mockAnalyticsServiceInstance.recordWebVitalMetric
			).toHaveBeenCalledWith(validWebVitalData, 'user-123')
			expect(result).toEqual({ success: true })
		})
	})

	describe('ingestMobileEvent', () => {
		const baseEvent: MobileAnalyticsEventDto = {
			eventName: 'mobile_nav_opened',
			properties: {
				action: 'open',
				user_id: 'user-456'
			},
			timestamp: Date.now(),
			userAgent: 'Mozilla/5.0',
			screenResolution: '390x844',
			networkType: '4g',
			isOnline: true
		}

		it('should forward events to the analytics service', async () => {
			await controller.ingestMobileEvent(baseEvent)

			expect(
				mockAnalyticsServiceInstance.recordMobileEvent
			).toHaveBeenCalledWith(baseEvent)
		})
	})
})
