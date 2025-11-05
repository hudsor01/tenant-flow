import { Logger } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { SupabaseService } from '../../database/supabase.service'
import { TaxDocumentsService } from './tax-documents.service'

describe('TaxDocumentsService', () => {
	let service: TaxDocumentsService
	let supabaseService: jest.Mocked<SupabaseService>
	let mockClient: any

	beforeEach(async () => {
		mockClient = {
			rpc: jest.fn(),
			from: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			gte: jest.fn().mockReturnThis(),
			lte: jest.fn().mockReturnThis(),
			auth: {
				getUser: jest.fn().mockResolvedValue({
					data: { user: { id: 'user-123' } },
					error: null
				})
			}
		}

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
				}
			]
		}).compile()

		service = module.get(TaxDocumentsService)

		jest.spyOn(Logger.prototype, 'log').mockImplementation()
		jest.spyOn(Logger.prototype, 'error').mockImplementation()
	})

	describe('generateTaxDocuments', () => {
		it('should generate tax documents with valid data', async () => {
			// Mock expense summary
			mockClient.rpc.mockResolvedValueOnce({
				data: [
					{ category: 'Maintenance', amount: 5000, percentage: 25 },
					{ category: 'Insurance', amount: 3000, percentage: 15 },
					{ category: 'Property Tax', amount: 8000, percentage: 40 }
				],
				error: null
			})

			// Mock NOI calculation
			mockClient.rpc.mockResolvedValueOnce({
				data: [
					{
						property_id: 'prop-1',
						property_name: 'Property 1',
						property_value: 500000,
						acquisition_year: 2020
					}
				],
				error: null
			})

			// Mock financial metrics
			mockClient.rpc.mockResolvedValueOnce({
				data: {
					total_revenue: 60000,
					operating_expenses: 20000
				},
				error: null
			})

			const result = await service.generateTaxDocuments('user-123', 2024)

			expect(result).toBeDefined()
			expect(result.taxYear).toBe(2024)
			expect(result.incomeBreakdown.grossRentalIncome).toBe(60000)
			expect(result.incomeBreakdown.totalExpenses).toBe(20000)
			expect(result.expenseCategories.length).toBe(3)
			expect(result.propertyDepreciation.length).toBe(1)

			// Verify expense categories have tax notes
			const maintenanceExpense = result.expenseCategories.find(
				e => e.category === 'Maintenance'
			)
			expect(maintenanceExpense?.notes).toBeDefined()
			expect(maintenanceExpense?.deductible).toBe(true)

			// Verify RPC calls
			expect(mockClient.rpc).toHaveBeenCalledWith('get_expense_summary', {
				p_user_id: 'user-123'
			})
			expect(mockClient.rpc).toHaveBeenCalledWith(
				'calculate_net_operating_income',
				{
					p_user_id: 'user-123'
				}
			)
			expect(mockClient.rpc).toHaveBeenCalledWith(
				'calculate_financial_metrics',
				{
					p_user_id: 'user-123',
					p_start_date: '2024-01-01',
					p_end_date: '2024-12-31'
				}
			)
		})

		it('should calculate residential property depreciation correctly (27.5 years)', async () => {
			mockClient.rpc.mockResolvedValueOnce({
				data: [],
				error: null
			})

			mockClient.rpc.mockResolvedValueOnce({
				data: [
					{
						property_id: 'prop-1',
						property_name: 'Residential Property',
						property_value: 550000,
						acquisition_year: 2020
					}
				],
				error: null
			})

			mockClient.rpc.mockResolvedValueOnce({
				data: { total_revenue: 0, operating_expenses: 0 },
				error: null
			})

			const result = await service.generateTaxDocuments('user-123', 2024)

			const property = result.propertyDepreciation[0]
			expect(property).toBeDefined()

			if (!property) return

			// Annual depreciation = Property Value / 27.5
			const expectedAnnual = 550000 / 27.5
			expect(property.annualDepreciation).toBeCloseTo(expectedAnnual, 2)

			// Years owned: 2024 - 2020 = 4 years
			const yearsOwned = 4
			const expectedAccumulated = expectedAnnual * yearsOwned
			expect(property.accumulatedDepreciation).toBeCloseTo(
				expectedAccumulated,
				2
			)

			// Remaining basis
			const expectedRemaining = 550000 - expectedAccumulated
			expect(property.remainingBasis).toBeCloseTo(expectedRemaining, 2)
		})

		it('should handle missing property values with default estimate', async () => {
			mockClient.rpc.mockResolvedValueOnce({
				data: [],
				error: null
			})

			mockClient.rpc.mockResolvedValueOnce({
				data: [
					{
						property_id: 'prop-1',
						property_name: 'Property Without Value',
						// property_value is missing
						acquisition_year: 2024
					}
				],
				error: null
			})

			mockClient.rpc.mockResolvedValueOnce({
				data: { total_revenue: 0, operating_expenses: 0 },
				error: null
			})

			const result = await service.generateTaxDocuments('user-123', 2024)

			const property = result.propertyDepreciation[0]
			expect(property).toBeDefined()

			if (!property) return

			// Should use default estimate of 100000
			expect(property.propertyValue).toBe(100000)
			expect(property.annualDepreciation).toBeCloseTo(100000 / 27.5, 2)
		})

		it('should calculate mortgage interest estimate (30% of expenses)', async () => {
			mockClient.rpc.mockResolvedValueOnce({
				data: [],
				error: null
			})

			mockClient.rpc.mockResolvedValueOnce({
				data: [],
				error: null
			})

			mockClient.rpc.mockResolvedValueOnce({
				data: {
					total_revenue: 100000,
					operating_expenses: 30000
				},
				error: null
			})

			const result = await service.generateTaxDocuments('user-123', 2024)

			// Mortgage interest = 30% of total expenses
			const expectedMortgageInterest = 30000 * 0.3
			expect(result.incomeBreakdown.mortgageInterest).toBe(
				expectedMortgageInterest
			)
		})

		it('should calculate taxable income correctly', async () => {
			mockClient.rpc.mockResolvedValueOnce({
				data: [],
				error: null
			})

			mockClient.rpc.mockResolvedValueOnce({
				data: [
					{
						property_id: 'prop-1',
						property_value: 275000,
						acquisition_year: 2024
					}
				],
				error: null
			})

			mockClient.rpc.mockResolvedValueOnce({
				data: {
					total_revenue: 50000,
					operating_expenses: 15000
				},
				error: null
			})

			const result = await service.generateTaxDocuments('user-123', 2024)

			// Calculations:
			// NOI = 50000 - 15000 = 35000
			// Depreciation = 275000 / 27.5 = 10000
			// Mortgage Interest = 15000 * 0.3 = 4500
			// Taxable Income = 35000 - 10000 - 4500 = 20500

			const expectedNOI = 35000
			const expectedDepreciation = 10000
			const expectedMortgageInterest = 4500
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

		it('should handle expense summary errors', async () => {
			const expenseError = new Error('Expense summary error')
			mockClient.rpc.mockResolvedValueOnce({
				data: null,
				error: expenseError
			})

			await expect(
				service.generateTaxDocuments('user-123', 2024)
			).rejects.toThrow('Expense summary error')
		})

		it('should handle NOI calculation errors', async () => {
			mockClient.rpc.mockResolvedValueOnce({
				data: [],
				error: null
			})

			const noiError = new Error('NOI calculation error')
			mockClient.rpc.mockResolvedValueOnce({
				data: null,
				error: noiError
			})

			await expect(
				service.generateTaxDocuments('user-123', 2024)
			).rejects.toThrow('NOI calculation error')
		})

		it('should handle financial metrics errors', async () => {
			mockClient.rpc.mockResolvedValueOnce({
				data: [],
				error: null
			})

			mockClient.rpc.mockResolvedValueOnce({
				data: [],
				error: null
			})

			const metricsError = new Error('Financial metrics error')
			mockClient.rpc.mockResolvedValueOnce({
				data: null,
				error: metricsError
			})

			await expect(
				service.generateTaxDocuments('user-123', 2024)
			).rejects.toThrow('Financial metrics error')
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
			// Test with single object response (not array)
			mockClient.rpc.mockResolvedValueOnce({
				data: { category: 'Maintenance', amount: 5000, percentage: 100 },
				error: null
			})

			mockClient.rpc.mockResolvedValueOnce({
				data: [],
				error: null
			})

			mockClient.rpc.mockResolvedValueOnce({
				data: { total_revenue: 10000, operating_expenses: 5000 },
				error: null
			})

			const result = await service.generateTaxDocuments('user-123', 2024)

			expect(result.expenseCategories.length).toBe(1)

			const expense = result.expenseCategories[0]
			if (!expense) return

			expect(expense.category).toBe('Maintenance')
			expect(expense.amount).toBe(5000)
		})

		it('should calculate totals correctly', async () => {
			mockClient.rpc.mockResolvedValueOnce({
				data: [{ category: 'Maintenance', amount: 5000 }],
				error: null
			})

			mockClient.rpc.mockResolvedValueOnce({
				data: [
					{
						property_id: 'prop-1',
						property_value: 275000,
						acquisition_year: 2024
					}
				],
				error: null
			})

			mockClient.rpc.mockResolvedValueOnce({
				data: {
					total_revenue: 60000,
					operating_expenses: 20000
				},
				error: null
			})

			const result = await service.generateTaxDocuments('user-123', 2024)

			// Total income = gross rental income
			expect(result.totals.totalIncome).toBe(60000)

			// Total deductions = expenses + depreciation
			const expectedDeductions = 20000 + 275000 / 27.5
			expect(result.totals.totalDeductions).toBeCloseTo(expectedDeductions, 2)

			// Net taxable income = NOI - depreciation - mortgage interest
			const noi = 60000 - 20000
			const depreciation = 275000 / 27.5
			const mortgageInterest = 20000 * 0.3
			const expectedNetTaxable = noi - depreciation - mortgageInterest
			expect(result.totals.netTaxableIncome).toBeCloseTo(expectedNetTaxable, 2)
		})

		it('should populate Schedule E correctly', async () => {
			mockClient.rpc.mockResolvedValueOnce({
				data: [],
				error: null
			})

			mockClient.rpc.mockResolvedValueOnce({
				data: [
					{
						property_id: 'prop-1',
						property_value: 275000,
						acquisition_year: 2024
					}
				],
				error: null
			})

			mockClient.rpc.mockResolvedValueOnce({
				data: {
					total_revenue: 80000,
					operating_expenses: 25000
				},
				error: null
			})

			const result = await service.generateTaxDocuments('user-123', 2024)

			const scheduleE = result.schedule.scheduleE
			expect(scheduleE.grossRentalIncome).toBe(80000)
			expect(scheduleE.totalExpenses).toBe(25000)
			expect(scheduleE.depreciation).toBeCloseTo(275000 / 27.5, 2)

			// Net income = NOI - depreciation - mortgage interest
			const noi = 80000 - 25000
			const depreciation = 275000 / 27.5
			const mortgageInterest = 25000 * 0.3
			const expectedNetIncome = noi - depreciation - mortgageInterest
			expect(scheduleE.netIncome).toBeCloseTo(expectedNetIncome, 2)
		})
	})
})
