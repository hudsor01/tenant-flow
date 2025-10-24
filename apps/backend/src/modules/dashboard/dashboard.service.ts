import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common'
import type {
	DashboardStats,
	PropertyPerformance,
	SystemUptime
} from '@repo/shared/types/core'
import {
	EMPTY_DASHBOARD_STATS,
	EMPTY_MAINTENANCE_ANALYTICS,
	EMPTY_SYSTEM_UPTIME
} from '@repo/shared/constants/empty-states'
import { SupabaseService } from '../../database/supabase.service'
import { DashboardAnalyticsService } from '../analytics/dashboard-analytics.service'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import type { Cache } from 'cache-manager'

@Injectable()
export class DashboardService {
	private readonly logger = new Logger(DashboardService.name)

	constructor(
		private readonly supabase: SupabaseService,
		private readonly dashboardAnalyticsService: DashboardAnalyticsService,
		@Inject(CACHE_MANAGER) private readonly cacheManager: Cache
	) {}

	/**
	 * Map Supabase Auth ID to internal users.id with caching
	 * This is required because JWT contains Supabase Auth ID but RLS policies use internal users.id
	 */
	private async getUserIdFromSupabaseId(supabaseId: string): Promise<string> {
		const cacheKey = `user:supabaseId:${supabaseId}`
		const cached = await this.cacheManager.get<string>(cacheKey)
		if (cached) return cached

		const { data, error } = await this.supabase
			.getAdminClient()
			.from('users')
			.select('id')
			.eq('supabaseId', supabaseId)
			.single()

		if (error || !data) {
			this.logger.error('Failed to lookup user ID', { error, supabaseId })
			throw new BadRequestException('User not found')
		}

		await this.cacheManager.set(cacheKey, data.id, 300000) // 5 min cache
		return data.id
	}

