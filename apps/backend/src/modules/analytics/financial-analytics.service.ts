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
		user_id: string,
		extra?: Record<string, unknown>
	): Record<string, unknown> {
		return {
			user_id: user_id,
			user_id_param: user_id,
			p_user_id: user_id,
			uid: user_id,
			...extra
		}
	}

	private async callRpc<T = unknown>(
		functionName: string,
		payload: Record<string, unknown>
	): Promise<T | null> {
		try {
			const result = await this.supabase.rpcWithRetries(functionName, payload)
			const res = result as {
				data?: T
				error?: { message?: string } | null
			}
			if (res.error) {
				this.logger.warn('Financial analytics RPC failed', {
					functionName,
					error: res.error?.message
				})
				return null
			}
			return res.data ?? null
		} catch (error) {
			this.logger.error('Unexpected RPC failure', {
				functionName,
				error: error instanceof Error ? error.message : String(error)
			})
			return null
		}
	}

	async getFinancialMetrics(user_id: string): Promise<FinancialMetricSummary> {
		const raw = await this.callRpc(
			'calculate_financial_metrics',
			this.buildUserPayload(user_id)
		)
		return mapFinancialMetricSummary(raw)
	}

	async getFinancialBreakdown(user_id: string) {
		const raw = await this.callRpc(
			'calculate_financial_metrics',
			this.buildUserPayload(user_id)
		)
		return mapRevenueExpenseBreakdown(raw)
	}

	async getNetOperatingIncome(
		user_id: string
	): Promise<NetOperatingIncomeByProperty[]> {
		const raw = await this.callRpc(
			'calculate_net_operating_income',
			this.buildUserPayload(user_id)
		)
		return mapNetOperatingIncome(raw)
	}

	async getFinancialOverview(
		user_id: string
	): Promise<FinancialOverviewSnapshot> {
		const raw = await this.callRpc(
			'get_financial_overview',
			this.buildUserPayload(user_id)
		)
		return mapFinancialOverview(raw)
	}

	async getBillingInsights(user_id: string) {
		const raw = await this.callRpc(
			'get_billing_insights',
			this.buildUserPayload(user_id)
		)
		return mapBillingInsights(raw)
	}

	async getExpenseSummary(user_id: string) {
		const raw = await this.callRpc(
			'get_expense_summary',
			this.buildUserPayload(user_id)
		)
		return mapExpenseSummary(raw)
	}

	async getInvoiceStatistics(user_id: string) {
		const raw = await this.callRpc(
			'get_invoice_statistics',
			this.buildUserPayload(user_id)
		)
		return mapInvoiceSummary(raw)
	}

	async getMonthlyMetrics(user_id: string) {
		const raw = await this.callRpc(
			'calculate_monthly_metrics',
			this.buildUserPayload(user_id)
		)
		return mapMonthlyMetrics(raw)
	}

	async getLeaseFinancialSummary(
		user_id: string
	): Promise<LeaseFinancialSummary> {
		const raw = await this.callRpc(
			'get_lease_financial_summary',
			this.buildUserPayload(user_id)
		)
		return mapLeaseSummary(raw)
	}

	async getLeasesWithFinancialAnalytics(user_id: string) {
		const raw = await this.callRpc(
			'get_leases_with_financial_analytics',
			this.buildUserPayload(user_id)
		)
		return mapLeaseAnalytics(raw)
	}

	async getFinancialAnalyticsPageData(
		user_id: string
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
				this.buildUserPayload(user_id)
			),
			this.callRpc(
				'calculate_net_operating_income',
				this.buildUserPayload(user_id)
			),
			this.callRpc('get_financial_overview', this.buildUserPayload(user_id)),
			this.callRpc('get_billing_insights', this.buildUserPayload(user_id)),
			this.callRpc('get_expense_summary', this.buildUserPayload(user_id)),
			this.callRpc('get_invoice_statistics', this.buildUserPayload(user_id)),
			this.callRpc('calculate_monthly_metrics', this.buildUserPayload(user_id)),
			this.callRpc(
				'get_lease_financial_summary',
				this.buildUserPayload(user_id)
			),
			this.callRpc(
				'get_leases_with_financial_analytics',
				this.buildUserPayload(user_id)
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
