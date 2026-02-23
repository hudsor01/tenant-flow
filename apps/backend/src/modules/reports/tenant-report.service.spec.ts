import { Test } from '@nestjs/testing'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import { SupabaseService } from '../../database/supabase.service'
import { TenantReportService } from './tenant-report.service'

describe('TenantReportService', () => {
	let service: TenantReportService
	let mockAdminClient: { from: jest.Mock }
	const USER_ID = 'user-123'

	const createChainBuilder = (resolvedValue: { data: unknown; error: unknown; count?: number | null }) => {
		const builder: Record<string, jest.Mock> = {}
		for (const m of ['select', 'eq', 'neq', 'in', 'gte', 'lte', 'order', 'limit']) {
			builder[m] = jest.fn().mockReturnValue(builder)
		}
		builder.single = jest.fn().mockResolvedValue(resolvedValue)
		builder.maybeSingle = jest.fn().mockResolvedValue(resolvedValue)
		Object.defineProperty(builder, 'then', {
			value: (resolve: (v: unknown) => void) => Promise.resolve(resolvedValue).then(resolve),
			writable: true, enumerable: false,
		})
		return builder
	}

	beforeEach(async () => {
		mockAdminClient = { from: jest.fn() }
		const module = await Test.createTestingModule({
			providers: [
				TenantReportService,
				{ provide: SupabaseService, useValue: { getAdminClient: jest.fn(() => mockAdminClient) } },
				{ provide: AppLogger, useValue: new SilentLogger() },
			],
		}).setLogger(new SilentLogger()).compile()
		service = module.get<TenantReportService>(TenantReportService)
	})

	afterEach(() => { jest.resetAllMocks() })

	describe('getTenantReport', () => {
		it('returns empty report when user has no properties', async () => {
			mockAdminClient.from.mockReturnValue(createChainBuilder({ data: [], error: null }))
			const result = await service.getTenantReport(USER_ID)
			expect(result.summary.totalTenants).toBe(0)
			expect(result.summary.activeLeases).toBe(0)
			expect(result.summary.leasesExpiringNext90).toBe(0)
			expect(result.paymentHistory).toEqual([])
			expect(result.leaseExpirations).toEqual([])
			expect(result.turnover).toEqual([])
		})

		it('counts active leases from lease data', async () => {
			const pIds = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const units = createChainBuilder({ data: [{ id: 'unit-1', property_id: 'prop-1', unit_number: '1A' }], error: null })
			const leases = createChainBuilder({ data: [
				{ id: 'l1', start_date: '2024-01-01', end_date: '2025-01-01', unit_id: 'unit-1', lease_status: 'active', primary_tenant_id: 't1', unit: { property_id: 'prop-1' } },
				{ id: 'l2', start_date: '2023-01-01', end_date: '2023-12-31', unit_id: 'unit-1', lease_status: 'expired', primary_tenant_id: 't2', unit: { property_id: 'prop-1' } },
			], error: null })
			const props = createChainBuilder({ data: [{ id: 'prop-1', name: 'Prop A' }], error: null })
			const payments = createChainBuilder({ data: [], error: null })
			mockAdminClient.from
				.mockReturnValueOnce(pIds).mockReturnValueOnce(units)
				.mockReturnValueOnce(leases).mockReturnValueOnce(props)
				.mockReturnValueOnce(payments)
			const result = await service.getTenantReport(USER_ID)
			expect(result.summary.activeLeases).toBe(1)
		})

		it('counts unique tenant ids across all leases', async () => {
			const pIds = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const units = createChainBuilder({ data: [{ id: 'unit-1', property_id: 'prop-1', unit_number: '1A' }], error: null })
			const leases = createChainBuilder({ data: [
				{ id: 'l1', start_date: '2024-01-01', end_date: '2025-01-01', unit_id: 'unit-1', lease_status: 'active', primary_tenant_id: 't1', unit: { property_id: 'prop-1' } },
				{ id: 'l2', start_date: '2023-01-01', end_date: '2023-12-31', unit_id: 'unit-1', lease_status: 'expired', primary_tenant_id: 't1', unit: { property_id: 'prop-1' } },
				{ id: 'l3', start_date: '2024-01-01', end_date: '2025-01-01', unit_id: 'unit-1', lease_status: 'active', primary_tenant_id: 't2', unit: { property_id: 'prop-1' } },
			], error: null })
			const props = createChainBuilder({ data: [{ id: 'prop-1', name: 'Prop A' }], error: null })
			const payments = createChainBuilder({ data: [], error: null })
			mockAdminClient.from
				.mockReturnValueOnce(pIds).mockReturnValueOnce(units)
				.mockReturnValueOnce(leases).mockReturnValueOnce(props)
				.mockReturnValueOnce(payments)
			const result = await service.getTenantReport(USER_ID)
			expect(result.summary.totalTenants).toBe(2)
		})

		it('identifies leases expiring within next 90 days', async () => {
			const pIds = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const units = createChainBuilder({ data: [{ id: 'unit-1', property_id: 'prop-1', unit_number: '1A' }], error: null })
			const expiring = new Date(); expiring.setDate(expiring.getDate() + 30)
			const farFuture = new Date(); farFuture.setDate(farFuture.getDate() + 200)
			const leases = createChainBuilder({ data: [
				{ id: 'l1', start_date: '2024-01-01', end_date: expiring.toISOString().substring(0, 10), unit_id: 'unit-1', lease_status: 'active', primary_tenant_id: 't1', unit: { property_id: 'prop-1' } },
				{ id: 'l2', start_date: '2024-01-01', end_date: farFuture.toISOString().substring(0, 10), unit_id: 'unit-1', lease_status: 'active', primary_tenant_id: 't2', unit: { property_id: 'prop-1' } },
			], error: null })
			const props = createChainBuilder({ data: [{ id: 'prop-1', name: 'Prop A' }], error: null })
			const payments = createChainBuilder({ data: [], error: null })
			mockAdminClient.from
				.mockReturnValueOnce(pIds).mockReturnValueOnce(units)
				.mockReturnValueOnce(leases).mockReturnValueOnce(props)
				.mockReturnValueOnce(payments)
			const result = await service.getTenantReport(USER_ID)
			expect(result.summary.leasesExpiringNext90).toBe(1)
			expect(result.leaseExpirations).toHaveLength(1)
		})

		it('calculates 100% onTimePaymentRate when all payments are on time', async () => {
			const pIds = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const units = createChainBuilder({ data: [{ id: 'unit-1', property_id: 'prop-1', unit_number: '1A' }], error: null })
			const leases = createChainBuilder({ data: [], error: null })
			const props = createChainBuilder({ data: [{ id: 'prop-1', name: 'Prop A' }], error: null })
			const payments = createChainBuilder({ data: [
				{ id: 'p1', created_at: '2024-01-01T00:00:00Z', due_date: '2024-01-05', paid_date: '2024-01-03', status: 'succeeded', amount: 100000, lease: { unit: { property_id: 'prop-1' } } },
				{ id: 'p2', created_at: '2024-01-02T00:00:00Z', due_date: '2024-01-05', paid_date: '2024-01-04', status: 'succeeded', amount: 100000, lease: { unit: { property_id: 'prop-1' } } },
			], error: null })
			mockAdminClient.from
				.mockReturnValueOnce(pIds).mockReturnValueOnce(units)
				.mockReturnValueOnce(leases).mockReturnValueOnce(props)
				.mockReturnValueOnce(payments)
			const result = await service.getTenantReport(USER_ID, '2024-01-01', '2024-01-31')
			expect(result.summary.onTimePaymentRate).toBe(100)
		})

		it('builds turnover data tracking move-ins by start_date month', async () => {
			const pIds = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const units = createChainBuilder({ data: [{ id: 'unit-1', property_id: 'prop-1', unit_number: '1A' }], error: null })
			const leases = createChainBuilder({ data: [
				{ id: 'l1', start_date: '2024-01-15', end_date: '2024-12-31', unit_id: 'unit-1', lease_status: 'active', primary_tenant_id: 't1', unit: { property_id: 'prop-1' } },
			], error: null })
			const props = createChainBuilder({ data: [{ id: 'prop-1', name: 'Prop A' }], error: null })
			const payments = createChainBuilder({ data: [], error: null })
			mockAdminClient.from
				.mockReturnValueOnce(pIds).mockReturnValueOnce(units)
				.mockReturnValueOnce(leases).mockReturnValueOnce(props)
				.mockReturnValueOnce(payments)
			const result = await service.getTenantReport(USER_ID, '2024-01-01', '2024-01-31')
			const jan = result.turnover.find(t => t.month === '2024-01')
			expect(jan?.moveIns).toBe(1)
		})

		it('uses provided date range', async () => {
			mockAdminClient.from.mockReturnValue(createChainBuilder({ data: [], error: null }))
			const result = await service.getTenantReport(USER_ID, '2024-01-01', '2024-12-31')
			expect(result.summary.totalTenants).toBe(0)
		})

		it('populates lease expiration details with property and unit label', async () => {
			const pIds = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const units = createChainBuilder({ data: [{ id: 'unit-1', property_id: 'prop-1', unit_number: '2B' }], error: null })
			const expDate = new Date(); expDate.setDate(expDate.getDate() + 15)
			const leases = createChainBuilder({ data: [
				{ id: 'l1', start_date: '2024-01-01', end_date: expDate.toISOString().substring(0, 10), unit_id: 'unit-1', lease_status: 'active', primary_tenant_id: 't1', unit: { property_id: 'prop-1' } },
			], error: null })
			const props = createChainBuilder({ data: [{ id: 'prop-1', name: 'River Apts' }], error: null })
			const payments = createChainBuilder({ data: [], error: null })
			mockAdminClient.from
				.mockReturnValueOnce(pIds).mockReturnValueOnce(units)
				.mockReturnValueOnce(leases).mockReturnValueOnce(props)
				.mockReturnValueOnce(payments)
			const result = await service.getTenantReport(USER_ID)
			expect(result.leaseExpirations[0].propertyName).toBe('River Apts')
			expect(result.leaseExpirations[0].unitLabel).toBe('Unit 2B')
			expect(result.leaseExpirations[0].leaseId).toBe('l1')
		})

		it('does not count leases with null primary_tenant_id in totalTenants', async () => {
			const pIds = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const units = createChainBuilder({ data: [{ id: 'unit-1', property_id: 'prop-1', unit_number: '1A' }], error: null })
			const leases = createChainBuilder({ data: [
				{ id: 'l1', start_date: '2024-01-01', end_date: '2025-01-01', unit_id: 'unit-1', lease_status: 'active', primary_tenant_id: null, unit: { property_id: 'prop-1' } },
			], error: null })
			const props = createChainBuilder({ data: [{ id: 'prop-1', name: 'Prop A' }], error: null })
			const payments = createChainBuilder({ data: [], error: null })
			mockAdminClient.from
				.mockReturnValueOnce(pIds).mockReturnValueOnce(units)
				.mockReturnValueOnce(leases).mockReturnValueOnce(props)
				.mockReturnValueOnce(payments)
			const result = await service.getTenantReport(USER_ID)
			expect(result.summary.totalTenants).toBe(0)
		})
	})
})
