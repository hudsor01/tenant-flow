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
import { isValidUUID } from '@repo/shared/validation/common'
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
	 * Get maintenance metrics via existing optimized analytics service
	 * Delegates to DashboardAnalyticsService.getMaintenanceAnalytics()
	 */
	@Get('metrics')
	async getMaintenanceMetrics(
		@Req() req: Request,
		@Query('property_id') property_id?: string,
		@Query('timeframe') timeframe = '30d'
	): Promise<MaintenanceMetrics> {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new UnauthorizedException('User not authenticated')
		}

		// Validate property_id if provided
		if (property_id && !isValidUUID(property_id)) {
			throw new BadRequestException('Invalid property ID')
		}

		try {
			const context = await this.loadMaintenanceContext(
				user.id,
				timeframe,
				property_id
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
					user_id: user.id
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
		@Query('property_id') property_id?: string,
		@Query('timeframe') timeframe = '30d'
	): Promise<MaintenanceCostSummary> {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new UnauthorizedException('User not authenticated')
		}

		// Validate property_id if provided
		if (property_id && !isValidUUID(property_id)) {
			throw new BadRequestException('Invalid property ID')
		}

		try {
			const context = await this.loadMaintenanceContext(
				user.id,
				timeframe,
				property_id
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
					user_id: user.id
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
		@Query('property_id') property_id?: string,
		@Query('period') period = 'monthly',
		@Query('timeframe') timeframe = '90d'
	): Promise<MaintenancePerformance[]> {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new UnauthorizedException('User not authenticated')
		}

		// Validate property_id if provided
		if (property_id && !isValidUUID(property_id)) {
			throw new BadRequestException('Invalid property ID')
		}

		try {
			const context = await this.loadMaintenanceContext(
				user.id,
				timeframe,
				property_id
			)
			const propertyAggregates = this.calculatePropertyAggregates(
				context.requests,
				context.unitToProperty,
				context.propertyNames
			)

			if (propertyAggregates.size === 0) {
				if (property_id) {
					const propertyName =
						context.propertyNames.get(property_id) ?? 'Unknown Property'
					return [
						{
							propertyId: property_id,
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

			return Array.from(propertyAggregates.values())
		} catch (error) {
			this.logger.error(
				'Failed to get maintenance performance analytics via analytics service',
				{
					error: error instanceof Error ? error.message : String(error),
					user_id: user.id,
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
		user_id: string,
		timeframe: string,
		property_id?: string
	) {
		const client = this.supabaseService.getAdminClient()

		const { data: propertyRows, error: propertyError } = await client
			.from('properties')
			.select('id, name')
			.eq('owner_id', user_id)

		if (propertyError) {
			this.logger.error(
				'Failed to fetch properties, proceeding with empty data',
				{
					error: propertyError.message || propertyError,
					user_id
				}
			)
		}

		const propertyNames = new Map<string, string>()
		const property_ids: string[] = []
		for (const property of propertyRows || []) {
			if (!property?.id) {
				continue
			}
			property_ids.push(property.id)
			if (typeof property.name === 'string') {
				propertyNames.set(property.id, property.name)
			}
		}

		if (property_ids.length === 0) {
			return {
				requests: [],
				unitToProperty: new Map<string, string>(),
				propertyNames
			}
		}

		const { data: unitRows, error: unitError } = await client
			.from('units')
			.select('id, property_id')
			.in('property_id', property_ids)

		if (unitError) {
			this.logger.error('Failed to fetch units, proceeding with empty data', {
				error: unitError.message || unitError,
				user_id,
				property_idsCount: property_ids.length
			})
		}

		const unitToProperty = new Map<string, string>()
		const unit_ids: string[] = []
		for (const unit of unitRows || []) {
			if (!unit?.id) {
				continue
			}
			unit_ids.push(unit.id)
			if (typeof unit.property_id === 'string' && unit.property_id.length > 0) {
				unitToProperty.set(unit.id, unit.property_id)
			}
		}

		if (unit_ids.length === 0) {
			return {
				requests: [],
				unitToProperty,
				propertyNames
			}
		}

		let maintenanceRequests: MaintenanceRequest[] = []
		try {
			const { data: maintenanceRows, error: maintenanceError } = await client
				.from('maintenance_requests')
				.select('*')
				.in('unit_id', unit_ids)

			if (maintenanceError) {
				this.logger.error(
					'Failed to fetch maintenance requests, proceeding with empty data',
					{
						error: maintenanceError.message || maintenanceError,
						user_id,
						unit_idsCount: unit_ids.length
					}
				)
				// Return empty result shape on error instead of throwing
				return {
					requests: [],
					unitToProperty,
					propertyNames
				}
			}

			maintenanceRequests = (maintenanceRows || []) as MaintenanceRequest[]
		} catch (error) {
			this.logger.error(
				'Unexpected error fetching maintenance requests, proceeding with empty data',
				{
					error: error instanceof Error ? error.message : String(error),
					user_id
				}
			)
			// Return empty result shape on unexpected errors
			return {
				requests: [],
				unitToProperty,
				propertyNames
			}
		}

		const start = this.calculatestart_date(timeframe)
		const filteredRequests = maintenanceRequests.filter(request => {
			if (start && request.created_at) {
				const created_at = new Date(request.created_at)
				if (Number.isFinite(start.getTime()) && created_at < start) {
					return false
				}
			}

			if (!property_id) {
				return true
			}

			const mappedproperty_id = unitToProperty.get(request.unit_id ?? '')
			return mappedproperty_id === property_id
		})

		const enrichedRequests = filteredRequests.map(request => ({
			request,
			property_id: unitToProperty.get(request.unit_id ?? '') ?? null
		}))

		return {
			requests: enrichedRequests,
			unitToProperty,
			propertyNames
		}
	}

	private calculatestart_date(timeframe: string): Date | null {
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
		requests: Array<{ request: MaintenanceRequest; property_id: string | null }>
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

			const priority = request.priority?.toLowerCase()
			if (priority === 'urgent') {
				aggregates.emergencyCount += 1
			}
			if (priority === 'high') {
				aggregates.highPriorityCount += 1
			}

			const cost = this.deriveCost(request)
			if (cost > 0) {
				aggregates.totalCost += cost
				aggregates.costSamples += 1
			}

			const status = request.status?.toLowerCase()
			if (status === 'completed') {
				aggregates.completedCount += 1
				if (request.completed_at && request.created_at) {
					const created = new Date(request.created_at)
					const completed = new Date(request.completed_at)
					const durationHours =
						(completed.getTime() - created.getTime()) / (1000 * 60 * 60)
					if (Number.isFinite(durationHours) && durationHours >= 0) {
						aggregates.resolutionTimeSum += durationHours
						aggregates.resolutionSamples += 1
					}
				}
			} else if (status !== 'cancelled') {
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
		requests: Array<{ request: MaintenanceRequest; property_id: string | null }>,
		unitToProperty: Map<string, string>,
		propertyNames: Map<string, string>
	) {
		type PropertyAggregate = {
			propertyId: string
			propertyName: string
			totalRequests: number
			completedRequests: number
			pendingRequests: number
			totalCost: number
			resolutionTimeSum: number
			resolutionSamples: number
			emergencyRequests: number
		}

		const map = new Map<string, PropertyAggregate>()

		for (const { request, property_id } of requests) {
			const targetPropertyId =
				property_id ?? unitToProperty.get(request.unit_id ?? '')
			if (!targetPropertyId) {
				continue
			}

			if (!map.has(targetPropertyId)) {
				map.set(targetPropertyId, {
					propertyId: targetPropertyId,
					propertyName:
						propertyNames.get(targetPropertyId) ?? 'Unknown Property',
					totalRequests: 0,
					completedRequests: 0,
					pendingRequests: 0,
					totalCost: 0,
					resolutionTimeSum: 0,
					resolutionSamples: 0,
					emergencyRequests: 0
				})
			}

			const aggregate = map.get(targetPropertyId)!

			aggregate.totalRequests += 1
			aggregate.totalCost += this.deriveCost(request)
			const priority = request.priority?.toLowerCase()
			if (priority === 'urgent') {
				aggregate.emergencyRequests += 1
			}

			const status = request.status?.toLowerCase()
			if (status === 'completed') {
				aggregate.completedRequests += 1
				if (request.completed_at && request.created_at) {
					const created = new Date(request.created_at)
					const completed = new Date(request.completed_at)
					const durationHours =
						(completed.getTime() - created.getTime()) / (1000 * 60 * 60)
					if (Number.isFinite(durationHours) && durationHours >= 0) {
						aggregate.resolutionTimeSum += durationHours
						aggregate.resolutionSamples += 1
					}
				}
			} else if (status !== 'cancelled') {
				aggregate.pendingRequests += 1
			}
		}

		const result = new Map<string, MaintenancePerformance>()

		for (const aggregate of map.values()) {
			const averageResolutionTime =
				aggregate.resolutionSamples > 0
					? aggregate.resolutionTimeSum / aggregate.resolutionSamples
					: 0

			result.set(aggregate.propertyId, {
				propertyId: aggregate.propertyId,
				propertyName: aggregate.propertyName,
				totalRequests: aggregate.totalRequests,
				completedRequests: aggregate.completedRequests,
				pendingRequests: aggregate.pendingRequests,
				totalCost: aggregate.totalCost,
				emergencyRequests: aggregate.emergencyRequests,
				averageResolutionTime
			})
		}

		return result
	}

	private deriveCost(request: MaintenanceRequest): number {
		if (typeof request.actual_cost === 'number') {
			return request.actual_cost
		}
		if (typeof request.estimated_cost === 'number') {
			return request.estimated_cost
		}
		return 0
	}
}
