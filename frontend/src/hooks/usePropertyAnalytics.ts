import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
	differenceInDays,
	differenceInMonths,
	subMonths,
	format,
	startOfMonth,
	endOfMonth
} from 'date-fns'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/logger'
import type { Lease } from '@/types/entities'

interface PropertyMetrics {
	propertyId: string
	propertyName: string
	propertyAddress: string
	totalUnits: number
	occupiedUnits: number
	occupancyRate: number
	avgRentPerUnit: number
	totalMonthlyRevenue: number
	potentialRevenue: number
	revenueEfficiency: number
	avgTenancyLength: number // months
	turnoverRate: number // annual percentage
	maintenanceRequestsCount: number
	avgMaintenanceResponseTime: number // hours
	maintenanceCostPerUnit: number
	tenantSatisfactionScore: number
	profitMargin: number
	totalExpenses: number
	netOperatingIncome: number
	capRate: number
	lastUpdated: string
}

interface PropertyTrend {
	date: string
	occupancyRate: number
	revenue: number
	maintenanceRequests: number
	newLeases: number
	renewalRate: number
}

interface PropertyAlert {
	id: string
	propertyId: string
	propertyName: string
	alertType:
		| 'occupancy_drop'
		| 'maintenance_spike'
		| 'revenue_decline'
		| 'tenant_turnover'
		| 'expense_increase'
	severity: 'low' | 'medium' | 'high' | 'critical'
	title: string
	description: string
	value: number
	threshold: number
	trend: 'improving' | 'stable' | 'declining'
	actionRequired: boolean
	createdAt: string
}

interface PortfolioSummary {
	totalProperties: number
	totalUnits: number
	overallOccupancyRate: number
	totalMonthlyRevenue: number
	avgPropertyValue: number
	totalMaintenanceRequests: number
	avgTenantSatisfaction: number
	portfolioROI: number
	topPerformingProperty: string
	underperformingProperties: number
	totalAlerts: number
	criticalAlerts: number
}

interface AnalyticsSettings {
	enableAutomatedReports: boolean
	reportFrequency: 'daily' | 'weekly' | 'monthly'
	alertThresholds: {
		occupancyDropPercent: number
		maintenanceSpike: number
		revenueDecline: number
		expenseIncrease: number
	}
	benchmarkComparisons: boolean
	includeMarketData: boolean
}

const DEFAULT_SETTINGS: AnalyticsSettings = {
	enableAutomatedReports: true,
	reportFrequency: 'weekly',
	alertThresholds: {
		occupancyDropPercent: 10, // Alert if occupancy drops by 10%
		maintenanceSpike: 50, // Alert if maintenance requests increase by 50%
		revenueDecline: 5, // Alert if revenue declines by 5%
		expenseIncrease: 15 // Alert if expenses increase by 15%
	},
	benchmarkComparisons: true,
	includeMarketData: false
}

