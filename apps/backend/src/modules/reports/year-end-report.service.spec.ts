import { Test, TestingModule } from '@nestjs/testing'
import { YearEndReportService } from './year-end-report.service'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import * as reportsUtils from './reports.utils'

// Spy on loadPropertyIdsByOwner so we can control it per-test
jest.mock('./reports.utils', () => ({
	loadPropertyIdsByOwner: jest.fn()
}))

const mockLoadPropertyIdsByOwner = reportsUtils.loadPropertyIdsByOwner as jest.MockedFunction<
	typeof reportsUtils.loadPropertyIdsByOwner
>

function buildSupabaseMock(responses: Record<string, unknown[]>) {
	const chainMethods = (data: unknown[], error: null = null) => {
		const chain: Record<string, unknown> = {}
		const methods = ['select', 'eq', 'in', 'gte', 'lte', 'neq', 'not']
		methods.forEach(m => {
			chain[m] = jest.fn(() => chain)
		})
		chain['then'] = jest.fn(cb => Promise.resolve(cb({ data, error })))
		Object.defineProperty(chain, Symbol.toStringTag, { value: 'Promise' })
		return chain
	}

	const fromMock = jest.fn((table: string) => chainMethods(responses[table] ?? []))

	return {
		getAdminClient: jest.fn(() => ({
			from: fromMock
		})),
		fromMock
	}
}

const USER_ID = 'user-123'
const YEAR = 2024
const PROPERTY_ID = 'prop-abc'

