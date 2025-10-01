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
import { SupabaseService } from '../database/supabase.service'

@Injectable()
export class LeaseAnalyticsService {
	private readonly logger = new Logger(LeaseAnalyticsService.name)

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

	private async callRpc(
		functionName: string,
		payload: Record<string, unknown>
	): Promise<unknown> {
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
				this.logger.warn(
					`Lease analytics RPC failed: ${functionName} - ${error.message}`
				)
				return null
			}

			return data ?? null
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error)
			this.logger.error(
				`Unexpected RPC failure: ${functionName} - ${errorMessage}`
			)
			return null
		}
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

	async getLeasesWithFinancialAnalytics(
		userId: string
	): Promise<LeaseFinancialInsight[]> {
		const raw = await this.callRpc(
			'get_leases_with_financial_analytics',
			this.buildUserPayload(userId)
		)
		return mapLeaseProfitability(raw)
	}

	async getLeaseLifecycleData(userId: string): Promise<LeaseLifecyclePoint[]> {
		const raw = await this.callRpc(
			'get_lease_lifecycle_data',
			this.buildUserPayload(userId)
		)
		return mapLeaseLifecycle(raw)
	}

	async getLeaseStatusBreakdown(
		userId: string
	): Promise<LeaseStatusBreakdown[]> {
		const raw = await this.callRpc(
			'get_lease_status_breakdown',
			this.buildUserPayload(userId)
		)
		return mapLeaseStatusBreakdown(raw)
	}

	async getLeaseAnalyticsPageData(
		userId: string
	): Promise<LeaseAnalyticsPageResponse> {
		const [summaryRaw, profitabilityRaw, lifecycleRaw, statusRaw] =
			await Promise.all([
				this.callRpc(
					'get_lease_financial_summary',
					this.buildUserPayload(userId)
				),
				this.callRpc(
					'get_leases_with_financial_analytics',
					this.buildUserPayload(userId)
				),
				this.callRpc('get_lease_lifecycle_data', this.buildUserPayload(userId)),
				this.callRpc(
					'get_lease_status_breakdown',
					this.buildUserPayload(userId)
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
