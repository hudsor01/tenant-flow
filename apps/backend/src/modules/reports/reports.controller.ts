import {
	BadRequestException,
	Body,
	Controller,
	Get,
	UnauthorizedException,
	Post,
	Query,
	Req,
	Res
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiBody,
	ApiOperation,
	ApiProduces,
	ApiQuery,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { ExportService } from './export.service'
import { ReportsService } from './reports.service'
import { ExecutiveMonthlyTemplate } from './templates/executive-monthly.template'
import { FinancialPerformanceTemplate } from './templates/financial-performance.template'
import { LeasePortfolioTemplate } from './templates/lease-portfolio.template'
import { MaintenanceOperationsTemplate } from './templates/maintenance-operations.template'
import { PropertyPortfolioTemplate } from './templates/property-portfolio.template'
import { TaxPreparationTemplate } from './templates/tax-preparation.template'
import { AppLogger } from '../../logger/app-logger.service'

interface AuthenticatedRequest extends Request {
	user?: { id: string; email: string }
}

const exportRequestSchema = z
	.object({
		filename: z
			.string()
			.trim()
			.max(120, 'Filename must be 120 characters or fewer')
			.optional(),
		sheetName: z
			.string()
			.trim()
			.max(60, 'Sheet name must be 60 characters or fewer')
			.optional(),
		title: z
			.string()
			.trim()
			.max(160, 'Title must be 160 characters or fewer')
			.optional(),
		payload: z.unknown().optional(),
		data: z.unknown().optional()
	})
	.superRefine((value, ctx) => {
		if (value.payload === undefined && value.data === undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'payload or data is required'
			})
		}
	})

type ExportRequestDto = z.infer<typeof exportRequestSchema>

@ApiTags('Reports')
@ApiBearerAuth('supabase-auth')
@Controller('reports')
export class ReportsController {
	constructor(
		private readonly exportService: ExportService,
		private readonly reportsService: ReportsService,
		private readonly executiveMonthlyTemplate: ExecutiveMonthlyTemplate,
		private readonly financialPerformanceTemplate: FinancialPerformanceTemplate,
		private readonly propertyPortfolioTemplate: PropertyPortfolioTemplate,
		private readonly leasePortfolioTemplate: LeasePortfolioTemplate,
		private readonly maintenanceOperationsTemplate: MaintenanceOperationsTemplate,
		private readonly taxPreparationTemplate: TaxPreparationTemplate,
		private readonly logger: AppLogger
	) {}

	private parseRequest(body: ExportRequestDto): ExportRequestDto {
		try {
			return exportRequestSchema.parse(body)
		} catch (error) {
			if (error instanceof z.ZodError) {
				const message = error.issues.map(issue => issue.message).join('; ')
				throw new BadRequestException(`Invalid export request: ${message}`)
			}
			throw error
		}
	}

	private sanitizeFilename(
		input: string | undefined,
		fallback: string,
		extension: string
	) {
		const lower = (input ?? fallback).toLowerCase()
		const baseName = lower.replace(/\.[a-z0-9]+$/, '')
		const replaced = [...baseName]
			.map(char => (/[a-z0-9-]/.test(char) ? char : '-'))
			.join('')
		const cleaned = replaced.replace(/-+/g, '-').replace(/^-|-$/g, '')
		const normalized = cleaned || fallback
		return `${normalized}.${extension}`
	}

	// ==================== REPORT GENERATION ENDPOINTS ====================

	@ApiOperation({ summary: 'Export data as Excel', description: 'Generate Excel spreadsheet from provided data' })
	@ApiBody({ schema: { type: 'object', required: ['payload'], properties: { filename: { type: 'string' }, sheetName: { type: 'string' }, payload: { type: 'object' }, data: { type: 'object' } } } })
	@ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
	@ApiResponse({ status: 200, description: 'Excel file generated successfully' })
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@Post('export/excel')
	async exportExcel(
		@Body() body: ExportRequestDto,
		@Res({ passthrough: true }) res: Response
	) {
		const parsed = this.parseRequest(body)
		const payload = parsed.payload ?? parsed.data
		const sheetName = (parsed.sheetName ?? 'Analytics').slice(0, 60)
		const filename = this.sanitizeFilename(parsed.filename, 'analytics', 'xlsx')

		this.logger.log('Generating Excel export', {
			sheetName,
			filename
		})

		const buffer = await this.exportService.generateExcel(
			payload as Record<string, unknown> | Record<string, unknown>[],
			sheetName
		)

		res.setHeader(
			'Content-Type',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		)
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

		res.send(buffer)
	}