describe('YearEndReportService', () => {
	let service: YearEndReportService
	let supabaseMock: ReturnType<typeof buildSupabaseMock>

	beforeEach(async () => {
		jest.clearAllMocks()
	})

	async function createService(responses: Record<string, unknown[]>) {
		supabaseMock = buildSupabaseMock(responses)

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				YearEndReportService,
				{
					provide: SupabaseService,
					useValue: supabaseMock
				},
				{
					provide: AppLogger,
					useValue: {
						log: jest.fn(),
						warn: jest.fn(),
						error: jest.fn()
					}
				}
			]
		}).compile()

		service = module.get<YearEndReportService>(YearEndReportService)
	}

	describe('getYearEndSummary', () => {
		it('returns zero-value summary when owner has no properties', async () => {
			mockLoadPropertyIdsByOwner.mockResolvedValue([])
			await createService({})

			const result = await service.getYearEndSummary(USER_ID, YEAR)

			expect(result).toEqual({
				year: YEAR,
				grossRentalIncome: 0,
				operatingExpenses: 0,
				netIncome: 0,
				byProperty: [],
				expenseByCategory: []
			})
		})

		it('calculates gross rental income from payments in cents', async () => {
			mockLoadPropertyIdsByOwner.mockResolvedValue([PROPERTY_ID])

			// amounts in cents
			const payments = [
				{ amount: 120000, status: 'succeeded', lease: { unit: { property_id: PROPERTY_ID } } },
				{ amount: 80000, status: 'succeeded', lease: { unit: { property_id: PROPERTY_ID } } }
			]

			await createService({
				properties: [{ id: PROPERTY_ID, name: 'Test Property' }],
				rent_payments: payments,
				maintenance_requests: [],
				expenses: []
			})

			const result = await service.getYearEndSummary(USER_ID, YEAR)

			// 120000 + 80000 = 200000 cents = $2000
			expect(result.grossRentalIncome).toBe(2000)
			expect(result.netIncome).toBe(2000)
		})

		it('calculates operating expenses from maintenance requests', async () => {
			mockLoadPropertyIdsByOwner.mockResolvedValue([PROPERTY_ID])

			const maintenance = [
				{ actual_cost: 50000, estimated_cost: null, unit: { property_id: PROPERTY_ID } },
				{ actual_cost: null, estimated_cost: 25000, unit: { property_id: PROPERTY_ID } }
			]

			await createService({
				properties: [{ id: PROPERTY_ID, name: 'Test Property' }],
				rent_payments: [],
				maintenance_requests: maintenance,
				expenses: []
			})

			const result = await service.getYearEndSummary(USER_ID, YEAR)

			// 50000 + 25000 = 75000 cents = $750
			expect(result.operatingExpenses).toBe(750)
			expect(result.netIncome).toBe(-750)
		})

		it('includes vendor expenses in operating expenses', async () => {
			mockLoadPropertyIdsByOwner.mockResolvedValue([PROPERTY_ID])

			const expenses = [
				{
					amount: 30000,
					vendor_name: 'ACME Plumbing',
					maintenance_requests: { units: { property_id: PROPERTY_ID } }
				}
			]

			await createService({
				properties: [{ id: PROPERTY_ID, name: 'Test Property' }],
				rent_payments: [],
				maintenance_requests: [],
				expenses
			})

			const result = await service.getYearEndSummary(USER_ID, YEAR)

			expect(result.operatingExpenses).toBe(300)
		})

		it('groups expenses by category with vendor name prefix', async () => {
			mockLoadPropertyIdsByOwner.mockResolvedValue([PROPERTY_ID])

			const expenses = [
				{
					amount: 10000,
					vendor_name: 'ACME Plumbing',
					maintenance_requests: { units: { property_id: PROPERTY_ID } }
				},
				{
					amount: 5000,
					vendor_name: 'ACME Plumbing',
					maintenance_requests: { units: { property_id: PROPERTY_ID } }
				},
				{
					amount: 8000,
					vendor_name: null,
					maintenance_requests: { units: { property_id: PROPERTY_ID } }
				}
			]

			await createService({
				properties: [{ id: PROPERTY_ID, name: 'Test Property' }],
				rent_payments: [],
				maintenance_requests: [],
				expenses
			})

			const result = await service.getYearEndSummary(USER_ID, YEAR)
			const categoryMap = new Map(result.expenseByCategory.map(c => [c.category, c.amount]))

			expect(categoryMap.get('Vendor: ACME Plumbing')).toBe(150) // 10000+5000 = 15000 cents = $150
			expect(categoryMap.get('Other Expenses')).toBe(80) // 8000 cents = $80
		})

		it('groups maintenance costs under Maintenance category', async () => {
			mockLoadPropertyIdsByOwner.mockResolvedValue([PROPERTY_ID])

			const maintenance = [
				{ actual_cost: 20000, estimated_cost: null, unit: { property_id: PROPERTY_ID } }
			]

			await createService({
				properties: [{ id: PROPERTY_ID, name: 'Test Property' }],
				rent_payments: [],
				maintenance_requests: maintenance,
				expenses: []
			})

			const result = await service.getYearEndSummary(USER_ID, YEAR)
			const maintenanceEntry = result.expenseByCategory.find(c => c.category === 'Maintenance')

			expect(maintenanceEntry?.amount).toBe(200)
		})

		it('provides property breakdown with income and expenses', async () => {
			const PROP_B = 'prop-bbb'
			mockLoadPropertyIdsByOwner.mockResolvedValue([PROPERTY_ID, PROP_B])

			const payments = [
				{ amount: 100000, status: 'succeeded', lease: { unit: { property_id: PROPERTY_ID } } },
				{ amount: 60000, status: 'succeeded', lease: { unit: { property_id: PROP_B } } }
			]
			const maintenance = [
				{ actual_cost: 10000, estimated_cost: null, unit: { property_id: PROPERTY_ID } }
			]

			await createService({
				properties: [
					{ id: PROPERTY_ID, name: 'Property A' },
					{ id: PROP_B, name: 'Property B' }
				],
				rent_payments: payments,
				maintenance_requests: maintenance,
				expenses: []
			})

			const result = await service.getYearEndSummary(USER_ID, YEAR)

			const propA = result.byProperty.find(p => p.propertyId === PROPERTY_ID)
			const propB = result.byProperty.find(p => p.propertyId === PROP_B)

			expect(propA).toMatchObject({
				propertyName: 'Property A',
				income: 1000,
				expenses: 100,
				netIncome: 900
			})
			expect(propB).toMatchObject({
				propertyName: 'Property B',
				income: 600,
				expenses: 0,
				netIncome: 600
			})
		})

		it('calculates totals correctly combining all sources', async () => {
			mockLoadPropertyIdsByOwner.mockResolvedValue([PROPERTY_ID])

			const payments = [
				{ amount: 200000, status: 'succeeded', lease: { unit: { property_id: PROPERTY_ID } } }
			]
			const maintenance = [
				{ actual_cost: 30000, estimated_cost: null, unit: { property_id: PROPERTY_ID } }
			]
			const expenses = [
				{
					amount: 20000,
					vendor_name: 'Bob the Plumber',
					maintenance_requests: { units: { property_id: PROPERTY_ID } }
				}
			]

			await createService({
				properties: [{ id: PROPERTY_ID, name: 'Test Property' }],
				rent_payments: payments,
				maintenance_requests: maintenance,
				expenses
			})

			const result = await service.getYearEndSummary(USER_ID, YEAR)

			expect(result.grossRentalIncome).toBe(2000) // $2000
			expect(result.operatingExpenses).toBe(500) // $300 maintenance + $200 vendor
			expect(result.netIncome).toBe(1500) // $2000 - $500
		})
	})

	describe('get1099Vendors', () => {
		it('returns empty summary when owner has no properties', async () => {
			mockLoadPropertyIdsByOwner.mockResolvedValue([])
			await createService({})

			const result = await service.get1099Vendors(USER_ID, YEAR)

			expect(result).toEqual({
				year: YEAR,
				threshold: 600,
				recipients: [],
				totalReported: 0
			})
		})

		it('excludes vendors below $600 threshold', async () => {
			mockLoadPropertyIdsByOwner.mockResolvedValue([PROPERTY_ID])

			const expenses = [
				{
					amount: 50000, // $500 — below threshold
					vendor_name: 'Small Vendor',
					maintenance_requests: { units: { property_id: PROPERTY_ID } }
				}
			]

			await createService({
				properties: [],
				expenses
			})

			const result = await service.get1099Vendors(USER_ID, YEAR)

			expect(result.recipients).toHaveLength(0)
		})

		it('includes vendors at exactly $600 threshold', async () => {
			mockLoadPropertyIdsByOwner.mockResolvedValue([PROPERTY_ID])

			const expenses = [
				{
					amount: 60000, // exactly $600
					vendor_name: 'Threshold Vendor',
					maintenance_requests: { units: { property_id: PROPERTY_ID } }
				}
			]

			await createService({ properties: [], expenses })

			const result = await service.get1099Vendors(USER_ID, YEAR)

			expect(result.recipients).toHaveLength(1)
			expect(result.recipients[0].vendorName).toBe('Threshold Vendor')
			expect(result.recipients[0].totalPaid).toBe(600)
		})

		it('aggregates payments for the same vendor across multiple jobs', async () => {
			mockLoadPropertyIdsByOwner.mockResolvedValue([PROPERTY_ID])

			const expenses = [
				{
					amount: 40000,
					vendor_name: 'Multi-Job Plumber',
					maintenance_requests: { units: { property_id: PROPERTY_ID } }
				},
				{
					amount: 40000,
					vendor_name: 'Multi-Job Plumber',
					maintenance_requests: { units: { property_id: PROPERTY_ID } }
				}
			]

			await createService({ properties: [], expenses })

			const result = await service.get1099Vendors(USER_ID, YEAR)

			expect(result.recipients).toHaveLength(1)
			expect(result.recipients[0].totalPaid).toBe(800)
			expect(result.recipients[0].jobCount).toBe(2)
		})

		it('sorts recipients by totalPaid descending', async () => {
			mockLoadPropertyIdsByOwner.mockResolvedValue([PROPERTY_ID])

			const expenses = [
				{
					amount: 70000, // $700
					vendor_name: 'Medium Vendor',
					maintenance_requests: { units: { property_id: PROPERTY_ID } }
				},
				{
					amount: 150000, // $1500
					vendor_name: 'Big Vendor',
					maintenance_requests: { units: { property_id: PROPERTY_ID } }
				},
				{
					amount: 90000, // $900
					vendor_name: 'Another Vendor',
					maintenance_requests: { units: { property_id: PROPERTY_ID } }
				}
			]

			await createService({ properties: [], expenses })

			const result = await service.get1099Vendors(USER_ID, YEAR)

			expect(result.recipients[0].vendorName).toBe('Big Vendor')
			expect(result.recipients[1].vendorName).toBe('Another Vendor')
			expect(result.recipients[2].vendorName).toBe('Medium Vendor')
		})

		it('calculates totalReported as sum of all qualifying recipients', async () => {
			mockLoadPropertyIdsByOwner.mockResolvedValue([PROPERTY_ID])

			const expenses = [
				{
					amount: 100000, // $1000
					vendor_name: 'Vendor A',
					maintenance_requests: { units: { property_id: PROPERTY_ID } }
				},
				{
					amount: 80000, // $800
					vendor_name: 'Vendor B',
					maintenance_requests: { units: { property_id: PROPERTY_ID } }
				}
			]

			await createService({ properties: [], expenses })

			const result = await service.get1099Vendors(USER_ID, YEAR)

			expect(result.totalReported).toBe(1800)
		})
	})

	describe('formatYearEndForCsv', () => {
		it('produces overview, property, and category rows', () => {
			const summary = {
				year: 2024,
				grossRentalIncome: 12000,
				operatingExpenses: 3000,
				netIncome: 9000,
				byProperty: [
					{ propertyId: 'p1', propertyName: 'Main St', income: 12000, expenses: 3000, netIncome: 9000 }
				],
				expenseByCategory: [
					{ category: 'Maintenance', amount: 3000 }
				]
			}

			const rows = service.formatYearEndForCsv(summary)

			const sections = rows.map(r => (r as { section: string }).section)
			expect(sections).toContain('Overview')
			expect(sections).toContain('By Property')
			expect(sections).toContain('Expense Categories')
		})

		it('formats monetary values as fixed-2 decimals', () => {
			const summary = {
				year: 2024,
				grossRentalIncome: 1200.5,
				operatingExpenses: 300.25,
				netIncome: 900.25,
				byProperty: [],
				expenseByCategory: []
			}

			const rows = service.formatYearEndForCsv(summary)
			const netIncomeRow = rows.find(
				r => (r as { item: string }).item === 'Net Income'
			) as { value: string }

			expect(netIncomeRow.value).toBe('900.25')
		})
	})

	describe('format1099ForCsv', () => {
		it('returns a no-threshold message when no recipients', () => {
			const summary = {
				year: 2024,
				threshold: 600,
				recipients: [],
				totalReported: 0
			}

			const rows = service.format1099ForCsv(summary)

			expect(rows).toHaveLength(1)
			expect((rows[0] as { message: string }).message).toContain('$600')
			expect((rows[0] as { message: string }).message).toContain('2024')
		})

		it('maps each recipient to a CSV row', () => {
			const summary = {
				year: 2024,
				threshold: 600,
				recipients: [
					{ vendorName: 'Bob Plumber', totalPaid: 1200.5, jobCount: 3 }
				],
				totalReported: 1200.5
			}

			const rows = service.format1099ForCsv(summary)

			expect(rows).toHaveLength(1)
			const row = rows[0] as Record<string, unknown>
			expect(row.vendor_name).toBe('Bob Plumber')
			expect(row.total_paid).toBe('1200.50')
			expect(row.job_count).toBe(3)
			expect(row.requires_1099).toBe('Yes')
		})
	})
})
