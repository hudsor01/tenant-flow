import {
	Controller,
	Get,
	ParseIntPipe,
	Query,
	Req,
	StreamableFile,
	UnauthorizedException
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiQuery,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { Request } from 'express'
import { FinancialReportService } from './financial-report.service'
import { MaintenanceReportService } from './maintenance-report.service'
import { PropertyReportService } from './property-report.service'
import { TenantReportService } from './tenant-report.service'
import { YearEndReportService } from './year-end-report.service'

interface AuthenticatedRequest extends Request {
	user?: { id: string; email: string }
}

/**
 * Reports Controller
 *
 * Handles report data retrieval operations for financial, property, tenant, and maintenance reports.
 * These endpoints return JSON data for report views.
 *
 * Related controllers:
 * - ReportExportController: File export operations (Excel, CSV, PDF)
 * - ReportGenerationController: Complex report generation with templates
 * - ReportAnalyticsController: Analytics data for dashboards
 *
 * Route ordering: static routes (year-end/pdf, tax-documents/pdf, year-end/1099)
 * are declared BEFORE any dynamic /:id routes.
 */
@ApiTags('Reports')
@ApiBearerAuth('supabase-auth')
@Controller('reports')
export class ReportsController {
	constructor(
		private readonly financialReportService: FinancialReportService,
		private readonly propertyReportService: PropertyReportService,
		private readonly tenantReportService: TenantReportService,
		private readonly maintenanceReportService: MaintenanceReportService,
		private readonly yearEndReportService: YearEndReportService
	) {}

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

		const data = await this.financialReportService.getFinancialReport(
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

		const data = await this.propertyReportService.getPropertyReport(
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

		const data = await this.tenantReportService.getTenantReport(
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

		const data = await this.maintenanceReportService.getMaintenanceReport(
			user_id,
			start_date,
			end_date
		)

		return {
			success: true,
			data
		}
	}

	// NOTE: Static sub-routes (year-end/pdf, year-end/1099) must be declared
	// BEFORE the parent route (year-end) to avoid route shadowing issues.

	/**
	 * GET /reports/year-end/pdf
	 * Download year-end financial summary as a PDF file
	 */
	@ApiOperation({ summary: 'Download year-end PDF', description: 'Generate and download year-end financial summary as a PDF file' })
	@ApiQuery({ name: 'year', required: true, type: Number, description: 'Tax year to generate PDF for' })
	@ApiResponse({ status: 200, description: 'PDF file downloaded successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('year-end/pdf')
	async downloadYearEndPdf(
		@Req() req: AuthenticatedRequest,
		@Query('year', ParseIntPipe) year: number
	): Promise<StreamableFile> {
		const user_id = req.user?.id
		if (!user_id) {
			throw new UnauthorizedException('User not authenticated')
		}

		const pdf = await this.yearEndReportService.generateYearEndPdf(user_id, year)

		return new StreamableFile(pdf, {
			type: 'application/pdf',
			disposition: `attachment; filename="year-end-${year}.pdf"`
		})
	}

	/**
	 * GET /reports/year-end/1099
	 * 1099-NEC vendor data for vendors paid over $600 threshold
	 */
	@ApiOperation({ summary: 'Get 1099-NEC vendor data', description: 'Get vendors paid over $600 threshold for 1099-NEC reporting' })
	@ApiQuery({ name: 'year', required: false, type: Number, description: 'Tax year (defaults to current year)' })
	@ApiResponse({ status: 200, description: '1099 vendor data retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('year-end/1099')
	async get1099Vendors(
		@Req() req: AuthenticatedRequest,
		@Query('year') year?: string
	) {
		const user_id = req.user?.id
		if (!user_id) {
			throw new UnauthorizedException('User not authenticated')
		}

		const taxYear = year ? parseInt(year, 10) : new Date().getFullYear()
		const data = await this.yearEndReportService.get1099Vendors(user_id, taxYear)

		return {
			success: true,
			data
		}
	}

	/**
	 * GET /reports/year-end
	 * Year-end income/expense summary for tax purposes
	 */
	@ApiOperation({ summary: 'Get year-end summary', description: 'Get year-end income and expense summary for the given tax year' })
	@ApiQuery({ name: 'year', required: false, type: Number, description: 'Tax year (defaults to current year)' })
	@ApiResponse({ status: 200, description: 'Year-end summary retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('year-end')
	async getYearEndSummary(
		@Req() req: AuthenticatedRequest,
		@Query('year') year?: string
	) {
		const user_id = req.user?.id
		if (!user_id) {
			throw new UnauthorizedException('User not authenticated')
		}

		const taxYear = year ? parseInt(year, 10) : new Date().getFullYear()
		const data = await this.yearEndReportService.getYearEndSummary(user_id, taxYear)

		return {
			success: true,
			data
		}
	}

	/**
	 * GET /reports/tax-documents/pdf
	 * Download tax documents as a PDF file
	 */
	@ApiOperation({ summary: 'Download tax documents PDF', description: 'Generate and download tax documents (Schedule E, depreciation) as a PDF file' })
	@ApiQuery({ name: 'year', required: true, type: Number, description: 'Tax year to generate PDF for' })
	@ApiResponse({ status: 200, description: 'PDF file downloaded successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('tax-documents/pdf')
	async downloadTaxDocumentPdf(
		@Req() req: AuthenticatedRequest,
		@Query('year', ParseIntPipe) year: number
	): Promise<StreamableFile> {
		const user_id = req.user?.id
		if (!user_id) {
			throw new UnauthorizedException('User not authenticated')
		}

		const token = req.headers.authorization?.split(' ')[1] ?? ''
		const pdf = await this.yearEndReportService.generateTaxDocumentPdf(
			token,
			user_id,
			year
		)

		return new StreamableFile(pdf, {
			type: 'application/pdf',
			disposition: `attachment; filename="tax-documents-${year}.pdf"`
		})
	}
}
