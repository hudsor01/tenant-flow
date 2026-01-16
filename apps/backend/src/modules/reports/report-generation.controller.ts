import {
	Body,
	Controller,
	Post,
	Res
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiBody,
	ApiOperation,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { Response } from 'express'
import { ExecutiveReportService } from './executive-report.service'
import { ExportService } from './export.service'
import { FinancialPerformanceTemplate } from './templates/financial-performance.template'
import { LeasePortfolioTemplate } from './templates/lease-portfolio.template'
import { MaintenanceOperationsTemplate } from './templates/maintenance-operations.template'
import { PropertyPortfolioTemplate } from './templates/property-portfolio.template'
import { TaxReportService } from './tax-report.service'
import { AppLogger } from '../../logger/app-logger.service'

/**
 * Report Generation Controller
 *
 * Handles complex report generation operations that produce downloadable documents.
 * These are structured reports with templates and business logic.
 */
@ApiTags('Reports')
@ApiBearerAuth('supabase-auth')
@Controller('reports')
export class ReportGenerationController {
	constructor(
		private readonly exportService: ExportService,
		private readonly executiveReportService: ExecutiveReportService,
		private readonly taxReportService: TaxReportService,
		private readonly financialPerformanceTemplate: FinancialPerformanceTemplate,
		private readonly propertyPortfolioTemplate: PropertyPortfolioTemplate,
		private readonly leasePortfolioTemplate: LeasePortfolioTemplate,
		private readonly maintenanceOperationsTemplate: MaintenanceOperationsTemplate,
		private readonly logger: AppLogger
	) {}

	@ApiOperation({ summary: 'Generate executive monthly report', description: 'Generate comprehensive monthly executive summary report' })
	@ApiBody({ schema: { type: 'object', required: ['user_id', 'start_date', 'end_date'], properties: { user_id: { type: 'string', format: 'uuid' }, start_date: { type: 'string', format: 'date' }, end_date: { type: 'string', format: 'date' }, format: { type: 'string', enum: ['pdf', 'excel'] } } } })
	@ApiResponse({ status: 200, description: 'Report generated successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post('generate/executive-monthly')
	async generateExecutiveMonthly(
		@Body()
		body: {
			user_id: string
			start_date: string
			end_date: string
			format?: 'pdf' | 'excel'
		},
		@Res({ passthrough: true }) res: Response
	) {
		const { user_id, start_date, end_date, format = 'pdf' } = body

		const { buffer, contentType, filename } =
			await this.executiveReportService.generateMonthlyReport(
				user_id,
				start_date,
				end_date,
				format
			)

		// Note: Report storage feature requires database table that hasn't been created yet

		res.setHeader('Content-Type', contentType)
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
		res.send(buffer)
	}

	@ApiOperation({ summary: 'Generate financial performance report', description: 'Generate detailed financial performance analysis report' })
	@ApiBody({ schema: { type: 'object', required: ['user_id', 'start_date', 'end_date'], properties: { user_id: { type: 'string', format: 'uuid' }, start_date: { type: 'string', format: 'date' }, end_date: { type: 'string', format: 'date' } } } })
	@ApiResponse({ status: 200, description: 'Report generated successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post('generate/financial-performance')
	async generateFinancialPerformance(
		@Body()
		body: {
			user_id: string
			start_date: string
			end_date: string
		},
		@Res({ passthrough: true }) res: Response
	) {
		const { user_id, start_date, end_date } = body

		this.logger.log('Generating financial performance report', { user_id })

		const reportData =
			await this.financialPerformanceTemplate.generateReportData(
				user_id,
				start_date,
				end_date
			)

		const excelData =
			this.financialPerformanceTemplate.formatForExcel(reportData)
		const buffer = await this.exportService.generateExcel(
			excelData,
			'Financial Performance'
		)

		// Note: Report storage feature requires database table that hasn't been created yet

		res.setHeader(
			'Content-Type',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		)
		res.setHeader(
			'Content-Disposition',
			'attachment; filename="financial-performance-report.xlsx"'
		)
		res.send(buffer)
	}

	@ApiOperation({ summary: 'Generate property portfolio report', description: 'Generate property portfolio overview and metrics report' })
	@ApiBody({ schema: { type: 'object', required: ['user_id', 'start_date', 'end_date'], properties: { user_id: { type: 'string', format: 'uuid' }, start_date: { type: 'string', format: 'date' }, end_date: { type: 'string', format: 'date' }, format: { type: 'string', enum: ['pdf', 'excel'] } } } })
	@ApiResponse({ status: 200, description: 'Report generated successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post('generate/property-portfolio')
	async generatePropertyPortfolio(
		@Body()
		body: {
			user_id: string
			start_date: string
			end_date: string
			format?: 'pdf' | 'excel'
		},
		@Res({ passthrough: true }) res: Response
	) {
		const { user_id, start_date, end_date, format = 'pdf' } = body

		this.logger.log('Generating property portfolio report', { user_id, format })

		const reportData = await this.propertyPortfolioTemplate.generateReportData(
			user_id,
			start_date,
			end_date
		)

		if (format === 'excel') {
			const excelData =
				this.propertyPortfolioTemplate.formatForExcel(reportData)
			const buffer = await this.exportService.generateExcel(
				excelData,
				'Property Portfolio'
			)

			// Note: Report storage feature requires database table that hasn't been created yet

			res.setHeader(
				'Content-Type',
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
			)
			res.setHeader(
				'Content-Disposition',
				'attachment; filename="property-portfolio-report.xlsx"'
			)
			res.send(buffer)
		} else {
			const pdfContent = this.propertyPortfolioTemplate.formatForPDF(reportData)
			const buffer = await this.exportService.generatePDF(
				pdfContent as unknown as
					| Record<string, unknown>
					| Record<string, unknown>[],
				'Property Portfolio Report'
			)

			// Note: Report storage feature requires database table that hasn't been created yet

			res.setHeader('Content-Type', 'application/pdf')
			res.setHeader(
				'Content-Disposition',
				'attachment; filename="property-portfolio-report.pdf"'
			)
			res.send(buffer)
		}
	}

	@ApiOperation({ summary: 'Generate lease portfolio report', description: 'Generate lease portfolio analysis report' })
	@ApiBody({ schema: { type: 'object', required: ['user_id', 'start_date', 'end_date'], properties: { user_id: { type: 'string', format: 'uuid' }, start_date: { type: 'string', format: 'date' }, end_date: { type: 'string', format: 'date' } } } })
	@ApiResponse({ status: 200, description: 'Report generated successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post('generate/lease-portfolio')
	async generateLeasePortfolio(
		@Body()
		body: {
			user_id: string
			start_date: string
			end_date: string
		},
		@Res({ passthrough: true }) res: Response
	) {
		const { user_id, start_date, end_date } = body

		this.logger.log('Generating lease portfolio report', { user_id })

		const reportData = await this.leasePortfolioTemplate.generateReportData(
			user_id,
			start_date,
			end_date
		)

		const excelData = this.leasePortfolioTemplate.formatForExcel(reportData)
		const buffer = await this.exportService.generateExcel(
			excelData,
			'Lease Portfolio'
		)

		// Note: Report storage feature requires database table that hasn't been created yet

		res.setHeader(
			'Content-Type',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		)
		res.setHeader(
			'Content-Disposition',
			'attachment; filename="lease-portfolio-report.xlsx"'
		)
		res.send(buffer)
	}

	@ApiOperation({ summary: 'Generate maintenance operations report', description: 'Generate maintenance operations and costs analysis report' })
	@ApiBody({ schema: { type: 'object', required: ['user_id', 'start_date', 'end_date'], properties: { user_id: { type: 'string', format: 'uuid' }, start_date: { type: 'string', format: 'date' }, end_date: { type: 'string', format: 'date' }, format: { type: 'string', enum: ['pdf', 'excel'] } } } })
	@ApiResponse({ status: 200, description: 'Report generated successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post('generate/maintenance-operations')
	async generateMaintenanceOperations(
		@Body()
		body: {
			user_id: string
			start_date: string
			end_date: string
			format?: 'pdf' | 'excel'
		},
		@Res({ passthrough: true }) res: Response
	) {
		const { user_id, start_date, end_date, format = 'pdf' } = body

		this.logger.log('Generating maintenance operations report', {
			user_id,
			format
		})

		const reportData =
			await this.maintenanceOperationsTemplate.generateReportData(
				user_id,
				start_date,
				end_date
			)

		if (format === 'excel') {
			const excelData =
				this.maintenanceOperationsTemplate.formatForExcel(reportData)
			const buffer = await this.exportService.generateExcel(
				excelData,
				'Maintenance Operations'
			)

			// Note: Report storage feature requires database table that hasn't been created yet

			res.setHeader(
				'Content-Type',
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
			)
			res.setHeader(
				'Content-Disposition',
				'attachment; filename="maintenance-operations-report.xlsx"'
			)
			res.send(buffer)
		} else {
			const pdfContent =
				this.maintenanceOperationsTemplate.formatForPDF(reportData)
			const buffer = await this.exportService.generatePDF(
				pdfContent as unknown as
					| Record<string, unknown>
					| Record<string, unknown>[],
				'Maintenance Operations Report'
			)

			// Note: Report storage feature requires database table that hasn't been created yet

			res.setHeader('Content-Type', 'application/pdf')
			res.setHeader(
				'Content-Disposition',
				'attachment; filename="maintenance-operations-report.pdf"'
			)
			res.send(buffer)
		}
	}

	@ApiOperation({ summary: 'Generate tax preparation report', description: 'Generate tax preparation documents and summaries' })
	@ApiBody({ schema: { type: 'object', required: ['user_id', 'start_date', 'end_date'], properties: { user_id: { type: 'string', format: 'uuid' }, start_date: { type: 'string', format: 'date' }, end_date: { type: 'string', format: 'date' } } } })
	@ApiResponse({ status: 200, description: 'Report generated successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post('generate/tax-preparation')
	async generateTaxPreparation(
		@Body()
		body: {
			user_id: string
			start_date: string
			end_date: string
		},
		@Res({ passthrough: true }) res: Response
	) {
		const { user_id, start_date, end_date } = body

		const { buffer, contentType, filename } =
			await this.taxReportService.generateTaxPreparation(
				user_id,
				start_date,
				end_date
			)

		// Note: Report storage feature requires database table that hasn't been created yet

		res.setHeader('Content-Type', contentType)
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
		res.send(buffer)
	}
}
