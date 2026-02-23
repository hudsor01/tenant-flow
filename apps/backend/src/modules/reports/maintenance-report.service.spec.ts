import { Test } from '@nestjs/testing'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import { SupabaseService } from '../../database/supabase.service'
import { MaintenanceReportService } from './maintenance-report.service'

describe('MaintenanceReportService', () => {
	let service: MaintenanceReportService
	let mockAdminClient: { from: jest.Mock }

	const USER_ID = 'user-123'

	const createChainBuilder = (resolvedValue: {
		data: unknown
		error: unknown
		count?: number | null
	}) => {
		const builder: Record<string, jest.Mock> = {}
		const chainMethods = ['select', 'eq', 'neq', 'in', 'gte', 'lte', 'order', 'limit']
		for (const method of chainMethods) {
			builder[method] = jest.fn().mockReturnValue(builder)
		}
		builder.single = jest.fn().mockResolvedValue(resolvedValue)
		builder.maybeSingle = jest.fn().mockResolvedValue(resolvedValue)
		const thenFn = (resolve: (v: unknown) => void) =>
			Promise.resolve(resolvedValue).then(resolve)
		Object.defineProperty(builder, 'then', {
			value: thenFn,
			writable: true,
			enumerable: false,
		})
		return builder
	}

	beforeEach(async () => {
		mockAdminClient = { from: jest.fn() }
		const module = await Test.createTestingModule({
			providers: [
				MaintenanceReportService,
				{
					provide: SupabaseService,
					useValue: { getAdminClient: jest.fn(() => mockAdminClient) },
				},
				{ provide: AppLogger, useValue: new SilentLogger() },
			],
		})
			.setLogger(new SilentLogger())
			.compile()
		service = module.get<MaintenanceReportService>(MaintenanceReportService)
	})

	afterEach(() => { jest.resetAllMocks() })

	// ================================================================
	// getMaintenanceReport
	// ================================================================
	describe('getMaintenanceReport', () => {
		it('returns empty report when user has no properties', async () => {
			// loadPropertyIdsByOwner queries from('properties')
			mockAdminClient.from.mockReturnValue(
				createChainBuilder({ data: [], error: null })
			)
			const result = await service.getMaintenanceReport(USER_ID)
			expect(result.summary.totalRequests).toBe(0)
			expect(result.summary.openRequests).toBe(0)
			expect(result.summary.totalCost).toBe(0)
			expect(result.byStatus).toEqual([])
			expect(result.byPriority).toEqual([])
			expect(result.vendorPerformance).toEqual([])
		})

		it('counts open vs completed requests correctly', async () => {
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const maintenanceBuilder = createChainBuilder({
				data: [
					{ id: 'm1', status: 'open', priority: 'normal', created_at: new Date().toISOString(), completed_at: null, actual_cost: null, estimated_cost: null, unit: { property_id: 'prop-1' } },
					{ id: 'm2', status: 'completed', priority: 'high', created_at: '2024-01-01T00:00:00Z', completed_at: '2024-01-02T00:00:00Z', actual_cost: 10000, estimated_cost: null, unit: { property_id: 'prop-1' } },
				],
				error: null,
			})
			const expensesBuilder = createChainBuilder({ data: [], error: null })

			mockAdminClient.from
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(maintenanceBuilder)
				.mockReturnValueOnce(expensesBuilder)

			const result = await service.getMaintenanceReport(USER_ID)
			expect(result.summary.totalRequests).toBe(2)
			expect(result.summary.openRequests).toBe(1)
		})

		it('builds byStatus breakdown from request statuses', async () => {
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const maintenanceBuilder = createChainBuilder({
				data: [
					{ id: 'm1', status: 'open', priority: 'normal', created_at: new Date().toISOString(), completed_at: null, actual_cost: null, estimated_cost: null, unit: { property_id: 'prop-1' } },
					{ id: 'm2', status: 'open', priority: 'high', created_at: new Date().toISOString(), completed_at: null, actual_cost: null, estimated_cost: null, unit: { property_id: 'prop-1' } },
					{ id: 'm3', status: 'completed', priority: 'low', created_at: '2024-01-01T00:00:00Z', completed_at: '2024-01-02T00:00:00Z', actual_cost: null, estimated_cost: null, unit: { property_id: 'prop-1' } },
				],
				error: null,
			})
			const expensesBuilder = createChainBuilder({ data: [], error: null })

			mockAdminClient.from
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(maintenanceBuilder)
				.mockReturnValueOnce(expensesBuilder)

			const result = await service.getMaintenanceReport(USER_ID)
			const openStatus = result.byStatus.find(s => s.status === 'open')
			const completedStatus = result.byStatus.find(s => s.status === 'completed')
			expect(openStatus?.count).toBe(2)
			expect(completedStatus?.count).toBe(1)
		})

		it('builds byPriority breakdown from request priorities', async () => {
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const maintenanceBuilder = createChainBuilder({
				data: [
					{ id: 'm1', status: 'open', priority: 'urgent', created_at: new Date().toISOString(), completed_at: null, actual_cost: null, estimated_cost: null, unit: { property_id: 'prop-1' } },
					{ id: 'm2', status: 'open', priority: 'normal', created_at: new Date().toISOString(), completed_at: null, actual_cost: null, estimated_cost: null, unit: { property_id: 'prop-1' } },
				],
				error: null,
			})
			const expensesBuilder = createChainBuilder({ data: [], error: null })

			mockAdminClient.from
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(maintenanceBuilder)
				.mockReturnValueOnce(expensesBuilder)

			const result = await service.getMaintenanceReport(USER_ID)
			const urgentPriority = result.byPriority.find(p => p.priority === 'urgent')
			expect(urgentPriority?.count).toBe(1)
		})

		it('calculates total cost from actual_cost in cents', async () => {
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const maintenanceBuilder = createChainBuilder({
				data: [
					{ id: 'm1', status: 'completed', priority: 'normal', created_at: '2024-01-01T00:00:00Z', completed_at: '2024-01-02T00:00:00Z', actual_cost: 50000, estimated_cost: null, unit: { property_id: 'prop-1' } },
					{ id: 'm2', status: 'completed', priority: 'normal', created_at: '2024-01-01T00:00:00Z', completed_at: '2024-01-03T00:00:00Z', actual_cost: 30000, estimated_cost: null, unit: { property_id: 'prop-1' } },
				],
				error: null,
			})
			const expensesBuilder = createChainBuilder({ data: [], error: null })

			mockAdminClient.from
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(maintenanceBuilder)
				.mockReturnValueOnce(expensesBuilder)

			const result = await service.getMaintenanceReport(USER_ID)
			expect(result.summary.totalCost).toBe(800)
		})

		it('falls back to estimated_cost when actual_cost is null', async () => {
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const maintenanceBuilder = createChainBuilder({
				data: [
					{ id: 'm1', status: 'open', priority: 'normal', created_at: new Date().toISOString(), completed_at: null, actual_cost: null, estimated_cost: 20000, unit: { property_id: 'prop-1' } },
				],
				error: null,
			})
			const expensesBuilder = createChainBuilder({ data: [], error: null })

			mockAdminClient.from
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(maintenanceBuilder)
				.mockReturnValueOnce(expensesBuilder)

			const result = await service.getMaintenanceReport(USER_ID)
			expect(result.summary.totalCost).toBe(200)
		})

		it('calculates average resolution hours from completed requests', async () => {
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			// 2 hours = 2 * 60 * 60 * 1000 ms between created_at and completed_at
			const created = '2024-01-01T00:00:00Z'
			const completed = '2024-01-01T02:00:00Z'
			const maintenanceBuilder = createChainBuilder({
				data: [
					{ id: 'm1', status: 'completed', priority: 'normal', created_at: created, completed_at: completed, actual_cost: null, estimated_cost: null, unit: { property_id: 'prop-1' } },
				],
				error: null,
			})
			const expensesBuilder = createChainBuilder({ data: [], error: null })

			mockAdminClient.from
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(maintenanceBuilder)
				.mockReturnValueOnce(expensesBuilder)

			const result = await service.getMaintenanceReport(USER_ID)
			expect(result.summary.avgResolutionHours).toBe(2)
		})

		it('builds vendor performance from expense records', async () => {
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const maintenanceBuilder = createChainBuilder({ data: [], error: null })
			const expensesBuilder = createChainBuilder({
				data: [
					{ amount: 50000, expense_date: new Date().toISOString(), vendor_name: 'Acme Plumbing', maintenance_requests: { units: { property_id: 'prop-1' } } },
					{ amount: 30000, expense_date: new Date().toISOString(), vendor_name: 'Acme Plumbing', maintenance_requests: { units: { property_id: 'prop-1' } } },
					{ amount: 20000, expense_date: new Date().toISOString(), vendor_name: 'Quick Electric', maintenance_requests: { units: { property_id: 'prop-1' } } },
				],
				error: null,
			})

			mockAdminClient.from
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(maintenanceBuilder)
				.mockReturnValueOnce(expensesBuilder)

			const result = await service.getMaintenanceReport(USER_ID)
			const acme = result.vendorPerformance.find(v => v.vendorName === 'Acme Plumbing')
			const electric = result.vendorPerformance.find(v => v.vendorName === 'Quick Electric')
			expect(acme?.totalSpend).toBe(800)
			expect(acme?.jobs).toBe(2)
			expect(electric?.totalSpend).toBe(200)
			expect(electric?.jobs).toBe(1)
		})

		it('assigns "Unknown" vendor name for expenses without vendor_name', async () => {
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const maintenanceBuilder = createChainBuilder({ data: [], error: null })
			const expensesBuilder = createChainBuilder({
				data: [
					{ amount: 10000, expense_date: new Date().toISOString(), vendor_name: null, maintenance_requests: { units: { property_id: 'prop-1' } } },
				],
				error: null,
			})

			mockAdminClient.from
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(maintenanceBuilder)
				.mockReturnValueOnce(expensesBuilder)

			const result = await service.getMaintenanceReport(USER_ID)
			const unknown = result.vendorPerformance.find(v => v.vendorName === 'Unknown')
			expect(unknown).toBeDefined()
		})

		it('returns monthly cost buckets for each month in range', async () => {
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const maintenanceBuilder = createChainBuilder({ data: [], error: null })
			const expensesBuilder = createChainBuilder({ data: [], error: null })

			mockAdminClient.from
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(maintenanceBuilder)
				.mockReturnValueOnce(expensesBuilder)

			// Use mid-month dates to avoid UTC/local-time boundary causing December 2023 to appear
			const result = await service.getMaintenanceReport(USER_ID, '2024-01-15', '2024-03-15')
			expect(Array.isArray(result.monthlyCost)).toBe(true)
			// 3 months: Jan, Feb, Mar
			expect(result.monthlyCost.length).toBe(3)
		})

		it('uses provided date range parameters', async () => {
			mockAdminClient.from.mockReturnValue(
				createChainBuilder({ data: [], error: null })
			)
			const result = await service.getMaintenanceReport(USER_ID, '2024-01-01', '2024-12-31')
			expect(result.summary.totalRequests).toBe(0)
		})

		it('calculates averageCost as totalCost divided by totalRequests', async () => {
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const maintenanceBuilder = createChainBuilder({
				data: [
					{ id: 'm1', status: 'completed', priority: 'normal', created_at: '2024-01-01T00:00:00Z', completed_at: '2024-01-02T00:00:00Z', actual_cost: 20000, estimated_cost: null, unit: { property_id: 'prop-1' } },
					{ id: 'm2', status: 'completed', priority: 'normal', created_at: '2024-01-01T00:00:00Z', completed_at: '2024-01-02T00:00:00Z', actual_cost: 40000, estimated_cost: null, unit: { property_id: 'prop-1' } },
				],
				error: null,
			})
			const expensesBuilder = createChainBuilder({ data: [], error: null })

			mockAdminClient.from
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(maintenanceBuilder)
				.mockReturnValueOnce(expensesBuilder)

			const result = await service.getMaintenanceReport(USER_ID)
			expect(result.summary.totalCost).toBe(600)
			expect(result.summary.averageCost).toBe(300)
		})
	})
})
