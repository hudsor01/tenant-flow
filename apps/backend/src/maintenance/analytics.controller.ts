import {
	BadRequestException,
	Controller,
	Get,
	Logger,
	Query,
	Req,
	Inject
} from '@nestjs/common'
import type { Request } from 'express'
import { SupabaseService } from '../database/supabase.service'
import { REPOSITORY_TOKENS } from '../repositories/repositories.module'
import type { IMaintenanceRepository } from '../repositories/interfaces/maintenance-repository.interface'
import type { IUnitsRepository } from '../repositories/interfaces/units-repository.interface'
import type { IPropertiesRepository } from '../repositories/interfaces/properties-repository.interface'
import type {
	MaintenanceMetrics,
	MaintenanceCostSummary,
	MaintenancePerformance,
	MaintenanceRequest,
	Unit,
	Property
} from '@repo/shared'

/**
 * Maintenance Analytics Controller - Repository Pattern Implementation
 * All maintenance calculations via repository using direct table queries
 * Clean separation of concerns with repository layer
 */
@Controller('maintenance/analytics')
export class MaintenanceAnalyticsController {
	private readonly logger = new Logger(MaintenanceAnalyticsController.name)

	constructor(
		private readonly supabaseService: SupabaseService,
		@Inject(REPOSITORY_TOKENS.MAINTENANCE)
		private readonly maintenanceRepository: IMaintenanceRepository,
		@Inject(REPOSITORY_TOKENS.UNITS)
		private readonly unitsRepository: IUnitsRepository,
		@Inject(REPOSITORY_TOKENS.PROPERTIES)
		private readonly propertiesRepository: IPropertiesRepository
	) {}

	/**
	 * Get maintenance metrics via repository - DIRECT TABLE QUERIES
	 * NO RPC BULLSHIT - Repository handles all calculations in TypeScript
	 */
	@Get('metrics')
	async getMaintenanceMetrics(
		@Req() req: Request,
		@Query('propertyId') propertyId?: string,
		@Query('timeframe') timeframe = '30d',
		@Query('status') _status?: string
	): Promise<MaintenanceMetrics> {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new BadRequestException('User not authenticated')
		}

