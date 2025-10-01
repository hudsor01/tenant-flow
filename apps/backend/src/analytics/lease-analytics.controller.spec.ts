import { UnauthorizedException } from '@nestjs/common'
import { Test, type TestingModule } from '@nestjs/testing'
import type { Request } from 'express'
import { SupabaseService } from '../database/supabase.service'
import { LeaseAnalyticsController } from './lease-analytics.controller'
import { LeaseAnalyticsService } from './lease-analytics.service'

describe('LeaseAnalyticsController', () => {
	let controller: LeaseAnalyticsController
	let service: Record<string, jest.Mock>
	let supabase: { getUser: jest.Mock }

	const createRequest = (): Partial<Request> => ({
		path: '/analytics/leases',
		method: 'GET',
		headers: {},
		cookies: {}
	})

	beforeEach(async () => {
		service = {
			getLeasesWithFinancialAnalytics: jest.fn(),
			getLeaseFinancialSummary: jest.fn(),
			getLeaseLifecycleData: jest.fn(),
			getLeaseStatusBreakdown: jest.fn(),
			getLeaseAnalyticsPageData: jest.fn()
		}

		supabase = { getUser: jest.fn() }

		const module: TestingModule = await Test.createTestingModule({
			controllers: [LeaseAnalyticsController],
			providers: [
				{
					provide: LeaseAnalyticsService,
					useValue: service
				},
				{
					provide: SupabaseService,
					useValue: supabase
				}
			]
		}).compile()

		controller = module.get(LeaseAnalyticsController)
	})

	it('requires authentication to access lease analytics', async () => {
		supabase.getUser.mockResolvedValue(null)
		const request = createRequest()

		await expect(
			controller.getLeaseAnalytics(request as Request)
		).rejects.toBeInstanceOf(UnauthorizedException)
	})

	it('returns lease analytics from the service', async () => {
		const request = createRequest()
		supabase.getUser.mockResolvedValue({ id: 'user-77' })
		const payload = [{ leaseId: 'lease-1' }]
		service.getLeasesWithFinancialAnalytics.mockResolvedValue(payload)

		const response = await controller.getLeaseAnalytics(request as Request)

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
		const request = { ...createRequest(), path: '/analytics/lease-summary' }
		supabase.getUser.mockResolvedValue({ id: 'user-77' })
		const summary = { totalLeases: 12 }
		service.getLeaseFinancialSummary.mockResolvedValue(summary)

		const response = await controller.getLeaseSummary(request as Request)

		expect(service.getLeaseFinancialSummary).toHaveBeenCalledWith('user-77')
		expect(response).toEqual({
			success: true,
			data: summary,
			message: 'Lease financial summary retrieved successfully',
			timestamp: expect.any(Date)
		})
	})

	it('returns lease lifecycle data', async () => {
		const request = { ...createRequest(), path: '/analytics/lease-lifecycle' }
		supabase.getUser.mockResolvedValue({ id: 'user-77' })
		const lifecycle = [{ period: '2024-01' }]
		service.getLeaseLifecycleData.mockResolvedValue(lifecycle)

		const response = await controller.getLeaseLifecycle(request as Request)

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
			...createRequest(),
			path: '/analytics/lease-status-breakdown'
		}
		supabase.getUser.mockResolvedValue({ id: 'user-77' })
		const status = [{ status: 'Active', count: 10 }]
		service.getLeaseStatusBreakdown.mockResolvedValue(status)

		const response = await controller.getLeaseStatusBreakdown(
			request as Request
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
		const request = { ...createRequest(), path: '/analytics/lease/page-data' }
		supabase.getUser.mockResolvedValue({ id: 'user-77' })
		const pageData = { metrics: { totalLeases: 12 } }
		service.getLeaseAnalyticsPageData.mockResolvedValue(pageData)

		const response = await controller.getLeasePageData(request as Request)

		expect(service.getLeaseAnalyticsPageData).toHaveBeenCalledWith('user-77')
		expect(response).toEqual({
			success: true,
			data: pageData,
			message: 'Lease analytics page data retrieved successfully',
			timestamp: expect.any(Date)
		})
	})
})
