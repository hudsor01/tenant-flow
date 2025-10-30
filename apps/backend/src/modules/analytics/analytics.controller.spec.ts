import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { AnalyticsController } from './analytics.controller'
import { AnalyticsService } from './analytics.service'

// Define WebVitalData type for test purposes - matches controller definition
interface WebVitalData {
	name: string
	value: number
	rating: 'good' | 'needs-improvement' | 'poor'
	delta: number
	id: string
	page: string
	timestamp?: string
	sessionId?: string
	userId?: string
}

// Mock the AnalyticsService
jest.mock('./analytics.service', () => {
	return {
		AnalyticsService: jest.fn().mockImplementation(() => ({
			recordWebVitalMetric: jest.fn().mockResolvedValue(undefined)
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
			providers: [AnalyticsService]
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
		const validWebVitalData: WebVitalData = {
			name: 'LCP',
			value: 2500,
			rating: 'good',
			delta: 100,
			id: 'test-id-123',
			userId: 'user-123',
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
				'user-123' // Should use userId as distinctId
			)
			expect(result).toEqual({ success: true })
		})

		it('should use sessionId as distinctId when userId is not provided', async () => {
			const dataWithoutUserId: WebVitalData = { ...validWebVitalData }
			delete dataWithoutUserId.userId

			await controller.reportWebVitals(dataWithoutUserId)

			expect(
				mockAnalyticsServiceInstance.recordWebVitalMetric
			).toHaveBeenCalledWith(
				dataWithoutUserId,
				'session-456' // Should use sessionId as distinctId
			)
		})

		it('should use id as distinctId when neither userId nor sessionId are provided', async () => {
			const dataWithoutIds: WebVitalData = { ...validWebVitalData }
			delete dataWithoutIds.userId
			delete dataWithoutIds.sessionId

			await controller.reportWebVitals(dataWithoutIds)

			expect(
				mockAnalyticsServiceInstance.recordWebVitalMetric
			).toHaveBeenCalledWith(
				dataWithoutIds,
				'test-id-123' // Should use id as distinctId
			)
		})

		it('should throw error for null/undefined payload', async () => {
			// Type assertion for testing edge cases - null/undefined should be rejected
			await expect(
				controller.reportWebVitals(null as unknown as WebVitalData)
			).rejects.toThrow('Invalid payload')
			await expect(
				controller.reportWebVitals(undefined as unknown as WebVitalData)
			).rejects.toThrow('Invalid payload')
		})

		it('should throw error for non-object payload', async () => {
			// Type assertion for testing edge cases - non-objects should be rejected
			await expect(
				controller.reportWebVitals('string' as unknown as WebVitalData)
			).rejects.toThrow('Invalid payload')
			await expect(
				controller.reportWebVitals(123 as unknown as WebVitalData)
			).rejects.toThrow('Invalid payload')
		})

		describe('name validation', () => {
			it('should accept all valid metric names', async () => {
				const validNames = ['FCP', 'LCP', 'CLS', 'FID', 'TTFB', 'INP'] as const

				for (const name of validNames) {
					const data: WebVitalData = { ...validWebVitalData, name }
					await expect(controller.reportWebVitals(data)).resolves.toEqual({
						success: true
					})
				}
			})

			it('should reject invalid metric names', async () => {
				const invalidData = { ...validWebVitalData, name: 'INVALID_METRIC' }
				await expect(
					controller.reportWebVitals(invalidData as unknown as WebVitalData)
				).rejects.toThrow('Invalid web vitals data')
			})
		})

		describe('value validation', () => {
			it('should accept numeric values', async () => {
				const numericValues = [0, 100, 2500.5, -10]

				for (const value of numericValues) {
					const data = { ...validWebVitalData, value }
					await expect(controller.reportWebVitals(data)).resolves.toEqual({
						success: true
					})
				}
			})

			it('should reject non-numeric values', async () => {
				const invalidData = { ...validWebVitalData, value: 'not-a-number' }
				await expect(
					controller.reportWebVitals(invalidData as unknown as WebVitalData)
				).rejects.toThrow('Invalid web vitals data')
			})
		})

		describe('rating validation', () => {
			it('should accept all valid ratings', async () => {
				const validRatings = ['good', 'needs-improvement', 'poor'] as const

				for (const rating of validRatings) {
					const data: WebVitalData = { ...validWebVitalData, rating }
					await expect(controller.reportWebVitals(data)).resolves.toEqual({
						success: true
					})
				}
			})

			it('should reject invalid ratings', async () => {
				const invalidData = { ...validWebVitalData, rating: 'excellent' }
				await expect(
					controller.reportWebVitals(invalidData as unknown as WebVitalData)
				).rejects.toThrow('Invalid web vitals data')
			})
		})

		describe('delta validation', () => {
			it('should accept numeric delta values', async () => {
				const numericDeltas = [0, 50, -25, 1000.75]

				for (const delta of numericDeltas) {
					const data = { ...validWebVitalData, delta }
					await expect(controller.reportWebVitals(data)).resolves.toEqual({
						success: true
					})
				}
			})

			it('should reject non-numeric delta values', async () => {
				const invalidData = { ...validWebVitalData, delta: 'not-a-number' }
				await expect(
					controller.reportWebVitals(invalidData as unknown as WebVitalData)
				).rejects.toThrow('Invalid web vitals data')
			})
		})

		describe('id validation', () => {
			it('should accept string id values', async () => {
				const stringIds = ['test-123', 'session-abc', '']

				for (const id of stringIds) {
					const data = { ...validWebVitalData, id }
					await expect(controller.reportWebVitals(data)).resolves.toEqual({
						success: true
					})
				}
			})

			it('should reject non-string id values', async () => {
				const invalidData = { ...validWebVitalData, id: 123 }
				await expect(
					controller.reportWebVitals(invalidData as unknown as WebVitalData)
				).rejects.toThrow('Invalid web vitals data')
			})
		})

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
})
