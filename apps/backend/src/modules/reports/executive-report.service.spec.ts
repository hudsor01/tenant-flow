import { Test } from '@nestjs/testing'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import { ExecutiveReportService } from './executive-report.service'
import { ExportService } from './export.service'
import { ExecutiveMonthlyTemplate } from './templates/executive-monthly.template'

describe('ExecutiveReportService', () => {
	let service: ExecutiveReportService
	let mockExportService: jest.Mocked<Pick<ExportService, 'generatePDF' | 'generateExcel'>>
	let mockTemplate: jest.Mocked<Pick<ExecutiveMonthlyTemplate, 'generateReportData' | 'formatForExcel' | 'formatForPDF'>>

	const USER_ID = 'user-123'
	const START_DATE = '2024-01-01'
	const END_DATE = '2024-12-31'

	const mockReportData = {
		summary: { totalRevenue: 10000, totalExpenses: 5000, netIncome: 5000, occupancyRate: 85, propertyCount: 3, unitCount: 12 },
		trends: { revenueGrowth: 5, expenseChange: 2, occupancyChange: 1 },
		topPerformers: [],
		keyMetrics: {} as any,
		period: { start_date: START_DATE, end_date: END_DATE },
	}

	beforeEach(async () => {
		mockExportService = {
			generatePDF: jest.fn().mockResolvedValue(Buffer.from('%PDF-test')),
			generateExcel: jest.fn().mockResolvedValue(Buffer.from('excel-test')),
		}
		mockTemplate = {
			generateReportData: jest.fn().mockResolvedValue(mockReportData),
			formatForExcel: jest.fn().mockReturnValue([{ sheet: 'data' }]),
			formatForPDF: jest.fn().mockReturnValue({ content: 'pdf' }),
		}

		const module = await Test.createTestingModule({
			providers: [
				ExecutiveReportService,
				{ provide: ExportService, useValue: mockExportService },
				{ provide: ExecutiveMonthlyTemplate, useValue: mockTemplate },
				{ provide: AppLogger, useValue: new SilentLogger() },
			],
		}).setLogger(new SilentLogger()).compile()

		service = module.get<ExecutiveReportService>(ExecutiveReportService)
	})

	afterEach(() => { jest.resetAllMocks() })

	describe('generateMonthlyReport', () => {
		it('generates a PDF report by default', async () => {
			const result = await service.generateMonthlyReport(USER_ID, START_DATE, END_DATE)

			expect(mockTemplate.generateReportData).toHaveBeenCalledWith(USER_ID, START_DATE, END_DATE)
			expect(mockTemplate.formatForPDF).toHaveBeenCalledWith(mockReportData)
			expect(mockExportService.generatePDF).toHaveBeenCalled()
			expect(result.contentType).toBe('application/pdf')
			expect(result.filename).toBe('executive-monthly-report.pdf')
			expect(Buffer.isBuffer(result.buffer)).toBe(true)
		})

		it('generates an Excel report when format is excel', async () => {
			const result = await service.generateMonthlyReport(USER_ID, START_DATE, END_DATE, 'excel')

			expect(mockTemplate.generateReportData).toHaveBeenCalledWith(USER_ID, START_DATE, END_DATE)
			expect(mockTemplate.formatForExcel).toHaveBeenCalledWith(mockReportData)
			expect(mockExportService.generateExcel).toHaveBeenCalled()
			expect(result.contentType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
			expect(result.filename).toBe('executive-monthly-report.xlsx')
			expect(Buffer.isBuffer(result.buffer)).toBe(true)
		})

		it('passes user_id, start_date, end_date to template', async () => {
			await service.generateMonthlyReport('owner-xyz', '2024-03-01', '2024-03-31')
			expect(mockTemplate.generateReportData).toHaveBeenCalledWith('owner-xyz', '2024-03-01', '2024-03-31')
		})

		it('uses pdf format as the default when format param is omitted', async () => {
			await service.generateMonthlyReport(USER_ID, START_DATE, END_DATE)
			expect(mockExportService.generatePDF).toHaveBeenCalled()
			expect(mockExportService.generateExcel).not.toHaveBeenCalled()
		})

		it('propagates errors from template.generateReportData', async () => {
			mockTemplate.generateReportData.mockRejectedValue(new Error('Template error'))
			await expect(
				service.generateMonthlyReport(USER_ID, START_DATE, END_DATE)
			).rejects.toThrow('Template error')
		})

		it('propagates errors from exportService.generatePDF', async () => {
			mockExportService.generatePDF.mockRejectedValue(new Error('PDF generation failed'))
			await expect(
				service.generateMonthlyReport(USER_ID, START_DATE, END_DATE)
			).rejects.toThrow('PDF generation failed')
		})

		it('propagates errors from exportService.generateExcel', async () => {
			mockExportService.generateExcel.mockRejectedValue(new Error('Excel generation failed'))
			await expect(
				service.generateMonthlyReport(USER_ID, START_DATE, END_DATE, 'excel')
			).rejects.toThrow('Excel generation failed')
		})

		it('returns the buffer from generateExcel for excel format', async () => {
			const excelBuffer = Buffer.from('excel-content-bytes')
			mockExportService.generateExcel.mockResolvedValue(excelBuffer)
			const result = await service.generateMonthlyReport(USER_ID, START_DATE, END_DATE, 'excel')
			expect(result.buffer).toEqual(excelBuffer)
		})

		it('returns the buffer from generatePDF for pdf format', async () => {
			const pdfBuffer = Buffer.from('%PDF-content')
			mockExportService.generatePDF.mockResolvedValue(pdfBuffer)
			const result = await service.generateMonthlyReport(USER_ID, START_DATE, END_DATE, 'pdf')
			expect(result.buffer).toEqual(pdfBuffer)
		})
	})
})
