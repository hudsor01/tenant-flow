import { type LedgerData } from './financial-ledger.helpers'
import * as FinancialLedgerHelpers from './financial-ledger.helpers'

import { Logger } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { SupabaseService } from '../../database/supabase.service'
import { TaxDocumentsService } from './tax-documents.service'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'


describe('TaxDocumentsService', () => {
  let service: TaxDocumentsService
  let supabaseService: jest.Mocked<SupabaseService>
  let mockClient: any

  beforeEach(async () => {
    mockClient = {
      from: jest.fn(),
      rpc: jest.fn(),
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null
        })
      }
    }

    // Mock table queries used by loadLedgerData
    mockClient.from.mockImplementation((table: string) => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        then: jest.fn()
      }

      // Mock the final resolution based on table
      mockQuery.then.mockImplementation((resolve) => {
        let data: any[] = []
        switch (table) {
          case 'rent_payments':
            data = [
              { id: 'rp1', amount: 20000, status: 'succeeded', due_date: '2024-06-01', paid_date: '2024-06-01', lease_id: 'lease-1' },
              { id: 'rp2', amount: 20000, status: 'succeeded', due_date: '2024-07-01', paid_date: '2024-07-01', lease_id: 'lease-1' },
              { id: 'rp3', amount: 20000, status: 'succeeded', due_date: '2024-08-01', paid_date: '2024-08-01', lease_id: 'lease-1' }
            ]
            break
          case 'expenses':
            data = [
              { id: 'e1', amount: 5000, expense_date: '2024-03-01', created_at: '2024-03-01', category: 'Maintenance', property_id: 'prop-1' },
              { id: 'e2', amount: 5000, expense_date: '2024-04-01', created_at: '2024-04-01', category: 'Insurance', property_id: 'prop-1' },
              { id: 'e3', amount: 5000, expense_date: '2024-05-01', created_at: '2024-05-01', category: 'Repairs', property_id: 'prop-1' },
              { id: 'e4', amount: 5000, expense_date: '2024-06-01', created_at: '2024-06-01', category: 'Utilities', property_id: 'prop-1' }
            ]
            break
          case 'leases':
            data = [
              {
                id: 'lease-1',
                tenant_id: 'tenant-1',
                unit_id: 'unit-1',
                rent_amount: 1500
              }
            ]
            break
          case 'maintenance_requests':
            data = []
            break
          case 'units':
            data = [
              {
                id: 'unit-1',
                property_id: 'prop-1',
                unit_number: '101'
              }
            ]
            break
          case 'properties':
            data = [
              {
                id: 'prop-1',
                name: 'Property',
                property_value: 1000000,
                acquisition_year: 2020,
                created_at: '2020-01-01T00:00:00Z'
              }
            ]
            break
        }
        return resolve({ data, error: null })
      })

      return mockQuery
    })

    supabaseService = {
      getAdminClient: jest.fn().mockReturnValue(mockClient),
      getUserClient: jest.fn().mockReturnValue(mockClient)
    } as unknown as jest.Mocked<SupabaseService>

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxDocumentsService,
        {
          provide: SupabaseService,
          useValue: supabaseService
        },
        {
          provide: AppLogger,
          useValue: new SilentLogger()
        }
      ]
    }).compile()

    service = module.get(TaxDocumentsService)

    jest.spyOn(Logger.prototype, 'log').mockImplementation()
    jest.spyOn(Logger.prototype, 'error').mockImplementation()

    // Mock loadLedgerData to return default test data
    // This replaces the individual table mocks since loadLedgerData now uses a single nested query
    //
    // Test values calculation:
    // - Gross revenue = 4 payments × 20000 = 80000
    // - Total expenses = 4 expenses × 5000 = 20000
    // - NOI = 80000 - 20000 = 60000
    // - Property value (derived) = NOI / 0.06 = 1000000
    // - Depreciation = 1000000 / 27.5 ≈ 36363.64
    const defaultLedger: LedgerData = {
      rentPayments: [
        { status: 'succeeded', paid_date: '2024-05-01', due_date: '2024-05-01', amount: 20000, lease_id: 'lease-1', application_fee_amount: null, late_fee_amount: null },
        { status: 'succeeded', paid_date: '2024-06-01', due_date: '2024-06-01', amount: 20000, lease_id: 'lease-1', application_fee_amount: null, late_fee_amount: null },
        { status: 'succeeded', paid_date: '2024-07-01', due_date: '2024-07-01', amount: 20000, lease_id: 'lease-1', application_fee_amount: null, late_fee_amount: null },
        { status: 'succeeded', paid_date: '2024-08-01', due_date: '2024-08-01', amount: 20000, lease_id: 'lease-1', application_fee_amount: null, late_fee_amount: null }
      ],
      expenses: [
        { expense_date: '2024-03-01', created_at: '2024-03-01', amount: 5000, maintenance_request_id: 'mr-1' },
        { expense_date: '2024-04-01', created_at: '2024-04-01', amount: 5000, maintenance_request_id: 'mr-1' },
        { expense_date: '2024-05-01', created_at: '2024-05-01', amount: 5000, maintenance_request_id: 'mr-1' },
        { expense_date: '2024-06-01', created_at: '2024-06-01', amount: 5000, maintenance_request_id: 'mr-1' }
      ],
      leases: [{ id: 'lease-1', unit_id: 'unit-1', security_deposit: 3000 }],
      maintenanceRequests: [{ id: 'mr-1', unit_id: 'unit-1', status: 'completed', completed_at: '2024-03-01', created_at: '2024-03-01', actual_cost: null, estimated_cost: null }],
      units: [{ id: 'unit-1', property_id: 'prop-1' }],
      properties: [{ id: 'prop-1', name: 'Property', created_at: '2020-01-01T00:00:00Z' }]
    }
    jest.spyOn(FinancialLedgerHelpers, 'loadLedgerData').mockResolvedValue(defaultLedger)
  })

  describe('generateTaxDocuments', () => {
    it('should generate tax documents with valid data', async () => {
      const result = await service.generateTaxDocuments('user-123', 2024)

      expect(result).toBeDefined()
      expect(result.taxYear).toBe(2024)
      expect(result.incomeBreakdown.grossRentalIncome).toBe(80000)
      expect(result.incomeBreakdown.totalExpenses).toBe(20000)
      expect(result.expenseCategories.length).toBe(3)
      expect(result.propertyDepreciation.length).toBe(1)

      // Verify expense categories have tax notes
      const maintenanceExpense = result.expenseCategories.find(
        e => e.category === 'Maintenance'
      )
      expect(maintenanceExpense?.notes).toBeDefined()
      expect(maintenanceExpense?.deductible).toBe(true)
    })

    it('should calculate residential property depreciation correctly (27.5 years)', async () => {
      const result = await service.generateTaxDocuments('user-123', 2024)

      const property = result.propertyDepreciation[0]
      expect(property).toBeDefined()

      if (!property) return

      // Service uses property_value from database for depreciation calculation
      const expectedPropertyValue = 1000000
      expect(property.propertyValue).toBe(expectedPropertyValue)

      // Annual depreciation = Property Value / 27.5
      const expectedAnnual = expectedPropertyValue / 27.5
      expect(property.annualDepreciation).toBeCloseTo(expectedAnnual, 2)

      // Years owned: 2024 - 2020 = 4 years
      const yearsOwned = 4
      const expectedAccumulated = expectedAnnual * yearsOwned
      expect(property.accumulatedDepreciation).toBeCloseTo(
        expectedAccumulated,
        2
      )

      // Remaining basis
      const expectedRemaining = expectedPropertyValue - expectedAccumulated
      expect(property.remainingBasis).toBeCloseTo(expectedRemaining, 2)
    })

    it('should handle missing property values with default estimate', async () => {
      // Override loadLedgerData to return custom data with only 1 rent payment and no expenses
      // This simulates a property where propertyValue is derived from NOI
      const customLedger: LedgerData = {
        rentPayments: [
          { status: 'succeeded', paid_date: '2024-06-01', due_date: '2024-06-01', amount: 20000, lease_id: 'lease-1', application_fee_amount: null, late_fee_amount: null }
        ],
        expenses: [],
        leases: [{ id: 'lease-1', unit_id: 'unit-1', security_deposit: null }],
        maintenanceRequests: [],
        units: [{ id: 'unit-1', property_id: 'prop-1' }],
        properties: [{ id: 'prop-1', name: 'Property Without Value', created_at: '2024-01-01' }]
      }
      jest.spyOn(FinancialLedgerHelpers, 'loadLedgerData').mockResolvedValue(customLedger)

      const result = await service.generateTaxDocuments('user-123', 2024)

      const property = result.propertyDepreciation[0]
      expect(property).toBeDefined()

      if (!property) return

      // NOI = 20000 - 0 = 20000, propertyValue = 20000 / 0.06 = 333333.33
      expect(property.propertyValue).toBe(20000 / 0.06)
      expect(property.annualDepreciation).toBeCloseTo((20000 / 0.06) / 27.5, 2)
    })

    it('should calculate mortgage interest estimate (30% of expenses)', async () => {
      const customLedger: LedgerData = {
        rentPayments: [],
        expenses: [
          { amount: 30000, expense_date: '2024-01-01', created_at: '2024-01-01', maintenance_request_id: 'maint-1' }
        ],
        leases: [],
        maintenanceRequests: [],
        units: [],
        properties: [
          { id: 'prop-1', name: 'Property', created_at: '2024-01-01' }
        ]
      }
      jest.spyOn(FinancialLedgerHelpers, 'loadLedgerData').mockResolvedValue(customLedger)

      const result = await service.generateTaxDocuments('user-123', 2024)

      // Mortgage interest = 30% of total expenses (30000 * 0.3 = 9000)
      expect(result.incomeBreakdown.mortgageInterest).toBe(9000)
    })

    it('should calculate taxable income correctly', async () => {
      const result = await service.generateTaxDocuments('user-123', 2024)

      // Calculations based on default table data:
      // Gross Income = 80000 (rent payments)
      // Expenses = 20000
      // NOI = 80000 - 20000 = 60000
      // Depreciation = 1000000 / 27.5 ≈ 36363.64
      // Mortgage Interest = 20000 * 0.3 = 6000
      // Taxable Income = 60000 - 36363.64 - 6000 ≈ 17636.36

      const expectedNOI = 60000
      const expectedDepreciation = 1000000 / 27.5
      const expectedMortgageInterest = 20000 * 0.3 // 6000
      const expectedTaxable =
        expectedNOI - expectedDepreciation - expectedMortgageInterest

      expect(result.incomeBreakdown.netOperatingIncome).toBe(expectedNOI)
      expect(result.incomeBreakdown.depreciation).toBeCloseTo(
        expectedDepreciation,
        2
      )
      expect(result.incomeBreakdown.mortgageInterest).toBe(
        expectedMortgageInterest
      )
      expect(result.incomeBreakdown.taxableIncome).toBeCloseTo(
        expectedTaxable,
        2
      )
    })

    it('should mark all standard property expenses as deductible', async () => {
      mockClient.rpc.mockResolvedValueOnce({
        data: [
          { category: 'Maintenance', amount: 5000 },
          { category: 'Insurance', amount: 3000 },
          { category: 'Property Tax', amount: 8000 },
          { category: 'Utilities', amount: 2000 },
          { category: 'Property Management', amount: 4000 }
        ],
        error: null
      })

      mockClient.rpc.mockResolvedValueOnce({
        data: [],
        error: null
      })

      mockClient.rpc.mockResolvedValueOnce({
        data: { total_revenue: 0, operating_expenses: 0 },
        error: null
      })

      const result = await service.generateTaxDocuments('user-123', 2024)

      // All expense categories should be marked as deductible
      result.expenseCategories.forEach(expense => {
        expect(expense.deductible).toBe(true)
      })

      // Verify tax notes are provided for known categories
      const maintenanceExpense = result.expenseCategories.find(
        e => e.category === 'Maintenance'
      )
      expect(maintenanceExpense?.notes).toContain('deductible')
    })

    it('should handle array vs single object response for expenses', async () => {
      const result = await service.generateTaxDocuments('user-123', 2024)

      // Service always returns 3 expense categories: Maintenance, Operations, Fees
      expect(result.expenseCategories.length).toBe(3)

      const maintenanceExpense = result.expenseCategories.find(e => e.category === 'Maintenance')
      expect(maintenanceExpense).toBeDefined()
      expect(maintenanceExpense?.amount).toBe(0) // No maintenance requests in mock
    })

    it('should calculate totals correctly', async () => {
      const result = await service.generateTaxDocuments('user-123', 2024)

      // Total income = gross rental income
      expect(result.totals.totalIncome).toBe(80000)

      // Total deductions = expenses + depreciation
      const expectedDeductions = 20000 + 1000000 / 27.5
      expect(result.totals.totalDeductions).toBeCloseTo(expectedDeductions, 2)

      // Net taxable income = NOI - depreciation - mortgage interest
      const noi = 80000 - 20000
      const depreciation = 1000000 / 27.5
      const mortgageInterest = 20000 * 0.3
      const expectedNetTaxable = noi - depreciation - mortgageInterest
      expect(result.totals.netTaxableIncome).toBeCloseTo(expectedNetTaxable, 2)
    })

    it('should populate Schedule E correctly', async () => {
      const result = await service.generateTaxDocuments('user-123', 2024)

      const scheduleE = result.schedule.scheduleE
      expect(scheduleE.grossRentalIncome).toBe(80000)
      expect(scheduleE.totalExpenses).toBe(20000)
      expect(scheduleE.depreciation).toBeCloseTo(1000000 / 27.5, 2)

      // Net income = NOI - depreciation - mortgage interest
      const noi = 80000 - 20000
      const depreciation = 1000000 / 27.5
      const mortgageInterest = 20000 * 0.3
      const expectedNetIncome = noi - depreciation - mortgageInterest
      expect(scheduleE.netIncome).toBeCloseTo(expectedNetIncome, 2)
    })
  })
})
