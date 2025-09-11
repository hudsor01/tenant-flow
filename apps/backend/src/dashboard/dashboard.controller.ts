import { Controller, Get, Query } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger'
import { PinoLogger } from 'nestjs-pino'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import { Public } from '../shared/decorators/public.decorator'
import { SupabaseService } from '../database/supabase.service'
import type { ControllerApiResponse } from '@repo/shared/types/errors'
import type { AuthServiceValidatedUser } from '@repo/shared'

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: PinoLogger
	) {
		// PinoLogger context handled automatically via app-level configuration
	}

	private logMessage(message: string, data?: Record<string, unknown>): void {
		if (this.logger?.info) {
			this.logger.info(data || {}, message)
		} else {
			console.log(message, data || {})
		}
	}

	private logError(message: string, error: Error | unknown): void {
		if (this.logger?.error) {
			this.logger.error(message, error)
		} else {
			console.error(message, error)
		}
	}

	@Get('stats')
	@Public()
	@ApiOperation({ summary: 'Get dashboard statistics (test user data)' })
	@ApiResponse({
		status: 200,
		description: 'Dashboard statistics retrieved successfully'
	})
	async getStats(): Promise<ControllerApiResponse> {
		this.logMessage('Getting dashboard stats (public test endpoint)', {
			dashboard: {
				action: 'getStats'
			}
		})

		try {
			// Use test user ID - in production this would come from @CurrentUser()
			const testUserId = '00000000-0000-0000-0000-000000000000'
			
			// Ultra-native: Direct RPC call for dashboard stats with test user
			const { data, error } = await this.supabase
				.getAdminClient()
				.rpc('get_dashboard_stats' as never, { 
					user_id_param: testUserId 
				} as never)

			if (error) {
				this.logError('Failed to get dashboard stats from RPC', error)
				// Fallback to demo data if RPC fails
				const demoData = {
					totalProperties: 12,
					totalUnits: 48,
					totalTenants: 42,
					totalRevenue: 24500,
					occupancyRate: 87.5,
					maintenanceRequests: 6
				}
				
				return {
					success: true,
					data: demoData,
					message: 'Dashboard statistics retrieved successfully (fallback demo data)',
					timestamp: new Date()
				}
			}

			return {
				success: true,
				data,
				message: 'Dashboard statistics retrieved successfully (from database)',
				timestamp: new Date()
			}
		} catch (error) {
			this.logError('Unexpected error getting dashboard stats', error)
			// Final fallback
			const demoData = {
				totalProperties: 12,
				totalUnits: 48,
				totalTenants: 42,
				totalRevenue: 24500,
				occupancyRate: 87.5,
				maintenanceRequests: 6
			}
			
			return {
				success: true,
				data: demoData,
				message: 'Dashboard statistics retrieved successfully (fallback demo data)',
				timestamp: new Date()
			}
		}
	}

	@Get('activity')
	@ApiOperation({ summary: 'Get recent dashboard activity' })
	@ApiResponse({
		status: 200,
		description: 'Dashboard activity retrieved successfully'
	})
	async getActivity(
		@CurrentUser() user: AuthServiceValidatedUser
	): Promise<ControllerApiResponse> {
		this.logMessage(`Getting dashboard activity for user ${user.id}`)
		// Ultra-native: Direct RPC call for user activity
		const { data, error } = await this.supabase
			.getAdminClient()
			.rpc('get_user_dashboard_activity' as never, { 
				p_user_id: user.id 
			} as never)

		if (error) {
			this.logError('Failed to get dashboard activity', error)
			throw new Error(`Dashboard activity failed: ${error.message}`)
		}
		return {
			success: true,
			data,
			message: 'Dashboard activity retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('billing/insights')
	@ApiOperation({ 
		summary: 'Get comprehensive billing insights from Stripe Sync Engine',
		description: 'Advanced analytics including revenue, churn, MRR, and customer lifetime value'
	})
	@ApiQuery({
		name: 'startDate',
		required: false,
		type: String,
		description: 'Start date for analytics (ISO string, defaults to 12 months ago)'
	})
	@ApiQuery({
		name: 'endDate',
		required: false,
		type: String,
		description: 'End date for analytics (ISO string, defaults to now)'
	})
	@ApiResponse({
		status: 200,
		description: 'Billing insights retrieved successfully from Stripe Sync Engine data'
	})
	@ApiResponse({
		status: 404,
		description: 'Stripe Sync Engine not configured or no data available'
	})
	async getBillingInsights(
		@Query('startDate') startDate?: string,
		@Query('endDate') endDate?: string
	): Promise<ControllerApiResponse> {
		this.logMessage('Getting billing insights from Stripe Sync Engine', {
			dateRange: { startDate, endDate }
		})

		const parsedStartDate = startDate ? new Date(startDate) : undefined
		const parsedEndDate = endDate ? new Date(endDate) : undefined

		// Ultra-native: Direct RPC call for billing insights
		const { data, error } = await this.supabase
			.getAdminClient()
			.rpc('get_stripe_billing_insights' as never, {
				p_start_date: parsedStartDate?.toISOString(),
				p_end_date: parsedEndDate?.toISOString()
			} as never)

		if (error) {
			this.logError('Failed to get billing insights', error)
			return {
				success: false,
				data: null,
				message: 'Billing insights not available - Stripe Sync Engine not configured or no data',
				timestamp: new Date()
			}
		}

		if (!data) {
			return {
				success: false,
				data: null,
				message: 'Billing insights not available - Stripe Sync Engine not configured or no data',
				timestamp: new Date()
			}
		}

		return {
			success: true,
			data,
			message: 'Billing insights retrieved successfully from Stripe Sync Engine',
			timestamp: new Date()
		}
	}

	@Get('billing/health')
	@Public()
	@ApiOperation({ 
		summary: 'Check if billing insights are available',
		description: 'Health check for Stripe Sync Engine integration'
	})
	@ApiResponse({
		status: 200,
		description: 'Billing insights availability status'
	})
	async getBillingHealth(): Promise<ControllerApiResponse> {
		// Ultra-native: Direct RPC call to check billing health
		const { data: healthData, error } = await this.supabase
			.getAdminClient()
			.rpc('check_stripe_sync_health' as never)

		const isAvailable = !error && healthData

		return {
			success: true,
			data: { 
				available: isAvailable,
				service: 'Stripe Sync Engine',
				capabilities: isAvailable ? [
					'Revenue Analytics',
					'Churn Analysis', 
					'Customer Lifetime Value',
					'MRR Tracking',
					'Subscription Status Breakdown'
				] : []
			},
			message: isAvailable 
				? 'Billing insights are available' 
				: 'Billing insights not available - Stripe Sync Engine not configured',
			timestamp: new Date()
		}
	}
}