	@ApiOperation({ summary: 'Export data as CSV', description: 'Generate CSV file from provided data' })
	@ApiBody({ schema: { type: 'object', required: ['payload'], properties: { filename: { type: 'string' }, payload: { type: 'object' }, data: { type: 'object' } } } })
	@ApiProduces('text/csv')
	@ApiResponse({ status: 200, description: 'CSV file generated successfully' })
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@Post('export/csv')
	async exportCsv(
		@Body() body: ExportRequestDto,
		@Res({ passthrough: true }) res: Response
	) {
		const parsed = this.parseRequest(body)
		const payload = parsed.payload ?? parsed.data
		const filename = this.sanitizeFilename(parsed.filename, 'analytics', 'csv')

		this.logger.log('Generating CSV export', { filename })

		const csv = await this.exportService.generateCSV(
			payload as Record<string, unknown> | Record<string, unknown>[]
		)

		res.setHeader('Content-Type', 'text/csv')
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
		res.send(csv)
	}

	@ApiOperation({ summary: 'Export data as PDF', description: 'Generate PDF document from provided data' })
	@ApiBody({ schema: { type: 'object', required: ['payload'], properties: { filename: { type: 'string' }, title: { type: 'string' }, payload: { type: 'object' }, data: { type: 'object' } } } })
	@ApiProduces('application/pdf')
	@ApiResponse({ status: 200, description: 'PDF file generated successfully' })
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@Post('export/pdf')
	async exportPdf(
		@Body() body: ExportRequestDto,
		@Res({ passthrough: true }) res: Response
	) {
		const parsed = this.parseRequest(body)
		const payload = parsed.payload ?? parsed.data
		const title = (parsed.title ?? 'Analytics Export').slice(0, 160)
		const filename = this.sanitizeFilename(parsed.filename, 'analytics', 'pdf')

		this.logger.log('Generating PDF export', { filename })

		const buffer = await this.exportService.generatePDF(
			payload as Record<string, unknown> | Record<string, unknown>[],
			title
		)

		res.setHeader('Content-Type', 'application/pdf')
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
		res.send(buffer)
	}

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

		this.logger.log('Generating executive monthly report', { user_id, format })

		const reportData = await this.executiveMonthlyTemplate.generateReportData(
			user_id,
			start_date,
			end_date
		)

		if (format === 'excel') {
			const excelData = this.executiveMonthlyTemplate.formatForExcel(reportData)
			const buffer = await this.exportService.generateExcel(
				excelData,
				'Executive Report'
			)

			// Note: Report storage feature requires database table that hasn't been created yet

			res.setHeader(
				'Content-Type',
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
			)
			res.setHeader(
				'Content-Disposition',
				'attachment; filename="executive-monthly-report.xlsx"'
			)
			res.send(buffer)
		} else {
			const pdfContent = this.executiveMonthlyTemplate.formatForPDF(reportData)
			const buffer = await this.exportService.generatePDF(
				pdfContent as unknown as
					| Record<string, unknown>
					| Record<string, unknown>[],
				'Executive Monthly Report'
			)

			// Note: Report storage feature requires database table that hasn't been created yet

			res.setHeader('Content-Type', 'application/pdf')
			res.setHeader(
				'Content-Disposition',
				'attachment; filename="executive-monthly-report.pdf"'
			)
			res.send(buffer)
		}
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

		this.logger.log('Generating tax preparation report', { user_id })

		const reportData = await this.taxPreparationTemplate.generateReportData(
			user_id,
			start_date,
			end_date
		)

		const excelData = this.taxPreparationTemplate.formatForExcel(reportData)
		const buffer = await this.exportService.generateExcel(
			excelData,
			'Tax Preparation'
		)

		// Note: Report storage feature requires database table that hasn't been created yet

