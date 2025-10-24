import {
	BadRequestException,
	Controller,
	Get,
	Logger,
	Query,
	Req,
	UnauthorizedException
} from '@nestjs/common'
import type {
	MaintenanceCostSummary,
	MaintenanceMetrics,
	MaintenancePerformance,
	MaintenanceRequest
} from '@repo/shared/types/core'
import type { Request } from 'express'
import { SupabaseService } from '../../database/supabase.service'

/**
 * Maintenance Analytics Controller - Ultra-Native Implementation
 * Direct Supabase queries, no repository dependencies
 */
@Controller('maintenance/analytics')
export class MaintenanceAnalyticsController {
	private readonly logger = new Logger(MaintenanceAnalyticsController.name)

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Helper method to get unit IDs for a user (via property ownership)
	 */
	private async getUserUnitIds(userId: string): Promise<string[]> {
		const client = this.supabaseService.getAdminClient()
		const { data: properties } = await client
			.from('property')
			.select('id')
			.eq('ownerId', userId)
		const propertyIds = properties?.map(p => p.id) || []
		if (propertyIds.length === 0) return []

		const { data: units } = await client
			.from('unit')
			.select('id')
			.in('propertyId', propertyIds)
		return units?.map(u => u.id) || []
	}

	/**
	 * Get maintenance metrics via existing optimized analytics service
	 * Delegates to DashboardAnalyticsService.getMaintenanceAnalytics()
	 */
	@Get('metrics')
	async getMaintenanceMetrics(
		@Req() req: Request,
		@Query('propertyId') propertyId?: string,
		@Query('timeframe') timeframe = '30d'
	): Promise<MaintenanceMetrics> {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new UnauthorizedException('User not authenticated')
		}

