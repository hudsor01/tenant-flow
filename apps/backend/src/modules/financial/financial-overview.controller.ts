/**
 * Financial Overview Controller
 *
 * Provides aggregated financial dashboard data and expense tracking endpoints.
 * Used by the frontend Financial Overview dashboard and Expenses view.
 */

import {
	Controller,
	Get,
	Post,
	Delete,
	Body,
	Param,
	Query,
	Req,
	UnauthorizedException,
	InternalServerErrorException,
	ParseUUIDPipe,
	UseGuards
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiBody,
	ApiOperation,
	ApiParam,
	ApiQuery,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { Request } from 'express'
import type { ControllerApiResponse } from '@repo/shared/types/errors'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { SupabaseService } from '../../database/supabase.service'
import { FinancialService } from './financial.service'
import { AppLogger } from '../../logger/app-logger.service'
import { CreateExpenseDto } from './dto/create-expense.dto'

/**
 * Financial Overview endpoints at /financials/*
 * Provides unified financial dashboard data.
 */
@ApiTags('Financials')
@ApiBearerAuth('supabase-auth')
@Controller('financials')
@UseGuards(JwtAuthGuard)
export class FinancialOverviewController {
	constructor(
		private readonly financialService: FinancialService,
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	private getToken(req: Request): string {
		const token = this.supabase.getTokenFromRequest(req)
		if (!token) {
			this.logger.warn('Missing auth token for financial request', {
				path: req.path
			})
			throw new UnauthorizedException('Authentication token required')
		}
		return token
	}

	@ApiOperation({ summary: 'Get financial overview', description: 'Returns aggregated financial overview for dashboard including revenue, expenses, receivables' })
	@ApiResponse({ status: 200, description: 'Financial overview retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('overview')
	async getOverview(@Req() req: Request): Promise<ControllerApiResponse> {
		const token = this.getToken(req)
		const client = this.supabase.getUserClient(token)

		// Get financial overview
		const [overview, pendingPaymentsResult, pendingExpensesResult] =
			await Promise.all([
			this.financialService.getOverview(token),
			client.from('rent_payments').select('amount').eq('status', 'pending'),
			client
				.from('maintenance_requests')
				.select('estimated_cost, actual_cost')
				.in('status', ['open', 'in_progress', 'on_hold'])
		])
		const { data: pendingPayments, error: pendingPaymentsError } =
			pendingPaymentsResult
		if (pendingPaymentsError) {
			this.logger.warn('Failed to load pending payments for receivables', {
				error: pendingPaymentsError.message
			})
		}
		const accountsReceivable = pendingPaymentsError
			? 0
			: (pendingPayments ?? []).reduce(
					(sum, payment) => sum + (payment.amount ?? 0),
					0
				)
		const { data: pendingExpenses, error: pendingExpensesError } =
			pendingExpensesResult
		if (pendingExpensesError) {
			this.logger.warn('Failed to load pending expenses for payables', {
				error: pendingExpensesError.message
			})
		}
		const accountsPayable = pendingExpensesError
			? 0
			: (pendingExpenses ?? []).reduce(
					(sum, expense) =>
						sum +
						((expense.actual_cost ?? expense.estimated_cost) ?? 0),
					0
				)

		// Transform to frontend format
		const data = {
			overview: {
				total_revenue:
					(overview as Record<string, Record<string, number>>)?.summary
						?.totalRevenue ?? 0,
				total_expenses:
					(overview as Record<string, Record<string, number>>)?.summary
						?.totalExpenses ?? 0,
				net_income:
					(overview as Record<string, Record<string, number>>)?.summary
						?.netIncome ?? 0,
				accounts_receivable: accountsReceivable,
				accounts_payable: accountsPayable
			},
			highlights: [
				{
					label: 'Monthly Revenue',
					value:
						((overview as Record<string, Record<string, number>>)?.summary
							?.totalRevenue ?? 0) / 12,
					trend: null
				},
				{
					label: 'Operating Margin',
					value:
						(overview as Record<string, Record<string, number>>)?.summary
							?.roi ?? 0,
					trend: null
				},
				{
					label: 'Occupancy Rate',
					value:
						(overview as Record<string, Record<string, number>>)?.summary
							?.occupancyRate ?? 0,
					trend: null
				}
			]
		}

		return {
			success: true,
			data,
			message: 'Financial overview retrieved successfully',
			timestamp: new Date()
		}
	}

	@ApiOperation({ summary: 'Get monthly metrics', description: 'Returns monthly financial metrics for charts' })
	@ApiQuery({ name: 'year', required: false, type: Number, description: 'Year for metrics (defaults to current year)' })
	@ApiResponse({ status: 200, description: 'Monthly metrics retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('monthly-metrics')
	async getMonthlyMetrics(
		@Req() req: Request,
		@Query('year') year?: string
	): Promise<ControllerApiResponse> {
		const token = this.getToken(req)
		const targetYear =
			Number.parseInt(year ?? '', 10) || new Date().getFullYear()

		const trends = await this.financialService.getRevenueTrends(
			token,
			targetYear
		)

		// Transform to expected format
		const data = trends.map(t => ({
			month: t.period,
			revenue: t.revenue ?? 0,
			expenses: t.expenses ?? 0,
			net_income: (t.revenue ?? 0) - (t.expenses ?? 0),
			cash_flow: (t.revenue ?? 0) - (t.expenses ?? 0)
		}))

		return {
			success: true,
			data,
			message: 'Monthly metrics retrieved successfully',
			timestamp: new Date()
		}
	}

	@ApiOperation({ summary: 'Get expense summary', description: 'Returns expense breakdown with category summary' })
	@ApiQuery({ name: 'year', required: false, type: Number, description: 'Year for summary (defaults to current year)' })
	@ApiResponse({ status: 200, description: 'Expense summary retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('expense-summary')
	async getExpenseSummary(
		@Req() req: Request,
		@Query('year') year?: string
	): Promise<ControllerApiResponse> {
		const token = this.getToken(req)
		const targetYear =
			Number.parseInt(year ?? '', 10) || new Date().getFullYear()

		const summary = await this.financialService.getExpenseSummary(
			token,
			targetYear
		)

		return {
			success: true,
			data: summary,
			message: 'Expense summary retrieved successfully',
			timestamp: new Date()
		}
	}

	@ApiOperation({ summary: 'Get expenses', description: 'Returns list of expenses with optional filters' })
	@ApiQuery({ name: 'property_id', required: false, description: 'Filter by property UUID' })
	@ApiQuery({ name: 'start_date', required: false, description: 'Filter expenses from date (YYYY-MM-DD)' })
	@ApiQuery({ name: 'end_date', required: false, description: 'Filter expenses to date (YYYY-MM-DD)' })
	@ApiQuery({ name: 'category', required: false, description: 'Filter by expense category' })
	@ApiResponse({ status: 200, description: 'Expenses retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('expenses')
	async getExpenses(
		@Req() req: Request,
		@Query('property_id') propertyId?: string,
		@Query('start_date') startDate?: string,
		@Query('end_date') endDate?: string,
		@Query('category') category?: string
	): Promise<ControllerApiResponse> {
		const token = this.getToken(req)
		const client = this.supabase.getUserClient(token)

		// Get user's properties
		const { data: properties } = await client
			.from('properties')
			.select('id, name')
		const propertyMap = new Map(
			(properties ?? []).map((p: { id: string; name: string }) => [
				p.id,
				p.name
			])
		)
		const propertyIds = Array.from(propertyMap.keys())

		if (propertyIds.length === 0) {
			return {
				success: true,
				data: [],
				message: 'No expenses found',
				timestamp: new Date()
			}
		}

		// Build query - expenses are linked to maintenance_requests which have category
		let query = client.from('expenses').select(`
				id,
				amount,
				expense_date,
				vendor_name,
				maintenance_request_id,
				created_at,
				maintenance_requests!inner(
					unit_id,
					category,
					description,
					units!inner(
						property_id
					)
				)
			`)

		// Apply date filters if provided
		if (startDate) {
			query = query.gte('expense_date', startDate)
		}
		if (endDate) {
			query = query.lte('expense_date', endDate)
		}

		const { data: expenses, error } = await query.order('expense_date', {
			ascending: false
		})

		if (error) {
			this.logger.error('Failed to fetch expenses', { error: error.message })
			throw new InternalServerErrorException('Failed to fetch expenses')
		}

		// Transform to include property name and category from maintenance_request
		const transformedExpenses = (expenses ?? []).map(
			(expense: Record<string, unknown>) => {
				const maintenanceRequest = expense.maintenance_requests as Record<
					string,
					unknown
				> | null
				const unit = maintenanceRequest?.units as Record<string, string> | null
				const property_id = unit?.property_id
				const property_name = property_id ? propertyMap.get(property_id) : null

				return {
					id: expense.id,
					description: (maintenanceRequest?.description as string) ?? '',
					amount: expense.amount,
					expense_date: expense.expense_date,
					vendor_name: expense.vendor_name,
					maintenance_request_id: expense.maintenance_request_id,
					created_at: expense.created_at,
					category: maintenanceRequest?.category ?? 'other',
					property_id,
					property_name
				}
			}
		)

		// Filter by property if specified
		let filteredExpenses = transformedExpenses
		if (propertyId) {
			filteredExpenses = transformedExpenses.filter(
				e => e.property_id === propertyId
			)
		}

		// Filter by category if specified
		if (category) {
			filteredExpenses = filteredExpenses.filter(e => e.category === category)
		}

		return {
			success: true,
			data: filteredExpenses,
			message: 'Expenses retrieved successfully',
			timestamp: new Date()
		}
	}

	@ApiOperation({ summary: 'Create expense', description: 'Create a new expense record linked to a maintenance request' })
	@ApiBody({ schema: { type: 'object', properties: { amount: { type: 'number' }, expense_date: { type: 'string', format: 'date' }, maintenance_request_id: { type: 'string', format: 'uuid' }, vendor_name: { type: 'string' } }, required: ['amount', 'expense_date', 'maintenance_request_id'] } })
	@ApiResponse({ status: 201, description: 'Expense created successfully' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post('expenses')
	async createExpense(
		@Req() req: Request,
		@Body() body: CreateExpenseDto
	): Promise<ControllerApiResponse> {
		const token = this.getToken(req)
		const client = this.supabase.getUserClient(token)

		// Create the expense (linked to a maintenance_request)
		const { data, error } = await client
			.from('expenses')
			.insert({
				amount: body.amount,
				expense_date: body.expense_date,
				vendor_name: body.vendor_name ?? null,
				maintenance_request_id: body.maintenance_request_id
			})
			.select()
			.single()

		if (error) {
			this.logger.error('Failed to create expense', { error: error.message })
			throw new InternalServerErrorException('Failed to create expense')
		}

		return {
			success: true,
			data,
			message: 'Expense created successfully',
			timestamp: new Date()
		}
	}

	@ApiOperation({ summary: 'Delete expense', description: 'Delete an expense record by ID' })
	@ApiParam({ name: 'id', type: String, description: 'Expense UUID' })
	@ApiResponse({ status: 200, description: 'Expense deleted successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Expense not found' })
	@Delete('expenses/:id')
	async deleteExpense(
		@Req() req: Request,
		@Param('id', ParseUUIDPipe) id: string
	): Promise<ControllerApiResponse> {
		const token = this.getToken(req)
		const client = this.supabase.getUserClient(token)

		const { error } = await client.from('expenses').delete().eq('id', id)

		if (error) {
			this.logger.error('Failed to delete expense', { error: error.message })
			throw new InternalServerErrorException('Failed to delete expense')
		}

		return {
			success: true,
			data: null,
			message: 'Expense deleted successfully',
			timestamp: new Date()
		}
	}
}
