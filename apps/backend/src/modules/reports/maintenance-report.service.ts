import { Injectable } from '@nestjs/common'
import type { MaintenanceReport } from '@repo/shared/types/reports'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import {
	buildMonthBuckets,
	loadPropertyIdsByOwner,
	parseDateRange
} from './reports.utils'

@Injectable()
export class MaintenanceReportService {
	constructor(
		private readonly logger: AppLogger,
		private readonly supabase: SupabaseService
	) {}

	private get sb(): SupabaseService {
		return this.supabase
	}

	private getEmptyMaintenanceReport(): MaintenanceReport {
		return {
			summary: {
				totalRequests: 0,
				openRequests: 0,
				avgResolutionHours: 0,
				totalCost: 0,
				averageCost: 0
			},
			byStatus: [],
			byPriority: [],
			monthlyCost: [],
			vendorPerformance: []
		}
	}

	/**
	 * Maintenance report data: work orders, cost analysis, vendor performance
	 */
	async getMaintenanceReport(
		user_id: string,
		start_date?: string,
		end_date?: string
	): Promise<MaintenanceReport> {
		const { start, end } = parseDateRange(start_date, end_date)
		const property_ids = await loadPropertyIdsByOwner(
			this.sb,
			this.logger,
			user_id
		)

		if (property_ids.length === 0) {
			return this.getEmptyMaintenanceReport()
		}

		const { data: maintenance } = await this.sb
			.getAdminClient()
			.from('maintenance_requests')
			.select(
				`
				id,
				status,
				priority,
				created_at,
				completed_at,
				actual_cost,
				estimated_cost,
				unit:units!maintenance_requests_unit_id_fkey(property_id)
			`
			)
			.in('unit.property_id', property_ids)
			.gte('created_at', start.toISOString())
			.lte('created_at', end.toISOString())

		const { data: expenses } = await this.sb
			.getAdminClient()
			.from('expenses')
			.select(
				`
				amount,
				expense_date,
				vendor_name,
				maintenance_requests!expenses_maintenance_request_id_fkey(
					units!maintenance_requests_unit_id_fkey(property_id)
				)
			`
			)
			.in('maintenance_requests.units.property_id', property_ids)
			.gte('expense_date', start.toISOString())
			.lte('expense_date', end.toISOString())

		const byStatus = new Map<string, number>()
		const byPriority = new Map<string, number>()
		const monthlyCostBuckets = buildMonthBuckets(start, end)
		let totalCost = 0
		let totalRequests = 0
		let openRequests = 0
		let totalResolutionHours = 0
		let resolutionCount = 0

		;(maintenance ?? []).forEach(request => {
			totalRequests += 1
			if (request.status !== 'completed') openRequests += 1
			byStatus.set(request.status, (byStatus.get(request.status) ?? 0) + 1)
			byPriority.set(
				request.priority,
				(byPriority.get(request.priority) ?? 0) + 1
			)
			const cost = (request.actual_cost ?? request.estimated_cost ?? 0) / 100
			totalCost += cost
			const monthKey =
				request.completed_at?.substring(0, 7) ??
				request.created_at?.substring(0, 7)
			if (monthKey && monthlyCostBuckets.has(monthKey)) {
				const bucket = monthlyCostBuckets.get(monthKey)
				if (bucket) bucket.expenses += cost
			}
			if (request.completed_at && request.created_at) {
				const duration =
					(new Date(request.completed_at).getTime() -
						new Date(request.created_at).getTime()) /
					(1000 * 60 * 60)
				totalResolutionHours += duration
				resolutionCount += 1
			}
		})
		;(expenses ?? []).forEach(expense => {
			const cost = expense.amount / 100
			totalCost += cost
			const monthKey = expense.expense_date?.substring(0, 7)
			if (monthKey && monthlyCostBuckets.has(monthKey)) {
				const bucket = monthlyCostBuckets.get(monthKey)
				if (bucket) bucket.expenses += cost
			}
		})

		const vendorPerformanceMap = new Map<
			string,
			{ totalSpend: number; jobs: number }
		>()
		;(expenses ?? []).forEach(expense => {
			const vendor = expense.vendor_name ?? 'Unknown'
			const entry = vendorPerformanceMap.get(vendor) ?? {
				totalSpend: 0,
				jobs: 0
			}
			entry.totalSpend += expense.amount / 100
			entry.jobs += 1
			vendorPerformanceMap.set(vendor, entry)
		})

		const monthlyCost = Array.from(monthlyCostBuckets.entries()).map(
			([month, values]) => ({
				month,
				cost: values.expenses
			})
		)

		const averageCost = totalRequests ? totalCost / totalRequests : 0
		const avgResolutionHours = resolutionCount
			? totalResolutionHours / resolutionCount
			: 0

		return {
			summary: {
				totalRequests,
				openRequests,
				avgResolutionHours,
				totalCost,
				averageCost
			},
			byStatus: Array.from(byStatus.entries()).map(([status, count]) => ({
				status,
				count
			})),
			byPriority: Array.from(byPriority.entries()).map(([priority, count]) => ({
				priority,
				count
			})),
			monthlyCost,
			vendorPerformance: Array.from(vendorPerformanceMap.entries()).map(
				([vendorName, values]) => ({
					vendorName,
					totalSpend: values.totalSpend,
					jobs: values.jobs
				})
			)
		}
	}
}
