import { Logger } from '@nestjs/common'
import type { SupabaseService } from '../../database/supabase.service'
import { LeaseAnalyticsService } from './lease-analytics.service'

describe('LeaseAnalyticsService', () => {
	let service: LeaseAnalyticsService
	let mockSupabase: jest.Mocked<Pick<SupabaseService, 'getAdminClient'>>
	let mockRpc: jest.Mock
	let warnSpy: jest.SpyInstance

	beforeEach(() => {
		warnSpy = jest
			.spyOn(Logger.prototype, 'warn')
			.mockImplementation(() => undefined)

		mockRpc = jest.fn()
		mockSupabase = {
			getAdminClient: jest.fn().mockReturnValue({ rpc: mockRpc })
		} as unknown as jest.Mocked<
			Pick<SupabaseService, 'getAdminClient' | 'rpcWithRetries'>
		>
		;(mockSupabase as unknown as any).rpcWithRetries = jest
			.fn()
			.mockImplementation((fn: string, payload: Record<string, unknown>) => {
				return (mockSupabase.getAdminClient() as any).rpc(fn, payload)
			})

		service = new LeaseAnalyticsService(
			mockSupabase as unknown as SupabaseService
		)
	})

	afterEach(() => {
		warnSpy.mockRestore()
	})

	it('maps lease financial summary from RPC response', async () => {
		const summary = {
			total_leases: 25,
			active_leases: 18,
			expiring_soon: 4,
			total_monthly_rent: 42500,
			average_lease_value: 1800
		}

		mockRpc.mockResolvedValue({ data: summary, error: null })

		const result = await service.getLeaseFinancialSummary('tenant-1')

		expect(mockRpc).toHaveBeenCalledWith(
			'get_lease_financial_summary',
			expect.objectContaining({ user_id: 'tenant-1' })
		)
		expect(result).toEqual({
			totalLeases: 25,
			activeLeases: 18,
			expiringSoon: 4,
			totalrent_amount: 42500,
			averageLeaseValue: 1800
		})
	})

	it('returns safe defaults when RPC reports an error', async () => {
		mockRpc.mockResolvedValue({ data: null, error: { message: 'timeout' } })

		const [summary, profitability, lifecycle, status] = await Promise.all([
			service.getLeaseFinancialSummary('tenant-2'),
			service.getLeasesWithFinancialAnalytics('tenant-2'),
			service.getLeaseLifecycleData('tenant-2'),
			service.getLeaseStatusBreakdown('tenant-2')
		])

		expect(summary).toEqual({
			totalLeases: 0,
			activeLeases: 0,
			expiringSoon: 0,
			totalrent_amount: 0,
			averageLeaseValue: 0
		})
		expect(profitability).toEqual([])
		expect(lifecycle).toEqual([])
		expect(status).toEqual([])
	})

	it('handles RPC exceptions and still returns mapped defaults', async () => {
		mockRpc.mockRejectedValue(new Error('connection reset'))

		const result = await service.getLeasesWithFinancialAnalytics('tenant-3')

		expect(result).toEqual([])
	})

	it('builds page data by aggregating multiple RPC calls', async () => {
		const summary = {
			total_leases: 10,
			active_leases: 8,
			expiring_soon: 1,
			total_monthly_rent: 24000,
			average_lease_value: 1600
		}
		const profitability = [
			{
				lease_id: 'lease-001',
				property_name: 'Elm Apartments',
				tenant_name: 'Jane Doe',
				monthly_rent: 1800,
				outstanding_balance: 250,
				profitability_score: 78
			}
		]
		const lifecycle = [
			{ period: '2024-01', renewals: 2, expirations: 1, notices: 0 }
		]
		const status = [{ status: 'Active', count: 8, percentage: 80 }]

		mockRpc
			.mockResolvedValueOnce({ data: summary, error: null })
			.mockResolvedValueOnce({ data: profitability, error: null })
			.mockResolvedValueOnce({ data: lifecycle, error: null })
			.mockResolvedValueOnce({ data: status, error: null })

		const pageData = await service.getLeaseAnalyticsPageData('tenant-4')

		expect(mockRpc).toHaveBeenCalledTimes(4)
		expect(pageData).toEqual({
			metrics: {
				totalLeases: 10,
				activeLeases: 8,
				expiringSoon: 1,
				totalrent_amount: 24000,
				averageLeaseValue: 1600
			},
			profitability: [
				{
					lease_id: 'lease-001',
					propertyName: 'Elm Apartments',
					tenantName: 'Jane Doe',
					rent_amount: 1800,
					outstandingBalance: 250,
					profitabilityScore: 78
				}
			],
			lifecycle: [
				{
					period: '2024-01',
					renewals: 2,
					expirations: 1,
					noticesGiven: 0
				}
			],
			statusBreakdown: [
				{
					status: 'Active',
					count: 8,
					percentage: 80
				}
			]
		})
	})
})
