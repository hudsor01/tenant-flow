import { Injectable, Logger } from '@nestjs/common'
import { LeaseAnalyticsService } from '../../analytics/lease-analytics.service'

export interface LeasePortfolioReportData {
	leaseSummary: {
		totalLeases: number
		activeLeases: number
		expiringLeases: number
		totalrent_amount: number
		averageLeaseLength: number
	}
	leaseProfitability: Array<{
		lease_id: string
		tenant: string
		property: string
		rent_amount: number
		profitabilityScore: number
		status: string
	}>
	leaseLifecycle: Array<{
		period: string
		newLeases: number
		renewals: number
		terminations: number
	}>
	statusBreakdown: Array<{
		status: string
		count: number
		percentage: number
	}>
	period: {
		start_date: string
		end_date: string
	}
}

@Injectable()
export class LeasePortfolioTemplate {
	private readonly logger = new Logger(LeasePortfolioTemplate.name)

	constructor(private readonly leaseService: LeaseAnalyticsService) {}

	async generateReportData(
		user_id: string,
		start_date: string,
		end_date: string
	): Promise<LeasePortfolioReportData> {
		this.logger.log('Generating lease portfolio report data', {
			user_id,
			start_date,
			end_date
		})

		const [leaseSummary, leaseProfitability, leaseLifecycle, statusBreakdown] =
			await Promise.all([
				this.leaseService.getLeaseFinancialSummary(user_id),
				this.leaseService.getLeasesWithFinancialAnalytics(user_id),
				this.leaseService.getLeaseLifecycleData(user_id),
				this.leaseService.getLeaseStatusBreakdown(user_id)
			])

		const summary = {
			totalLeases: leaseSummary.totalLeases || 0,
			activeLeases: leaseSummary.activeLeases || 0,
			expiringLeases: leaseSummary.expiringSoon || 0,
			totalrent_amount: leaseSummary.totalrent_amount || 0,
			averageLeaseLength: 12 // Default average, not available in LeaseFinancialSummary
		}

		const profitability = leaseProfitability.map(lease => ({
			lease_id: lease.lease_id || 'N/A',
			tenant: lease.tenantName || 'Unknown',
			property: lease.propertyName || 'Unknown',
			rent_amount: lease.rent_amount || 0,
			profitabilityScore: lease.profitabilityScore || 0,
			status: 'Active' // Status not available in LeaseFinancialInsight
		}))

		const lifecycle = leaseLifecycle.map(point => ({
			period: point.period || '',
			newLeases: 0, // Not available in LeaseLifecyclePoint
			renewals: point.renewals || 0,
			terminations: point.expirations || 0
		}))

		const breakdown = statusBreakdown.map(item => ({
			status: item.status || 'Unknown',
			count: item.count || 0,
			percentage: item.percentage || 0
		}))

		return {
			leaseSummary: summary,
			leaseProfitability: profitability,
			leaseLifecycle: lifecycle,
			statusBreakdown: breakdown,
			period: {
				start_date,
				end_date
			}
		}
	}

	formatForExcel(data: LeasePortfolioReportData): Record<string, unknown>[] {
		const summaryRows = [
			{
				sheet: 'Lease Summary',
				metric: 'Total Leases',
				value: data.leaseSummary.totalLeases
			},
			{
				sheet: 'Lease Summary',
				metric: 'Active Leases',
				value: data.leaseSummary.activeLeases
			},
			{
				sheet: 'Lease Summary',
				metric: 'Expiring Leases',
				value: data.leaseSummary.expiringLeases
			},
			{
				sheet: 'Lease Summary',
				metric: 'Total Monthly Rent',
				value: data.leaseSummary.totalrent_amount
			},
			{
				sheet: 'Lease Summary',
				metric: 'Average Lease Length (months)',
				value: data.leaseSummary.averageLeaseLength
			}
		]

		const profitabilityRows = data.leaseProfitability.map(lease => ({
			sheet: 'Lease Profitability',
			lease_id: lease.lease_id,
			tenant: lease.tenant,
			property: lease.property,
			rent_amount: lease.rent_amount,
			profitabilityScore: lease.profitabilityScore,
			status: lease.status
		}))

		const lifecycleRows = data.leaseLifecycle.map(point => ({
			sheet: 'Lease Lifecycle',
			period: point.period,
			newLeases: point.newLeases,
			renewals: point.renewals,
			terminations: point.terminations
		}))

		const statusRows = data.statusBreakdown.map(item => ({
			sheet: 'Status Breakdown',
			status: item.status,
			count: item.count,
			percentage: `${item.percentage.toFixed(1)}%`
		}))

		return [
			...summaryRows,
			...profitabilityRows,
			...lifecycleRows,
			...statusRows
		]
	}
}