		try {
			const context = await this.loadMaintenanceContext(
				user.id,
				timeframe,
				propertyId
			)
			const aggregate = this.calculateAggregateMetrics(context.requests)

			return {
				totalCost: aggregate.totalCost,
				avgCost: aggregate.averageCost,
				totalRequests: aggregate.totalRequests,
				emergencyCount: aggregate.emergencyCount,
				highPriorityCount: aggregate.highPriorityCount,
				completedRequests: aggregate.completedCount,
				pendingRequests: aggregate.pendingCount,
				averageResolutionTime: aggregate.averageResolutionTime
			}
		} catch (error) {
			this.logger.error(
				'Failed to get maintenance metrics via analytics service',
				{
					error: error instanceof Error ? error.message : String(error),
					userId: user.id
				}
			)
			throw new BadRequestException('Failed to fetch maintenance metrics')
		}
	}

	/**
	 * Get maintenance cost summary via existing optimized analytics service
	 * Delegates to DashboardAnalyticsService.getMaintenanceAnalytics()
	 */
	@Get('cost-summary')
	async getCostSummary(
		@Req() req: Request,
		@Query('propertyId') propertyId?: string,
		@Query('timeframe') timeframe = '30d'
	): Promise<MaintenanceCostSummary> {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new UnauthorizedException('User not authenticated')
		}

		try {
			const context = await this.loadMaintenanceContext(
				user.id,
				timeframe,
				propertyId
			)
			const aggregate = this.calculateAggregateMetrics(context.requests)

			return {
				totalCost: aggregate.totalCost,
				avgCost: aggregate.averageCost,
				totalRequests: aggregate.totalRequests,
				emergencyCount: aggregate.emergencyCount,
				highPriorityCount: aggregate.highPriorityCount
			}
		} catch (error) {
			this.logger.error(
				'Failed to get maintenance cost summary via analytics service',
				{
					error: error instanceof Error ? error.message : String(error),
					userId: user.id
				}
			)
			throw new BadRequestException('Failed to fetch cost summary')
		}
	}

	/**
	 * Get maintenance performance analytics via existing optimized analytics service
	 * Simple delegation pattern - property name lookups are no longer required for analytics
	 */
	@Get('performance')
	async getPerformanceAnalytics(
		@Req() req: Request,
		@Query('propertyId') propertyId?: string,
		@Query('period') period = 'monthly',
		@Query('timeframe') timeframe = '90d'
	): Promise<MaintenancePerformance[]> {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new UnauthorizedException('User not authenticated')
		}

		try {
			const context = await this.loadMaintenanceContext(
				user.id,
				timeframe,
				propertyId
			)
			const propertyAggregates = this.calculatePropertyAggregates(
				context.requests,
				context.unitToProperty,
				context.propertyNames
			)

			if (propertyAggregates.size === 0) {
				if (propertyId) {
					const propertyName =
						context.propertyNames.get(propertyId) ?? 'Unknown Property'
					return [
						{
							propertyId,
							propertyName,
							totalRequests: 0,
							completedRequests: 0,
							pendingRequests: 0,
							averageResolutionTime: 0,
							totalCost: 0,
							emergencyRequests: 0
						}
					]
				}
				return []
			}

			return Array.from(propertyAggregates.values()).map(aggregate => ({
				propertyId: aggregate.propertyId,
				propertyName: aggregate.propertyName,
				totalRequests: aggregate.totalRequests,
				completedRequests: aggregate.completedCount,
				pendingRequests: aggregate.pendingCount,
				averageResolutionTime: aggregate.averageResolutionTime,
				totalCost: aggregate.totalCost,
				emergencyRequests: aggregate.emergencyCount
			}))
		} catch (error) {
			this.logger.error(
				'Failed to get maintenance performance analytics via analytics service',
				{
					error: error instanceof Error ? error.message : String(error),
					userId: user.id,
					period,
					timeframe
				}
			)
			throw new BadRequestException('Failed to fetch performance analytics')
		}
	}

	// Utility method to parse time range
	private parseTimeframe(timeframe: string): number {
		const match = timeframe.match(/^(\d+)([dmy])$/)
		if (!match) return 30 // Default to 30 days

		const [, value, unit] = match
		const numValue = parseInt(value || '30', 10)

		switch (unit) {
			case 'd':
				return numValue
			case 'm':
				return numValue * 30
			case 'y':
				return numValue * 365
			default:
				return 30
		}
	}

	private async loadMaintenanceContext(
		userId: string,
		timeframe: string,
		propertyId?: string
	) {
		const client = this.supabaseService.getAdminClient()
		const unitIds = await this.getUserUnitIds(userId)

		// Fetch all data with direct Supabase queries
		const [maintenanceData, unitsData, propertiesData] = await Promise.all([
			unitIds.length > 0
				? client.from('maintenance_request').select('*').in('unitId', unitIds)
				: Promise.resolve({ data: [] }),
			client
				.from('unit')
				.select('id, propertyId')
				.in(
					'propertyId',
					(
						await client.from('property').select('id').eq('ownerId', userId)
					).data?.map(p => p.id) || []
				),
			client.from('property').select('id, name').eq('ownerId', userId)
		])

		const maintenanceRequests = (maintenanceData.data ||
			[]) as MaintenanceRequest[]
		const units = unitsData.data || []
		const properties = propertiesData.data || []

		const start = this.calculateStartDate(timeframe)
		const unitToProperty = new Map<string, string>()
		for (const unit of units) {
			if (unit.id && unit.propertyId) {
				unitToProperty.set(unit.id, unit.propertyId)
			}
		}

		const propertyNames = new Map<string, string>()
		for (const property of properties) {
			propertyNames.set(property.id, property.name)
		}

		const filteredRequests = maintenanceRequests.filter(request => {
			if (start && request.createdAt) {
				const createdAt = new Date(request.createdAt)
				if (Number.isFinite(start.getTime()) && createdAt < start) {
					return false
				}
			}

			if (!propertyId) {
				return true
			}

			const mappedPropertyId = unitToProperty.get(request.unitId ?? '')
			return mappedPropertyId === propertyId
		})

		const enrichedRequests = filteredRequests.map(request => ({
			request,
			propertyId: unitToProperty.get(request.unitId ?? '') ?? null
		}))

		return {
			requests: enrichedRequests,
			unitToProperty,
			propertyNames
		}
	}

	private calculateStartDate(timeframe: string): Date | null {
		if (!timeframe) {
			return null
		}

		const lower = timeframe.toLowerCase()
		if (lower === 'all' || lower === 'lifetime') {
			return null
		}
		if (lower === 'yearly') {
			return this.subtractDays(365)
		}
		if (lower === 'quarterly') {
			return this.subtractDays(90)
		}
		if (lower === 'monthly') {
			return this.subtractDays(30)
		}

		const days = this.parseTimeframe(lower)
		return this.subtractDays(days)
	}

	private subtractDays(days: number): Date {
		const now = new Date()
		now.setHours(0, 0, 0, 0)
		now.setDate(now.getDate() - days)
		return now
	}

	private calculateAggregateMetrics(
		requests: Array<{ request: MaintenanceRequest; propertyId: string | null }>
	) {
		const aggregates = {
			totalRequests: 0,
			totalCost: 0,
			emergencyCount: 0,
			highPriorityCount: 0,
			completedCount: 0,
			pendingCount: 0,
			resolutionTimeSum: 0,
			resolutionSamples: 0,
			costSamples: 0
		}

		for (const { request } of requests) {
			aggregates.totalRequests += 1

			if (request.priority === 'EMERGENCY') {
				aggregates.emergencyCount += 1
			}
			if (request.priority === 'HIGH') {
				aggregates.highPriorityCount += 1
			}

			const cost = this.deriveCost(request)
			if (cost > 0) {
				aggregates.totalCost += cost
				aggregates.costSamples += 1
			}

			const status = request.status?.toUpperCase()
			if (status === 'COMPLETED') {
				aggregates.completedCount += 1
				if (request.completedAt) {
					const created = new Date(request.createdAt)
					const completed = new Date(request.completedAt)
					const durationHours =
						(completed.getTime() - created.getTime()) / (1000 * 60 * 60)
					if (Number.isFinite(durationHours) && durationHours >= 0) {
						aggregates.resolutionTimeSum += durationHours
						aggregates.resolutionSamples += 1
					}
				}
			} else if (status !== 'CANCELED') {
				aggregates.pendingCount += 1
			}
		}

		const averageCost =
			aggregates.costSamples > 0
				? aggregates.totalCost / aggregates.costSamples
				: 0
		const averageResolutionTime =
			aggregates.resolutionSamples > 0
				? aggregates.resolutionTimeSum / aggregates.resolutionSamples
				: 0

		return {
			totalRequests: aggregates.totalRequests,
			totalCost: aggregates.totalCost,
			emergencyCount: aggregates.emergencyCount,
			highPriorityCount: aggregates.highPriorityCount,
			completedCount: aggregates.completedCount,
			pendingCount: aggregates.pendingCount,
			averageCost,
			averageResolutionTime
		}
	}

	private calculatePropertyAggregates(
		requests: Array<{ request: MaintenanceRequest; propertyId: string | null }>,
		unitToProperty: Map<string, string>,
		propertyNames: Map<string, string>
	) {
		const map = new Map<
			string,
			{
				propertyId: string
				propertyName: string
				totalRequests: number
				completedCount: number
				pendingCount: number
				totalCost: number
				resolutionTimeSum: number
				resolutionSamples: number
				emergencyCount: number
				averageResolutionTime: number
			}
		>()

		for (const { request, propertyId } of requests) {
			const targetPropertyId =
				propertyId ?? unitToProperty.get(request.unitId ?? '')
			if (!targetPropertyId) {
				continue
			}

			if (!map.has(targetPropertyId)) {
				map.set(targetPropertyId, {
					propertyId: targetPropertyId,
					propertyName:
						propertyNames.get(targetPropertyId) ?? 'Unknown Property',
					totalRequests: 0,
					completedCount: 0,
					pendingCount: 0,
					totalCost: 0,
					resolutionTimeSum: 0,
					resolutionSamples: 0,
					emergencyCount: 0,
					averageResolutionTime: 0
				})
			}

			const aggregate = map.get(targetPropertyId)!

			aggregate.totalRequests += 1
			aggregate.totalCost += this.deriveCost(request)
			if (request.priority === 'EMERGENCY') {
				aggregate.emergencyCount += 1
			}

			const status = request.status?.toUpperCase()
			if (status === 'COMPLETED') {
				aggregate.completedCount += 1
				if (request.completedAt) {
					const created = new Date(request.createdAt)
					const completed = new Date(request.completedAt)
					const durationHours =
						(completed.getTime() - created.getTime()) / (1000 * 60 * 60)
					if (Number.isFinite(durationHours) && durationHours >= 0) {
						aggregate.resolutionTimeSum += durationHours
						aggregate.resolutionSamples += 1
					}
				}
			} else if (status !== 'CANCELED') {
				aggregate.pendingCount += 1
			}
		}

		const result = new Map<
			string,
			{
				propertyId: string
				propertyName: string
				totalRequests: number
				completedCount: number
				pendingCount: number
				totalCost: number
				emergencyCount: number
				averageResolutionTime: number
			}
		>()

		for (const aggregate of map.values()) {
			const averageResolutionTime =
				aggregate.resolutionSamples > 0
					? aggregate.resolutionTimeSum / aggregate.resolutionSamples
					: 0

			result.set(aggregate.propertyId, {
				propertyId: aggregate.propertyId,
				propertyName: aggregate.propertyName,
				totalRequests: aggregate.totalRequests,
				completedCount: aggregate.completedCount,
				pendingCount: aggregate.pendingCount,
				totalCost: aggregate.totalCost,
				emergencyCount: aggregate.emergencyCount,
				averageResolutionTime
			})
		}

		return result
	}

	private deriveCost(request: MaintenanceRequest): number {
		if (typeof request.actualCost === 'number') {
			return request.actualCost
		}
		if (typeof request.estimatedCost === 'number') {
			return request.estimatedCost
		}
		return 0
	}
}
