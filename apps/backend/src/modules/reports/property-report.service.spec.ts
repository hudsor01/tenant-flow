import { Test } from '@nestjs/testing'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import { SupabaseService } from '../../database/supabase.service'
import { PropertyReportService } from './property-report.service'

describe('PropertyReportService', () => {
	let service: PropertyReportService
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
				PropertyReportService,
				{
					provide: SupabaseService,
					useValue: { getAdminClient: jest.fn(() => mockAdminClient) },
				},
				{ provide: AppLogger, useValue: new SilentLogger() },
			],
		})
			.setLogger(new SilentLogger())
			.compile()
		service = module.get<PropertyReportService>(PropertyReportService)
	})

	afterEach(() => { jest.resetAllMocks() })

	// ================================================================
	// getOccupancyMetrics
	// ================================================================
	describe('getOccupancyMetrics', () => {
		it('returns empty metrics when no properties found', async () => {
			mockAdminClient.from.mockReturnValue(
				createChainBuilder({ data: null, error: null })
			)
			const result = await service.getOccupancyMetrics(USER_ID)
			expect(result.totalUnits).toBe(0)
			expect(result.occupiedUnits).toBe(0)
			expect(result.vacantUnits).toBe(0)
			expect(result.byProperty).toEqual([])
		})

		it('calculates total units and occupied units from lease data', async () => {
			const propertiesWithUnits = [
				{
					id: 'prop-1',
					name: 'Property One',
					units: [
						{ id: 'unit-1', leases: [{ id: 'lease-1', lease_status: 'active' }] },
						{ id: 'unit-2', leases: [] },
					],
				},
			]
			mockAdminClient.from.mockReturnValue(
				createChainBuilder({ data: propertiesWithUnits, error: null })
			)
			const result = await service.getOccupancyMetrics(USER_ID)
			expect(result.totalUnits).toBe(2)
			expect(result.occupiedUnits).toBe(1)
			expect(result.vacantUnits).toBe(1)
			expect(result.occupancyRate).toBe(50)
		})

		it('filters by owner_user_id when querying properties', async () => {
			const propertiesBuilder = createChainBuilder({ data: [], error: null })
			mockAdminClient.from.mockReturnValue(propertiesBuilder)
			await service.getOccupancyMetrics(USER_ID)
			expect(propertiesBuilder.eq).toHaveBeenCalledWith('owner_user_id', USER_ID)
		})

		it('marks unit as occupied only when an active lease exists', async () => {
			const propertiesWithUnits = [
				{
					id: 'prop-1',
					name: 'Property One',
					units: [
						{ id: 'unit-1', leases: [{ id: 'lease-1', lease_status: 'expired' }] },
						{ id: 'unit-2', leases: [{ id: 'lease-2', lease_status: 'active' }] },
					],
				},
			]
			mockAdminClient.from.mockReturnValue(
				createChainBuilder({ data: propertiesWithUnits, error: null })
			)
			const result = await service.getOccupancyMetrics(USER_ID)
			expect(result.occupiedUnits).toBe(1)
		})

		it('includes byProperty breakdown with per-property occupancy rate', async () => {
			const propertiesWithUnits = [
				{
					id: 'prop-1',
					name: 'Property One',
					units: [
						{ id: 'unit-1', leases: [{ id: 'l1', lease_status: 'active' }] },
						{ id: 'unit-2', leases: [] },
						{ id: 'unit-3', leases: [] },
					],
				},
			]
			mockAdminClient.from.mockReturnValue(
				createChainBuilder({ data: propertiesWithUnits, error: null })
			)
			const result = await service.getOccupancyMetrics(USER_ID)
			expect(result.byProperty).toHaveLength(1)
			expect(result.byProperty[0].propertyName).toBe('Property One')
			expect(result.byProperty[0].totalUnits).toBe(3)
			expect(result.byProperty[0].occupiedUnits).toBe(1)
			expect(result.byProperty[0].occupancyRate).toBeCloseTo(33.33, 1)
		})

		it('handles zero units per property gracefully', async () => {
			const propertiesWithUnits = [{ id: 'prop-1', name: 'Empty Property', units: [] }]
			mockAdminClient.from.mockReturnValue(
				createChainBuilder({ data: propertiesWithUnits, error: null })
			)
			const result = await service.getOccupancyMetrics(USER_ID)
			expect(result.byProperty[0].occupancyRate).toBe(0)
		})

		it('throws when Supabase client throws', async () => {
			mockAdminClient.from.mockImplementation(() => { throw new Error('DB error') })
			await expect(service.getOccupancyMetrics(USER_ID)).rejects.toThrow('DB error')
		})
	})

	// ================================================================
	// getPropertyReport
	// ================================================================
	describe('getPropertyReport', () => {
		it('returns empty report when user has no properties', async () => {
			// loadPropertyIdsByOwner: from('properties').select('id').eq('owner_user_id', ...)
			mockAdminClient.from.mockReturnValue(
				createChainBuilder({ data: [], error: null })
			)
			const result = await service.getPropertyReport(USER_ID)
			expect(result.summary.totalProperties).toBe(0)
			expect(result.summary.totalUnits).toBe(0)
			expect(result.byProperty).toEqual([])
		})

		it('returns property report with occupancy and revenue data', async () => {
			const propertiesIdsBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1', name: 'Prop A' }], error: null })
			const unitsBuilder = createChainBuilder({ data: [{ id: 'unit-1', property_id: 'prop-1' }], error: null })
			const activeLeasesBuilder = createChainBuilder({
				data: [{ id: 'lease-1', unit_id: 'unit-1', unit: { property_id: 'prop-1' } }],
				error: null,
			})
			const paymentsBuilder = createChainBuilder({
				data: [{ amount: 100000, status: 'succeeded', created_at: new Date().toISOString(), lease: { unit: { property_id: 'prop-1' } } }],
				error: null,
			})
			const maintenanceBuilder = createChainBuilder({ data: [], error: null })

			mockAdminClient.from
				.mockReturnValueOnce(propertiesIdsBuilder) // loadPropertyIdsByOwner
				.mockReturnValueOnce(propertiesBuilder)   // properties names
				.mockReturnValueOnce(unitsBuilder)        // units
				.mockReturnValueOnce(activeLeasesBuilder) // active leases
				.mockReturnValueOnce(paymentsBuilder)     // rent_payments
				.mockReturnValueOnce(maintenanceBuilder)  // maintenance_requests

			const result = await service.getPropertyReport(USER_ID)
			expect(result.summary.totalProperties).toBe(1)
			expect(result.summary.totalUnits).toBe(1)
			expect(result.summary.occupiedUnits).toBe(1)
			expect(result.summary.occupancyRate).toBe(100)
			expect(result.byProperty).toHaveLength(1)
			expect(result.byProperty[0].propertyName).toBe('Prop A')
			expect(result.byProperty[0].revenue).toBe(1000)
		})

		it('counts vacant units correctly in byProperty', async () => {
			const propertiesIdsBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1', name: 'Prop A' }], error: null })
			const unitsBuilder = createChainBuilder({
				data: [
					{ id: 'unit-1', property_id: 'prop-1' },
					{ id: 'unit-2', property_id: 'prop-1' },
				],
				error: null,
			})
			const activeLeasesBuilder = createChainBuilder({ data: [], error: null })
			const paymentsBuilder = createChainBuilder({ data: [], error: null })
			const maintenanceBuilder = createChainBuilder({ data: [], error: null })

			mockAdminClient.from
				.mockReturnValueOnce(propertiesIdsBuilder)
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(unitsBuilder)
				.mockReturnValueOnce(activeLeasesBuilder)
				.mockReturnValueOnce(paymentsBuilder)
				.mockReturnValueOnce(maintenanceBuilder)

			const result = await service.getPropertyReport(USER_ID)
			expect(result.byProperty[0].vacantUnits).toBe(2)
			expect(result.byProperty[0].occupancyRate).toBe(0)
		})

		it('aggregates maintenance costs as expenses per property', async () => {
			const propertiesIdsBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1', name: 'Prop A' }], error: null })
			const unitsBuilder = createChainBuilder({ data: [{ id: 'unit-1', property_id: 'prop-1' }], error: null })
			const activeLeasesBuilder = createChainBuilder({ data: [], error: null })
			const paymentsBuilder = createChainBuilder({ data: [], error: null })
			const maintenanceBuilder = createChainBuilder({
				data: [
					{ actual_cost: 50000, estimated_cost: null, completed_at: null, created_at: new Date().toISOString(), unit: { property_id: 'prop-1' } },
				],
				error: null,
			})

			mockAdminClient.from
				.mockReturnValueOnce(propertiesIdsBuilder)
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(unitsBuilder)
				.mockReturnValueOnce(activeLeasesBuilder)
				.mockReturnValueOnce(paymentsBuilder)
				.mockReturnValueOnce(maintenanceBuilder)

			const result = await service.getPropertyReport(USER_ID)
			expect(result.byProperty[0].expenses).toBe(500)
			expect(result.byProperty[0].netOperatingIncome).toBe(-500)
		})

		it('builds occupancyTrend and vacancyTrend arrays', async () => {
			const propertiesIdsBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1', name: 'Prop A' }], error: null })
			const unitsBuilder = createChainBuilder({ data: [], error: null })
			const activeLeasesBuilder = createChainBuilder({ data: [], error: null })
			const paymentsBuilder = createChainBuilder({ data: [], error: null })
			const maintenanceBuilder = createChainBuilder({ data: [], error: null })

			mockAdminClient.from
				.mockReturnValueOnce(propertiesIdsBuilder)
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(unitsBuilder)
				.mockReturnValueOnce(activeLeasesBuilder)
				.mockReturnValueOnce(paymentsBuilder)
				.mockReturnValueOnce(maintenanceBuilder)

			const result = await service.getPropertyReport(USER_ID)
			expect(Array.isArray(result.occupancyTrend)).toBe(true)
			expect(Array.isArray(result.vacancyTrend)).toBe(true)
		})

		it('uses provided date range', async () => {
			mockAdminClient.from.mockReturnValue(
				createChainBuilder({ data: [], error: null })
			)
			const result = await service.getPropertyReport(USER_ID, '2024-01-01', '2024-12-31')
			expect(result.summary.totalProperties).toBe(0)
		})

		it('does not include failed payment revenue', async () => {
			const propertiesIdsBuilder = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
			const propertiesBuilder = createChainBuilder({ data: [{ id: 'prop-1', name: 'Prop A' }], error: null })
			const unitsBuilder = createChainBuilder({ data: [{ id: 'unit-1', property_id: 'prop-1' }], error: null })
			const activeLeasesBuilder = createChainBuilder({ data: [], error: null })
			const paymentsBuilder = createChainBuilder({
				data: [{ amount: 100000, status: 'failed', created_at: new Date().toISOString(), lease: { unit: { property_id: 'prop-1' } } }],
				error: null,
			})
			const maintenanceBuilder = createChainBuilder({ data: [], error: null })

			mockAdminClient.from
				.mockReturnValueOnce(propertiesIdsBuilder)
				.mockReturnValueOnce(propertiesBuilder)
				.mockReturnValueOnce(unitsBuilder)
				.mockReturnValueOnce(activeLeasesBuilder)
				.mockReturnValueOnce(paymentsBuilder)
				.mockReturnValueOnce(maintenanceBuilder)

			const result = await service.getPropertyReport(USER_ID)
			expect(result.byProperty[0].revenue).toBe(0)
		})
	})
})
