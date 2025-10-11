import {
	getBalanceSheet,
	getCashFlowStatement,
	getIncomeStatement,
	getTaxDocuments
} from '../financials-client'

// Mock fetch globally
global.fetch = jest.fn()

describe('financials-client', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		// Set environment variable for test
		process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001'
	})

	describe('API URL construction', () => {
		it('getIncomeStatement should use correct endpoint', async () => {
			const mockResponse = {
				data: {
					period: { startDate: '2024-01-01', endDate: '2024-12-31' },
					revenue: { rental: 0, other: 0, total: 0 },
					expenses: { categories: [], total: 0 },
					netIncome: 0
				}
			}

			;(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			})

			await getIncomeStatement('token', '2024-01-01', '2024-12-31')

			expect(global.fetch).toHaveBeenCalledWith(
				'http://localhost:3001/api/v1/financials/income-statement?startDate=2024-01-01&endDate=2024-12-31',
				expect.any(Object)
			)
		})

		it('getCashFlowStatement should use correct endpoint', async () => {
			const mockResponse = {
				data: {
					period: { startDate: '2024-01-01', endDate: '2024-12-31' },
					operating: { inflows: [], outflows: [], net: 0 },
					investing: { inflows: [], outflows: [], net: 0 },
					financing: { inflows: [], outflows: [], net: 0 },
					netCashFlow: 0
				}
			}

			;(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			})

			await getCashFlowStatement('token', '2024-01-01', '2024-12-31')

			expect(global.fetch).toHaveBeenCalledWith(
				'http://localhost:3001/api/v1/financials/cash-flow?startDate=2024-01-01&endDate=2024-12-31',
				expect.any(Object)
			)
		})

		it('getBalanceSheet should use correct endpoint', async () => {
			const mockResponse = {
				data: {
					asOfDate: '2024-12-31',
					assets: { current: [], longTerm: [], total: 0 },
					liabilities: { current: [], longTerm: [], total: 0 },
					equity: { items: [], total: 0 },
					totalLiabilitiesAndEquity: 0
				}
			}

			;(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			})

			await getBalanceSheet('token', '2024-12-31')

			expect(global.fetch).toHaveBeenCalledWith(
				'http://localhost:3001/api/v1/financials/balance-sheet?asOfDate=2024-12-31',
				expect.any(Object)
			)
		})
	})

	describe('getTaxDocuments', () => {
		it('should construct correct API URL with /api/v1/financials/ prefix', async () => {
			const mockResponse = {
				data: {
					taxYear: 2024,
					scheduleE: {},
					depreciation: {},
					summary: {
						totalIncome: 0,
						totalExpenses: 0,
						netIncome: 0
					}
				}
			}

			;(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			})

			const token = 'test-token'
			const taxYear = 2024

			const result = await getTaxDocuments(token, taxYear)

			expect(global.fetch).toHaveBeenCalledWith(
				'http://localhost:3001/api/v1/financials/tax-documents?taxYear=2024',
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer test-token',
						'Content-Type': 'application/json'
					}),
					cache: 'no-store'
				})
			)
			expect(result).toEqual(mockResponse.data)
		})

		it('should handle API errors with descriptive message', async () => {
			;(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: 'Not Found'
			})

			const token = 'test-token'
			const taxYear = 2024

			await expect(getTaxDocuments(token, taxYear)).rejects.toThrow(
				'API request failed: Not Found'
			)
		})

		it('should handle network errors', async () => {
			;(global.fetch as jest.Mock).mockRejectedValueOnce(
				new Error('Network error')
			)

			await expect(getTaxDocuments('token', 2024)).rejects.toThrow(
				'Network error'
			)
		})
	})

	describe('Authentication', () => {
		it('should include Authorization header in all requests', async () => {
			const mockResponse = { data: {} }
			;(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: async () => mockResponse
			})

			const token = 'secure-token-123'

			await getTaxDocuments(token, 2024)

			const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
			const headers = fetchCall[1].headers

			expect(headers.Authorization).toBe('Bearer secure-token-123')
			expect(headers['Content-Type']).toBe('application/json')
		})
	})
})