	/**
	 * Get comprehensive dashboard statistics
	 * Uses repository pattern for clean separation of concerns
	 */
	async getStats(userId?: string): Promise<DashboardStats> {
		if (!userId) {
			this.logger.warn('Dashboard stats requested without userId')
			return { ...EMPTY_DASHBOARD_STATS }
		}

		try {
			// Map Supabase Auth ID to internal users.id for RLS policies
			const internalUserId = await this.getUserIdFromSupabaseId(userId)
			const client = this.supabase.getAdminClient()

			const now = new Date()
			const startOfCurrentMonth = new Date(
				Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
			)
			const startOfNextMonth = new Date(
				Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
			)
			const startOfPreviousMonth = new Date(
				Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)
			)
			const endOfPreviousMonth = new Date(startOfCurrentMonth.getTime() - 1)
			const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
			const paymentQueryStart = (
				startOfPreviousMonth < startOfYear ? startOfPreviousMonth : startOfYear
			)

			const [propertyResult, tenantResult, paymentResult] = await Promise.all([
				client.from('property').select('id, status').eq('ownerId', internalUserId),
				client.from('tenant').select('status, createdAt').eq('landlordId', internalUserId),
				client
					.from('rent_payment')
					.select('landlordReceives, amount, paidAt, createdAt, status')
					.eq('landlordId', internalUserId)
					.gte('createdAt', paymentQueryStart.toISOString())
			])

			if (propertyResult.error) {
				this.logger.error('Failed to fetch properties for dashboard stats', {
					error: propertyResult.error.message,
					userId
				})
			}

			if (tenantResult.error) {
				this.logger.error('Failed to fetch tenants for dashboard stats', {
					error: tenantResult.error.message,
					userId
				})
			}

			if (paymentResult.error) {
				this.logger.error('Failed to fetch rent payments for dashboard stats', {
					error: paymentResult.error.message,
					userId
				})
			}

			const parseDate = (value: string | null | undefined): Date | null => {
				if (!value) return null
				const date = new Date(value)
				return Number.isNaN(date.getTime()) ? null : date
			}

			const toNumber = (value: number | null | undefined): number =>
				typeof value === 'number' && Number.isFinite(value) ? value : 0

			type PropertyRow = { id: string; status?: string | null }
			const propertyRows = (propertyResult.data ?? []) as PropertyRow[]
			const propertyIds = propertyRows.map(row => row.id).filter(Boolean)
			const propertyTotal = propertyIds.length

			type TenantRow = { status: string | null; createdAt: string | null }
			const tenantRows = (tenantResult.data ?? []) as TenantRow[]

			type PaymentRow = {
				landlordReceives: number | null
				amount: number | null
				paidAt: string | null
				createdAt: string | null
				status: string | null
			}
			const paymentRows = (paymentResult.data ?? []) as PaymentRow[]

			type UnitRow = {
				id: string
				propertyId: string
				status: string | null
				rent: number | null
			}

			let unitRows: UnitRow[] = []
			if (propertyIds.length > 0) {
				const unitResult = await client
					.from('unit')
					.select('id, propertyId, status, rent')
					.in('propertyId', propertyIds)

				if (unitResult.error) {
					this.logger.error('Failed to fetch units for dashboard stats', {
						error: unitResult.error.message,
						userId
					})
				} else {
					unitRows = (unitResult.data ?? []) as UnitRow[]
				}
			}

			const unitIds = unitRows.map(unit => unit.id)

			type LeaseRow = {
				id: string
				status: string | null
				startDate: string
				endDate: string
				rentAmount: number | null
				monthlyRent: number | null
				securityDeposit: number | null
				unitId: string
				propertyId: string | null
			}

			let leaseRows: LeaseRow[] = []
			if (unitIds.length > 0) {
				const leaseResult = await client
					.from('lease')
					.select(
						'id, status, startDate, endDate, rentAmount, monthlyRent, securityDeposit, unitId, propertyId'
					)
					.in('unitId', unitIds)

				if (leaseResult.error) {
					this.logger.error('Failed to fetch leases for dashboard stats', {
						error: leaseResult.error.message,
						userId
					})
				} else {
					leaseRows = (leaseResult.data ?? []) as LeaseRow[]
				}
			}

			type MaintenanceRow = {
				id: string
				status: string | null
				priority: string | null
				createdAt: string
				updatedAt: string | null
				completedAt: string | null
				unitId: string
			}

			let maintenanceRows: MaintenanceRow[] = []
			if (unitIds.length > 0) {
				const maintenanceResult = await client
					.from('maintenance_request')
					.select('id, status, priority, createdAt, updatedAt, completedAt, unitId')
					.in('unitId', unitIds)

				if (maintenanceResult.error) {
					this.logger.error('Failed to fetch maintenance stats for dashboard', {
						error: maintenanceResult.error.message,
						userId
					})
				} else {
					maintenanceRows = (maintenanceResult.data ?? []) as MaintenanceRow[]
				}
			}

			const unitPropertyMap = new Map<string, string>()
			const unitRentMap = new Map<string, number>()
			const occupiedUnitIdsFromStatus = new Set<string>()
			const propertyOccupiedFromUnits = new Set<string>()

			let totalPotentialRent = 0
			let maintenanceUnitCount = 0
			let reservedUnitCount = 0
			let vacantUnitCount = 0

			for (const unit of unitRows) {
				if (!unit.id) continue
				if (unit.propertyId) {
					unitPropertyMap.set(unit.id, unit.propertyId)
				}
				if (typeof unit.rent === 'number') {
					unitRentMap.set(unit.id, unit.rent)
					totalPotentialRent += unit.rent
				}

				const status = (unit.status ?? '').toUpperCase()
				if (status === 'OCCUPIED') {
					occupiedUnitIdsFromStatus.add(unit.id)
					if (unit.propertyId) {
						propertyOccupiedFromUnits.add(unit.propertyId)
					}
				} else if (status === 'MAINTENANCE') {
					maintenanceUnitCount++
				} else if (status === 'RESERVED') {
					reservedUnitCount++
				} else if (status === 'VACANT') {
					vacantUnitCount++
				}
			}

			const activeLeaseUnitIds = new Set<string>()
			const propertyOccupiedFromLeases = new Set<string>()
			const propertyRentTotals = new Map<string, number>()
			const occupiedLastMonthUnitIds = new Set<string>()

			let activeLeaseCount = 0
			let terminatedLeaseCount = 0
			let expiredLeaseCount = 0
			let expiringSoonCount = 0
			let totalLeaseRent = 0
			let totalSecurityDeposits = 0

			const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
			const soonThreshold = new Date(now.getTime() + thirtyDaysMs)

			for (const lease of leaseRows) {
				if (!lease.unitId) continue

				const status = (lease.status ?? '').toUpperCase()
				const startDate = parseDate(lease.startDate)
				const endDate = parseDate(lease.endDate)
				const propertyId = lease.propertyId ?? unitPropertyMap.get(lease.unitId) ?? null

				if (status === 'ACTIVE') {
					activeLeaseCount++
				}
				if (status === 'TERMINATED') {
					terminatedLeaseCount++
				}
				if (endDate && endDate < now) {
					expiredLeaseCount++
				} else if (status === 'ACTIVE' && endDate && endDate >= now && endDate <= soonThreshold) {
					expiringSoonCount++
				}

				totalSecurityDeposits += toNumber(lease.securityDeposit)

				const rentFromLease = toNumber(
					lease.rentAmount ?? lease.monthlyRent ?? unitRentMap.get(lease.unitId)
				)

				const isLeaseActiveNow =
					status === 'ACTIVE' &&
					(startDate ? startDate <= now : true) &&
					(endDate ? endDate >= now : true)

				if (isLeaseActiveNow) {
					activeLeaseUnitIds.add(lease.unitId)
					totalLeaseRent += rentFromLease
					if (propertyId) {
						propertyOccupiedFromLeases.add(propertyId)
						propertyRentTotals.set(
							propertyId,
							(propertyRentTotals.get(propertyId) ?? 0) + rentFromLease
						)
					}
				}

				const wasActivePreviousMonth =
					(status === 'ACTIVE' || status === 'PENDING') &&
					(startDate ? startDate <= endOfPreviousMonth : true) &&
					(endDate ? endDate >= startOfPreviousMonth : true)

				if (wasActivePreviousMonth) {
					occupiedLastMonthUnitIds.add(lease.unitId)
				}
			}

			const occupiedUnitIds = new Set<string>([
				...occupiedUnitIdsFromStatus,
				...activeLeaseUnitIds
			])
			const unitTotal = unitRows.length
			const occupiedUnitCount = Math.min(occupiedUnitIds.size, unitTotal)

			const propertyOccupiedSet = new Set<string>([
				...propertyOccupiedFromUnits,
				...propertyOccupiedFromLeases
			])
			const propertyOccupiedCount = Math.min(propertyOccupiedSet.size, propertyTotal)

			let totalActualRent = totalLeaseRent
			if (totalActualRent === 0 && occupiedUnitIds.size > 0) {
				totalActualRent = [...occupiedUnitIds].reduce((sum, unitId) => {
					return sum + toNumber(unitRentMap.get(unitId))
				}, 0)
			}

			const totalPropertyRent =
				propertyRentTotals.size > 0
					? Array.from(propertyRentTotals.values()).reduce(
							(sum, value) => sum + value,
							0
						)
					: totalActualRent

			const occupancyRate =
				unitTotal > 0 ? (occupiedUnitCount / unitTotal) * 100 : 0
			const previousOccupancyRate =
				unitTotal > 0 ? (occupiedLastMonthUnitIds.size / unitTotal) * 100 : 0

			const derivedVacant = Math.max(
				unitTotal - occupiedUnitCount - maintenanceUnitCount,
				0
			)
			const vacantUnitsTotal = Math.max(vacantUnitCount, derivedVacant)

			const unitsStats = {
				total: unitTotal,
				occupied: occupiedUnitCount,
				vacant: vacantUnitsTotal,
				maintenance: maintenanceUnitCount,
				averageRent:
					occupiedUnitCount > 0
						? Number((totalActualRent / occupiedUnitCount).toFixed(2))
						: 0,
				available: vacantUnitCount + reservedUnitCount,
				occupancyRate: Number(occupancyRate.toFixed(2)),
				occupancyChange: Number((occupancyRate - previousOccupancyRate).toFixed(2)),
				totalPotentialRent: Number(totalPotentialRent.toFixed(2)),
				totalActualRent: Number(totalActualRent.toFixed(2))
			}

			const propertyStats = {
				total: propertyTotal,
				occupied: propertyOccupiedCount,
				vacant: Math.max(propertyTotal - propertyOccupiedCount, 0),
				occupancyRate:
					propertyTotal > 0
						? Number(((propertyOccupiedCount / propertyTotal) * 100).toFixed(2))
						: 0,
				totalMonthlyRent: Number(totalPropertyRent.toFixed(2)),
				averageRent:
					propertyOccupiedCount > 0
						? Number((totalPropertyRent / propertyOccupiedCount).toFixed(2))
						: 0
			}

			const statusToUpper = (value: string | null) =>
				(value ?? '').toUpperCase()

			const activeTenants = tenantRows.filter(
				tenant => statusToUpper(tenant.status) === 'ACTIVE'
			).length
			const pendingTenants = tenantRows.filter(
				tenant => statusToUpper(tenant.status) === 'PENDING'
			).length
			const inactiveTenants = tenantRows.filter(tenant =>
				['INACTIVE', 'EVICTED', 'MOVED_OUT', 'ARCHIVED'].includes(
					statusToUpper(tenant.status)
				)
			).length
			const newTenantsThisMonth = tenantRows.filter(tenant => {
				const created = parseDate(tenant.createdAt)
				return Boolean(created && created >= startOfCurrentMonth)
			}).length

			const tenantStats = {
				total: tenantRows.length,
				active: activeTenants,
				inactive: inactiveTenants,
				newThisMonth: newTenantsThisMonth,
				totalTenants: tenantRows.length,
				activeTenants: activeTenants + pendingTenants
			}

			const leaseStats = {
				total: leaseRows.length,
				active: activeLeaseCount,
				expired: expiredLeaseCount,
				expiringSoon: expiringSoonCount,
				terminated: terminatedLeaseCount,
				totalMonthlyRent: Number(totalLeaseRent.toFixed(2)),
				averageRent:
					activeLeaseCount > 0
						? Number((totalLeaseRent / activeLeaseCount).toFixed(2))
						: 0,
				totalSecurityDeposits: Number(totalSecurityDeposits.toFixed(2))
			}

			let maintenanceOpen = 0
			let maintenanceInProgress = 0
			let maintenanceCompleted = 0
			let maintenanceCompletedToday = 0
			let resolutionTotalMs = 0
			let resolvedCount = 0

			const priorityCounts = {
				low: 0,
				medium: 0,
				high: 0,
				emergency: 0
			}

			const todayKey = now.toISOString().slice(0, 10)

			for (const request of maintenanceRows) {
				const status = (request.status ?? '').toUpperCase()
				if (status === 'OPEN' || status === 'ON_HOLD') {
					maintenanceOpen++
				} else if (status === 'IN_PROGRESS') {
					maintenanceInProgress++
				} else if (status === 'COMPLETED' || status === 'CLOSED') {
					maintenanceCompleted++
				}

				const priority = (request.priority ?? '').toUpperCase()
				if (priority === 'LOW') priorityCounts.low++
				if (priority === 'MEDIUM') priorityCounts.medium++
				if (priority === 'HIGH') priorityCounts.high++
				if (priority === 'EMERGENCY') priorityCounts.emergency++

				const createdAt = parseDate(request.createdAt)
				const completedAt =
					parseDate(request.completedAt) ??
					(status === 'COMPLETED' || status === 'CLOSED'
						? parseDate(request.updatedAt)
						: null)

				if (completedAt) {
					if (completedAt.toISOString().slice(0, 10) === todayKey) {
						maintenanceCompletedToday++
					}
					if (createdAt && completedAt > createdAt) {
						resolutionTotalMs += completedAt.getTime() - createdAt.getTime()
						resolvedCount++
					}
				}
			}

			const maintenanceStats = {
				total: maintenanceRows.length,
				open: maintenanceOpen,
				inProgress: maintenanceInProgress,
				completed: maintenanceCompleted,
				completedToday: maintenanceCompletedToday,
				avgResolutionTime:
					resolvedCount > 0
						? Number(
								(resolutionTotalMs / resolvedCount / (1000 * 60 * 60)).toFixed(2)
							)
						: 0,
				byPriority: priorityCounts
			}

			let monthlyRevenueCents = 0
			let previousMonthRevenueCents = 0
			let yearlyRevenueCents = 0
			let lifetimeRevenueCents = 0

			for (const payment of paymentRows) {
				const status = (payment.status ?? '').toUpperCase()
				const isPaid =
					status === 'SUCCEEDED' ||
					status === 'PAID' ||
					(Boolean(payment.paidAt) && status !== 'FAILED')

				if (!isPaid) continue

				const paymentDate =
					parseDate(payment.paidAt) ?? parseDate(payment.createdAt)
				if (!paymentDate) continue

				let amountCents = toNumber(payment.landlordReceives)
				if (amountCents === 0 && payment.landlordReceives === null) {
					amountCents = toNumber(payment.amount)
				}

				lifetimeRevenueCents += amountCents

				if (paymentDate >= startOfCurrentMonth && paymentDate < startOfNextMonth) {
					monthlyRevenueCents += amountCents
				}

				if (
					paymentDate >= startOfPreviousMonth &&
					paymentDate < startOfCurrentMonth
				) {
					previousMonthRevenueCents += amountCents
				}

				if (paymentDate >= startOfYear) {
					yearlyRevenueCents += amountCents
				}
			}

			const monthlyRevenue = Number((monthlyRevenueCents / 100).toFixed(2))
			const yearlyRevenue = Number((yearlyRevenueCents / 100).toFixed(2))
			const revenueGrowth =
				previousMonthRevenueCents > 0
					? Number(
							(
								((monthlyRevenueCents - previousMonthRevenueCents) /
									previousMonthRevenueCents) *
								100
							).toFixed(2)
						)
					: monthlyRevenueCents > 0
						? 100
						: 0

			const revenueStats = {
				monthly: monthlyRevenue,
				yearly: yearlyRevenue,
				growth: revenueGrowth
			}

			const stats: DashboardStats = {
				properties: propertyStats,
				tenants: tenantStats,
				units: unitsStats,
				leases: leaseStats,
				maintenance: maintenanceStats,
				revenue: revenueStats,
				totalProperties: propertyStats.total,
				totalUnits: unitsStats.total,
				totalTenants: tenantStats.total,
				totalRevenue: Number((lifetimeRevenueCents / 100).toFixed(2)),
				occupancyRate: Number(occupancyRate.toFixed(2)),
				maintenanceRequests: maintenanceStats.total
			}

			return stats
		} catch (error) {
			this.logger.error('Dashboard service failed to get stats', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})

