import { Test } from '@nestjs/testing'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import { TaxReportService } from './tax-report.service'
import { ExportService } from './export.service'
import { TaxPreparationTemplate } from './templates/tax-preparation.template'

describe('TaxReportService', () => {
	let service: TaxReportService
	let mockExportService: jest.Mocked<Pick<ExportService, 'generateExcel'>>
	let mockTemplate: jest.Mocked<Pick<TaxPreparationTemplate, 'generateReportData' | 'formatForExcel'>>

	const USER_ID = 'user-123'
	const START_DATE = '2024-01-01'
	const END_DATE = '2024-12-31'

	const mockReportData = {
		incomeSummary: { totalRentalIncome: 50000, otherIncome: 0, totalIncome: 50000 },
		expenseSummary: { deductibleExpenses: 10000, nonDeductibleExpenses: 0, totalExpenses: 10000 },
		expenseCategories: [],
		propertyDepreciation: [],
		netOperatingIncome: [],
		taxYearSummary: { totalRentalIncome: 50000, totalDeductions: 10000, netRentalIncome: 40000, estimatedTaxLiability: 8000 },
		period: { taxYear: 2024, start_date: START_DATE, end_date: END_DATE },
	}

	beforeEach(async () => {
		mockExportService = {
			generateExcel: jest.fn().mockResolvedValue(Buffer.from('excel-content')),
		}
		mockTemplate = {
			generateReportData: jest.fn().mockResolvedValue(mockReportData),
			formatForExcel: jest.fn().mockReturnValue([{ row: 1 }]),
		}

		const module = await Test.createTestingModule({
			providers: [
				TaxReportService,
				{ provide: ExportService, useValue: mockExportService },
				{ provide: TaxPreparationTemplate, useValue: mockTemplate },
				{ provide: AppLogger, useValue: new SilentLogger() },
			],
		}).setLogger(new SilentLogger()).compile()

		service = module.get<TaxReportService>(TaxReportService)
	})

	afterEach(() => { jest.resetAllMocks() })

	describe('generateTaxPreparation', () => {
		it('generates an Excel tax preparation report', async () => {
			const result = await service.generateTaxPreparation(USER_ID, START_DATE, END_DATE)

			expect(mockTemplate.generateReportData).toHaveBeenCalledWith(USER_ID, START_DATE, END_DATE)
			expect(mockTemplate.formatForExcel).toHaveBeenCalledWith(mockReportData)
			expect(mockExportService.generateExcel).toHaveBeenCalledWith([{ row: 1 }], 'Tax Preparation')
			expect(result.contentType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
			expect(result.filename).toBe('tax-preparation-report.xlsx')
			expect(Buffer.isBuffer(result.buffer)).toBe(true)
		})

		it('passes user_id, start_date, end_date to template.generateReportData', async () => {
			await service.generateTaxPreparation('owner-abc', '2023-01-01', '2023-12-31')
			expect(mockTemplate.generateReportData).toHaveBeenCalledWith('owner-abc', '2023-01-01', '2023-12-31')
		})

		it('passes formatted excel data to exportService.generateExcel', async () => {
			const formattedData = [{ col1: 'val1' }, { col2: 'val2' }]
			mockTemplate.formatForExcel.mockReturnValue(formattedData)
			await service.generateTaxPreparation(USER_ID, START_DATE, END_DATE)
			expect(mockExportService.generateExcel).toHaveBeenCalledWith(formattedData, 'Tax Preparation')
		})

		it('returns the buffer from generateExcel', async () => {
			const excelBuffer = Buffer.from('tax-excel-bytes')
			mockExportService.generateExcel.mockResolvedValue(excelBuffer)
			const result = await service.generateTaxPreparation(USER_ID, START_DATE, END_DATE)
			expect(result.buffer).toEqual(excelBuffer)
		})

		it('propagates errors from template.generateReportData', async () => {
			mockTemplate.generateReportData.mockRejectedValue(new Error('Template fetch failed'))
			await expect(
				service.generateTaxPreparation(USER_ID, START_DATE, END_DATE)
			).rejects.toThrow('Template fetch failed')
		})

		it('propagates errors from exportService.generateExcel', async () => {
			mockExportService.generateExcel.mockRejectedValue(new Error('Excel write failed'))
			await expect(
				service.generateTaxPreparation(USER_ID, START_DATE, END_DATE)
			).rejects.toThrow('Excel write failed')
		})

		it('always produces xlsx content type regardless of data', async () => {
			const result = await service.generateTaxPreparation(USER_ID, START_DATE, END_DATE)
			expect(result.contentType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
		})

		it('always produces xlsx filename', async () => {
			const result = await service.generateTaxPreparation(USER_ID, START_DATE, END_DATE)
			expect(result.filename).toBe('tax-preparation-report.xlsx')
		})
	})
})
