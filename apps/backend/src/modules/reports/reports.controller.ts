import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Logger,
	NotFoundException,
	Post,
	Query,
	Req,
	Res,
	UseGuards
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { ExportService } from './export.service'
import { ReportsService } from './reports.service'
import { ExecutiveMonthlyTemplate } from './templates/executive-monthly.template'
import { FinancialPerformanceTemplate } from './templates/financial-performance.template'
import { LeasePortfolioTemplate } from './templates/lease-portfolio.template'
import { MaintenanceOperationsTemplate } from './templates/maintenance-operations.template'
import { PropertyPortfolioTemplate } from './templates/property-portfolio.template'
import { TaxPreparationTemplate } from './templates/tax-preparation.template'

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

@Controller('reports')
export class ReportsController {
	private readonly logger = new Logger(ReportsController.name)

	constructor(
		private readonly exportService: ExportService,
		private readonly reportsService: ReportsService,
		private readonly executiveMonthlyTemplate: ExecutiveMonthlyTemplate,
		private readonly financialPerformanceTemplate: FinancialPerformanceTemplate,
		private readonly propertyPortfolioTemplate: PropertyPortfolioTemplate,
		private readonly leasePortfolioTemplate: LeasePortfolioTemplate,
		private readonly maintenanceOperationsTemplate: MaintenanceOperationsTemplate,
		private readonly taxPreparationTemplate: TaxPreparationTemplate
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

		const buffer = await this.exportService.generateExcel(payload, sheetName)

		res.setHeader(
			'Content-Type',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		)
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

		res.send(buffer)
	}

	@Post('export/csv')
	async exportCsv(
		@Body() body: ExportRequestDto,
		@Res({ passthrough: true }) res: Response
	) {
		const parsed = this.parseRequest(body)
		const payload = parsed.payload ?? parsed.data
		const filename = this.sanitizeFilename(parsed.filename, 'analytics', 'csv')

		this.logger.log('Generating CSV export', { filename })

		const csv = await this.exportService.generateCSV(payload)

		res.setHeader('Content-Type', 'text/csv')
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
		res.send(csv)
	}

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

		const buffer = await this.exportService.generatePDF(payload, title)

		res.setHeader('Content-Type', 'application/pdf')
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
		res.send(buffer)
	}

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
				pdfContent,
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
				pdfContent,
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
				pdfContent,
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
	@Get('analytics/revenue/monthly')
	@UseGuards(JwtAuthGuard)
	async getMonthlyRevenue(
		@Req() req: AuthenticatedRequest,
		@Query('months') months?: string
	) {
		const user_id = req.user?.id
		if (!user_id) {
			throw new NotFoundException('User not authenticated')
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
	@Get('analytics/payments')
	@UseGuards(JwtAuthGuard)
	async getPaymentAnalytics(
		@Req() req: AuthenticatedRequest,
		@Query('start_date') start_date?: string,
		@Query('end_date') end_date?: string
	) {
		const user_id = req.user?.id
		if (!user_id) {
			throw new NotFoundException('User not authenticated')
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
	@Get('analytics/occupancy')
	@UseGuards(JwtAuthGuard)
	async getOccupancyMetrics(@Req() req: AuthenticatedRequest) {
		const user_id = req.user?.id
		if (!user_id) {
			throw new NotFoundException('User not authenticated')
		}

		const data = await this.reportsService.getOccupancyMetrics(user_id)

		return {
			success: true,
			data
		}
	}
}