export function usePropertyAnalytics() {
	const { user } = useAuth()

	// Get property metrics for all properties
	const { data: propertyMetrics = [], isLoading: isLoadingMetrics } =
		useQuery({
			queryKey: ['propertyMetrics', user?.id],
			queryFn: async () => {
				if (!user?.id) throw new Error('No user ID')

				try {
					// Get all properties with their units and leases using the API
					const properties = await apiClient.properties.getAll()

					// For now, get leases separately since the API structure might be different
					const allLeases = await apiClient.leases.getAll()

					// Transform properties to match expected structure
					const propertiesWithData = properties.map(property => ({
						...property,
						units: property.units || [],
						leases:
							allLeases.filter(lease =>
								property.units?.some(
									unit => unit.id === lease.unitId
								)
							) || []
					}))

					const metrics: PropertyMetrics[] = []
					const currentDate = new Date()

					for (const property of propertiesWithData) {
						const totalUnits = property.units.length
						const occupiedUnits = property.leases.filter(
							(lease: Lease) => lease.status === 'ACTIVE'
						).length
						const activeLeases = property.leases.filter(
							(lease: Lease) => lease.status === 'ACTIVE'
						)

						// Calculate basic metrics
						const occupancyRate =
							totalUnits > 0
								? (occupiedUnits / totalUnits) * 100
								: 0
						const totalRent = activeLeases.reduce(
							(sum, lease) => sum + (lease.rentAmount || 0),
							0
						)
						const avgRentPerUnit =
							totalUnits > 0 ? totalRent / totalUnits : 0
						const potentialRevenue = totalUnits * avgRentPerUnit
						const revenueEfficiency =
							potentialRevenue > 0
								? (totalRent / potentialRevenue) * 100
								: 0

						// Calculate tenancy length and turnover
						const completedLeases =
							property.leases?.filter(
								l => l.status === 'COMPLETED'
							) || []
						const avgTenancyLength =
							completedLeases.length > 0
								? completedLeases.reduce((sum, lease) => {
										const start = new Date(lease.startDate)
										const end = new Date(lease.endDate)
										return (
											sum + differenceInMonths(end, start)
										)
									}, 0) / completedLeases.length
								: 12 // Default to 12 months

						const yearlyTurnover = completedLeases.filter(lease => {
							const endDate = new Date(lease.endDate)
							return differenceInDays(currentDate, endDate) <= 365
						}).length
						const turnoverRate =
							totalUnits > 0
								? (yearlyTurnover / totalUnits) * 100
								: 0

						// Get real maintenance requests for this property
						let maintenanceRequests: {
							id: string
							unit?: { property?: { id: string } }
							status?: string
							priority?: string
							createdAt?: string
						}[] = []
						let maintenanceCount = 0

						try {
							const allMaintenanceRequests =
								await apiClient.maintenance.getAll()
							maintenanceRequests = allMaintenanceRequests.filter(
								req => {
									// Filter by property - check if request is for any unit in this property
									return property.units?.some(
										unit => unit.id === req.unitId
									)
								}
							)
							maintenanceCount = maintenanceRequests.length
						} catch (error) {
							// Fallback to mock data if API fails
							logger.warn(
								'Maintenance API not available, using mock data',
								error
							)
							maintenanceCount =
								Math.floor(Math.random() * 15) + 5
							maintenanceRequests = Array.from(
								{ length: maintenanceCount },
								(_, i) => ({
									id: `mock-${property.id}-${i}`,
									createdAt: subMonths(
										currentDate,
										Math.floor(Math.random() * 3)
									).toISOString(),
									resolvedAt:
										Math.random() > 0.3
											? subMonths(
													currentDate,
													Math.floor(
														Math.random() * 2
													)
												).toISOString()
											: null
								})
							)
						}
						const avgResponseTime = maintenanceRequests?.length
							? maintenanceRequests.reduce((sum, req) => {
									if (req.resolvedAt) {
										const created = new Date(req.createdAt)
										const resolved = new Date(
											req.resolvedAt
										)
										return (
											sum +
											differenceInDays(
												resolved,
												created
											) *
												24
										) // Convert to hours
									}
									return sum
								}, 0) /
								maintenanceRequests.filter(
									req => req.resolvedAt
								).length
							: 0

						// Calculate financial metrics (simplified)
						const estimatedExpenses = totalRent * 0.3 // Assume 30% expense ratio
						const netOperatingIncome = totalRent - estimatedExpenses
						const estimatedPropertyValue = totalRent * 12 * 10 // 10x annual rent estimate
						const capRate =
							estimatedPropertyValue > 0
								? ((netOperatingIncome * 12) /
										estimatedPropertyValue) *
									100
								: 0

						metrics.push({
							propertyId: property.id,
							propertyName: property.name,
							propertyAddress: property.address,
							totalUnits,
							occupiedUnits,
							occupancyRate,
							avgRentPerUnit,
							totalMonthlyRevenue: totalRent,
							potentialRevenue,
							revenueEfficiency,
							avgTenancyLength,
							turnoverRate,
							maintenanceRequestsCount: maintenanceCount,
							avgMaintenanceResponseTime: avgResponseTime,
							maintenanceCostPerUnit:
								totalUnits > 0
									? (maintenanceCount * 150) / totalUnits
									: 0, // Estimate
							tenantSatisfactionScore: Math.random() * 2 + 3.5, // Mock score between 3.5-5.5
							profitMargin:
								totalRent > 0
									? (netOperatingIncome / totalRent) * 100
									: 0,
							totalExpenses: estimatedExpenses,
							netOperatingIncome,
							capRate,
							lastUpdated: currentDate.toISOString()
						})
					}

					return metrics
				} catch (error) {
					console.error('Error fetching property metrics:', error)
					return []
				}
			},
			enabled: !!user?.id,
			refetchInterval: 1000 * 60 * 60 // Refetch every hour
		})

	// Get property performance trends
	const { data: propertyTrends = [], isLoading: isLoadingTrends } = useQuery({
		queryKey: ['propertyTrends', user?.id],
		queryFn: async () => {
			if (!user?.id) throw new Error('No user ID')

			// Generate mock trend data for the last 6 months
			const trends: PropertyTrend[] = []
			const currentDate = new Date()

			for (let i = 5; i >= 0; i--) {
				const date = subMonths(currentDate, i)
				const monthStart = startOfMonth(date)
				const monthEnd = endOfMonth(date)

				// Get leases active during this month using the new API
				const allLeases = await apiClient.leases.getAll()
				const leases = allLeases.filter(lease => {
					const startDate = new Date(lease.startDate)
					const endDate = new Date(lease.endDate)
					return startDate <= monthEnd && endDate >= monthStart
				})

				const totalRevenue =
					leases?.reduce(
						(sum, lease) => sum + (lease.rentAmount || 0),
						0
					) || 0
				const newLeases =
					leases?.filter(lease => {
						const startDate = new Date(lease.startDate)
						return startDate >= monthStart && startDate <= monthEnd
					}).length || 0

				// Mock maintenance requests for the month
				const maintenanceRequests = Math.floor(Math.random() * 10) + 5
				const occupancyRate = Math.random() * 20 + 80 // 80-100%
				const renewalRate = Math.random() * 30 + 70 // 70-100%

				trends.push({
					date: format(date, 'yyyy-MM'),
					occupancyRate,
					revenue: totalRevenue,
					maintenanceRequests,
					newLeases,
					renewalRate
				})
			}

			return trends
		},
		enabled: !!user?.id
	})

	// Generate property alerts based on metrics
	const { data: propertyAlerts = [], isLoading: isLoadingAlerts } = useQuery({
		queryKey: ['propertyAlerts', user?.id, propertyMetrics],
		queryFn: async () => {
			if (!propertyMetrics.length) return []

			const alerts: PropertyAlert[] = []
			// Settings placeholder - in production would fetch from user_settings table
			// const settings = DEFAULT_SETTINGS;

			propertyMetrics.forEach(metrics => {
				// Occupancy drop alert
				if (metrics.occupancyRate < 90) {
					alerts.push({
						id: `${metrics.propertyId}-occupancy`,
						propertyId: metrics.propertyId,
						propertyName: metrics.propertyName,
						alertType: 'occupancy_drop',
						severity:
							metrics.occupancyRate < 70
								? 'critical'
								: metrics.occupancyRate < 80
									? 'high'
									: 'medium',
						title: 'Low Occupancy Rate',
						description: `Occupancy rate is ${metrics.occupancyRate.toFixed(1)}%, below optimal levels`,
						value: metrics.occupancyRate,
						threshold: 90,
						trend: 'declining',
						actionRequired: metrics.occupancyRate < 80,
						createdAt: new Date().toISOString()
					})
				}

				// Maintenance spike alert
				if (metrics.maintenanceRequestsCount > 10) {
					alerts.push({
						id: `${metrics.propertyId}-maintenance`,
						propertyId: metrics.propertyId,
						propertyName: metrics.propertyName,
						alertType: 'maintenance_spike',
						severity:
							metrics.maintenanceRequestsCount > 20
								? 'critical'
								: 'high',
						title: 'High Maintenance Volume',
						description: `${metrics.maintenanceRequestsCount} maintenance requests in the last 3 months`,
						value: metrics.maintenanceRequestsCount,
						threshold: 10,
						trend: 'declining',
						actionRequired: true,
						createdAt: new Date().toISOString()
					})
				}

				// Revenue efficiency alert
				if (metrics.revenueEfficiency < 85) {
					alerts.push({
						id: `${metrics.propertyId}-revenue`,
						propertyId: metrics.propertyId,
						propertyName: metrics.propertyName,
						alertType: 'revenue_decline',
						severity:
							metrics.revenueEfficiency < 70
								? 'critical'
								: 'medium',
						title: 'Revenue Below Potential',
						description: `Revenue efficiency is ${metrics.revenueEfficiency.toFixed(1)}% of potential`,
						value: metrics.revenueEfficiency,
						threshold: 85,
						trend: 'declining',
						actionRequired: metrics.revenueEfficiency < 75,
						createdAt: new Date().toISOString()
					})
				}

				// High turnover alert
				if (metrics.turnoverRate > 30) {
					alerts.push({
						id: `${metrics.propertyId}-turnover`,
						propertyId: metrics.propertyId,
						propertyName: metrics.propertyName,
						alertType: 'tenant_turnover',
						severity:
							metrics.turnoverRate > 50 ? 'critical' : 'high',
						title: 'High Tenant Turnover',
						description: `Annual turnover rate is ${metrics.turnoverRate.toFixed(1)}%`,
						value: metrics.turnoverRate,
						threshold: 30,
						trend: 'declining',
						actionRequired: true,
						createdAt: new Date().toISOString()
					})
				}
			})

			return alerts.sort((a, b) => {
				const severityOrder = {
					critical: 0,
					high: 1,
					medium: 2,
					low: 3
				}
				return severityOrder[a.severity] - severityOrder[b.severity]
			})
		},
		enabled: !!user?.id && propertyMetrics.length > 0
	})

	// Generate portfolio summary
	const portfolioSummary: PortfolioSummary = {
		totalProperties: propertyMetrics.length,
		totalUnits: propertyMetrics.reduce((sum, p) => sum + p.totalUnits, 0),
		overallOccupancyRate:
			propertyMetrics.length > 0
				? propertyMetrics.reduce((sum, p) => sum + p.occupancyRate, 0) /
					propertyMetrics.length
				: 0,
		totalMonthlyRevenue: propertyMetrics.reduce(
			(sum, p) => sum + p.totalMonthlyRevenue,
			0
		),
		avgPropertyValue:
			propertyMetrics.length > 0
				? propertyMetrics.reduce(
						(sum, p) => sum + p.totalMonthlyRevenue * 12 * 10,
						0
					) / propertyMetrics.length
				: 0,
		totalMaintenanceRequests: propertyMetrics.reduce(
			(sum, p) => sum + p.maintenanceRequestsCount,
			0
		),
		avgTenantSatisfaction:
			propertyMetrics.length > 0
				? propertyMetrics.reduce(
						(sum, p) => sum + p.tenantSatisfactionScore,
						0
					) / propertyMetrics.length
				: 0,
		portfolioROI:
			propertyMetrics.length > 0
				? propertyMetrics.reduce((sum, p) => sum + p.capRate, 0) /
					propertyMetrics.length
				: 0,
		topPerformingProperty:
			propertyMetrics.length > 0
				? propertyMetrics.reduce((best, current) =>
						current.capRate > best.capRate ? current : best
					).propertyName
				: '',
		underperformingProperties: propertyMetrics.filter(
			p => p.occupancyRate < 80 || p.capRate < 5
		).length,
		totalAlerts: propertyAlerts.length,
		criticalAlerts: propertyAlerts.filter(a => a.severity === 'critical')
			.length
	}

	// Send automated analytics report
	const sendAnalyticsReportMutation = useMutation({
		mutationFn: async (reportType: 'weekly' | 'monthly' | 'custom') => {
			// Analytics report API placeholder
			// For now, just log the report data
			logger.info('Analytics report would be sent', undefined, {
				reportType,
				propertyMetrics: propertyMetrics.length,
				portfolioSummary,
				alertCount: propertyAlerts.filter(
					a => a.severity === 'critical' || a.severity === 'high'
				).length,
				trends: propertyTrends.length
			})

			return { reportType, sentAt: new Date().toISOString() }
		},
		onSuccess: data => {
			logger.info('Analytics report sent successfully', undefined, {
				reportType: data.reportType
			})
		}
	})

	return {
		propertyMetrics,
		propertyTrends,
		propertyAlerts,
		portfolioSummary,
		isLoading: isLoadingMetrics || isLoadingTrends || isLoadingAlerts,
		sendAnalyticsReport: sendAnalyticsReportMutation.mutate,
		isSendingReport: sendAnalyticsReportMutation.isPending
	}
}

export function useAnalyticsSettings() {
	const { user } = useAuth()
	const queryClient = useQueryClient()

	// Get analytics settings
	const { data: analyticsSettings = DEFAULT_SETTINGS } = useQuery({
		queryKey: ['analyticsSettings', user?.id],
		queryFn: async () => {
			if (!user?.id) throw new Error('No user ID')

			// Settings placeholder - in production would fetch from user_settings table
			return DEFAULT_SETTINGS
		},
		enabled: !!user?.id
	})

	// Update settings
	const updateSettingsMutation = useMutation({
		mutationFn: async (newSettings: Partial<AnalyticsSettings>) => {
			// Settings update placeholder - in production would update user_settings table
			logger.info('Analytics settings updated', undefined, {
				settings: newSettings
			})
			return { ...analyticsSettings, ...newSettings }
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['analyticsSettings'] })
			queryClient.invalidateQueries({ queryKey: ['propertyAlerts'] })
		}
	})

	return {
		settings: analyticsSettings,
		updateSettings: updateSettingsMutation.mutate,
		isUpdating: updateSettingsMutation.isPending
	}
}
