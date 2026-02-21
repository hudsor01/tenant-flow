import { Test, TestingModule } from '@nestjs/testing'
import { YearEndReportService } from './year-end-report.service'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import { PDFGeneratorService } from '../pdf/pdf-generator.service'
import { TaxDocumentsService } from '../financial/tax-documents.service'
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
const UNIT_ID = 'unit-1'
const LEASE_ID = 'lease-1'
const MAINTENANCE_ID = 'mr-1'

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
				},
				{
					provide: PDFGeneratorService,
					useValue: {
						generateFromHtml: jest.fn().mockResolvedValue(Buffer.from('pdf'))
					}
				},
				{
					provide: TaxDocumentsService,
					useValue: {
						generateTaxDocuments: jest.fn().mockResolvedValue({})
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

			await createService({
				properties: [{ id: PROPERTY_ID, name: 'Test Property' }],
				units: [{ id: UNIT_ID, property_id: PROPERTY_ID }],
				leases: [{ id: LEASE_ID, unit_id: UNIT_ID }],
				// amounts in cents — flat shape: no nested lease/unit join
				rent_payments: [
					{ amount: 120000, lease_id: LEASE_ID },
					{ amount: 80000, lease_id: LEASE_ID }
				],
				maintenance_requests: []
			})

			const result = await service.getYearEndSummary(USER_ID, YEAR)

			// 120000 + 80000 = 200000 cents = $2000
			expect(result.grossRentalIncome).toBe(2000)
			expect(result.netIncome).toBe(2000)
		})

		it('calculates operating expenses from maintenance requests', async () => {
			mockLoadPropertyIdsByOwner.mockResolvedValue([PROPERTY_ID])

			await createService({
				properties: [{ id: PROPERTY_ID, name: 'Test Property' }],
				units: [{ id: UNIT_ID, property_id: PROPERTY_ID }],
				leases: [],
				rent_payments: [],
				// flat shape: no nested unit join — uses unit_id directly
				maintenance_requests: [
					{ actual_cost: 50000, estimated_cost: null, unit_id: UNIT_ID },
					{ actual_cost: null, estimated_cost: 25000, unit_id: UNIT_ID }
				]
			})

			const result = await service.getYearEndSummary(USER_ID, YEAR)

			// 50000 + 25000 = 75000 cents = $750
			expect(result.operatingExpenses).toBe(750)
			expect(result.netIncome).toBe(-750)
		})

		it('does not double-count expenses table against maintenance_requests costs', async () => {
			// getYearEndSummary does NOT query the expenses table to avoid double-counting.
			// Operating expenses derive solely from maintenance_requests.actual_cost / estimated_cost.
			mockLoadPropertyIdsByOwner.mockResolvedValue([PROPERTY_ID])

			await createService({
				properties: [{ id: PROPERTY_ID, name: 'Test Property' }],
				units: [{ id: UNIT_ID, property_id: PROPERTY_ID }],
				leases: [],
				rent_payments: [],
				maintenance_requests: [] // no maintenance costs
			})

			const result = await service.getYearEndSummary(USER_ID, YEAR)

			// expenses table not counted separately — operatingExpenses comes only from maintenance_requests
			expect(result.operatingExpenses).toBe(0)
		})

		it('groups maintenance costs under Maintenance category only', async () => {
			// Without the expenses loop, all expense categories derive from maintenance_requests
			mockLoadPropertyIdsByOwner.mockResolvedValue([PROPERTY_ID])

			await createService({
				properties: [{ id: PROPERTY_ID, name: 'Test Property' }],
				units: [{ id: UNIT_ID, property_id: PROPERTY_ID }],
				leases: [],
				rent_payments: [],
				maintenance_requests: [
					{ actual_cost: 10000, estimated_cost: null, unit_id: UNIT_ID },
					{ actual_cost: 5000, estimated_cost: null, unit_id: UNIT_ID }
				]
			})

			const result = await service.getYearEndSummary(USER_ID, YEAR)
			const categoryMap = new Map(result.expenseByCategory.map(c => [c.category, c.amount]))

			expect(categoryMap.get('Maintenance')).toBe(150) // 10000+5000 = 15000 cents = $150
			expect(categoryMap.size).toBe(1) // only Maintenance category
		})

		it('groups maintenance costs under Maintenance category', async () => {
			mockLoadPropertyIdsByOwner.mockResolvedValue([PROPERTY_ID])

			await createService({
				properties: [{ id: PROPERTY_ID, name: 'Test Property' }],
				units: [{ id: UNIT_ID, property_id: PROPERTY_ID }],
				leases: [],
				rent_payments: [],
				maintenance_requests: [
					{ actual_cost: 20000, estimated_cost: null, unit_id: UNIT_ID }
				]
			})

			const result = await service.getYearEndSummary(USER_ID, YEAR)
			const maintenanceEntry = result.expenseByCategory.find(c => c.category === 'Maintenance')

			expect(maintenanceEntry?.amount).toBe(200)
		})

		it('provides property breakdown with income and expenses', async () => {
			const PROP_B = 'prop-bbb'
			const UNIT_A = 'unit-a'
			const UNIT_B = 'unit-b'
			const LEASE_A = 'lease-a'
			const LEASE_B = 'lease-b'
			mockLoadPropertyIdsByOwner.mockResolvedValue([PROPERTY_ID, PROP_B])

			await createService({
				properties: [
					{ id: PROPERTY_ID, name: 'Property A' },
					{ id: PROP_B, name: 'Property B' }
				],
				units: [
					{ id: UNIT_A, property_id: PROPERTY_ID },
					{ id: UNIT_B, property_id: PROP_B }
				],
				leases: [
					{ id: LEASE_A, unit_id: UNIT_A },
					{ id: LEASE_B, unit_id: UNIT_B }
				],
				rent_payments: [
					{ amount: 100000, lease_id: LEASE_A },
					{ amount: 60000, lease_id: LEASE_B }
				],
				maintenance_requests: [
					{ actual_cost: 10000, estimated_cost: null, unit_id: UNIT_A }
				]
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

		it('calculates totals correctly from payments and maintenance_requests', async () => {
			mockLoadPropertyIdsByOwner.mockResolvedValue([PROPERTY_ID])

			await createService({
				properties: [{ id: PROPERTY_ID, name: 'Test Property' }],
				units: [{ id: UNIT_ID, property_id: PROPERTY_ID }],
				leases: [{ id: LEASE_ID, unit_id: UNIT_ID }],
				rent_payments: [
					{ amount: 200000, lease_id: LEASE_ID }
				],
				maintenance_requests: [
					{ actual_cost: 30000, estimated_cost: null, unit_id: UNIT_ID }
				]
			})

			const result = await service.getYearEndSummary(USER_ID, YEAR)

			expect(result.grossRentalIncome).toBe(2000) // $2000
			expect(result.operatingExpenses).toBe(300) // $300 from maintenance_requests only
			expect(result.netIncome).toBe(1700) // $2000 - $300
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

			await createService({
				units: [{ id: UNIT_ID }],
				maintenance_requests: [{ id: MAINTENANCE_ID }],
				expenses: [
					{ amount: 50000, vendor_name: 'Small Vendor' } // $500 — below threshold
				]
			})

			const result = await service.get1099Vendors(USER_ID, YEAR)

			expect(result.recipients).toHaveLength(0)
		})

		it('includes vendors at exactly $600 threshold', async () => {
			mockLoadPropertyIdsByOwner.mockResolvedValue([PROPERTY_ID])

			await createService({
				units: [{ id: UNIT_ID }],
				maintenance_requests: [{ id: MAINTENANCE_ID }],
				expenses: [
					{ amount: 60000, vendor_name: 'Threshold Vendor' } // exactly $600
				]
			})

			const result = await service.get1099Vendors(USER_ID, YEAR)

			expect(result.recipients).toHaveLength(1)
			expect(result.recipients[0].vendorName).toBe('Threshold Vendor')
			expect(result.recipients[0].totalPaid).toBe(600)
		})

		it('aggregates payments for the same vendor across multiple jobs', async () => {
			mockLoadPropertyIdsByOwner.mockResolvedValue([PROPERTY_ID])

			await createService({
				units: [{ id: UNIT_ID }],
				maintenance_requests: [{ id: MAINTENANCE_ID }],
				expenses: [
					{ amount: 40000, vendor_name: 'Multi-Job Plumber' },
					{ amount: 40000, vendor_name: 'Multi-Job Plumber' }
				]
			})

			const result = await service.get1099Vendors(USER_ID, YEAR)

			expect(result.recipients).toHaveLength(1)
			expect(result.recipients[0].totalPaid).toBe(800)
			expect(result.recipients[0].jobCount).toBe(2)
		})

		it('sorts recipients by totalPaid descending', async () => {
			mockLoadPropertyIdsByOwner.mockResolvedValue([PROPERTY_ID])

			await createService({
				units: [{ id: UNIT_ID }],
				maintenance_requests: [{ id: MAINTENANCE_ID }],
				expenses: [
					{ amount: 70000, vendor_name: 'Medium Vendor' },  // $700
					{ amount: 150000, vendor_name: 'Big Vendor' },    // $1500
					{ amount: 90000, vendor_name: 'Another Vendor' }  // $900
				]
			})

			const result = await service.get1099Vendors(USER_ID, YEAR)

			expect(result.recipients[0].vendorName).toBe('Big Vendor')
			expect(result.recipients[1].vendorName).toBe('Another Vendor')
			expect(result.recipients[2].vendorName).toBe('Medium Vendor')
		})

		it('calculates totalReported as sum of all qualifying recipients', async () => {
			mockLoadPropertyIdsByOwner.mockResolvedValue([PROPERTY_ID])

			await createService({
				units: [{ id: UNIT_ID }],
				maintenance_requests: [{ id: MAINTENANCE_ID }],
				expenses: [
					{ amount: 100000, vendor_name: 'Vendor A' }, // $1000
					{ amount: 80000, vendor_name: 'Vendor B' }   // $800
				]
			})

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