		try {
			this.logger.log('Getting maintenance metrics via repository', {
				userId: user.id,
				propertyId,
				timeframe
			})

			// Repository will handle all calculations using direct table queries
			const analytics = await this.maintenanceRepository.getAnalytics(user.id, {
				propertyId,
				timeframe
			})

			// Calculate metrics from analytics data - SIMPLE TYPESCRIPT MATH
			const requests = analytics
			const totalRequests = requests.length
			const totalCost = requests.reduce((sum, r) => sum + (r.actualCost || 0), 0)
			const avgCost = totalRequests > 0 ? Math.round(totalCost / totalRequests) : 0

			const emergencyCount = requests.filter(r => r.priority === 'EMERGENCY').length
			const highPriorityCount = requests.filter(r => r.priority === 'HIGH').length
			const completedRequests = requests.filter(r => r.status === 'COMPLETED').length
			const pendingRequests = requests.filter(r => ['OPEN', 'IN_PROGRESS'].includes(r.status)).length

			// Calculate average resolution time for completed requests
			const completedWithTimes = requests.filter(r =>
				r.status === 'COMPLETED' && r.createdAt && r.updatedAt
			)
			const avgResolutionHours = completedWithTimes.length > 0
				? completedWithTimes.reduce((sum, r) => {
					const created = new Date(r.createdAt).getTime()
					const completed = new Date(r.updatedAt).getTime()
					return sum + ((completed - created) / (1000 * 60 * 60))
				}, 0) / completedWithTimes.length
				: 0

			return {
				totalCost,
				avgCost,
				totalRequests,
				emergencyCount,
				highPriorityCount,
				completedRequests,
				pendingRequests,
				averageResolutionTime: Math.round(avgResolutionHours)
			}
		} catch (error) {
			this.logger.error('Failed to get maintenance metrics via repository', {
				error: error instanceof Error ? error.message : String(error),
				userId: user.id,
				propertyId,
				timeframe
			})
			throw new BadRequestException('Failed to fetch maintenance metrics')
		}
	}

	/**
	 * Get maintenance cost summary via repository - DIRECT TABLE QUERIES
	 * NO RPC BULLSHIT - Repository handles calculations in TypeScript
	 */
	@Get('cost-summary')
	async getCostSummary(
		@Req() req: Request,
		@Query('propertyId') propertyId?: string,
		@Query('timeframe') timeframe = '30d'
	): Promise<MaintenanceCostSummary> {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new BadRequestException('User not authenticated')
		}

		try {
			this.logger.log('Getting maintenance cost summary via repository', {
				userId: user.id,
				propertyId,
				timeframe
			})

			// Repository will handle all calculations using direct table queries
			const analytics = await this.maintenanceRepository.getAnalytics(user.id, {
				propertyId,
				timeframe
			})

			// Calculate cost summary from analytics data - SIMPLE TYPESCRIPT MATH
			const requests = analytics
			const totalRequests = requests.length
			const totalCost = requests.reduce((sum, r) => sum + (r.actualCost || 0), 0)
			const avgCost = totalRequests > 0 ? Math.round(totalCost / totalRequests) : 0

			const emergencyCount = requests.filter(r => r.priority === 'EMERGENCY').length
			const highPriorityCount = requests.filter(r => r.priority === 'HIGH').length

			return {
				totalCost,
				avgCost,
				totalRequests,
				emergencyCount,
				highPriorityCount
			}
		} catch (error) {
			this.logger.error('Failed to get maintenance cost summary via repository', {
				error: error instanceof Error ? error.message : String(error),
				userId: user.id,
				propertyId,
				timeframe
			})
			throw new BadRequestException('Failed to fetch cost summary')
		}
	}

	/**
	 * Get maintenance performance analytics via repository - DIRECT TABLE QUERIES
	 * NO RPC BULLSHIT - Repository handles calculations in TypeScript
	 */
	@Get('performance')
	async getPerformanceAnalytics(
		@Req() req: Request,
		@Query('propertyId') propertyId?: string,
		@Query('period') period = 'monthly'
	): Promise<MaintenancePerformance[]> {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new BadRequestException('User not authenticated')
		}

		try {
			this.logger.log('Getting maintenance performance analytics via repository', {
				userId: user.id,
				propertyId,
				period
			})

			// Repository will handle all calculations using direct table queries
			const analytics = await this.maintenanceRepository.getAnalytics(user.id, {
				propertyId,
				timeframe: period
			})

			// Calculate performance metrics from analytics data - SIMPLE TYPESCRIPT MATH
			const requests = analytics

			// Group requests by unit if no specific property requested
			// NOTE: MaintenanceRequest doesn't have propertyId directly, only unitId
			const performanceData: MaintenancePerformance[] = []

			if (propertyId) {
				// Single property performance
				// Since we filtered by propertyId in the repository, these are all for the same property
				const totalRequests = requests.length
				const completedRequests = requests.filter(r => r.status === 'COMPLETED').length
				const totalCost = requests.reduce((sum, r) => sum + (r.actualCost || 0), 0)

				// Calculate average resolution time
				const completedWithTimes = requests.filter(r =>
					r.status === 'COMPLETED' && r.createdAt && r.updatedAt
				)
				const avgResolutionHours = completedWithTimes.length > 0
					? completedWithTimes.reduce((sum, r) => {
						const created = new Date(r.createdAt).getTime()
						const completed = new Date(r.updatedAt).getTime()
						return sum + ((completed - created) / (1000 * 60 * 60))
					}, 0) / completedWithTimes.length
					: 0

				performanceData.push({
					propertyId,
					propertyName: propertyId, // TODO: Get actual property name
					totalRequests,
					completedRequests,
					pendingRequests: totalRequests - completedRequests,
					averageResolutionTime: Math.round(avgResolutionHours),
					totalCost,
					emergencyRequests: requests.filter(r => r.priority === 'EMERGENCY').length
				})
			} else {
				// All properties performance - group by propertyId via unit mapping
				// Step 1: Fetch all units for the user to create unitId -> propertyId mapping
				const [units, properties] = await Promise.all([
					this.unitsRepository.findByUserIdWithSearch(user.id, { limit: 1000, offset: 0 }),
					this.propertiesRepository.findByUserId(user.id)
				])

				// Step 2: Create mapping of unitId to propertyId
				const unitToPropertyMap = new Map<string, string>()
				units.forEach((unit: Unit) => {
					if (unit.id && unit.propertyId) {
						unitToPropertyMap.set(unit.id, unit.propertyId)
					}
				})

				// Step 3: Create mapping of propertyId to property name
				const propertyMap = new Map<string, Property>()
				properties.forEach((property: Property) => {
					if (property.id) {
						propertyMap.set(property.id, property)
					}
				})

				// Step 4: Group maintenance requests by property
				const requestsByProperty = new Map<string, MaintenanceRequest[]>()

				requests.forEach(request => {
					let propId = 'unassigned'

					// Map via unitId to get propertyId
					if (request.unitId && unitToPropertyMap.has(request.unitId)) {
						propId = unitToPropertyMap.get(request.unitId)!
					}

					if (!requestsByProperty.has(propId)) {
						requestsByProperty.set(propId, [])
					}
					requestsByProperty.get(propId)!.push(request)
				})

				// Step 5: Calculate performance metrics for each property
				requestsByProperty.forEach((propertyRequests, propId) => {
					const totalRequests = propertyRequests.length
					const completedRequests = propertyRequests.filter(r => r.status === 'COMPLETED').length
					const totalCost = propertyRequests.reduce((sum, r) => sum + (r.actualCost || 0), 0)

					const completedWithTimes = propertyRequests.filter(r =>
						r.status === 'COMPLETED' && r.createdAt && r.updatedAt
					)
					const avgResolutionHours = completedWithTimes.length > 0
						? completedWithTimes.reduce((sum, r) => {
							const created = new Date(r.createdAt).getTime()
							const completed = new Date(r.updatedAt).getTime()
							return sum + ((completed - created) / (1000 * 60 * 60))
						}, 0) / completedWithTimes.length
						: 0

					// Get property name from map or use ID
					const propertyName = propId === 'unassigned'
						? 'Unassigned'
						: propertyMap.get(propId)?.name || `Property ${propId}`

					performanceData.push({
						propertyId: propId,
						propertyName,
						totalRequests,
						completedRequests,
						pendingRequests: totalRequests - completedRequests,
						averageResolutionTime: Math.round(avgResolutionHours),
						totalCost,
						emergencyRequests: propertyRequests.filter(r => r.priority === 'EMERGENCY').length
					})
				})
			}

			return performanceData
		} catch (error) {
			this.logger.error('Failed to get maintenance performance analytics via repository', {
				error: error instanceof Error ? error.message : String(error),
				userId: user.id,
				propertyId,
				period
			})
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
			case 'd': return numValue
			case 'm': return numValue * 30
			case 'y': return numValue * 365
			default: return 30
		}
	}
}