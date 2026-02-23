import { Test } from '@nestjs/testing'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import { SupabaseService } from '../../database/supabase.service'
import { FinancialReportService } from './financial-report.service'

describe('FinancialReportService', () => {
	let service: FinancialReportService
	let mockAdminClient: { from: jest.Mock }

	const USER_ID = 'user-123'

	// Chainable builder: every Supabase fluent method returns `this`;
	// the builder itself is thenable so `await query` resolves.
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
				FinancialReportService,
				{
					provide: SupabaseService,
					useValue: { getAdminClient: jest.fn(() => mockAdminClient) },
				},
				{ provide: AppLogger, useValue: new SilentLogger() },
			],
		})
			.setLogger(new SilentLogger())
			.compile()
		service = module.get<FinancialReportService>(FinancialReportService)
	})

	afterEach(() => { jest.resetAllMocks() })

	// ================================================================
	// getMonthlyRevenue
	// ================================================================
	describe('getMonthlyRevenue', () => {
		it('returns empty array when user has no properties', async () => {
			mockAdminClient.from.mockReturnValue(
				createChainBuilder({ data: [], error: null })
			)
			const result = await service.getMonthlyRevenue(USER_ID)
			expect(result).toEqual([])
		})

		it('returns monthly revenue data including succeeded payments', async () => {
			const now = new Date()
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const paymentsBuilder = createChainBuilder({
				data: [{ id: 'pay-1', amount: 100000, status: 'succeeded', created_at: now.toISOString() }],
				error: null,
			})
			const unitsBuilder = createChainBuilder({ data: [{ id: 'unit-1', property_id: 'prop-1' }], error: null })
			const leasesBuilder = createChainBuilder({ data: [{ id: 'lease-1', unit_id: 'unit-1' }], error: null })

			mockAdminClient.from
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(paymentsBuilder)
				.mockReturnValueOnce(unitsBuilder)
				.mockReturnValueOnce(leasesBuilder)

			const result = await service.getMonthlyRevenue(USER_ID, 1)

			expect(Array.isArray(result)).toBe(true)
			const monthWithRevenue = result.find(r => r.revenue > 0)
			expect(monthWithRevenue?.revenue).toBe(1000)
		})

		it('returns zero revenue when all payments are non-succeeded', async () => {
			// The DB query filters status='succeeded', so mock returns empty array
			// (failed payments would never be returned by the real query)
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const paymentsBuilder = createChainBuilder({ data: [], error: null })
			const unitsBuilder = createChainBuilder({ data: [], error: null })
			const leasesBuilder = createChainBuilder({ data: [], error: null })

			mockAdminClient.from
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(paymentsBuilder)
				.mockReturnValueOnce(unitsBuilder)
				.mockReturnValueOnce(leasesBuilder)

			const result = await service.getMonthlyRevenue(USER_ID, 1)
			expect(result.reduce((s, r) => s + r.revenue, 0)).toBe(0)
		})

		it('tracks unit and occupancy counts per month bucket', async () => {
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const paymentsBuilder = createChainBuilder({ data: [], error: null })
			const unitsBuilder = createChainBuilder({
				data: [{ id: 'unit-1', property_id: 'prop-1' }, { id: 'unit-2', property_id: 'prop-1' }],
				error: null,
			})
			const leasesBuilder = createChainBuilder({ data: [{ id: 'lease-1', unit_id: 'unit-1' }], error: null })

			mockAdminClient.from
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(paymentsBuilder)
				.mockReturnValueOnce(unitsBuilder)
				.mockReturnValueOnce(leasesBuilder)

			const result = await service.getMonthlyRevenue(USER_ID, 1)
			expect(result[0].unitCount).toBe(2)
			expect(result[0].occupiedUnits).toBe(1)
		})

		it('throws when Supabase client throws', async () => {
			mockAdminClient.from.mockImplementation(() => { throw new Error('Connection failed') })
			await expect(service.getMonthlyRevenue(USER_ID)).rejects.toThrow('Connection failed')
		})
	})

	// ================================================================
	// getPaymentAnalytics
	// ================================================================
	describe('getPaymentAnalytics', () => {
		it('returns empty analytics when user has no properties', async () => {
			mockAdminClient.from.mockReturnValue(createChainBuilder({ data: [], error: null }))
			const result = await service.getPaymentAnalytics(USER_ID)
			expect(result.totalPayments).toBe(0)
			expect(result.totalRevenue).toBe(0)
		})

		it('returns empty analytics when no payments are returned', async () => {
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const rentPaymentsQB = createChainBuilder({ data: null, error: null })
			const unitsBuilder = createChainBuilder({ data: [{ id: 'unit-1' }], error: null })
			const paymentsResult = createChainBuilder({ data: null, error: null })

			mockAdminClient.from
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(rentPaymentsQB)
				.mockReturnValueOnce(unitsBuilder)
				.mockReturnValueOnce(paymentsResult)

			const result = await service.getPaymentAnalytics(USER_ID)
			expect(result.totalPayments).toBe(0)
		})

		it('calculates correct totals from payment data', async () => {
			// getPaymentAnalytics makes 3 from() calls: properties, rent_payments (query builder), units
			// The rent_payments query builder is awaited directly, so its data is the payments result
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const payments = [
				{ id: 'p1', amount: 200000, status: 'succeeded', payment_method_type: 'card', created_at: new Date().toISOString() },
				{ id: 'p2', amount: 100000, status: 'failed', payment_method_type: 'ach', created_at: new Date().toISOString() },
				{ id: 'p3', amount: 50000, status: 'pending', payment_method_type: 'card', created_at: new Date().toISOString() },
			]
			const rentPaymentsQB = createChainBuilder({ data: payments, error: null })
			const unitsBuilder = createChainBuilder({ data: [{ id: 'unit-1' }], error: null })

			mockAdminClient.from
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(rentPaymentsQB)
				.mockReturnValueOnce(unitsBuilder)

			const result = await service.getPaymentAnalytics(USER_ID)
			expect(result.totalPayments).toBe(3)
			expect(result.successfulPayments).toBe(1)
			expect(result.failedPayments).toBe(1)
			expect(result.totalRevenue).toBe(2000)
			expect(result.paymentsByMethod.card).toBe(2)
			expect(result.paymentsByMethod.ach).toBe(1)
			expect(result.paymentsByStatus.completed).toBe(1)
			expect(result.paymentsByStatus.pending).toBe(1)
			expect(result.paymentsByStatus.failed).toBe(1)
		})

		it('applies gte and lte date filters when start/end dates provided', async () => {
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const rentPaymentsQB = createChainBuilder({ data: null, error: null })
			const unitsBuilder = createChainBuilder({ data: [], error: null })
			const paymentsResult = createChainBuilder({ data: null, error: null })

			mockAdminClient.from
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(rentPaymentsQB)
				.mockReturnValueOnce(unitsBuilder)
				.mockReturnValueOnce(paymentsResult)

			await service.getPaymentAnalytics(USER_ID, '2024-01-01', '2024-12-31')
			expect(rentPaymentsQB.gte).toHaveBeenCalledWith('created_at', '2024-01-01')
			expect(rentPaymentsQB.lte).toHaveBeenCalledWith('created_at', '2024-12-31')
		})

		it('calculates average payment amount correctly', async () => {
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const payments = [
				{ id: 'p1', amount: 200000, status: 'succeeded', payment_method_type: 'card', created_at: new Date().toISOString() },
				{ id: 'p2', amount: 200000, status: 'succeeded', payment_method_type: 'card', created_at: new Date().toISOString() },
			]
			const rentPaymentsQB = createChainBuilder({ data: payments, error: null })
			const unitsBuilder = createChainBuilder({ data: [{ id: 'unit-1' }], error: null })

			mockAdminClient.from
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(rentPaymentsQB)
				.mockReturnValueOnce(unitsBuilder)

			const result = await service.getPaymentAnalytics(USER_ID)
			expect(result.averagePayment).toBe(2000)
		})

		it('throws when Supabase throws unexpectedly', async () => {
			mockAdminClient.from.mockImplementation(() => { throw new Error('DB error') })
			await expect(service.getPaymentAnalytics(USER_ID)).rejects.toThrow('DB error')
		})
	})

	// ================================================================
	// getFinancialReport
	// ================================================================
	describe('getFinancialReport', () => {
		it('returns empty report when user has no properties', async () => {
			mockAdminClient.from.mockReturnValue(createChainBuilder({ data: [], error: null }))
			const result = await service.getFinancialReport(USER_ID)
			expect(result.summary.totalIncome).toBe(0)
			expect(result.summary.totalExpenses).toBe(0)
			expect(result.summary.netIncome).toBe(0)
			expect(result.monthly).toEqual([])
			expect(result.rentRoll).toEqual([])
		})

		it('aggregates income only from succeeded payments', async () => {
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const paymentsBuilder = createChainBuilder({
				data: [
					{ amount: 150000, status: 'succeeded', created_at: new Date().toISOString(), lease: { unit: { property_id: 'prop-1' } } },
					{ amount: 100000, status: 'failed', created_at: new Date().toISOString(), lease: { unit: { property_id: 'prop-1' } } },
				],
				error: null,
			})
			const maintenanceBuilder = createChainBuilder({ data: [], error: null })
			const expensesBuilder = createChainBuilder({ data: [], error: null })
			const unitsBuilder = createChainBuilder({ data: [], error: null })
			const activeLeasesBuilder = createChainBuilder({ data: [], error: null })
			const propsDetailBuilder = createChainBuilder({ data: [{ id: 'prop-1', name: 'Prop A' }], error: null })

			mockAdminClient.from
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(paymentsBuilder)
				.mockReturnValueOnce(maintenanceBuilder)
				.mockReturnValueOnce(expensesBuilder)
				.mockReturnValueOnce(unitsBuilder)
				.mockReturnValueOnce(activeLeasesBuilder)
				.mockReturnValueOnce(propsDetailBuilder)

			const result = await service.getFinancialReport(USER_ID)
			expect(result.summary.totalIncome).toBe(1500)
		})

		it('uses actual_cost for maintenance expenses', async () => {
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const paymentsBuilder = createChainBuilder({ data: [], error: null })
			const maintenanceBuilder = createChainBuilder({
				data: [{ id: 'm1', created_at: new Date().toISOString(), completed_at: null, actual_cost: 50000, estimated_cost: null, unit: { property_id: 'prop-1' } }],
				error: null,
			})
			const expensesBuilder = createChainBuilder({ data: [], error: null })
			const unitsBuilder = createChainBuilder({ data: [], error: null })
			const activeLeasesBuilder = createChainBuilder({ data: [], error: null })
			const propsDetailBuilder = createChainBuilder({ data: [{ id: 'prop-1', name: 'Prop A' }], error: null })

			mockAdminClient.from
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(paymentsBuilder)
				.mockReturnValueOnce(maintenanceBuilder)
				.mockReturnValueOnce(expensesBuilder)
				.mockReturnValueOnce(unitsBuilder)
				.mockReturnValueOnce(activeLeasesBuilder)
				.mockReturnValueOnce(propsDetailBuilder)

			const result = await service.getFinancialReport(USER_ID)
			expect(result.summary.totalExpenses).toBe(500)
		})

		it('falls back to estimated_cost when actual_cost is null', async () => {
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const paymentsBuilder = createChainBuilder({ data: [], error: null })
			const maintenanceBuilder = createChainBuilder({
				data: [{ id: 'm1', created_at: new Date().toISOString(), completed_at: null, actual_cost: null, estimated_cost: 20000, unit: { property_id: 'prop-1' } }],
				error: null,
			})
			const expensesBuilder = createChainBuilder({ data: [], error: null })
			const unitsBuilder = createChainBuilder({ data: [], error: null })
			const activeLeasesBuilder = createChainBuilder({ data: [], error: null })
			const propsDetailBuilder = createChainBuilder({ data: [{ id: 'prop-1', name: 'Prop A' }], error: null })

			mockAdminClient.from
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(paymentsBuilder)
				.mockReturnValueOnce(maintenanceBuilder)
				.mockReturnValueOnce(expensesBuilder)
				.mockReturnValueOnce(unitsBuilder)
				.mockReturnValueOnce(activeLeasesBuilder)
				.mockReturnValueOnce(propsDetailBuilder)

			const result = await service.getFinancialReport(USER_ID)
			expect(result.summary.totalExpenses).toBe(200)
		})

		it('calculates occupancy rate from active leases vs total units', async () => {
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const paymentsBuilder = createChainBuilder({ data: [], error: null })
			const maintenanceBuilder = createChainBuilder({ data: [], error: null })
			const expensesBuilder = createChainBuilder({ data: [], error: null })
			const unitsBuilder = createChainBuilder({
				data: [
					{ id: 'unit-1', property_id: 'prop-1', rent_amount: 100000 },
					{ id: 'unit-2', property_id: 'prop-1', rent_amount: 100000 },
				],
				error: null,
			})
			const activeLeasesBuilder = createChainBuilder({
				data: [{ id: 'lease-1', unit_id: 'unit-1', unit: { property_id: 'prop-1' } }],
				error: null,
			})
			const propsDetailBuilder = createChainBuilder({ data: [{ id: 'prop-1', name: 'Prop A' }], error: null })

			mockAdminClient.from
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(paymentsBuilder)
				.mockReturnValueOnce(maintenanceBuilder)
				.mockReturnValueOnce(expensesBuilder)
				.mockReturnValueOnce(unitsBuilder)
				.mockReturnValueOnce(activeLeasesBuilder)
				.mockReturnValueOnce(propsDetailBuilder)

			const result = await service.getFinancialReport(USER_ID)
			expect(result.rentRoll[0].occupancyRate).toBe(50)
			expect(result.summary.rentRollOccupancyRate).toBe(50)
		})

		it('net income equals income minus expenses', async () => {
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const paymentsBuilder = createChainBuilder({
				data: [{ amount: 100000, status: 'succeeded', created_at: new Date().toISOString(), lease: { unit: { property_id: 'prop-1' } } }],
				error: null,
			})
			const maintenanceBuilder = createChainBuilder({
				data: [{ id: 'm1', created_at: new Date().toISOString(), completed_at: null, actual_cost: 30000, estimated_cost: null, unit: { property_id: 'prop-1' } }],
				error: null,
			})
			const expensesBuilder = createChainBuilder({ data: [], error: null })
			const unitsBuilder = createChainBuilder({ data: [], error: null })
			const activeLeasesBuilder = createChainBuilder({ data: [], error: null })
			const propsDetailBuilder = createChainBuilder({ data: [{ id: 'prop-1', name: 'Prop A' }], error: null })

			mockAdminClient.from
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(paymentsBuilder)
				.mockReturnValueOnce(maintenanceBuilder)
				.mockReturnValueOnce(expensesBuilder)
				.mockReturnValueOnce(unitsBuilder)
				.mockReturnValueOnce(activeLeasesBuilder)
				.mockReturnValueOnce(propsDetailBuilder)

			const result = await service.getFinancialReport(USER_ID)
			expect(result.summary.netIncome).toBe(result.summary.totalIncome - result.summary.totalExpenses)
			expect(result.summary.cashFlow).toBe(result.summary.netIncome)
		})

		it('uses provided date range parameters', async () => {
			mockAdminClient.from.mockReturnValue(createChainBuilder({ data: [], error: null }))
			const result = await service.getFinancialReport(USER_ID, '2024-01-01', '2024-12-31')
			expect(result.summary.totalIncome).toBe(0)
		})

		it('builds vendor expense breakdown for expense entries', async () => {
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const paymentsBuilder = createChainBuilder({ data: [], error: null })
			const maintenanceBuilder = createChainBuilder({ data: [], error: null })
			const expensesBuilder = createChainBuilder({
				data: [{ amount: 30000, expense_date: new Date().toISOString(), vendor_name: 'Acme Plumbing', maintenance_requests: { units: { property_id: 'prop-1' } } }],
				error: null,
			})
			const unitsBuilder = createChainBuilder({ data: [], error: null })
			const activeLeasesBuilder = createChainBuilder({ data: [], error: null })
			const propsDetailBuilder = createChainBuilder({ data: [{ id: 'prop-1', name: 'Prop A' }], error: null })

			mockAdminClient.from
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(paymentsBuilder)
				.mockReturnValueOnce(maintenanceBuilder)
				.mockReturnValueOnce(expensesBuilder)
				.mockReturnValueOnce(unitsBuilder)
				.mockReturnValueOnce(activeLeasesBuilder)
				.mockReturnValueOnce(propsDetailBuilder)

			const result = await service.getFinancialReport(USER_ID)
			const vendorEntry = result.expenseBreakdown.find(e => e.category.includes('Acme Plumbing'))
			expect(vendorEntry).toBeDefined()
			expect(vendorEntry?.amount).toBe(300)
		})
	})
})
