import { Injectable, Logger } from '@nestjs/common'
import type {
	FinancialAnalyticsPageResponse,
	FinancialMetricSummary,
	FinancialOverviewSnapshot,
	LeaseFinancialSummary,
	NetOperatingIncomeByProperty
} from '@repo/shared/types/financial-analytics'
import {
	buildFinancialAnalyticsPageResponse,
	mapBillingInsights,
	mapExpenseSummary,
	mapFinancialMetricSummary,
	mapFinancialOverview,
	mapInvoiceSummary,
	mapLeaseAnalytics,
	mapLeaseSummary,
	mapMonthlyMetrics,
	mapNetOperatingIncome,
	mapRevenueExpenseBreakdown
} from '@repo/shared/utils/financial-analytics'
import { SupabaseService } from '../../database/supabase.service'

@Injectable()
export class FinancialAnalyticsService {
	private readonly logger = new Logger(FinancialAnalyticsService.name)

	constructor(private readonly supabase: SupabaseService) {}

	private buildUserPayload(
		userId: string,
		extra?: Record<string, unknown>
	): Record<string, unknown> {
		return {
			user_id: userId,
			user_id_param: userId,
			p_user_id: userId,
			uid: userId,
			...extra
		}
	}

	private async callRpc<T = unknown>(
		functionName: string,
		payload: Record<string, unknown>
	): Promise<T | null> {
		const client = this.supabase.getAdminClient()

		try {
			const { data, error } = await (
				client as unknown as {
					rpc: (
						fn: string,
						args: Record<string, unknown>
					) => Promise<{ data: unknown; error: { message: string } | null }>
				}
			).rpc(functionName, payload)

			if (error) {
				this.logger.warn('Financial analytics RPC failed', {
					functionName,
					error: error.message
				})
				return null
			}

			return (data as T) ?? null
		} catch (error) {
			this.logger.error('Unexpected RPC failure', {
				functionName,
				error: error instanceof Error ? error.message : String(error)
			})
			return null
		}
	}

	async getFinancialMetrics(userId: string): Promise<FinancialMetricSummary> {
		const raw = await this.callRpc(
			'calculate_financial_metrics',
			this.buildUserPayload(userId)
		)
		return mapFinancialMetricSummary(raw)
	}

	async getFinancialBreakdown(userId: string) {
		const raw = await this.callRpc(
			'calculate_financial_metrics',
			this.buildUserPayload(userId)
		)
		return mapRevenueExpenseBreakdown(raw)
	}

	async getNetOperatingIncome(
		userId: string
	): Promise<NetOperatingIncomeByProperty[]> {
		const raw = await this.callRpc(
			'calculate_net_operating_income',
			this.buildUserPayload(userId)
		)
		return mapNetOperatingIncome(raw)
	}

	async getFinancialOverview(
		userId: string
	): Promise<FinancialOverviewSnapshot> {
		const raw = await this.callRpc(
			'get_financial_overview',
			this.buildUserPayload(userId)
		)
		return mapFinancialOverview(raw)
	}

	async getBillingInsights(userId: string) {
		const raw = await this.callRpc(
			'get_billing_insights',
			this.buildUserPayload(userId)
		)
		return mapBillingInsights(raw)
	}

	async getExpenseSummary(userId: string) {
		const raw = await this.callRpc(
			'get_expense_summary',
			this.buildUserPayload(userId)
		)
		return mapExpenseSummary(raw)
	}

	async getInvoiceStatistics(userId: string) {
		const raw = await this.callRpc(
			'get_invoice_statistics',
			this.buildUserPayload(userId)
		)
		return mapInvoiceSummary(raw)
	}

	async getMonthlyMetrics(userId: string) {
		const raw = await this.callRpc(
			'calculate_monthly_metrics',
			this.buildUserPayload(userId)
		)
		return mapMonthlyMetrics(raw)
	}

	async getLeaseFinancialSummary(
		userId: string
	): Promise<LeaseFinancialSummary> {
		const raw = await this.callRpc(
			'get_lease_financial_summary',
			this.buildUserPayload(userId)
		)
		return mapLeaseSummary(raw)
	}

	async getLeasesWithFinancialAnalytics(userId: string) {
		const raw = await this.callRpc(
			'get_leases_with_financial_analytics',
			this.buildUserPayload(userId)
		)
		return mapLeaseAnalytics(raw)
	}

	async getFinancialAnalyticsPageData(
		userId: string
	): Promise<FinancialAnalyticsPageResponse> {
		const [
			metricsRaw,
			noiRaw,
			overviewRaw,
			billingRaw,
			expenseRaw,
			invoiceRaw,
			monthlyRaw,
			leaseSummaryRaw,
			leaseAnalyticsRaw
		] = await Promise.all([
			this.callRpc(
				'calculate_financial_metrics',
				this.buildUserPayload(userId)
			),
			this.callRpc(
				'calculate_net_operating_income',
				this.buildUserPayload(userId)
			),
			this.callRpc('get_financial_overview', this.buildUserPayload(userId)),
			this.callRpc('get_billing_insights', this.buildUserPayload(userId)),
			this.callRpc('get_expense_summary', this.buildUserPayload(userId)),
			this.callRpc('get_invoice_statistics', this.buildUserPayload(userId)),
			this.callRpc('calculate_monthly_metrics', this.buildUserPayload(userId)),
			this.callRpc(
				'get_lease_financial_summary',
				this.buildUserPayload(userId)
			),
			this.callRpc(
				'get_leases_with_financial_analytics',
				this.buildUserPayload(userId)
			)
		])

		return buildFinancialAnalyticsPageResponse({
			metrics: metricsRaw,
			breakdown: metricsRaw,
			netOperatingIncome: noiRaw,
			financialOverview: overviewRaw,
			billingInsights: billingRaw,
			expenseSummary: expenseRaw,
			invoiceSummary: invoiceRaw,
			monthlyMetrics: monthlyRaw,
			leaseSummary: leaseSummaryRaw,
			leaseAnalytics: leaseAnalyticsRaw
		})
	}
}
