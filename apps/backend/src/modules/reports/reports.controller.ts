import {
	Controller,
	Get,
	Query,
	Req,
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
 */
@ApiTags('Reports')
@ApiBearerAuth('supabase-auth')
@Controller('reports')
export class ReportsController {
	constructor(
		private readonly financialReportService: FinancialReportService,
		private readonly propertyReportService: PropertyReportService,
		private readonly tenantReportService: TenantReportService,
		private readonly maintenanceReportService: MaintenanceReportService
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
}
