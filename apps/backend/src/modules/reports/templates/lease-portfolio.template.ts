import { Injectable, Logger } from '@nestjs/common'
import { LeaseAnalyticsService } from '../../analytics/lease-analytics.service'

export interface LeasePortfolioReportData {
	leaseSummary: {
		totalLeases: number
		activeLeases: number
		expiringLeases: number
		totalMonthlyRent: number
		averageLeaseLength: number
	}
	leaseProfitability: Array<{
		leaseId: string
		tenant: string
		property: string
		monthlyRent: number
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
		startDate: string
		endDate: string
	}
}

@Injectable()
export class LeasePortfolioTemplate {
	private readonly logger = new Logger(LeasePortfolioTemplate.name)

	constructor(private readonly leaseService: LeaseAnalyticsService) {}

	async generateReportData(
		userId: string,
		startDate: string,
		endDate: string
	): Promise<LeasePortfolioReportData> {
		this.logger.log('Generating lease portfolio report data', {
			userId,
			startDate,
			endDate
		})

		const [leaseSummary, leaseProfitability, leaseLifecycle, statusBreakdown] =
			await Promise.all([
				this.leaseService.getLeaseFinancialSummary(userId),
				this.leaseService.getLeasesWithFinancialAnalytics(userId),
				this.leaseService.getLeaseLifecycleData(userId),
				this.leaseService.getLeaseStatusBreakdown(userId)
			])

		const summary = {
			totalLeases: leaseSummary.totalLeases || 0,
			activeLeases: leaseSummary.activeLeases || 0,
			expiringLeases: leaseSummary.expiringSoon || 0,
			totalMonthlyRent: leaseSummary.totalMonthlyRent || 0,
			averageLeaseLength: 12 // Default average, not available in LeaseFinancialSummary
		}

		const profitability = leaseProfitability.map(lease => ({
			leaseId: lease.leaseId || 'N/A',
			tenant: lease.tenantName || 'Unknown',
			property: lease.propertyName || 'Unknown',
			monthlyRent: lease.monthlyRent || 0,
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
				startDate,
				endDate
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
				value: data.leaseSummary.totalMonthlyRent
			},
			{
				sheet: 'Lease Summary',
				metric: 'Average Lease Length (months)',
				value: data.leaseSummary.averageLeaseLength
			}
		]

		const profitabilityRows = data.leaseProfitability.map(lease => ({
			sheet: 'Lease Profitability',
			leaseId: lease.leaseId,
			tenant: lease.tenant,
			property: lease.property,
			monthlyRent: lease.monthlyRent,
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
