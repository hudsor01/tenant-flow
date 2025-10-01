import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Logger,
	NotFoundException,
	Param,
	ParseUUIDPipe,
	Post,
	Query,
	Req,
	Res,
	UseGuards
} from '@nestjs/common'
import type { Response } from 'express'
import { z } from 'zod'
import { JwtAuthGuard } from '../shared/auth/jwt-auth.guard'
import { ExportService } from './export.service'
import { GeneratedReportService } from './generated-report.service'
import { ScheduledReportService } from './scheduled-report.service'
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
		private readonly generatedReportService: GeneratedReportService,
		private readonly scheduledReportService: ScheduledReportService,
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

	// ==================== REPORT LIBRARY ENDPOINTS ====================

	/**
	 * List user's generated reports (paginated)
	 */
	@Get()
	@UseGuards(JwtAuthGuard)
	async listReports(
		@Req() req: AuthenticatedRequest,
		@Query('limit') limit?: string,
		@Query('offset') offset?: string
	) {
		const userId = req.user?.id
		if (!userId) {
			throw new NotFoundException('User not authenticated')
		}

		const parsedLimit = limit ? parseInt(limit, 10) : 20
		const parsedOffset = offset ? parseInt(offset, 10) : 0

		const result = await this.generatedReportService.findAll(userId, {
			limit: parsedLimit,
			offset: parsedOffset
		})

		return {
			success: true,
			data: result.reports,
			pagination: {
				total: result.total,
				limit: parsedLimit,
				offset: parsedOffset,
				hasMore: parsedOffset + parsedLimit < result.total
			}
		}
	}

	/**
	 * Get specific report metadata
	 */
	@Get(':id')
	@UseGuards(JwtAuthGuard)
	async getReport(
		@Req() req: AuthenticatedRequest,
		@Param('id', ParseUUIDPipe) reportId: string
	) {
		const userId = req.user?.id
		if (!userId) {
			throw new NotFoundException('User not authenticated')
		}

		const report = await this.generatedReportService.findOne(userId, reportId)

		return {
			success: true,
			data: report
		}
	}

	/**
	 * Download report file
	 */
	@Get(':id/download')
	@UseGuards(JwtAuthGuard)
	async downloadReport(
		@Req() req: AuthenticatedRequest,
		@Param('id', ParseUUIDPipe) reportId: string,
		@Res() res: Response
	) {
		const userId = req.user?.id
		if (!userId) {
			throw new NotFoundException('User not authenticated')
		}

		const report = await this.generatedReportService.findOne(userId, reportId)
		const buffer = await this.generatedReportService.getFileBuffer(
			userId,
			reportId
		)

		const contentType =
			report.format === 'excel'
				? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
				: 'application/pdf'
		const extension = report.format === 'excel' ? 'xlsx' : 'pdf'
		const filename = `${report.reportName}.${extension}`

		res.setHeader('Content-Type', contentType)
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
		res.setHeader('Content-Length', buffer.length)
		res.send(buffer)
	}

	/**
	 * Delete report
	 */
	@Delete(':id')
	@UseGuards(JwtAuthGuard)
	async deleteReport(
		@Req() req: AuthenticatedRequest,
		@Param('id', ParseUUIDPipe) reportId: string
	) {
		const userId = req.user?.id
		if (!userId) {
			throw new NotFoundException('User not authenticated')
		}

		await this.generatedReportService.delete(userId, reportId)

		return {
			success: true,
			message: 'Report deleted successfully'
		}
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
			userId: string
			startDate: string
			endDate: string
			format?: 'pdf' | 'excel'
		},
		@Res({ passthrough: true }) res: Response
	) {
		const { userId, startDate, endDate, format = 'pdf' } = body

		this.logger.log('Generating executive monthly report', { userId, format })

		const reportData = await this.executiveMonthlyTemplate.generateReportData(
			userId,
			startDate,
			endDate
		)

		if (format === 'excel') {
			const excelData = this.executiveMonthlyTemplate.formatForExcel(reportData)
			const buffer = await this.exportService.generateExcel(
				excelData,
				'Executive Report'
			)

			// Save report metadata
			await this.generatedReportService.create({
				userId,
				reportType: 'executive-monthly',
				reportName: 'Executive Monthly Report',
				format: 'excel',
				startDate,
				endDate,
				fileBuffer: buffer
			})

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

			// Save report metadata
			await this.generatedReportService.create({
				userId,
				reportType: 'executive-monthly',
				reportName: 'Executive Monthly Report',
				format: 'pdf',
				startDate,
				endDate,
				fileBuffer: buffer
			})

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
			userId: string
			startDate: string
			endDate: string
		},
		@Res({ passthrough: true }) res: Response
	) {
		const { userId, startDate, endDate } = body

		this.logger.log('Generating financial performance report', { userId })

		const reportData =
			await this.financialPerformanceTemplate.generateReportData(
				userId,
				startDate,
				endDate
			)

		const excelData =
			this.financialPerformanceTemplate.formatForExcel(reportData)
		const buffer = await this.exportService.generateExcel(
			excelData,
			'Financial Performance'
		)

		// Save report metadata
		await this.generatedReportService.create({
			userId,
			reportType: 'financial-performance',
			reportName: 'Financial Performance Report',
			format: 'excel',
			startDate,
			endDate,
			fileBuffer: buffer
		})

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
			userId: string
			startDate: string
			endDate: string
			format?: 'pdf' | 'excel'
		},
		@Res({ passthrough: true }) res: Response
	) {
		const { userId, startDate, endDate, format = 'pdf' } = body

		this.logger.log('Generating property portfolio report', { userId, format })

		const reportData = await this.propertyPortfolioTemplate.generateReportData(
			userId,
			startDate,
			endDate
		)

		if (format === 'excel') {
			const excelData =
				this.propertyPortfolioTemplate.formatForExcel(reportData)
			const buffer = await this.exportService.generateExcel(
				excelData,
				'Property Portfolio'
			)

			// Save report metadata
			await this.generatedReportService.create({
				userId,
				reportType: 'property-portfolio',
				reportName: 'Property Portfolio Report',
				format: 'excel',
				startDate,
				endDate,
				fileBuffer: buffer
			})

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

			// Save report metadata
			await this.generatedReportService.create({
				userId,
				reportType: 'property-portfolio',
				reportName: 'Property Portfolio Report',
				format: 'pdf',
				startDate,
				endDate,
				fileBuffer: buffer
			})

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
			userId: string
			startDate: string
			endDate: string
		},
		@Res({ passthrough: true }) res: Response
	) {
		const { userId, startDate, endDate } = body

		this.logger.log('Generating lease portfolio report', { userId })

		const reportData = await this.leasePortfolioTemplate.generateReportData(
			userId,
			startDate,
			endDate
		)

		const excelData = this.leasePortfolioTemplate.formatForExcel(reportData)
		const buffer = await this.exportService.generateExcel(
			excelData,
			'Lease Portfolio'
		)

		// Save report metadata
		await this.generatedReportService.create({
			userId,
			reportType: 'lease-portfolio',
			reportName: 'Lease Portfolio Report',
			format: 'excel',
			startDate,
			endDate,
			fileBuffer: buffer
		})

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
			userId: string
			startDate: string
			endDate: string
			format?: 'pdf' | 'excel'
		},
		@Res({ passthrough: true }) res: Response
	) {
		const { userId, startDate, endDate, format = 'pdf' } = body

		this.logger.log('Generating maintenance operations report', {
			userId,
			format
		})

		const reportData =
			await this.maintenanceOperationsTemplate.generateReportData(
				userId,
				startDate,
				endDate
			)

		if (format === 'excel') {
			const excelData =
				this.maintenanceOperationsTemplate.formatForExcel(reportData)
			const buffer = await this.exportService.generateExcel(
				excelData,
				'Maintenance Operations'
			)

			// Save report metadata
			await this.generatedReportService.create({
				userId,
				reportType: 'maintenance-operations',
				reportName: 'Maintenance Operations Report',
				format: 'excel',
				startDate,
				endDate,
				fileBuffer: buffer
			})

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

			// Save report metadata
			await this.generatedReportService.create({
				userId,
				reportType: 'maintenance-operations',
				reportName: 'Maintenance Operations Report',
				format: 'pdf',
				startDate,
				endDate,
				fileBuffer: buffer
			})

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
			userId: string
			startDate: string
			endDate: string
		},
		@Res({ passthrough: true }) res: Response
	) {
		const { userId, startDate, endDate } = body

		this.logger.log('Generating tax preparation report', { userId })

		const reportData = await this.taxPreparationTemplate.generateReportData(
			userId,
			startDate,
			endDate
		)

		const excelData = this.taxPreparationTemplate.formatForExcel(reportData)
		const buffer = await this.exportService.generateExcel(
			excelData,
			'Tax Preparation'
		)

		// Save report metadata
		await this.generatedReportService.create({
			userId,
			reportType: 'tax-preparation',
			reportName: 'Tax Preparation Report',
			format: 'excel',
			startDate,
			endDate,
			fileBuffer: buffer
		})

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

	// ==================== SCHEDULED REPORTS ENDPOINTS ====================

	/**
	 * Create a new scheduled report
	 */
	@Post('schedules')
	@UseGuards(JwtAuthGuard)
	async createSchedule(
		@Req() req: AuthenticatedRequest,
		@Body()
		body: {
			reportType: string
			reportName: string
			format: 'pdf' | 'excel'
			frequency: 'daily' | 'weekly' | 'monthly'
			dayOfWeek?: number
			dayOfMonth?: number
			hour?: number
			timezone?: string
			startDate: string
			endDate: string
		}
	) {
		const userId = req.user?.id
		if (!userId) {
			throw new NotFoundException('User not authenticated')
		}

		this.logger.log('Creating scheduled report', { userId, ...body })

		const schedule = await this.scheduledReportService.createSchedule({
			userId,
			...body
		})

		return {
			success: true,
			data: schedule
		}
	}

	/**
	 * List user's scheduled reports
	 */
	@Get('schedules')
	@UseGuards(JwtAuthGuard)
	async listSchedules(@Req() req: AuthenticatedRequest) {
		const userId = req.user?.id
		if (!userId) {
			throw new NotFoundException('User not authenticated')
		}

		const schedules = await this.scheduledReportService.listSchedules(userId)

		return {
			success: true,
			data: schedules
		}
	}

	/**
	 * Delete a scheduled report
	 */
	@Delete('schedules/:id')
	@UseGuards(JwtAuthGuard)
	async deleteSchedule(
		@Req() req: AuthenticatedRequest,
		@Param('id', ParseUUIDPipe) scheduleId: string
	) {
		const userId = req.user?.id
		if (!userId) {
			throw new NotFoundException('User not authenticated')
		}

		await this.scheduledReportService.deleteSchedule(scheduleId, userId)

		return {
			success: true,
			message: 'Schedule deleted successfully'
		}
	}
}
