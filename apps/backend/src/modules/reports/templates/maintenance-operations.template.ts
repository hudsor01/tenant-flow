import { Injectable, Logger } from '@nestjs/common'
import { MaintenanceInsightsService } from '../../analytics/maintenance-insights.service'

export interface MaintenanceOperationsReportData {
	operationsSummary: {
		openRequests: number
		inProgress: number
		completed: number
		averageResponseTime: number
		totalCost: number
	}
	costBreakdown: Array<{
		category: string
		amount: number
		percentage: number
		requestCount: number
	}>
	responseTrends: Array<{
		period: string
		averageResponseTime: number
		completionRate: number
		totalRequests: number
	}>
	categoryAnalysis: Array<{
		category: string
		averageCost: number
		frequency: number
		urgencyLevel: 'high' | 'medium' | 'low'
	}>
	period: {
		startDate: string
		endDate: string
	}
}

@Injectable()
export class MaintenanceOperationsTemplate {
	private readonly logger = new Logger(MaintenanceOperationsTemplate.name)

	constructor(
		private readonly maintenanceService: MaintenanceInsightsService
	) {}

	async generateReportData(
		userId: string,
		startDate: string,
		endDate: string
	): Promise<MaintenanceOperationsReportData> {
		this.logger.log('Generating maintenance operations report data', {
			userId,
			startDate,
			endDate
		})

		const [maintenanceMetrics, maintenanceAnalytics] = await Promise.all([
			this.maintenanceService.getMaintenanceMetrics(userId),
			this.maintenanceService.getMaintenanceAnalytics(userId)
		])

		const operationsSummary = {
			openRequests: maintenanceMetrics.openRequests || 0,
			inProgress: maintenanceMetrics.inProgressRequests || 0,
			completed: maintenanceMetrics.completedRequests || 0,
			averageResponseTime: maintenanceMetrics.averageResponseTimeHours || 0,
			totalCost: maintenanceMetrics.totalCost || 0
		}

		const costBreakdown = (maintenanceAnalytics.costBreakdown || []).map(
			item => ({
				category: item.category || 'Other',
				amount: item.amount || 0,
				percentage: item.percentage || 0,
				requestCount: 0 // Count not available in MaintenanceCostBreakdownEntry
			})
		)

		const responseTrends = (maintenanceAnalytics.trends || []).map(trend => ({
			period: trend.period || '',
			averageResponseTime: trend.avgResolutionTime || 0,
			completionRate: 0, // Not available in MaintenanceTrendPoint
			totalRequests: trend.completed + trend.pending || 0
		}))

		const categoryAnalysis = (maintenanceAnalytics.categoryBreakdown || []).map(
			cat => ({
				category: cat.category || 'Other',
				averageCost: 0, // Not available in MaintenanceCategoryBreakdown
				frequency: cat.count || 0,
				urgencyLevel:
					(cat.count || 0) > 10
						? ('high' as const)
						: (cat.count || 0) > 5
							? ('medium' as const)
							: ('low' as const)
			})
		)

		return {
			operationsSummary,
			costBreakdown,
			responseTrends,
			categoryAnalysis,
			period: {
				startDate,
				endDate
			}
		}
	}

	formatForPDF(data: MaintenanceOperationsReportData): string {
		return `
MAINTENANCE OPERATIONS REPORT
Period: ${data.period.startDate} to ${data.period.endDate}

OPERATIONS SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Open Requests: ${data.operationsSummary.openRequests}
• In Progress: ${data.operationsSummary.inProgress}
• Completed: ${data.operationsSummary.completed}
• Average Response Time: ${data.operationsSummary.averageResponseTime} hours
• Total Cost: $${data.operationsSummary.totalCost.toLocaleString()}

COST BREAKDOWN BY CATEGORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${data.costBreakdown
	.map(
		item => `• ${item.category}
  Amount: $${item.amount.toLocaleString()} (${item.percentage.toFixed(1)}%)
  Requests: ${item.requestCount}`
	)
	.join('\n\n')}

CATEGORY ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${data.categoryAnalysis
	.map(
		cat => `• ${cat.category}
  Average Cost: $${cat.averageCost.toLocaleString()}
  Frequency: ${cat.frequency} requests
  Urgency Level: ${cat.urgencyLevel.toUpperCase()}`
	)
	.join('\n\n')}
		`.trim()
	}

	formatForExcel(
		data: MaintenanceOperationsReportData
	): Record<string, unknown>[] {
		const summaryRows = [
			{
				section: 'Operations Summary',
				metric: 'Open Requests',
				value: data.operationsSummary.openRequests
			},
			{
				section: 'Operations Summary',
				metric: 'In Progress',
				value: data.operationsSummary.inProgress
			},
			{
				section: 'Operations Summary',
				metric: 'Completed',
				value: data.operationsSummary.completed
			},
			{
				section: 'Operations Summary',
				metric: 'Average Response Time (hours)',
				value: data.operationsSummary.averageResponseTime
			},
			{
				section: 'Operations Summary',
				metric: 'Total Cost',
				value: data.operationsSummary.totalCost
			}
		]

		const costRows = data.costBreakdown.map(item => ({
			section: 'Cost Breakdown',
			category: item.category,
			amount: item.amount,
			percentage: `${item.percentage.toFixed(1)}%`,
			requestCount: item.requestCount
		}))

		const trendRows = data.responseTrends.map(trend => ({
			section: 'Response Trends',
			period: trend.period,
			averageResponseTime: trend.averageResponseTime,
			completionRate: `${trend.completionRate.toFixed(1)}%`,
			totalRequests: trend.totalRequests
		}))

		const analysisRows = data.categoryAnalysis.map(cat => ({
			section: 'Category Analysis',
			category: cat.category,
			averageCost: cat.averageCost,
			frequency: cat.frequency,
			urgencyLevel: cat.urgencyLevel
		}))

		return [...summaryRows, ...costRows, ...trendRows, ...analysisRows]
	}
}