			return { ...EMPTY_DASHBOARD_STATS }
		}
	}
	/**
	 * Get recent activity feed from Activity table
	 * Uses repository pattern for clean data access
	 */
	async getActivity(
		userId: string,
		_authToken?: string
	): Promise<{ activities: unknown[] }> {
		// Business logic: Validate userId
		if (!userId) {
			this.logger.warn('Activity requested without userId')
			return { activities: [] }
		}

		try {
			this.logger.log('Fetching dashboard activity via direct Supabase query', {
				userId
			})

			// NOTE: Activity table doesn't exist yet - return empty array for now
			// When implemented, filter by property ownership
			const activityData: unknown[] = []

			// Example implementation when activity table exists:
			// const propertyIds = await this.getUserPropertyIds(userId)
			// const { data: activityData } = await client
			// 	.from('activity')
			// 	.select('*')
			// 	.in('propertyId', propertyIds)
			// 	.order('created_at', { ascending: false })
			// 	.limit(10)

			return { activities: activityData || [] }
		} catch (error) {
			this.logger.error('Dashboard service failed to get activity', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})

			// Business logic: Return empty array for resilience
			return { activities: [] }
		}
	}

	/**
	 * Get comprehensive billing insights
	 * Delegates to repository layer for clean data access
	 */
	async getBillingInsights(
		userId: string,
		startDate?: Date,
		endDate?: Date
	): Promise<Record<string, unknown> | null> {
		try {
			this.logger.log('Fetching billing insights via direct Supabase query', {
				userId,
				startDate,
				endDate
			})

			const client = this.supabase.getAdminClient()

			// Get billing insights - using a placeholder table, should be replaced with actual billing table
			const queryBuilder = client
				.from('property') // Using property table as placeholder - needs actual billing table
				.select('*')
				.eq('ownerId', userId) // Using ownerId instead of orgId for property table

			if (startDate) {
				queryBuilder.gte('created_at', startDate.toISOString())
			}
			if (endDate) {
				queryBuilder.lte('created_at', endDate.toISOString())
			}

			const { data: billingData } = await queryBuilder

			return billingData?.[0] || null
		} catch (error) {
			this.logger.error('Dashboard service failed to get billing insights', {
				error: error instanceof Error ? error.message : String(error),
				startDate,
				endDate
			})
			return null
		}
	}

	/**
	 * Check if billing insights service is available
	 * Delegates to repository layer for service health check
	 */
	async isBillingInsightsAvailable(): Promise<boolean> {
		try {
			const client = this.supabase.getAdminClient()

			// Check if billing insights are available by checking if there's billing data
			const { count, error } = await client
				.from('property') // Using property table as placeholder - needs actual billing table
				.select('*', { count: 'exact', head: true })
				.limit(1)

			if (error) {
				this.logger.error('Error checking billing insights availability', {
					error: error.message
				})
				return false
			}

			return count !== null && count > 0
		} catch (error) {
			this.logger.error(
				'Dashboard service failed to check billing insights availability',
				{
					error: error instanceof Error ? error.message : String(error)
				}
			)
			return false
		}
	}

	/**
	 * Get property performance metrics
	 * Delegates to repository layer for clean data access
	 */
	async getPropertyPerformance(userId: string): Promise<PropertyPerformance[]> {
		try {
			this.logger.log(
				'Fetching property performance via direct Supabase query',
				{
					userId
				}
			)

			const client = this.supabase.getAdminClient()

			// Get property performance metrics - this would typically involve complex queries
			// For now, using property and unit data to calculate performance
			const { data: propertyData } = await client
				.from('property')
				.select('id, name')
				.eq('ownerId', userId)

		const { data: unitData } = (await client
			.from('unit')
			.select('id, propertyId, status, rent')
			.in('propertyId', propertyData?.map(p => p.id) || [])) as unknown as {
			data?: Array<{
				id: string
				propertyId?: string
				status?: string
				rent?: number
			}>
		}

			// Calculate performance metrics
			const performanceData = (propertyData ?? []).map(property => {
			const propertyUnits =
				unitData?.filter(unit => unit.propertyId === property.id) || []
				const occupiedUnits = propertyUnits.filter(
					unit => unit.status === 'OCCUPIED'
				).length
				const totalUnits = propertyUnits.length
				const vacantUnits = totalUnits - occupiedUnits
				const totalRent = propertyUnits.reduce(
					(sum, unit) => sum + (unit.rent || 0),
					0
				)
				const maxRent =
					propertyUnits.length > 0
						? Math.max(...propertyUnits.map(u => u.rent || 0))
						: 0
				const occupancyRate =
					totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0
				const status: PropertyPerformance['status'] =
					totalUnits === 0
						? 'NO_UNITS'
						: occupiedUnits === 0
							? 'VACANT'
							: occupiedUnits === totalUnits
								? 'FULL'
								: 'PARTIAL'

				return {
					property: property.name || property.id,
					propertyId: property.id,
					units: totalUnits,
					totalUnits,
					occupiedUnits,
					vacantUnits,
					occupancy: `${occupancyRate}%`,
					occupancyRate,
					revenue: totalRent,
					monthlyRevenue: totalRent,
					potentialRevenue: totalUnits * maxRent,
					address: '',
					propertyType: 'SINGLE_FAMILY',
					status
				}
			})

			return performanceData
		} catch (error) {
			this.logger.error(
				'Dashboard service failed to get property performance',
				{
					error: error instanceof Error ? error.message : String(error),
					userId
				}
			)
			return []
		}
	}

	/**
	 * Get system uptime metrics
	 * Delegates to repository layer for clean data access
	 */
	async getUptime(): Promise<SystemUptime> {
		try {
			this.logger.log('Fetching uptime metrics via direct Supabase query')

			// Simulate uptime metrics - in a real implementation, this would query system monitoring data
			return EMPTY_SYSTEM_UPTIME
		} catch (error) {
			this.logger.error('Dashboard service failed to get uptime metrics', {
				error: error instanceof Error ? error.message : String(error)
			})
			return EMPTY_SYSTEM_UPTIME
		}
	}

	/**
	 * Get dashboard metrics - replaces get_dashboard_metrics function
	 * Uses repository pattern instead of database function
	 */
	async getMetrics(userId: string): Promise<Record<string, unknown>> {
		try {
			this.logger.log('Fetching dashboard metrics via repository', { userId })

			// Use existing getStats method as foundation
			const stats = await this.getStats(userId)

			// Return metrics format expected by frontend
			return {
				totalProperties: stats.properties.total,
				totalUnits: stats.units.total,
				totalTenants: stats.tenants.total,
				totalLeases: stats.leases.total,
				occupancyRate: stats.units.occupancyRate,
				monthlyRevenue: stats.revenue.monthly,
				maintenanceRequests: stats.maintenance.total,
				timestamp: new Date().toISOString()
			}
		} catch (error) {
			this.logger.error('Dashboard service failed to get metrics', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			return {}
		}
	}

	/**
	 * Get dashboard summary - replaces get_dashboard_summary function
	 * Uses repository pattern instead of database function
	 */
	async getSummary(userId: string): Promise<Record<string, unknown>> {
		try {
			this.logger.log('Fetching dashboard summary via repository', { userId })

			// Combine multiple repository calls for comprehensive summary
			const [stats, activity, propertyPerformance] = await Promise.all([
				this.getStats(userId),
				this.getActivity(userId),
				this.getPropertyPerformance(userId)
			])

			return {
				overview: {
					properties: stats.properties.total,
					units: stats.units.total,
					tenants: stats.tenants.active,
					occupancyRate: stats.units.occupancyRate
				},
				revenue: {
					monthly: stats.revenue.monthly,
					yearly: stats.revenue.yearly,
					growth: stats.revenue.growth
				},
				maintenance: {
					open: stats.maintenance.open,
					inProgress: stats.maintenance.inProgress,
					avgResolutionTime: stats.maintenance.avgResolutionTime
				},
				recentActivity: activity.activities.slice(0, 5),
				topPerformingProperties: propertyPerformance.slice(0, 3),
				timestamp: new Date().toISOString()
			}
		} catch (error) {
			this.logger.error('Dashboard service failed to get summary', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			return {}
		}
	}

	/**
	 * Get occupancy trends using optimized RPC function
	 */
	async getOccupancyTrends(userId: string, months: number = 12) {
		try {
			this.logger.log('Fetching occupancy trends via analytics service', {
				userId,
				months
			})
			return await this.dashboardAnalyticsService.getOccupancyTrends(
				userId,
				months
			)
		} catch (error) {
			this.logger.error('Dashboard service failed to get occupancy trends', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				months
			})
			return []
		}
	}

	/**
	 * Get revenue trends using optimized RPC function
	 */
	async getRevenueTrends(userId: string, months: number = 12) {
		try {
			this.logger.log('Fetching revenue trends via analytics service', {
				userId,
				months
			})
			return await this.dashboardAnalyticsService.getRevenueTrends(
				userId,
				months
			)
		} catch (error) {
			this.logger.error('Dashboard service failed to get revenue trends', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				months
			})
			return []
		}
	}

	/**
	 * Get maintenance analytics using optimized RPC function
	 */
	async getMaintenanceAnalytics(userId: string) {
		try {
			this.logger.log('Fetching maintenance analytics via analytics service', {
				userId
			})
			return await this.dashboardAnalyticsService.getMaintenanceAnalytics(
				userId
			)
		} catch (error) {
			this.logger.error(
				'Dashboard service failed to get maintenance analytics',
				{
					error: error instanceof Error ? error.message : String(error),
					userId
				}
			)
			return EMPTY_MAINTENANCE_ANALYTICS
		}
	}
}
