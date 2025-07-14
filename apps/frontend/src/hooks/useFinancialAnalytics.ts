import { useQuery } from '@tanstack/react-query'
import { subMonths, format, differenceInDays } from 'date-fns'
import { trpc } from '@/lib/trpcClient'
import { useAuth } from '@/hooks/useAuth'
import type {
	Unit,
	Lease,
	PaymentWithDetails,
	PropertyWithDetails,
	Expense
} from '@/types/entities'

// Analytics interfaces
interface CashFlowProjection {
	month: string
	projectedIncome: number
	projectedExpenses: number
	netCashFlow: number
	cumulativeCashFlow: number
	confidence: 'high' | 'medium' | 'low'
	assumptions: string[]
}

interface RevenueStream {
	source: string
	amount: number
	percentage: number
	trend: 'growing' | 'stable' | 'declining'
	monthOverMonth: number
	yearOverYear: number
}

interface ExpenseCategory {
	category: string
	amount: number
	percentage: number
	trend: 'increasing' | 'stable' | 'decreasing'
	avgMonthly: number
	projectedAnnual: number
}

interface FinancialKPI {
	name: string
	value: number | string
	target: number | string
	status: 'on-track' | 'at-risk' | 'off-track'
	trend: 'improving' | 'stable' | 'declining'
	description: string
}

interface PropertyComparison {
	propertyId: string
	propertyName: string
	revenue: number
	expenses: number
	netIncome: number
	roi: number
	occupancyRate: number
	avgRentPerUnit: number
	maintenanceCostRatio: number
	performanceScore: number
}

interface FinancialInsight {
	id: string
	type: 'opportunity' | 'risk' | 'trend' | 'anomaly'
	severity: 'info' | 'warning' | 'critical'
	title: string
	description: string
	impact: string
	recommendation: string
	value?: number
	relatedProperties?: string[]
	createdAt: string
}

// Use existing detailed types from entities
type PaymentWithRelations = PaymentWithDetails
type PropertyWithUnits = PropertyWithDetails

