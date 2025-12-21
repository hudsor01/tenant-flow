import { Test, TestingModule } from '@nestjs/testing'
import { DashboardEventAggregatorService } from './dashboard-event-aggregator.service'
import { SseService } from '../../notifications/sse/sse.service'
import { AppLogger } from '../../../logger/app-logger.service'
import { SSE_EVENT_TYPES } from '@repo/shared/events/sse-events'

describe('DashboardEventAggregatorService', () => {
	let service: DashboardEventAggregatorService
	let sseService: jest.Mocked<SseService>

	const mockOwnerId = 'owner-123'

	beforeEach(async () => {
		jest.useFakeTimers()

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				DashboardEventAggregatorService,
				{
					provide: SseService,
					useValue: {
						broadcast: jest.fn().mockResolvedValue(undefined),
						isUserConnected: jest.fn().mockReturnValue(true)
					}
				},
				{
					provide: AppLogger,
					useValue: {
						log: jest.fn(),
						debug: jest.fn(),
						warn: jest.fn(),
						error: jest.fn()
					}
				}
			]
		}).compile()

		service = module.get<DashboardEventAggregatorService>(DashboardEventAggregatorService)
		sseService = module.get(SseService)
	})

	afterEach(() => {
		service.onModuleDestroy()
		jest.useRealTimers()
	})

	describe('event handlers', () => {
		it('should handle payment.received event', () => {
			service.handlePaymentReceived({ ownerId: mockOwnerId })

			// Advance timers to trigger flush
			jest.advanceTimersByTime(5000)

			expect(sseService.broadcast).toHaveBeenCalledWith(
				mockOwnerId,
				expect.objectContaining({
					type: SSE_EVENT_TYPES.DASHBOARD_STATS_UPDATED,
					payload: {
						affectedCategories: expect.arrayContaining(['revenue', 'payments'])
					}
				})
			)
		})

		it('should handle payment.failed event', () => {
			service.handlePaymentFailed({ ownerId: mockOwnerId })

			jest.advanceTimersByTime(5000)

			expect(sseService.broadcast).toHaveBeenCalledWith(
				mockOwnerId,
				expect.objectContaining({
					type: SSE_EVENT_TYPES.DASHBOARD_STATS_UPDATED,
					payload: {
						affectedCategories: ['payments']
					}
				})
			)
		})

		it('should handle maintenance.created event', () => {
			service.handleMaintenanceCreated({ ownerId: mockOwnerId })

			jest.advanceTimersByTime(5000)

			expect(sseService.broadcast).toHaveBeenCalledWith(
				mockOwnerId,
				expect.objectContaining({
					type: SSE_EVENT_TYPES.DASHBOARD_STATS_UPDATED,
					payload: {
						affectedCategories: ['maintenance']
					}
				})
			)
		})

		it('should handle maintenance.updated event', () => {
			service.handleMaintenanceUpdated({ ownerId: mockOwnerId })

			jest.advanceTimersByTime(5000)

			expect(sseService.broadcast).toHaveBeenCalledWith(
				mockOwnerId,
				expect.objectContaining({
					payload: {
						affectedCategories: ['maintenance']
					}
				})
			)
		})

		it('should handle lease.activated event', () => {
			service.handleLeaseActivated({ ownerId: mockOwnerId })

			jest.advanceTimersByTime(5000)

			expect(sseService.broadcast).toHaveBeenCalledWith(
				mockOwnerId,
				expect.objectContaining({
					payload: {
						affectedCategories: expect.arrayContaining(['occupancy', 'revenue'])
					}
				})
			)
		})

		it('should handle tenant.created event', () => {
			service.handleTenantCreated({ ownerId: mockOwnerId })

			jest.advanceTimersByTime(5000)

			expect(sseService.broadcast).toHaveBeenCalledWith(
				mockOwnerId,
				expect.objectContaining({
					payload: {
						affectedCategories: ['occupancy']
					}
				})
			)
		})

		it('should handle lease.subscription_created event', () => {
			service.handleSubscriptionCreated({ ownerId: mockOwnerId })

			jest.advanceTimersByTime(5000)

			expect(sseService.broadcast).toHaveBeenCalledWith(
				mockOwnerId,
				expect.objectContaining({
					payload: {
						affectedCategories: ['revenue']
					}
				})
			)
		})

		it('should ignore events without ownerId', () => {
			service.handlePaymentReceived({ ownerId: '' })
			service.handlePaymentFailed({ ownerId: '' })
			service.handleMaintenanceUpdated({ ownerId: '' })

			jest.advanceTimersByTime(5000)

			expect(sseService.broadcast).not.toHaveBeenCalled()
		})
	})

	describe('debouncing', () => {
		it('should batch multiple events within debounce window', () => {
			// Fire multiple events rapidly
			service.handlePaymentReceived({ ownerId: mockOwnerId })
			service.handleMaintenanceCreated({ ownerId: mockOwnerId })
			service.handleLeaseActivated({ ownerId: mockOwnerId })

			// Advance past debounce window
			jest.advanceTimersByTime(5000)

			// Should only broadcast once with all categories
			expect(sseService.broadcast).toHaveBeenCalledTimes(1)
			expect(sseService.broadcast).toHaveBeenCalledWith(
				mockOwnerId,
				expect.objectContaining({
					payload: {
						affectedCategories: expect.arrayContaining([
							'revenue',
							'payments',
							'maintenance',
							'occupancy'
						])
					}
				})
			)
		})

		it('should not broadcast before debounce window expires', () => {
			service.handlePaymentReceived({ ownerId: mockOwnerId })

			// Only 2 seconds elapsed
			jest.advanceTimersByTime(2000)

			expect(sseService.broadcast).not.toHaveBeenCalled()
		})

		it('should handle multiple owners independently', () => {
			const ownerId2 = 'owner-456'

			service.handlePaymentReceived({ ownerId: mockOwnerId })
			service.handleMaintenanceCreated({ ownerId: ownerId2 })

			jest.advanceTimersByTime(5000)

			expect(sseService.broadcast).toHaveBeenCalledTimes(2)
			expect(sseService.broadcast).toHaveBeenCalledWith(
				mockOwnerId,
				expect.objectContaining({
					payload: {
						affectedCategories: expect.arrayContaining(['revenue', 'payments'])
					}
				})
			)
			expect(sseService.broadcast).toHaveBeenCalledWith(
				ownerId2,
				expect.objectContaining({
					payload: {
						affectedCategories: ['maintenance']
					}
				})
			)
		})
	})

	describe('SSE connection check', () => {
		it('should skip broadcast if user is not connected', () => {
			sseService.isUserConnected.mockReturnValue(false)

			service.handlePaymentReceived({ ownerId: mockOwnerId })

			jest.advanceTimersByTime(5000)

			expect(sseService.broadcast).not.toHaveBeenCalled()
		})
	})

	describe('cleanup', () => {
		it('should cleanup timers on module destroy', () => {
			service.handlePaymentReceived({ ownerId: mockOwnerId })

			// Destroy before timer fires
			service.onModuleDestroy()

			// Advance timers - should not throw or broadcast
			jest.advanceTimersByTime(10000)

			expect(sseService.broadcast).not.toHaveBeenCalled()
		})
	})
})