		res.setHeader(
			'Content-Type',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		)
		res.setHeader(
			'Content-Disposition',
			'attachment; filename="tax-preparation-report.xlsx"'
		)
		res.send(buffer)
	}

	// ==================== ANALYTICS ENDPOINTS ====================

	/**
	 * GET /reports/analytics/revenue/monthly
	 * Get monthly revenue data for charts
	 */
	@ApiOperation({ summary: 'Get monthly revenue', description: 'Get monthly revenue data for charts' })
	@ApiQuery({ name: 'months', required: false, type: Number, description: 'Number of months to retrieve (default: 12)' })
	@ApiResponse({ status: 200, description: 'Monthly revenue data retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('analytics/revenue/monthly')
	async getMonthlyRevenue(
		@Req() req: AuthenticatedRequest,
		@Query('months') months?: string
	) {
		const user_id = req.user?.id
		if (!user_id) {
			throw new UnauthorizedException('User not authenticated')
		}

		const parsedMonths = months ? parseInt(months, 10) : 12
		const data = await this.reportsService.getMonthlyRevenue(
			user_id,
			parsedMonths
		)

		return {
			success: true,
			data
		}
	}

	/**
	 * GET /reports/analytics/payments
	 * Get payment analytics for dashboard
	 */
	@ApiOperation({ summary: 'Get payment analytics', description: 'Get payment analytics data for dashboard' })
	@ApiQuery({ name: 'start_date', required: false, type: String, description: 'Start date filter (ISO format)' })
	@ApiQuery({ name: 'end_date', required: false, type: String, description: 'End date filter (ISO format)' })
	@ApiResponse({ status: 200, description: 'Payment analytics retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('analytics/payments')
	async getPaymentAnalytics(
		@Req() req: AuthenticatedRequest,
		@Query('start_date') start_date?: string,
		@Query('end_date') end_date?: string
	) {
		const user_id = req.user?.id
		if (!user_id) {
			throw new UnauthorizedException('User not authenticated')
		}

		const data = await this.reportsService.getPaymentAnalytics(
			user_id,
			start_date,
			end_date
		)

		return {
			success: true,
			data
		}
	}

	/**
	 * GET /reports/analytics/occupancy
	 * Get occupancy metrics across all properties
	 */
	@ApiOperation({ summary: 'Get occupancy metrics', description: 'Get occupancy metrics across all properties' })
	@ApiResponse({ status: 200, description: 'Occupancy metrics retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('analytics/occupancy')
	async getOccupancyMetrics(@Req() req: AuthenticatedRequest) {
		const user_id = req.user?.id
		if (!user_id) {
			throw new UnauthorizedException('User not authenticated')
		}

		const data = await this.reportsService.getOccupancyMetrics(user_id)

		return {
			success: true,
			data
		}
	}

	// ==================== REPORT DATA ENDPOINTS ====================

	/**
	 * GET /reports/financial
	 * Financial report data for income, expenses, cash flow, rent roll
	 */
	@ApiOperation({ summary: 'Get financial report', description: 'Get financial report data including income, expenses, cash flow, and rent roll' })
	@ApiQuery({ name: 'start_date', required: false, type: String, description: 'Start date filter (ISO format)' })
	@ApiQuery({ name: 'end_date', required: false, type: String, description: 'End date filter (ISO format)' })
	@ApiResponse({ status: 200, description: 'Financial report retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('financial')
	async getFinancialReport(
		@Req() req: AuthenticatedRequest,
		@Query('start_date') start_date?: string,
		@Query('end_date') end_date?: string
	) {
		const user_id = req.user?.id
		if (!user_id) {
			throw new UnauthorizedException('User not authenticated')
		}

		const data = await this.reportsService.getFinancialReport(
			user_id,
			start_date,
			end_date
		)

		return {
			success: true,
			data
		}
	}

	/**
	 * GET /reports/properties
	 * Property report data for occupancy, vacancy, performance
	 */
	@ApiOperation({ summary: 'Get property report', description: 'Get property report data including occupancy, vacancy, and performance metrics' })
	@ApiQuery({ name: 'start_date', required: false, type: String, description: 'Start date filter (ISO format)' })
	@ApiQuery({ name: 'end_date', required: false, type: String, description: 'End date filter (ISO format)' })
	@ApiResponse({ status: 200, description: 'Property report retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('properties')
	async getPropertyReport(
		@Req() req: AuthenticatedRequest,
		@Query('start_date') start_date?: string,
		@Query('end_date') end_date?: string
	) {
		const user_id = req.user?.id
		if (!user_id) {
			throw new UnauthorizedException('User not authenticated')
		}

		const data = await this.reportsService.getPropertyReport(
			user_id,
			start_date,
			end_date
		)

		return {
			success: true,
			data
		}
	}

	/**
	 * GET /reports/tenants
	 * Tenant report data for payments, expirations, turnover
	 */
	@ApiOperation({ summary: 'Get tenant report', description: 'Get tenant report data including payments, expirations, and turnover' })
	@ApiQuery({ name: 'start_date', required: false, type: String, description: 'Start date filter (ISO format)' })
	@ApiQuery({ name: 'end_date', required: false, type: String, description: 'End date filter (ISO format)' })
	@ApiResponse({ status: 200, description: 'Tenant report retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('tenants')
	async getTenantReport(
		@Req() req: AuthenticatedRequest,
		@Query('start_date') start_date?: string,
		@Query('end_date') end_date?: string
	) {
		const user_id = req.user?.id
		if (!user_id) {
			throw new UnauthorizedException('User not authenticated')
		}

		const data = await this.reportsService.getTenantReport(
			user_id,
			start_date,
			end_date
		)

		return {
			success: true,
			data
		}
	}

	/**
	 * GET /reports/maintenance
	 * Maintenance report data for work orders, costs, vendors
	 */
	@ApiOperation({ summary: 'Get maintenance report', description: 'Get maintenance report data including work orders, costs, and vendor information' })
	@ApiQuery({ name: 'start_date', required: false, type: String, description: 'Start date filter (ISO format)' })
	@ApiQuery({ name: 'end_date', required: false, type: String, description: 'End date filter (ISO format)' })
	@ApiResponse({ status: 200, description: 'Maintenance report retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('maintenance')
	async getMaintenanceReport(
		@Req() req: AuthenticatedRequest,
		@Query('start_date') start_date?: string,
		@Query('end_date') end_date?: string
	) {
		const user_id = req.user?.id
		if (!user_id) {
			throw new UnauthorizedException('User not authenticated')
		}

		const data = await this.reportsService.getMaintenanceReport(
			user_id,
			start_date,
			end_date
		)

		return {
			success: true,
			data
		}
	}
}
