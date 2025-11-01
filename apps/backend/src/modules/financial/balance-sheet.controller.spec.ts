import { BadRequestException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { BalanceSheetData } from '@repo/shared/types/financial-statements'
import { BalanceSheetController } from './balance-sheet.controller'
import { BalanceSheetService } from './balance-sheet.service'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'

// Mock the JwtToken decorator to return our test token
jest.mock('../../shared/decorators/jwt-token.decorator', () => ({
	JwtToken: () => (target: any, propertyKey: string, parameterIndex: number) => {
		// Store metadata for the decorator
		const existingParams = Reflect.getMetadata('custom:jwt-token-params', target, propertyKey) || []
		existingParams.push(parameterIndex)
		Reflect.defineMetadata('custom:jwt-token-params', existingParams, target, propertyKey)
	}
}))

describe('BalanceSheetController', () => {
	let controller: BalanceSheetController
	let service: jest.Mocked<BalanceSheetService>

	const mockBalanceSheet: BalanceSheetData = {
		period: {
			startDate: '2024-10-31',
			endDate: '2024-10-31',
			label: 'As of October 31, 2024'
		},
		assets: {
			currentAssets: {
				cash: 10000,
				accountsReceivable: 2000,
				securityDeposits: 5000,
				total: 17000
			},
			fixedAssets: {
				propertyValues: 500000,
				accumulatedDepreciation: -50000,
				netPropertyValue: 450000,
				total: 450000
			},
			totalAssets: 467000
		},
		liabilities: {
			currentLiabilities: {
				accountsPayable: 1000,
				securityDepositLiability: 5000,
				accruedExpenses: 500,
				total: 6500
			},
			longTermLiabilities: {
				mortgagesPayable: 300000,
				total: 300000
			},
			totalLiabilities: 306500
		},
		equity: {
			ownerCapital: 100000,
			retainedEarnings: 50000,
			currentPeriodIncome: 10500,
			totalEquity: 160500
		},
		balanceCheck: true
	}

	beforeEach(async () => {
		service = {
			generateBalanceSheet: jest.fn().mockResolvedValue(mockBalanceSheet)
		} as unknown as jest.Mocked<BalanceSheetService>

		const module: TestingModule = await Test.createTestingModule({
			controllers: [BalanceSheetController],
			providers: [
				{
					provide: BalanceSheetService,
					useValue: service
				}
			]
		})
			.overrideGuard(JwtAuthGuard)
			.useValue({ canActivate: () => true })
			.compile()

		controller = module.get(BalanceSheetController)
	})

	describe('GET /financials/balance-sheet', () => {
		it('should return balance sheet with provided date', async () => {
			const result = await controller.getBalanceSheet('mock-jwt-token', '2024-10-31')

			expect(result).toEqual({
				success: true,
				data: mockBalanceSheet
			})
			expect(service.generateBalanceSheet).toHaveBeenCalledWith(
				'mock-jwt-token',
				'2024-10-31'
			)
		})

		it('should use current date as default when no date provided', async () => {
			const expectedDate = new Date().toISOString().split('T')[0] as string

			await controller.getBalanceSheet('mock-jwt-token')

			expect(service.generateBalanceSheet).toHaveBeenCalledWith(
				'mock-jwt-token',
				expectedDate
			)
		})

		it('should throw UnauthorizedException when token is missing', async () => {
			await expect(
				controller.getBalanceSheet('' as any, '2024-10-31')
			).rejects.toThrow('Authentication token is required')
		})

		it('should throw BadRequestException for invalid date format', async () => {
			await expect(
				controller.getBalanceSheet('mock-jwt-token', 'invalid-date')
			).rejects.toThrow(BadRequestException)
		})

		it('should verify balance check equals assets = liabilities + equity', async () => {
			const result = await controller.getBalanceSheet('mock-jwt-token', '2024-10-31')

			const { assets, liabilities, equity } = result.data
			const leftSide = assets.totalAssets
			const rightSide = liabilities.totalLiabilities + equity.totalEquity

			expect(result.data.balanceCheck).toBe(leftSide === rightSide)
		})

		it('should handle service errors', async () => {
			service.generateBalanceSheet.mockRejectedValueOnce(
				new Error('Database error')
			)

			await expect(
				controller.getBalanceSheet('mock-jwt-token', '2024-10-31')
			).rejects.toThrow('Database error')
		})

		it('should show unbalanced when assets do not equal liabilities + equity', async () => {
			const unbalancedSheet: BalanceSheetData = {
				...mockBalanceSheet,
				equity: {
					...mockBalanceSheet.equity,
					totalEquity: 150000 // Changed to create imbalance
				},
				balanceCheck: false
			}

			service.generateBalanceSheet.mockResolvedValueOnce(unbalancedSheet)

			const result = await controller.getBalanceSheet('mock-jwt-token', '2024-10-31')

			expect(result.data.balanceCheck).toBe(false)
		})
	})
})
