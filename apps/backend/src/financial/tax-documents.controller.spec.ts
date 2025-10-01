import { BadRequestException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { TaxDocumentsData } from '@repo/shared/types/financial-statements'
import { TaxDocumentsController } from './tax-documents.controller'
import { TaxDocumentsService } from './tax-documents.service'

describe('TaxDocumentsController', () => {
	let controller: TaxDocumentsController
	let service: jest.Mocked<TaxDocumentsService>

	const mockTaxDocuments: TaxDocumentsData = {
		period: {
			startDate: '2024-01-01',
			endDate: '2024-12-31',
			label: '2024 Tax Year'
		},
		taxYear: 2024,
		incomeBreakdown: {
			grossRentalIncome: 120000,
			netOperatingIncome: 72000,
			depreciation: 18182,
			mortgageInterest: 24000,
			totalExpenses: 48000,
			taxableIncome: 29818
		},
		expenseCategories: [
			{
				category: 'Advertising',
				amount: 1200,
				percentage: 2.5,
				deductible: true,
				notes: ''
			},
			{
				category: 'Auto',
				amount: 2400,
				percentage: 5,
				deductible: true,
				notes: ''
			},
			{
				category: 'Cleaning',
				amount: 3600,
				percentage: 7.5,
				deductible: true,
				notes: ''
			},
			{
				category: 'Insurance',
				amount: 12000,
				percentage: 25,
				deductible: true,
				notes: ''
			},
			{
				category: 'Legal',
				amount: 1500,
				percentage: 3.1,
				deductible: true,
				notes: ''
			},
			{
				category: 'Management',
				amount: 6000,
				percentage: 12.5,
				deductible: true,
				notes: ''
			},
			{
				category: 'Repairs',
				amount: 4800,
				percentage: 10,
				deductible: true,
				notes: ''
			},
			{
				category: 'Supplies',
				amount: 1200,
				percentage: 2.5,
				deductible: true,
				notes: ''
			},
			{
				category: 'Property Tax',
				amount: 9600,
				percentage: 20,
				deductible: true,
				notes: ''
			},
			{
				category: 'Utilities',
				amount: 7200,
				percentage: 15,
				deductible: true,
				notes: ''
			}
		],
		propertyDepreciation: [
			{
				propertyId: 'prop-1',
				propertyName: 'Property 1',
				propertyValue: 500000,
				annualDepreciation: 18182,
				accumulatedDepreciation: 90910,
				remainingBasis: 409090
			}
		],
		totals: {
			totalIncome: 120000,
			totalDeductions: 90182,
			netTaxableIncome: 29818
		},
		schedule: {
			scheduleE: {
				grossRentalIncome: 120000,
				totalExpenses: 48000,
				depreciation: 18182,
				netIncome: 53818
			}
		}
	}

	beforeEach(async () => {
		service = {
			generateTaxDocuments: jest.fn().mockResolvedValue(mockTaxDocuments)
		} as unknown as jest.Mocked<TaxDocumentsService>

		const module: TestingModule = await Test.createTestingModule({
			controllers: [TaxDocumentsController],
			providers: [
				{
					provide: TaxDocumentsService,
					useValue: service
				}
			]
		}).compile()

		controller = module.get(TaxDocumentsController)
	})

	describe('GET /financials/tax-documents', () => {
		it('should return tax documents with provided tax year', async () => {
			const mockReq = {
				user: { id: 'user-123', email: 'test@example.com' }
			} as any

			const result = await controller.getTaxDocuments(mockReq, '2024')

			expect(result).toEqual({
				success: true,
				data: mockTaxDocuments
			})
			expect(service.generateTaxDocuments).toHaveBeenCalledWith(
				'user-123',
				2024
			)
		})

		it('should use current year as default when no tax year provided', async () => {
			const mockReq = {
				user: { id: 'user-123', email: 'test@example.com' }
			} as any

			const expectedYear = new Date().getFullYear()

			await controller.getTaxDocuments(mockReq)

			expect(service.generateTaxDocuments).toHaveBeenCalledWith(
				'user-123',
				expectedYear
			)
		})

		it('should throw BadRequestException when user ID is missing', async () => {
			const mockReq = {} as any

			await expect(controller.getTaxDocuments(mockReq, '2024')).rejects.toThrow(
				BadRequestException
			)
		})

		it('should throw BadRequestException for invalid tax year format', async () => {
			const mockReq = {
				user: { id: 'user-123', email: 'test@example.com' }
			} as any

			await expect(
				controller.getTaxDocuments(mockReq, 'invalid-year')
			).rejects.toThrow(BadRequestException)
		})

		it('should throw BadRequestException for tax year below 2000', async () => {
			const mockReq = {
				user: { id: 'user-123', email: 'test@example.com' }
			} as any

			await expect(controller.getTaxDocuments(mockReq, '1999')).rejects.toThrow(
				BadRequestException
			)
		})

		it('should throw BadRequestException for tax year above 2100', async () => {
			const mockReq = {
				user: { id: 'user-123', email: 'test@example.com' }
			} as any

			await expect(controller.getTaxDocuments(mockReq, '2101')).rejects.toThrow(
				BadRequestException
			)
		})

		it('should handle service errors', async () => {
			const mockReq = {
				user: { id: 'user-123', email: 'test@example.com' }
			} as any

			service.generateTaxDocuments.mockRejectedValueOnce(
				new Error('Service error')
			)

			await expect(controller.getTaxDocuments(mockReq, '2024')).rejects.toThrow(
				'Service error'
			)
		})

		it('should verify Schedule E calculations', async () => {
			const mockReq = {
				user: { id: 'user-123', email: 'test@example.com' }
			} as any

			const result = await controller.getTaxDocuments(mockReq, '2024')

			const { scheduleE } = result.data.schedule
			const calculatedNet =
				scheduleE.grossRentalIncome -
				scheduleE.totalExpenses -
				scheduleE.depreciation

			expect(scheduleE.netIncome).toBe(calculatedNet)
		})

		it('should verify all expense categories are present', async () => {
			const mockReq = {
				user: { id: 'user-123', email: 'test@example.com' }
			} as any

			const result = await controller.getTaxDocuments(mockReq, '2024')

			const { expenseCategories } = result.data

			// Verify each category has required properties
			expenseCategories.forEach(expense => {
				expect(expense).toHaveProperty('category')
				expect(expense).toHaveProperty('amount')
				expect(expense).toHaveProperty('deductible')
				expect(typeof expense.amount).toBe('number')
				expect(typeof expense.deductible).toBe('boolean')
			})
		})

		it('should verify depreciation schedule structure', async () => {
			const mockReq = {
				user: { id: 'user-123', email: 'test@example.com' }
			} as any

			const result = await controller.getTaxDocuments(mockReq, '2024')

			const { propertyDepreciation } = result.data
			expect(Array.isArray(propertyDepreciation)).toBe(true)
			expect(propertyDepreciation.length).toBeGreaterThan(0)

			const firstProperty = propertyDepreciation[0]
			expect(firstProperty).toHaveProperty('propertyId')
			expect(firstProperty).toHaveProperty('propertyName')
			expect(firstProperty).toHaveProperty('propertyValue')
			expect(firstProperty).toHaveProperty('annualDepreciation')
			expect(firstProperty).toHaveProperty('accumulatedDepreciation')
			expect(firstProperty).toHaveProperty('remainingBasis')
		})
	})
})
