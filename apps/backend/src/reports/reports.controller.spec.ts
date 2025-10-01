import { BadRequestException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ExportService } from './export.service'
import { GeneratedReportService } from './generated-report.service'
import { ReportsController } from './reports.controller'
import { ScheduledReportService } from './scheduled-report.service'
import { ExecutiveMonthlyTemplate } from './templates/executive-monthly.template'
import { FinancialPerformanceTemplate } from './templates/financial-performance.template'
import { LeasePortfolioTemplate } from './templates/lease-portfolio.template'
import { MaintenanceOperationsTemplate } from './templates/maintenance-operations.template'
import { PropertyPortfolioTemplate } from './templates/property-portfolio.template'
import { TaxPreparationTemplate } from './templates/tax-preparation.template'

describe('ReportsController', () => {
	let controller: ReportsController
	let exportService: jest.Mocked<ExportService>

	beforeEach(async () => {
		exportService = {
			generateExcel: jest.fn().mockResolvedValue(Buffer.from('excel')),
			generateCSV: jest.fn().mockResolvedValue('csv'),
			generatePDF: jest.fn().mockResolvedValue(Buffer.from('pdf'))
		} as unknown as jest.Mocked<ExportService>

		const module: TestingModule = await Test.createTestingModule({
			controllers: [ReportsController],
			providers: [
				{
					provide: ExportService,
					useValue: exportService
				},
				{
					provide: GeneratedReportService,
					useValue: {}
				},
				{
					provide: ScheduledReportService,
					useValue: {}
				},
				{
					provide: ExecutiveMonthlyTemplate,
					useValue: {}
				},
				{
					provide: FinancialPerformanceTemplate,
					useValue: {}
				},
				{
					provide: PropertyPortfolioTemplate,
					useValue: {}
				},
				{
					provide: LeasePortfolioTemplate,
					useValue: {}
				},
				{
					provide: MaintenanceOperationsTemplate,
					useValue: {}
				},
				{
					provide: TaxPreparationTemplate,
					useValue: {}
				}
			]
		}).compile()

		controller = module.get(ReportsController)
	})

	function createResponseMock() {
		return {
			setHeader: jest.fn(),
			send: jest.fn()
		} as unknown as Parameters<typeof controller.exportExcel>[1]
	}

	describe('validation', () => {
		it('throws when payload is missing', async () => {
			await expect(
				controller.exportCsv({} as never, createResponseMock())
			).rejects.toBeInstanceOf(BadRequestException)
		})

		it('enforces filename, sheet name, and title length constraints', async () => {
			const tooLongFilename = `${'a'.repeat(121)}.csv`
			await expect(
				controller.exportCsv(
					{
						filename: tooLongFilename,
						payload: []
					} as never,
					createResponseMock()
				)
			).rejects.toThrow('Filename must be 120 characters or fewer')

			await expect(
				controller.exportExcel(
					{
						payload: [],
						sheetName: 's'.repeat(61)
					} as never,
					createResponseMock()
				)
			).rejects.toThrow('Sheet name must be 60 characters or fewer')

			await expect(
				controller.exportPdf(
					{
						payload: [],
						title: 't'.repeat(161)
					} as never,
					createResponseMock()
				)
			).rejects.toThrow('Title must be 160 characters or fewer')
		})
	})

	describe('exportExcel', () => {
		it('generates excel export with sanitized filename', async () => {
			const res = createResponseMock()

			await controller.exportExcel(
				{
					filename: '../Portfolio Report',
					sheetName: 'Detailed Metrics',
					payload: { hello: 'world' }
				},
				res
			)

			expect(exportService.generateExcel).toHaveBeenCalledWith(
				{ hello: 'world' },
				'Detailed Metrics'
			)
			expect(res.setHeader).toHaveBeenCalledWith(
				'Content-Disposition',
				expect.stringContaining('portfolio-report.xlsx')
			)
			expect(res.send).toHaveBeenCalledWith(Buffer.from('excel'))
		})

		it('accepts analytics data via the data alias and truncates sheet names', async () => {
			const res = createResponseMock()
			const sheetName =
				'Quarterly Financial Snapshot FY2024 Metrics Overview 123456'

			await controller.exportExcel(
				{
					filename: 'Financial Overview',
					sheetName: sheetName,
					data: [{ revenue: 100 }]
				},
				res
			)

			expect(exportService.generateExcel).toHaveBeenCalledWith(
				[{ revenue: 100 }],
				sheetName.slice(0, 60)
			)
		})
	})

	describe('exportCsv', () => {
		it('generates csv export', async () => {
			const res = createResponseMock()

			await controller.exportCsv(
				{
					filename: 'leases',
					payload: [{ id: 1 }]
				},
				res
			)

			expect(exportService.generateCSV).toHaveBeenCalledWith([{ id: 1 }])
			expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv')
			expect(res.send).toHaveBeenCalledWith('csv')
		})
	})

	describe('exportPdf', () => {
		it('generates pdf export with title fallback', async () => {
			const res = createResponseMock()

			await controller.exportPdf(
				{
					title: 'Lease Summary',
					payload: { leases: [] }
				},
				res
			)

			expect(exportService.generatePDF).toHaveBeenCalledWith(
				{ leases: [] },
				'Lease Summary'
			)
			expect(res.setHeader).toHaveBeenCalledWith(
				'Content-Type',
				'application/pdf'
			)
			expect(res.send).toHaveBeenCalledWith(Buffer.from('pdf'))
		})

		it('trims provided titles before rendering the PDF document', async () => {
			const res = createResponseMock()
			const titleWithWhitespace = 'Lease Performance Summary            '

			await controller.exportPdf(
				{
					title: titleWithWhitespace,
					payload: { records: [] }
				},
				res
			)

			expect(exportService.generatePDF).toHaveBeenCalledWith(
				{ records: [] },
				titleWithWhitespace.trim()
			)
		})
	})
})
