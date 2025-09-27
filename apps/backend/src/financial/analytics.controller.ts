import {
	BadRequestException,
	Controller,
	Get,
	Logger,
	Query,
	Req
} from '@nestjs/common'
import type { Request } from 'express'
// Auth guard removed - using direct Supabase auth with database functions
import { SupabaseService } from '../database/supabase.service'
import type {
	FinancialMetrics,
	PropertyFinancialMetrics,
	DashboardSummary
} from '@repo/shared'

/**
 * Financial Analytics Controller
 * All financial calculations moved from frontend to backend
 * Following NO ABSTRACTIONS pattern - direct Supabase RPC calls
 */
@Controller('financial/analytics')
// Auth removed - endpoints now use direct Supabase database functions with RLS
export class FinancialAnalyticsController {
	private readonly logger = new Logger(FinancialAnalyticsController.name)

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Get revenue trends using PostgreSQL RPC function
	 * Replaces frontend calculations from revenue-trend-chart.tsx
	 */
	@Get('revenue-trends')
	async getRevenueTrends(
		@Query('year') year: string,
		@Query('timeRange') _timeRange = '12m',
		@Req() req: Request
	): Promise<FinancialMetrics[]> {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new BadRequestException('User not authenticated')
		}

		const targetYear = year ? parseInt(year) : new Date().getFullYear()
		const client = this.supabaseService.getAdminClient()

		// Use PostgreSQL RPC function for all calculations
		const { data, error } = await client
			.rpc('calculate_financial_metrics', {
				p_user_id: user.id,
				p_start_date: `${targetYear}-01-01`,
				p_end_date: `${targetYear}-12-31`
			})

		if (error) {
			this.logger.error('Failed to calculate financial metrics', error)
			throw new BadRequestException('Failed to fetch financial data')
		}

		// Type assertion for the RPC response
		return (data as unknown as FinancialMetrics[]) || []
	}

	/**
	 * Get dashboard financial metrics using PostgreSQL RPC function
	 * Replaces frontend calculations from financial.ts hooks
	 */
	@Get('dashboard-metrics')
	async getDashboardMetrics(@Req() req: Request): Promise<DashboardSummary> {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new BadRequestException('User not authenticated')
		}

		const client = this.supabaseService.getAdminClient()

		// Use PostgreSQL RPC function for dashboard summary
		const { data, error } = await client
			.rpc('get_dashboard_summary', {
				p_user_id: user.id
			})

		if (error) {
			this.logger.error('Failed to get dashboard summary', error)
			throw new BadRequestException('Failed to fetch dashboard metrics')
		}

		// Type assertion for the RPC response
		return (data as unknown as DashboardSummary) || {
			totalRevenue: 0,
			totalExpenses: 0,
			netIncome: 0,
			propertyCount: 0,
			occupancyRate: 0,
			avgRoi: 0
		}
	}

	/**
	 * Get expense breakdown using PostgreSQL RPC function
	 * Moved all calculations to database level
	 */
	@Get('expense-breakdown')
	async getExpenseBreakdown(
		@Query('year') year: string,
		@Req() req: Request
	): Promise<FinancialMetrics[]> {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new BadRequestException('User not authenticated')
		}

		const targetYear = year ? parseInt(year) : new Date().getFullYear()
		const client = this.supabaseService.getAdminClient()

		// Use PostgreSQL RPC function for all expense calculations
		const { data, error } = await client
			.rpc('calculate_financial_metrics', {
				p_user_id: user.id,
				p_start_date: `${targetYear}-01-01`,
				p_end_date: `${targetYear}-12-31`
			})

		if (error) {
			this.logger.error('Failed to calculate expense breakdown', error)
			throw new BadRequestException('Failed to fetch expense data')
		}

		// Type assertion for the RPC response
		return (data as unknown as FinancialMetrics[]) || []
	}

	/**
	 * Get Net Operating Income using PostgreSQL RPC function
	 * Replaces all frontend NOI calculations
	 */
	@Get('net-operating-income')
	async getNetOperatingIncome(
		@Query('period') _period = 'monthly',
		@Req() req: Request
	): Promise<PropertyFinancialMetrics[]> {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new BadRequestException('User not authenticated')
		}

		const client = this.supabaseService.getAdminClient()

		// Use PostgreSQL RPC function for NOI calculations
		const { data, error } = await client
			.rpc('calculate_financial_metrics', {
				p_user_id: user.id,
				p_start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0] as string,
				p_end_date: new Date().toISOString().split('T')[0] as string
			})

		if (error) {
			this.logger.error('Failed to calculate NOI', error)
			throw new BadRequestException('Failed to fetch NOI data')
		}

		// Type assertion for the RPC response
		return (data as unknown as PropertyFinancialMetrics[]) || []
	}
}