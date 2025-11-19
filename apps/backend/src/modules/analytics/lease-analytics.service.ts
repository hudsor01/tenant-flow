import { Injectable, Logger } from '@nestjs/common'
import type {
	LeaseFinancialInsight,
	LeaseFinancialSummary
} from '@repo/shared/types/financial-analytics'
import type {
	LeaseAnalyticsPageResponse,
	LeaseLifecyclePoint,
	LeaseStatusBreakdown
} from '@repo/shared/types/lease-analytics'
import {
	buildLeaseAnalyticsPageResponse,
	mapLeaseLifecycle,
	mapLeaseProfitability,
	mapLeaseStatusBreakdown,
	mapLeaseSummary
} from '@repo/shared/utils/lease-analytics'
import { SupabaseService } from '../../database/supabase.service'

@Injectable()
export class LeaseAnalyticsService {
	private readonly logger = new Logger(LeaseAnalyticsService.name)

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
				data?: T | null
				error?: { message?: string } | null
			}

			if (res?.error) {
				this.logger.warn(
					`Lease analytics RPC failed: ${functionName} - ${res.error?.message}`
				)
				return null
			}

			return (res?.data ?? null) as T | null
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error)
			this.logger.warn(
				`Unexpected RPC failure: ${functionName} - ${errorMessage}`
			)
			return null
		}
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

	async getLeasesWithFinancialAnalytics(
		user_id: string
	): Promise<LeaseFinancialInsight[]> {
		const raw = await this.callRpc(
			'get_leases_with_financial_analytics',
			this.buildUserPayload(user_id)
		)
		return mapLeaseProfitability(raw)
	}

	async getLeaseLifecycleData(user_id: string): Promise<LeaseLifecyclePoint[]> {
		const raw = await this.callRpc(
			'get_lease_lifecycle_data',
			this.buildUserPayload(user_id)
		)
		return mapLeaseLifecycle(raw)
	}

	async getLeaseStatusBreakdown(
		user_id: string
	): Promise<LeaseStatusBreakdown[]> {
		const raw = await this.callRpc(
			'get_lease_status_breakdown',
			this.buildUserPayload(user_id)
		)
		return mapLeaseStatusBreakdown(raw)
	}

	async getLeaseAnalyticsPageData(
		user_id: string
	): Promise<LeaseAnalyticsPageResponse> {
		const [summaryRaw, profitabilityRaw, lifecycleRaw, statusRaw] =
			await Promise.all([
				this.callRpc(
					'get_lease_financial_summary',
					this.buildUserPayload(user_id)
				),
				this.callRpc(
					'get_leases_with_financial_analytics',
					this.buildUserPayload(user_id)
				),
				this.callRpc('get_lease_lifecycle_data', this.buildUserPayload(user_id)),
				this.callRpc(
					'get_lease_status_breakdown',
					this.buildUserPayload(user_id)
				)
			])

		return buildLeaseAnalyticsPageResponse({
			summary: summaryRaw,
			profitability: profitabilityRaw,
			lifecycle: lifecycleRaw,
			statusBreakdown: statusRaw
		})
	}
}