export function useFinancialAnalytics(propertyId?: string) {
	const { user } = useAuth()

	// Fetch real payment data from database
	const { data: paymentData = [], isLoading: isLoadingPayments } = useQuery({
		queryKey: ['financial-payments', user?.id, propertyId],
		queryFn: async (): Promise<PaymentWithRelations[]> => {
			if (!user?.id) throw new Error('No user token')

			// Use tRPC to fetch payments with relations
			const payments = await trpc.payments.list.query({
				propertyId,
				includeRelations: true
			})

			return payments as PaymentWithRelations[]
		},
		enabled: !!user?.id
	})

	// Fetch real expense data from database
	const { data: expenseData = [], isLoading: isLoadingExpenses } = useQuery({
		queryKey: ['financial-expenses', user?.id, propertyId],
		queryFn: async (): Promise<Expense[]> => {
			if (!user?.id) throw new Error('No user token')

			// Use tRPC to fetch expenses
			const expenses = await trpc.expenses.list.query({
				propertyId
			})

			return expenses as Expense[]
		},
		enabled: !!user?.id
	})

	// Fetch property data with units and leases
	const { data: propertyData = [], isLoading: isLoadingProperties } = useQuery({
		queryKey: ['financial-properties', user?.id, propertyId],
		queryFn: async (): Promise<PropertyWithUnits[]> => {
			if (!user?.id) throw new Error('No user token')

			// Use tRPC to fetch properties with relations
			const properties = await trpc.properties.list.query({
				propertyId,
				includeUnits: true,
				includeLeases: true
			})

			return properties as PropertyWithUnits[]
		},
		enabled: !!user?.id
	})

// Calculate historical trends from payment data
const calculateHistoricalTrends = (payments: PaymentWithRelations[], monthsBack = 12) => {
		const monthlyData: Record<string, { amount: number; count: number; types: Record<string, number> }> = {}
		const currentDate = new Date()

		// Initialize monthly buckets
		for (let i = 0; i < monthsBack; i++) {
			const month = format(subMonths(currentDate, i), 'yyyy-MM')
			monthlyData[month] = { amount: 0, count: 0, types: {} }
		}

		// Aggregate payment data by month
		payments.forEach(payment => {
			const paymentMonth = format(new Date(payment.date), 'yyyy-MM')
			if (monthlyData[paymentMonth]) {
				monthlyData[paymentMonth].amount += payment.amount
				monthlyData[paymentMonth].count += 1
				
				const type = payment.type || 'RENT'
				monthlyData[paymentMonth].types[type] = (monthlyData[paymentMonth].types[type] || 0) + payment.amount
			}
		})

		return monthlyData
	}

	// Generate cash flow projections based on real data
	const { data: cashFlowProjections = [] } = useQuery({
		queryKey: ['cashFlowProjections', user?.id, propertyId, paymentData, expenseData],
		queryFn: async (): Promise<CashFlowProjection[]> => {
			if (!user?.id || !paymentData.length) return []

			const projections: CashFlowProjection[] = []
			const currentDate = new Date()
			let cumulativeCashFlow = 0

			// Calculate historical averages
			const historicalData = calculateHistoricalTrends(paymentData)
			const monthlyAmounts = Object.values(historicalData).map(d => d.amount).filter(a => a > 0)
			const avgMonthlyIncome = monthlyAmounts.length > 0 
				? monthlyAmounts.reduce((sum, amount) => sum + amount, 0) / monthlyAmounts.length 
				: 0

			// Calculate growth rate from historical data
			const recentMonths = Object.entries(historicalData)
				.sort(([a], [b]) => b.localeCompare(a))
				.slice(0, 6)
				.map(([, data]) => data.amount)
				.filter(amount => amount > 0)

const growthRate = recentMonths.length >= 3 
? (recentMonths[0] - recentMonths[recentMonths.length - 1]) / (recentMonths[recentMonths.length - 1] * recentMonths.length) 
: 0.02 // Default 2% monthly growth

			// Calculate average expense ratio from real data
			const totalRevenue = paymentData.reduce((sum: number, p: PaymentWithRelations) => sum + p.amount, 0)
			const totalExpenses = expenseData.reduce((sum: number, e: Expense) => sum + e.amount, 0)
			const expenseRatio = totalRevenue > 0 ? totalExpenses / totalRevenue : 0.35

			// Project for next 12 months
			for (let i = 0; i < 12; i++) {
				const projectionDate = subMonths(currentDate, -i)
				const monthStr = format(projectionDate, 'yyyy-MM')

				// Project income based on historical average and growth trend
				const projectedIncome = avgMonthlyIncome * Math.pow(1 + growthRate, i)
				
				// Project expenses based on historical expense ratio
				const projectedExpenses = projectedIncome * expenseRatio

				const netCashFlow = projectedIncome - projectedExpenses
				cumulativeCashFlow += netCashFlow

				// Determine confidence based on data quality and projection distance
				let confidence: CashFlowProjection['confidence'] = 'high'
				if (i > 6 || monthlyAmounts.length < 6) confidence = 'low'
				else if (i > 3 || monthlyAmounts.length < 12) confidence = 'medium'

				projections.push({
					month: monthStr,
					projectedIncome,
					projectedExpenses,
					netCashFlow,
					cumulativeCashFlow,
					confidence,
					assumptions: [
						`${(growthRate * 100).toFixed(1)}% monthly growth rate (based on ${recentMonths.length} months of data)`,
						`${(expenseRatio * 100).toFixed(1)}% expense ratio (based on ${expenseData.length} historical expenses)`,
						monthlyAmounts.length >= 12 ? 'Full year of historical data' : `Limited data: ${monthlyAmounts.length} months`,
						'Assumes current market conditions continue'
					]
				})
			}

			return projections
		},
		enabled: !!user?.id && paymentData.length > 0
	})

	// Analyze revenue streams from real payment data
	const { data: revenueStreams = [] } = useQuery({
		queryKey: ['revenueStreams', user?.id, propertyId, paymentData],
		queryFn: async (): Promise<RevenueStream[]> => {
			if (!paymentData.length) return []

			const totalRevenue = paymentData.reduce((sum: number, p: PaymentWithRelations) => sum + p.amount, 0)
			const streams: RevenueStream[] = []
			const historicalData = calculateHistoricalTrends(paymentData)

			// Group payments by type
			const paymentsByType = paymentData.reduce((acc, payment) => {
				const type = payment.type || 'RENT'
				if (!acc[type]) acc[type] = []
				acc[type].push(payment)
				return acc
			}, {} as Record<string, PaymentWithRelations[]>)

			Object.entries(paymentsByType).forEach(([type, payments]) => {
				const typedPayments = payments as PaymentWithRelations[]
				const amount = typedPayments.reduce((sum: number, p: PaymentWithRelations) => sum + p.amount, 0)
				const percentage = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0

				// Calculate real month-over-month and year-over-year trends
				const currentMonth = format(new Date(), 'yyyy-MM')
				const lastMonth = format(subMonths(new Date(), 1), 'yyyy-MM')
				const lastYear = format(subMonths(new Date(), 12), 'yyyy-MM')

				const currentMonthAmount = historicalData[currentMonth]?.types[type] || 0
				const lastMonthAmount = historicalData[lastMonth]?.types[type] || 0
				const lastYearAmount = historicalData[lastYear]?.types[type] || 0

				const monthOverMonth = lastMonthAmount > 0 
					? ((currentMonthAmount - lastMonthAmount) / lastMonthAmount) * 100 
					: 0
				const yearOverYear = lastYearAmount > 0 
					? ((currentMonthAmount - lastYearAmount) / lastYearAmount) * 100 
					: 0

				streams.push({
					source: type
						.replace('_', ' ')
						.toLowerCase()
						.replace(/\b\w/g, l => l.toUpperCase()),
					amount,
					percentage,
					trend: monthOverMonth > 5 ? 'growing' : monthOverMonth < -5 ? 'declining' : 'stable',
					monthOverMonth,
					yearOverYear
				})
			})

			return streams.sort((a, b) => b.amount - a.amount)
		},
		enabled: !!user?.id && paymentData.length > 0
	})

	// Calculate expense categories from real expense data
	const { data: expenseCategories = [] } = useQuery({
		queryKey: ['expenseCategories', user?.id, propertyId, expenseData, paymentData],
		queryFn: async (): Promise<ExpenseCategory[]> => {
			if (!expenseData.length) return []

			const categories: ExpenseCategory[] = []
			const totalRevenue = paymentData.reduce((sum: number, p: PaymentWithRelations) => sum + p.amount, 0)

			// Group expenses by category
			const expensesByCategory = expenseData.reduce((acc, expense) => {
				const category = expense.category || 'Other'
				if (!acc[category]) acc[category] = []
				acc[category].push(expense)
				return acc
			}, {} as Record<string, Expense[]>)

			Object.entries(expensesByCategory).forEach(([category, expenses]) => {
				const typedExpenses = expenses as Expense[]
				const totalAmount = typedExpenses.reduce((sum: number, e: Expense) => sum + e.amount, 0)
				const oldestDate = Math.min(...typedExpenses.map(e => new Date(e.date).getTime()))
				const daysSinceOldest = differenceInDays(new Date(), new Date(oldestDate))
				const avgMonthly = totalAmount / Math.max(1, daysSinceOldest / 30)
				const percentage = totalRevenue > 0 ? (totalAmount / totalRevenue) * 100 : 0

				// Calculate trend based on recent vs older expenses
				const midpointTime = Date.now() - (daysSinceOldest / 2) * 24 * 60 * 60 * 1000
				const midpoint = new Date(midpointTime)
				const recentExpenses = typedExpenses.filter((e: Expense) => new Date(e.date) >= midpoint)
				const olderExpenses = typedExpenses.filter((e: Expense) => new Date(e.date) < midpoint)

				const recentAvg = recentExpenses.length > 0 ? recentExpenses.reduce((sum: number, e: Expense) => sum + e.amount, 0) / recentExpenses.length : 0
				const olderAvg = olderExpenses.length > 0 ? olderExpenses.reduce((sum: number, e: Expense) => sum + e.amount, 0) / olderExpenses.length : 0

				let trend: ExpenseCategory['trend'] = 'stable'
				if (recentAvg > olderAvg * 1.1) trend = 'increasing'
				else if (recentAvg < olderAvg * 0.9) trend = 'decreasing'

				categories.push({
					category,
					amount: avgMonthly,
					percentage,
					trend,
					avgMonthly,
					projectedAnnual: avgMonthly * 12
				})
			})

			return categories.sort((a, b) => b.amount - a.amount)
		},
		enabled: !!user?.id && expenseData.length > 0
	})

	// Calculate financial KPIs from real data
	const { data: financialKPIs = [] } = useQuery({
		queryKey: ['financialKPIs', user?.id, propertyId, paymentData, expenseData, propertyData],
		queryFn: async (): Promise<FinancialKPI[]> => {
			if (!propertyData.length) return []

			const totalRevenue = paymentData.reduce((sum: number, p: PaymentWithRelations) => sum + p.amount, 0)
			const totalExpenses = expenseData.reduce((sum: number, e: Expense) => sum + e.amount, 0)
			const monthlyRevenue = totalRevenue / 12 // Annualized
			const monthlyExpenses = totalExpenses / 12
			
			// Calculate occupancy metrics
			const totalUnits = propertyData.reduce((sum, p) => sum + (p.units?.length || 0), 0)
			const occupiedUnits = propertyData.reduce((sum, p) => {
				return sum + (p.units?.filter((u: Unit) => 
					u.leases?.some((l: Lease) => l.status === 'ACTIVE')
				).length || 0)
			}, 0)
			const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0

			// Estimate property values (simplified calculation)
			const estimatedPortfolioValue = monthlyRevenue * 12 * 10 // 10x annual revenue
			const grossRentalYield = estimatedPortfolioValue > 0 ? (monthlyRevenue * 12 / estimatedPortfolioValue) * 100 : 0
			const operatingExpenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0
			const netOperatingIncome = monthlyRevenue - monthlyExpenses
			const cashOnCashReturn = grossRentalYield * 1.2 // Simplified calculation

			const kpis: FinancialKPI[] = [
				{
					name: 'Gross Rental Yield',
					value: `${grossRentalYield.toFixed(2)}%`,
					target: '8%',
					status: grossRentalYield > 8 ? 'on-track' : grossRentalYield > 6 ? 'at-risk' : 'off-track',
					trend: 'stable',
					description: 'Annual rental income as percentage of property value'
				},
				{
					name: 'Operating Expense Ratio',
					value: `${operatingExpenseRatio.toFixed(1)}%`,
					target: '30-40%',
					status: operatingExpenseRatio <= 40 && operatingExpenseRatio >= 30 ? 'on-track' : 'at-risk',
					trend: expenseCategories.some(c => c.trend === 'increasing') ? 'declining' : 'stable',
					description: 'Operating expenses as percentage of gross income'
				},
				{
					name: 'Net Operating Income',
					value: `$${netOperatingIncome.toFixed(0)}`,
					target: `$${(monthlyRevenue * 0.7).toFixed(0)}`,
					status: netOperatingIncome > monthlyRevenue * 0.7 ? 'on-track' : 'at-risk',
					trend: netOperatingIncome > 0 ? 'improving' : 'declining',
					description: 'Monthly revenue minus operating expenses'
				},
				{
					name: 'Cash-on-Cash Return',
					value: `${cashOnCashReturn.toFixed(2)}%`,
					target: '10%',
					status: cashOnCashReturn > 10 ? 'on-track' : cashOnCashReturn > 6 ? 'at-risk' : 'off-track',
					trend: 'improving',
					description: 'Annual pre-tax cash flow relative to cash invested'
				},
				{
					name: 'Vacancy Rate',
					value: `${(100 - occupancyRate).toFixed(1)}%`,
					target: '<5%',
					status: occupancyRate > 95 ? 'on-track' : occupancyRate > 90 ? 'at-risk' : 'off-track',
					trend: occupancyRate > 90 ? 'improving' : 'declining',
					description: 'Percentage of units currently vacant'
				}
			]

			return kpis
		},
		enabled: !!user?.id && propertyData.length > 0
	})

	// Generate property performance comparisons
	const { data: propertyComparisons = [] } = useQuery({
		queryKey: ['propertyComparisons', user?.id, paymentData, expenseData, propertyData],
		queryFn: async (): Promise<PropertyComparison[]> => {
			if (!propertyData.length) return []

			return propertyData.map(property => {
				// Get payments for this property
				const propertyPayments = paymentData.filter(p => 
					p.lease?.unit?.property?.id === property.id
				)
				const propertyExpenses = expenseData.filter(e => e.propertyId === property.id)

				const revenue = propertyPayments.reduce((sum: number, p: PaymentWithRelations) => sum + p.amount, 0) / 12 // Monthly
				const expenses = propertyExpenses.reduce((sum: number, e: Expense) => sum + e.amount, 0) / 12 // Monthly
				const netIncome = revenue - expenses

				const totalUnits = property.units?.length || 0
				const occupiedUnits = property.units?.filter((u: Unit) => 
					u.leases?.some((l: Lease) => l.status === 'ACTIVE')
				).length || 0
				const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0

				const avgRentPerUnit = occupiedUnits > 0 ? revenue / occupiedUnits : 0
				const maintenanceExpenses = propertyExpenses.filter(e => 
					e.category?.toLowerCase().includes('maintenance')
				).reduce((sum: number, e: Expense) => sum + e.amount, 0)
				const maintenanceCostRatio = revenue > 0 ? maintenanceExpenses / revenue : 0

				// Estimate ROI (simplified)
				const estimatedValue = revenue * 12 * 10
				const roi = estimatedValue > 0 ? (netIncome * 12 / estimatedValue) * 100 : 0

				// Calculate performance score
				const performanceScore = Math.min(100, Math.max(0,
					(occupancyRate / 100) * 30 + // 30% weight for occupancy
					Math.min(roi / 10, 1) * 25 + // 25% weight for ROI (capped at 10%)
					(revenue > 0 ? 1 : 0) * 25 + // 25% weight for having revenue
					(1 - Math.min(maintenanceCostRatio, 0.2) / 0.2) * 20 // 20% weight for low maintenance costs
				))

				return {
					propertyId: property.id,
					propertyName: property.name,
					revenue,
					expenses,
					netIncome,
					roi,
					occupancyRate,
					avgRentPerUnit,
					maintenanceCostRatio,
					performanceScore
				}
			}).sort((a, b) => b.performanceScore - a.performanceScore)
		},
		enabled: !!user?.id && propertyData.length > 0
	})

	// Generate financial insights based on real data patterns
	const { data: financialInsights = [] } = useQuery({
		queryKey: ['financialInsights', user?.id, propertyComparisons, expenseCategories, revenueStreams],
		queryFn: async (): Promise<FinancialInsight[]> => {
			const insights: FinancialInsight[] = []

			// Analyze underperforming properties
			propertyComparisons.forEach(property => {
				if (property.performanceScore < 60) {
					insights.push({
						id: `underperforming-${property.propertyId}`,
						type: 'risk',
						severity: property.performanceScore < 40 ? 'critical' : 'warning',
						title: `${property.propertyName} is underperforming`,
						description: `Performance score of ${property.performanceScore.toFixed(0)}/100 based on real occupancy, revenue, and maintenance data`,
						impact: `Potential monthly revenue loss of $${(property.avgRentPerUnit * 0.1).toFixed(0)}`,
						recommendation: property.occupancyRate < 80 
							? 'Focus on reducing vacancy through competitive pricing or property improvements'
							: 'Review operating expenses and maintenance efficiency',
						value: property.revenue,
						relatedProperties: [property.propertyId],
						createdAt: new Date().toISOString()
					})
				}
			})

			// Analyze high-performing properties for opportunities
			const topPerformers = propertyComparisons.filter(p => p.performanceScore > 85)
			if (topPerformers.length > 0) {
				const avgOccupancy = topPerformers.reduce((sum, p) => sum + p.occupancyRate, 0) / topPerformers.length
				if (avgOccupancy > 95) {
					insights.push({
						id: 'high-occupancy-opportunity',
						type: 'opportunity',
						severity: 'info',
						title: 'High-performing properties show rent increase potential',
						description: `${topPerformers.length} properties have >95% occupancy and strong performance scores`,
						impact: `Potential 3-5% rent increase could generate $${(topPerformers.reduce((sum, p) => sum + p.revenue, 0) * 0.04).toFixed(0)} additional monthly revenue`,
						recommendation: 'Review market rates and consider strategic rent increases at lease renewals for top-performing properties',
						createdAt: new Date().toISOString()
					})
				}
			}

			// Analyze expense trends
			const increasingExpenses = expenseCategories.filter(c => c.trend === 'increasing' && c.percentage > 10)
			increasingExpenses.forEach(category => {
				insights.push({
					id: `expense-trend-${category.category.toLowerCase().replace(/\s+/g, '-')}`,
					type: 'anomaly',
					severity: category.percentage > 20 ? 'critical' : 'warning',
					title: `Rising ${category.category} expenses detected`,
					description: `${category.category} costs are ${category.percentage.toFixed(1)}% of revenue and trending upward based on recent expense data`,
					impact: `Current monthly cost: $${category.avgMonthly.toFixed(0)}, projected annual: $${category.projectedAnnual.toFixed(0)}`,
					recommendation: `Review ${category.category.toLowerCase()} contracts and explore cost reduction opportunities`,
					value: category.projectedAnnual,
					createdAt: new Date().toISOString()
				})
			})

			// Analyze revenue concentration risk
			const dominantStream = revenueStreams.find(s => s.percentage > 80)
			if (dominantStream) {
				insights.push({
					id: 'revenue-concentration-risk',
					type: 'risk',
					severity: 'warning',
					title: 'High revenue concentration risk',
					description: `${dominantStream.percentage.toFixed(1)}% of revenue comes from ${dominantStream.source}`,
					impact: 'Heavy dependence on single revenue source increases portfolio risk',
					recommendation: 'Consider diversifying revenue streams through additional services or property types',
					value: dominantStream.amount,
					createdAt: new Date().toISOString()
				})
			}

			return insights.sort((a, b) => {
				const severityOrder = { critical: 0, warning: 1, info: 2 }
				return severityOrder[a.severity] - severityOrder[b.severity]
			})
		},
		enabled: !!user?.id && propertyComparisons.length > 0
	})

	return {
		cashFlowProjections,
		revenueStreams,
		expenseCategories,
		financialKPIs,
		propertyComparisons,
		financialInsights,
		isLoading: isLoadingPayments || isLoadingExpenses || isLoadingProperties,
		hasData: paymentData.length > 0 || expenseData.length > 0,
		error: null // Add error handling if needed
	}
}
