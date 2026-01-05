/**
 * SubscriptionsService (Facade) Tests
 * Tests delegation to specialized services
 */

import { Test } from '@nestjs/testing'
import { SubscriptionsService } from './subscriptions.service'
import { SubscriptionQueryService } from './subscription-query.service'
import { SubscriptionBillingService } from './subscription-billing.service'
import { SubscriptionLifecycleService } from './subscription-lifecycle.service'
import { SilentLogger } from '../__tests__/silent-logger'
import { AppLogger } from '../logger/app-logger.service'

describe('SubscriptionsService (Facade)', () => {
	let service: SubscriptionsService
	let mockQueryService: jest.Mocked<SubscriptionQueryService>
	let mockBillingService: jest.Mocked<SubscriptionBillingService>
	let mockLifecycleService: jest.Mocked<SubscriptionLifecycleService>

	const mockUserId = 'user-123'
	const mockLeaseId = 'lease-abc'

	beforeEach(async () => {
		mockQueryService = {
			getSubscription: jest.fn(),
			listSubscriptions: jest.fn()
		} as unknown as jest.Mocked<SubscriptionQueryService>

		mockBillingService = {
			createSubscription: jest.fn(),
			updateSubscription: jest.fn()
		} as unknown as jest.Mocked<SubscriptionBillingService>

		mockLifecycleService = {
			pauseSubscription: jest.fn(),
			resumeSubscription: jest.fn(),
			cancelSubscription: jest.fn()
		} as unknown as jest.Mocked<SubscriptionLifecycleService>

		const module = await Test.createTestingModule({
			providers: [
				SubscriptionsService,
				{ provide: SubscriptionQueryService, useValue: mockQueryService },
				{ provide: SubscriptionBillingService, useValue: mockBillingService },
				{
					provide: SubscriptionLifecycleService,
					useValue: mockLifecycleService
				},
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		service = module.get<SubscriptionsService>(SubscriptionsService)
	})

	type CreateSubscriptionResponse = Awaited<
		ReturnType<SubscriptionBillingService['createSubscription']>
	>
	type UpdateSubscriptionResponse = Awaited<
		ReturnType<SubscriptionBillingService['updateSubscription']>
	>
	type SubscriptionResponse = Awaited<
		ReturnType<SubscriptionQueryService['getSubscription']>
	>
	type SubscriptionListResponse = Awaited<
		ReturnType<SubscriptionQueryService['listSubscriptions']>
	>
	type LifecycleResponse = Awaited<
		ReturnType<SubscriptionLifecycleService['pauseSubscription']>
	>

	describe('createSubscription', () => {
		it('should delegate to billing service', async () => {
			const mockRequest = {
				leaseId: mockLeaseId,
				paymentMethodId: 'pm-123',
				amount: 1500,
				billingDayOfMonth: 1,
				currency: 'usd'
			}
			const mockResponse: CreateSubscriptionResponse = {
				id: mockLeaseId,
				status: 'active'
			} as CreateSubscriptionResponse
			mockBillingService.createSubscription.mockResolvedValue(mockResponse)

			const result = await service.createSubscription(mockUserId, mockRequest)

			expect(mockBillingService.createSubscription).toHaveBeenCalledWith(
				mockUserId,
				mockRequest
			)
			expect(result).toBe(mockResponse)
		})
	})

	describe('getSubscription', () => {
		it('should delegate to query service', async () => {
			const mockResponse: SubscriptionResponse = {
				id: mockLeaseId
			} as SubscriptionResponse
			mockQueryService.getSubscription.mockResolvedValue(mockResponse)

			const result = await service.getSubscription(mockLeaseId, mockUserId)

			expect(mockQueryService.getSubscription).toHaveBeenCalledWith(
				mockLeaseId,
				mockUserId
			)
			expect(result).toBe(mockResponse)
		})
	})

	describe('listSubscriptions', () => {
		it('should delegate to query service', async () => {
			const mockResponse: SubscriptionListResponse = [
				{ id: mockLeaseId }
			] as SubscriptionListResponse
			mockQueryService.listSubscriptions.mockResolvedValue(mockResponse)

			const result = await service.listSubscriptions(mockUserId)

			expect(mockQueryService.listSubscriptions).toHaveBeenCalledWith(
				mockUserId
			)
			expect(result).toBe(mockResponse)
		})
	})

	describe('pauseSubscription', () => {
		it('should delegate to lifecycle service', async () => {
			const mockResponse: LifecycleResponse = {
				success: true,
				message: 'Paused'
			} as LifecycleResponse
			mockLifecycleService.pauseSubscription.mockResolvedValue(mockResponse)

			const result = await service.pauseSubscription(mockLeaseId, mockUserId)

			expect(mockLifecycleService.pauseSubscription).toHaveBeenCalledWith(
				mockLeaseId,
				mockUserId
			)
			expect(result).toBe(mockResponse)
		})
	})

	describe('resumeSubscription', () => {
		it('should delegate to lifecycle service', async () => {
			const mockResponse: LifecycleResponse = {
				success: true,
				message: 'Resumed'
			} as LifecycleResponse
			mockLifecycleService.resumeSubscription.mockResolvedValue(mockResponse)

			const result = await service.resumeSubscription(mockLeaseId, mockUserId)

			expect(mockLifecycleService.resumeSubscription).toHaveBeenCalledWith(
				mockLeaseId,
				mockUserId
			)
			expect(result).toBe(mockResponse)
		})
	})

	describe('cancelSubscription', () => {
		it('should delegate to lifecycle service', async () => {
			const mockResponse: LifecycleResponse = {
				success: true,
				message: 'Canceled'
			} as LifecycleResponse
			mockLifecycleService.cancelSubscription.mockResolvedValue(mockResponse)

			const result = await service.cancelSubscription(mockLeaseId, mockUserId)

			expect(mockLifecycleService.cancelSubscription).toHaveBeenCalledWith(
				mockLeaseId,
				mockUserId
			)
			expect(result).toBe(mockResponse)
		})
	})

	describe('updateSubscription', () => {
		it('should delegate to billing service', async () => {
			const mockUpdate = { amount: 2000 }
			const mockResponse: UpdateSubscriptionResponse = {
				id: mockLeaseId,
				amount: 2000
			} as UpdateSubscriptionResponse
			mockBillingService.updateSubscription.mockResolvedValue(mockResponse)

			const result = await service.updateSubscription(
				mockLeaseId,
				mockUserId,
				mockUpdate
			)

			expect(mockBillingService.updateSubscription).toHaveBeenCalledWith(
				mockLeaseId,
				mockUserId,
				mockUpdate
			)
			expect(result).toBe(mockResponse)
		})
	})
})
