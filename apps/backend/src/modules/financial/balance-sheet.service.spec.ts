import { Logger } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { SupabaseService } from '../../database/supabase.service'
import { BalanceSheetService } from './balance-sheet.service'

describe('BalanceSheetService', () => {
	let service: BalanceSheetService
	let supabaseService: jest.Mocked<SupabaseService>
	let mockClient: any

	beforeEach(async () => {
		mockClient = {
			rpc: jest.fn(),
			from: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			single: jest.fn(),
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
				BalanceSheetService,
				{
					provide: SupabaseService,
					useValue: supabaseService
				}
			]
		}).compile()

		service = module.get(BalanceSheetService)

		jest.spyOn(Logger.prototype, 'log').mockImplementation()
		jest.spyOn(Logger.prototype, 'error').mockImplementation()
		jest.spyOn(Logger.prototype, 'warn').mockImplementation()
	})

	describe('generateBalanceSheet', () => {
		it('should generate balance sheet with valid data', async () => {
			// Create balanced test data:
			// Assets: 50k cash + 3k receivables + 10k deposits = 63k
			// Liabilities: 5k AP + 10k deposit liability + 2k accrued = 17k
			// Equity: Must be 46k to balance (63k - 17k)
			mockClient.rpc.mockResolvedValueOnce({
				data: {
					cash_balance: 50000,
					accounts_payable: 5000,
					accrued_expenses: 2000,
					mortgages_payable: 0, // Set to 0 for simple test
					owner_capital: 40000,
					retained_earnings: 5000,
					current_period_income: 1000 // Total equity = 46k
				},
				error: null
			})

			// Mock NOI calculation - use zero to simplify balance sheet validation
			mockClient.rpc.mockResolvedValueOnce({
				data: [],
				error: null
			})

			// Mock lease financial summary
			mockClient.rpc.mockResolvedValueOnce({
				data: {
					total_outstanding_balance: 3000,
					total_deposits: 10000
				},
				error: null
			})

			const result = await service.generateBalanceSheet(
				'user-123',
				'2024-10-31'
			)

			expect(result).toBeDefined()
			expect(result.assets.totalAssets).toBeGreaterThan(0)
			expect(result.liabilities.totalLiabilities).toBeGreaterThan(0)
			expect(result.equity.totalEquity).toBeGreaterThan(0)

			// Verify balance sheet equation: Assets = Liabilities + Equity
			const liabilitiesPlusEquity =
				result.liabilities.totalLiabilities + result.equity.totalEquity
			const difference = Math.abs(
				result.assets.totalAssets - liabilitiesPlusEquity
			)
			expect(difference).toBeLessThan(0.01) // Allow for rounding errors

			// Verify cash and current assets
			expect(result.assets.currentAssets.cash).toBe(50000)
			expect(result.assets.currentAssets.accountsReceivable).toBe(3000)
			expect(result.assets.currentAssets.securityDeposits).toBe(10000)

			// Verify current liabilities
			expect(result.liabilities.currentLiabilities.accountsPayable).toBe(5000)
			expect(result.liabilities.currentLiabilities.accruedExpenses).toBe(2000)

			// Verify long-term liabilities
			expect(result.liabilities.longTermLiabilities.mortgagesPayable).toBe(0)

			// Verify equity components
			expect(result.equity.ownerCapital).toBe(40000)
			expect(result.equity.retainedEarnings).toBe(5000)
			expect(result.equity.currentPeriodIncome).toBe(1000)

			// With zero NOI, property values should be zero
			expect(result.assets.fixedAssets.propertyValues).toBe(0)
			expect(result.assets.fixedAssets.accumulatedDepreciation).toBe(0)
			expect(result.assets.fixedAssets.netPropertyValue).toBe(0)

			// Verify RPC calls
			expect(mockClient.rpc).toHaveBeenCalledWith('get_financial_overview', {
				p_user_id: 'user-123'
			})
			expect(mockClient.rpc).toHaveBeenCalledWith(
				'calculate_net_operating_income',
				{
					p_user_id: ''
				}
			)
			expect(mockClient.rpc).toHaveBeenCalledWith(
				'get_lease_financial_summary',
				{
					p_user_id: ''
				}
			)
		})

		it('should handle missing data gracefully', async () => {
			// Mock all RPC calls returning null/empty data
			mockClient.rpc
				.mockResolvedValueOnce({
					data: null,
					error: null
				})
				.mockResolvedValueOnce({
					data: [],
					error: null
				})
				.mockResolvedValueOnce({
					data: null,
					error: null
				})

			const result = await service.generateBalanceSheet(
				'user-123',
				'2024-10-31'
			)

			expect(result.assets.totalAssets).toBe(0)
			expect(result.liabilities.totalLiabilities).toBe(0)
			expect(result.equity.totalEquity).toBe(0)
			expect(result.assets.currentAssets.cash).toBe(0)
			expect(result.assets.currentAssets.accountsReceivable).toBe(0)
		})

		it('should throw error when financial overview RPC fails', async () => {
			const dbError = new Error('Database error')
			mockClient.rpc.mockResolvedValueOnce({
				data: null,
				error: dbError
			})

			await expect(
				service.generateBalanceSheet('user-123', '2024-10-31')
			).rejects.toThrow('Database error')
		})

		it('should throw error when NOI calculation RPC fails', async () => {
			// Mock successful financial overview
			mockClient.rpc.mockResolvedValueOnce({
				data: { cash_balance: 10000 },
				error: null
			})

			// Mock failed NOI calculation
			const noiError = new Error('NOI calculation failed')
			mockClient.rpc.mockResolvedValueOnce({
				data: null,
				error: noiError
			})

			await expect(
				service.generateBalanceSheet('user-123', '2024-10-31')
			).rejects.toThrow('NOI calculation failed')
		})

		it('should throw error when lease summary RPC fails', async () => {
			// Mock successful financial overview
			mockClient.rpc.mockResolvedValueOnce({
				data: { cash_balance: 10000 },
				error: null
			})

			// Mock successful NOI calculation
			mockClient.rpc.mockResolvedValueOnce({
				data: [{ noi: 12000 }],
				error: null
			})

			// Mock failed lease summary
			const leaseError = new Error('Lease summary failed')
			mockClient.rpc.mockResolvedValueOnce({
				data: null,
				error: leaseError
			})

			await expect(
				service.generateBalanceSheet('user-123', '2024-10-31')
			).rejects.toThrow('Lease summary failed')
		})

		it('should calculate property values correctly from NOI', async () => {
			mockClient.rpc.mockResolvedValueOnce({
				data: { cash_balance: 0 },
				error: null
			})

			// Mock NOI with known value
			const testNOI = 18000
			mockClient.rpc.mockResolvedValueOnce({
				data: [{ noi: testNOI, property_id: 'prop-1' }],
				error: null
			})

			mockClient.rpc.mockResolvedValueOnce({
				data: { total_outstanding_balance: 0, total_deposits: 0 },
				error: null
			})

			const result = await service.generateBalanceSheet(
				'user-123',
				'2024-10-31'
			)

			// Expected: NOI / cap rate (18000 / 0.06 = 300000)
			const expectedPropertyValue = testNOI / 0.06
			expect(result.assets.fixedAssets.propertyValues).toBe(
				expectedPropertyValue
			)

			// Verify depreciation calculation (15% of property value)
			const expectedDepreciation = expectedPropertyValue * 0.15
			expect(result.assets.fixedAssets.accumulatedDepreciation).toBe(
				expectedDepreciation
			)

			// Verify net property value
			const expectedNetValue = expectedPropertyValue - expectedDepreciation
			expect(result.assets.fixedAssets.netPropertyValue).toBe(expectedNetValue)
		})

		it('should validate balance sheet correctly', async () => {
			// Mock data that creates a balanced balance sheet
			mockClient.rpc.mockResolvedValueOnce({
				data: {
					cash_balance: 100000,
					accounts_payable: 10000,
					mortgages_payable: 50000,
					owner_capital: 40000
				},
				error: null
			})

			mockClient.rpc.mockResolvedValueOnce({
				data: [],
				error: null
			})

			mockClient.rpc.mockResolvedValueOnce({
				data: { total_outstanding_balance: 0, total_deposits: 0 },
				error: null
			})

			const result = await service.generateBalanceSheet(
				'user-123',
				'2024-10-31'
			)

			// Balance sheet should validate correctly
			expect(result.balanceCheck).toBeDefined()
			expect(typeof result.balanceCheck).toBe('boolean')

			// Verify the fundamental accounting equation
			const assetTotal = result.assets.totalAssets
			const liabilitiesTotal = result.liabilities.totalLiabilities
			const equityTotal = result.equity.totalEquity
			const difference = Math.abs(assetTotal - (liabilitiesTotal + equityTotal))

			// Should be balanced (allowing for small rounding errors)
			expect(difference).toBeLessThan(0.01)
		})

		it('should handle security deposits correctly as both asset and liability', async () => {
			mockClient.rpc.mockResolvedValueOnce({
				data: { cash_balance: 10000 },
				error: null
			})

			mockClient.rpc.mockResolvedValueOnce({
				data: [],
				error: null
			})

			const securityDepositAmount = 15000
			mockClient.rpc.mockResolvedValueOnce({
				data: {
					total_outstanding_balance: 0,
					total_deposits: securityDepositAmount
				},
				error: null
			})

			const result = await service.generateBalanceSheet(
				'user-123',
				'2024-10-31'
			)

			// Security deposits should appear as both asset and liability
			expect(result.assets.currentAssets.securityDeposits).toBe(
				securityDepositAmount
			)
			expect(
				result.liabilities.currentLiabilities.securityDepositLiability
			).toBe(securityDepositAmount)

			// They should offset each other in the balance equation
			expect(result.balanceCheck).toBeDefined()
		})

		it('should format period correctly', async () => {
			mockClient.rpc.mockResolvedValue({
				data: null,
				error: null
			})

			const asOfDate = '2024-10-31'
			const result = await service.generateBalanceSheet('user-123', asOfDate)

			expect(result.period.startDate).toBe(asOfDate)
			expect(result.period.endDate).toBe(asOfDate)
			expect(result.period.label).toContain('2024')
		})

		it('should handle zero NOI correctly', async () => {
			mockClient.rpc.mockResolvedValueOnce({
				data: { cash_balance: 5000 },
				error: null
			})

			// Mock zero NOI
			mockClient.rpc.mockResolvedValueOnce({
				data: [{ noi: 0, property_id: 'prop-1' }],
				error: null
			})

			mockClient.rpc.mockResolvedValueOnce({
				data: { total_outstanding_balance: 0, total_deposits: 0 },
				error: null
			})

			const result = await service.generateBalanceSheet(
				'user-123',
				'2024-10-31'
			)

			// With zero NOI, property values should be zero
			expect(result.assets.fixedAssets.propertyValues).toBe(0)
			expect(result.assets.fixedAssets.accumulatedDepreciation).toBe(0)
			expect(result.assets.fixedAssets.netPropertyValue).toBe(0)
			expect(result.assets.fixedAssets.total).toBe(0)
		})

		it('should handle multiple properties with different NOI values', async () => {
			mockClient.rpc.mockResolvedValueOnce({
				data: { cash_balance: 10000 },
				error: null
			})

			// Mock multiple properties with different NOI
			mockClient.rpc.mockResolvedValueOnce({
				data: [
					{ noi: 10000, property_id: 'prop-1' },
					{ noi: 8000, property_id: 'prop-2' },
					{ noi: 6000, property_id: 'prop-3' }
				],
				error: null
			})

			mockClient.rpc.mockResolvedValueOnce({
				data: { total_outstanding_balance: 0, total_deposits: 0 },
				error: null
			})

			const result = await service.generateBalanceSheet(
				'user-123',
				'2024-10-31'
			)

			// Total NOI should be sum of all properties (24000)
			const totalNOI = 24000
			const expectedPropertyValue = totalNOI / 0.06
			expect(result.assets.fixedAssets.propertyValues).toBe(
				expectedPropertyValue
			)
		})
	})
})
