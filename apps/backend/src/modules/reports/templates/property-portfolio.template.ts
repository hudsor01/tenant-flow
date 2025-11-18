import { Injectable, Logger } from '@nestjs/common'
import { PropertyPerformanceService } from '../../analytics/property-performance.service'

export interface PropertyPortfolioReportData {
	portfolioSummary: {
		totalProperties: number
		totalUnits: number
		occupiedUnits: number
		vacantUnits: number
		averageOccupancy: number
		totalRevenue: number
	}
	propertyRankings: Array<{
		property: string
		occupancyRate: number
		totalUnits: number
		occupiedUnits: number
		monthlyRevenue: number
		performance: 'excellent' | 'good' | 'needs-improvement'
	}>
	unitStatistics: Array<{
		label: string
		value: number
		trend?: number
	}>
	vacancyAnalysis: {
		averageVacancyDays: number
		currentVacancies: number
		vacancyRate: number
	}
	period: {
		start_date: string
		end_date: string
	}
}

@Injectable()
export class PropertyPortfolioTemplate {
	private readonly logger = new Logger(PropertyPortfolioTemplate.name)

	constructor(private readonly propertyService: PropertyPerformanceService) {}

	async generateReportData(
		user_id: string,
		start_date: string,
		end_date: string
	): Promise<PropertyPortfolioReportData> {
		this.logger.log('Generating property portfolio report data', {
			user_id,
			start_date,
			end_date
		})

		const [propertyPerformance, unitStatistics] = await Promise.all([
			this.propertyService.getPropertyPerformance(user_id),
			this.propertyService.getUnitStatistics(user_id)
		])

		const totalProperties = propertyPerformance.length
		const totalUnits = propertyPerformance.reduce(
			(sum, prop) => sum + (prop.totalUnits || 0),
			0
		)
		const occupiedUnits = propertyPerformance.reduce(
			(sum, prop) => sum + (prop.occupiedUnits || 0),
			0
		)
		const vacantUnits = totalUnits - occupiedUnits
		const averageOccupancy =
			totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0
		const totalRevenue = propertyPerformance.reduce(
			(sum, prop) => sum + (prop.monthlyRevenue || 0),
			0
		)

		const propertyRankings = propertyPerformance
			.sort((a, b) => (b.occupancyRate || 0) - (a.occupancyRate || 0))
			.map(prop => ({
				property: prop.propertyName || 'Unknown',
				occupancyRate: prop.occupancyRate || 0,
				totalUnits: prop.totalUnits || 0,
				occupiedUnits: prop.occupiedUnits || 0,
				monthlyRevenue: prop.monthlyRevenue || 0,
				performance:
					(prop.occupancyRate || 0) >= 95
						? ('excellent' as const)
						: (prop.occupancyRate || 0) >= 85
							? ('good' as const)
							: ('needs-improvement' as const)
			}))

		const vacancyAnalysis = {
			averageVacancyDays: 0,
			currentVacancies: vacantUnits,
			vacancyRate: totalUnits > 0 ? (vacantUnits / totalUnits) * 100 : 0
		}

		return {
			portfolioSummary: {
				totalProperties,
				totalUnits,
				occupiedUnits,
				vacantUnits,
				averageOccupancy,
				totalRevenue
			},
			propertyRankings,
			unitStatistics: unitStatistics.map(stat => ({
				label: stat.label,
				value: stat.value,
				...(stat.trend !== null ? { trend: stat.trend } : {})
			})),
			vacancyAnalysis,
			period: {
				start_date,
				end_date
			}
		}
	}

	formatForPDF(data: PropertyPortfolioReportData): string {
		return `
PROPERTY PORTFOLIO REPORT
Period: ${data.period.start_date} to ${data.period.end_date}

PORTFOLIO SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Total Properties: ${data.portfolioSummary.totalProperties}
• Total Units: ${data.portfolioSummary.totalUnits}
• Occupied Units: ${data.portfolioSummary.occupiedUnits}
• Vacant Units: ${data.portfolioSummary.vacantUnits}
• Average Occupancy: ${data.portfolioSummary.averageOccupancy.toFixed(1)}%
• Total Monthly Revenue: $${data.portfolioSummary.totalRevenue.toLocaleString()}

PROPERTY RANKINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${data.propertyRankings
	.map(
		(prop, index) => `${index + 1}. ${prop.property}
   Occupancy: ${prop.occupancyRate.toFixed(1)}% (${prop.occupiedUnits}/${prop.totalUnits} units)
   Monthly Revenue: $${prop.monthlyRevenue.toLocaleString()}
   Performance: ${prop.performance.toUpperCase()}`
	)
	.join('\n\n')}

VACANCY ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Current Vacancies: ${data.vacancyAnalysis.currentVacancies} units
• Vacancy Rate: ${data.vacancyAnalysis.vacancyRate.toFixed(1)}%
		`.trim()
	}

	formatForExcel(data: PropertyPortfolioReportData): Record<string, unknown>[] {
		const summaryRows = [
			{
				section: 'Portfolio Summary',
				metric: 'Total Properties',
				value: data.portfolioSummary.totalProperties
			},
			{
				section: 'Portfolio Summary',
				metric: 'Total Units',
				value: data.portfolioSummary.totalUnits
			},
			{
				section: 'Portfolio Summary',
				metric: 'Occupied Units',
				value: data.portfolioSummary.occupiedUnits
			},
			{
				section: 'Portfolio Summary',
				metric: 'Vacant Units',
				value: data.portfolioSummary.vacantUnits
			},
			{
				section: 'Portfolio Summary',
				metric: 'Average Occupancy',
				value: `${data.portfolioSummary.averageOccupancy.toFixed(1)}%`
			},
			{
				section: 'Portfolio Summary',
				metric: 'Total Revenue',
				value: data.portfolioSummary.totalRevenue
			}
		]

		const rankingRows = data.propertyRankings.map((prop, index) => ({
			section: 'Property Rankings',
			rank: index + 1,
			property: prop.property,
			occupancyRate: `${prop.occupancyRate.toFixed(1)}%`,
			totalUnits: prop.totalUnits,
			occupiedUnits: prop.occupiedUnits,
			monthlyRevenue: prop.monthlyRevenue,
			performance: prop.performance
		}))

		return [...summaryRows, ...rankingRows]
	}
}
