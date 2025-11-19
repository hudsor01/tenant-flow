import { UnauthorizedException } from '@nestjs/common'
import { Test, type TestingModule } from '@nestjs/testing'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { LeaseAnalyticsController } from './lease-analytics.controller'
import { LeaseAnalyticsService } from './lease-analytics.service'

describe('LeaseAnalyticsController', () => {
	let controller: LeaseAnalyticsController
	let service: Record<string, jest.Mock>

	const createRequest = (user_id?: string): Partial<AuthenticatedRequest> => ({
		path: '/analytics/leases',
		method: 'GET',
		headers: {},
		cookies: {},
		user: user_id ? ({ id: user_id } as any) : undefined
	})

	beforeEach(async () => {
		service = {
			getLeasesWithFinancialAnalytics: jest.fn(),
			getLeaseFinancialSummary: jest.fn(),
			getLeaseLifecycleData: jest.fn(),
			getLeaseStatusBreakdown: jest.fn(),
			getLeaseAnalyticsPageData: jest.fn()
		}

		const module: TestingModule = await Test.createTestingModule({
			controllers: [LeaseAnalyticsController],
			providers: [
				{
					provide: LeaseAnalyticsService,
					useValue: service
				}
			]
		}).compile()

		controller = module.get(LeaseAnalyticsController)
	})

	it('requires authentication to access lease analytics', async () => {
		const request = createRequest()

		await expect(
			controller.getLeaseAnalytics(request as AuthenticatedRequest)
		).rejects.toBeInstanceOf(UnauthorizedException)
	})

	it('returns lease analytics from the service', async () => {
		const request = createRequest('user-77')
		const payload = [{ lease_id: 'lease-1' }]
		service.getLeasesWithFinancialAnalytics!.mockResolvedValue(payload)

		const response = await controller.getLeaseAnalytics(
			request as AuthenticatedRequest
		)

		expect(service.getLeasesWithFinancialAnalytics).toHaveBeenCalledWith(
			'user-77'
		)
		expect(response).toEqual({
			success: true,
			data: payload,
			message: 'Lease analytics retrieved successfully',
			timestamp: expect.any(Date)
		})
	})

	it('returns lease financial summary', async () => {
		const request = {
			...createRequest('user-77'),
			path: '/analytics/lease-summary'
		}
		const summary = { totalLeases: 12 }
		service.getLeaseFinancialSummary!.mockResolvedValue(summary)

		const response = await controller.getLeaseSummary(
			request as AuthenticatedRequest
		)

		expect(service.getLeaseFinancialSummary).toHaveBeenCalledWith('user-77')
		expect(response).toEqual({
			success: true,
			data: summary,
			message: 'Lease financial summary retrieved successfully',
			timestamp: expect.any(Date)
		})
	})

	it('returns lease lifecycle data', async () => {
		const request = {
			...createRequest('user-77'),
			path: '/analytics/lease-lifecycle'
		}
		const lifecycle = [{ period: '2024-01' }]
		service.getLeaseLifecycleData!.mockResolvedValue(lifecycle)

		const response = await controller.getLeaseLifecycle(
			request as AuthenticatedRequest
		)

		expect(service.getLeaseLifecycleData).toHaveBeenCalledWith('user-77')
		expect(response).toEqual({
			success: true,
			data: lifecycle,
			message: 'Lease lifecycle data retrieved successfully',
			timestamp: expect.any(Date)
		})
	})

	it('returns lease status breakdown', async () => {
		const request = {
			...createRequest('user-77'),
			path: '/analytics/lease-status-breakdown'
		}
		const status = [{ status: 'Active', count: 10 }]
		service.getLeaseStatusBreakdown!.mockResolvedValue(status)

		const response = await controller.getLeaseStatusBreakdown(
			request as AuthenticatedRequest
		)

		expect(service.getLeaseStatusBreakdown).toHaveBeenCalledWith('user-77')
		expect(response).toEqual({
			success: true,
			data: status,
			message: 'Lease status breakdown retrieved successfully',
			timestamp: expect.any(Date)
		})
	})

	it('returns lease analytics page data', async () => {
		const request = {
			...createRequest('user-77'),
			path: '/analytics/lease/page-data'
		}
		const pageData = { metrics: { totalLeases: 12 } }
		service.getLeaseAnalyticsPageData!.mockResolvedValue(pageData)

		const response = await controller.getLeasePageData(
			request as AuthenticatedRequest
		)

		expect(service.getLeaseAnalyticsPageData).toHaveBeenCalledWith('user-77')
		expect(response).toEqual({
			success: true,
			data: pageData,
			message: 'Lease analytics page data retrieved successfully',
			timestamp: expect.any(Date)
		})
	})
})
