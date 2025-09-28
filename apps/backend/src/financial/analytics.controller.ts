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
import type { IPropertiesRepository } from '../repositories/interfaces/properties-repository.interface'
import type { ILeasesRepository } from '../repositories/interfaces/leases-repository.interface'
import type { IUnitsRepository } from '../repositories/interfaces/units-repository.interface'
import type { IMaintenanceRepository } from '../repositories/interfaces/maintenance-repository.interface'
import type {
	FinancialMetrics,
	PropertyFinancialMetrics,
	DashboardSummary,
	Lease,
	MaintenanceRequest,
	Unit
} from '@repo/shared'


/**
 * Financial Analytics Controller - Repository Pattern Implementation
 * NO RPC BULLSHIT - All calculations via repository using direct table queries
 * Aggregates data from multiple repositories for financial metrics
 */
@Controller('financial/analytics')
export class FinancialAnalyticsController {
	private readonly logger = new Logger(FinancialAnalyticsController.name)

	constructor(
		private readonly supabaseService: SupabaseService,
		@Inject(REPOSITORY_TOKENS.PROPERTIES)
		private readonly propertiesRepository: IPropertiesRepository,
		@Inject(REPOSITORY_TOKENS.LEASES)
		private readonly leasesRepository: ILeasesRepository,
		@Inject(REPOSITORY_TOKENS.UNITS)
		private readonly unitsRepository: IUnitsRepository,
		@Inject(REPOSITORY_TOKENS.MAINTENANCE)
		private readonly maintenanceRepository: IMaintenanceRepository
	) {}

	/**
	 * Get revenue trends via repositories - DIRECT TABLE QUERIES
	 * NO RPC BULLSHIT - Aggregates data from multiple repositories in TypeScript
	 */
	@Get('revenue-trends')
	async getRevenueTrends(
		@Query('year') year: string,
		@Query('timeRange') _timeRange = '12m',
		@Req() req: Request
	): Promise<FinancialMetrics[]> {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new BadRequestException('User not authenticated')
		}

		try {
			const targetYear = year ? parseInt(year) : new Date().getFullYear()

			this.logger.log('Getting revenue trends via repositories', {
				userId: user.id,
				targetYear
			})

			// Aggregate data from multiple repositories - PARALLEL QUERIES
			const [, leases] = await Promise.all([
				this.unitsRepository.getAnalytics(user.id, { timeframe: '12m' }),
				this.leasesRepository.getAnalytics(user.id, { timeframe: '12m' })
			])

			// Calculate revenue trends by month - SIMPLE TYPESCRIPT MATH
			const monthlyMetrics: FinancialMetrics[] = []

			const leaseData = leases

			for (let month = 0; month < 12; month++) {
				const monthStart = new Date(targetYear, month, 1)
				const monthEnd = new Date(targetYear, month + 1, 0)

				// Filter data for this month
				const monthlyLeases = leaseData.filter((lease) => {
					const startDate = new Date(lease.startDate)
					const endDate = new Date(lease.endDate)
					return startDate <= monthEnd && endDate >= monthStart
				})

				// Calculate monthly revenue
				const totalRevenue: number = monthlyLeases.reduce((sum: number, lease: Lease) => {
					return sum + (lease.rentAmount || 0)
				}, 0)

				monthlyMetrics.push({
					period: monthStart.toISOString().substring(0, 7), // YYYY-MM format
					revenue: totalRevenue,
					expenses: 0, // TODO: Add expense calculation from maintenance
					netIncome: totalRevenue,
					profitMargin: totalRevenue > 0 ? 100 : 0
				})
			}

			return monthlyMetrics
		} catch (error) {
			this.logger.error('Failed to get revenue trends via repositories', {
				error: error instanceof Error ? error.message : String(error),
				userId: user.id,
				year
			})
			throw new BadRequestException('Failed to fetch revenue trends')
		}
	}

	/**
	 * Get dashboard financial metrics via repositories - DIRECT TABLE QUERIES
	 * NO RPC BULLSHIT - Aggregates data from multiple repositories in TypeScript
	 */
	@Get('dashboard-metrics')
	async getDashboardMetrics(@Req() req: Request): Promise<DashboardSummary> {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new BadRequestException('User not authenticated')
		}

		try {
			this.logger.log('Getting dashboard financial metrics via repositories', {
				userId: user.id
			})

			// Aggregate data from multiple repositories - PARALLEL QUERIES
			const [propertyStats, unitStats, , maintenanceAnalytics] = await Promise.all([
				this.propertiesRepository.getStats(user.id),
				this.unitsRepository.getStats(user.id),
				this.leasesRepository.getStats(user.id),
				this.maintenanceRepository.getAnalytics(user.id, { timeframe: '12m' })
			])

			// Calculate financial summary - SIMPLE TYPESCRIPT MATH
			const totalRevenue: number = unitStats.totalActualRent || 0
			const totalExpenses: number = (maintenanceAnalytics as MaintenanceRequest[]).reduce((sum: number, m: MaintenanceRequest) => {
				return sum + (m.actualCost || 0)
			}, 0)
			const netIncome: number = totalRevenue - totalExpenses
			const occupancyRate = unitStats.occupancyRate || 0
			const avgRoi = totalRevenue > 0 ? Math.round((netIncome / totalRevenue) * 100) : 0

			return {
				totalRevenue,
				totalExpenses,
				netIncome,
				propertyCount: propertyStats.total,
				occupancyRate,
				avgRoi
			}
		} catch (error) {
			this.logger.error('Failed to get dashboard financial metrics via repositories', {
				error: error instanceof Error ? error.message : String(error),
				userId: user.id
			})
			throw new BadRequestException('Failed to fetch dashboard metrics')
		}
	}

	/**
	 * Get expense breakdown via repositories - DIRECT TABLE QUERIES
	 * NO RPC BULLSHIT - Aggregates expense data from maintenance in TypeScript
	 */
	@Get('expense-breakdown')
	async getExpenseBreakdown(
		@Query('year') year: string,
		@Req() req: Request
	): Promise<FinancialMetrics[]> {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new BadRequestException('User not authenticated')
		}

		try {
			const targetYear = year ? parseInt(year) : new Date().getFullYear()

			this.logger.log('Getting expense breakdown via repositories', {
				userId: user.id,
				targetYear
			})

			// Get maintenance analytics for expense calculations
			const maintenanceAnalytics = await this.maintenanceRepository.getAnalytics(user.id, {
				timeframe: '12m'
			})

			// Calculate monthly expense breakdown - SIMPLE TYPESCRIPT MATH
			const monthlyExpenses: FinancialMetrics[] = []
			const maintenanceData = maintenanceAnalytics

			for (let month = 0; month < 12; month++) {
				const monthStart = new Date(targetYear, month, 1)
				const monthEnd = new Date(targetYear, month + 1, 0)

				// Filter maintenance expenses for this month
				const monthlyMaintenance = maintenanceData.filter(m => {
					const createdDate = new Date(m.createdAt)
					return createdDate >= monthStart && createdDate <= monthEnd
				})

				// Calculate monthly expenses
				const totalExpenses: number = monthlyMaintenance.reduce((sum: number, m: MaintenanceRequest) => {
					return sum + (m.actualCost || 0)
				}, 0)

				monthlyExpenses.push({
					period: monthStart.toISOString().substring(0, 7), // YYYY-MM format
					revenue: 0,
					expenses: totalExpenses,
					netIncome: -totalExpenses, // Expenses are negative income
					profitMargin: 0
				})
			}

			return monthlyExpenses
		} catch (error) {
			this.logger.error('Failed to get expense breakdown via repositories', {
				error: error instanceof Error ? error.message : String(error),
				userId: user.id,
				year
			})
			throw new BadRequestException('Failed to fetch expense breakdown')
		}
	}

	/**
	 * Get Net Operating Income via repositories - DIRECT TABLE QUERIES
	 * NO RPC BULLSHIT - Calculates NOI from property data in TypeScript
	 */
	@Get('net-operating-income')
	async getNetOperatingIncome(
		@Query('period') _period = 'monthly',
		@Req() req: Request
	): Promise<PropertyFinancialMetrics[]> {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new BadRequestException('User not authenticated')
		}

		try {
			this.logger.log('Getting Net Operating Income via repositories', {
				userId: user.id,
				period: _period
			})

			// Get all property analytics for NOI calculations - PARALLEL QUERIES
			const [unitAnalytics, maintenanceAnalytics] = await Promise.all([
				this.unitsRepository.getAnalytics(user.id, { timeframe: 'yearly' }),
				this.maintenanceRepository.getAnalytics(user.id, { timeframe: 'yearly' })
			])

			// Group data by property and calculate NOI - SIMPLE TYPESCRIPT MATH
			const propertyNOI: PropertyFinancialMetrics[] = []

			const unitData = unitAnalytics
			const maintenanceData = maintenanceAnalytics

			// Get unique property IDs from units (MaintenanceRequest doesn't have propertyId)
			const propertyIds = [...new Set(unitData.map(u => u.propertyId))].filter((id): id is string => Boolean(id))

			// Map maintenance requests to properties via unitId
			const unitToPropertyMap: Record<string, string> = {}
			unitData.forEach(unit => {
				if (unit.id && unit.propertyId) {
					unitToPropertyMap[unit.id] = unit.propertyId
				}
			})

			propertyIds.forEach(propertyId => {
				// Calculate revenue from units in this property
				const propertyUnits = unitData.filter(u => u.propertyId === propertyId)
				const totalRevenue: number = propertyUnits.reduce((sum: number, unit: Unit) => {
					return sum + (unit.rent || 0)
				}, 0)

				// Calculate expenses from maintenance in this property
				// Map maintenance requests to this property via their unitId
				const propertyMaintenance = maintenanceData.filter(m => {
					return m.unitId && unitToPropertyMap[m.unitId] === propertyId
				})
				const totalExpenses: number = propertyMaintenance.reduce((sum: number, m: MaintenanceRequest) => {
					return sum + (m.actualCost || 0)
				}, 0)

				// Calculate NOI
				const netOperatingIncome: number = totalRevenue - totalExpenses

				propertyNOI.push({
					propertyId,
					propertyName: propertyId, // TODO: Get actual property name
					revenue: totalRevenue,
					expenses: totalExpenses,
					netIncome: netOperatingIncome,
					roi: totalRevenue > 0 ? Math.round((netOperatingIncome / totalRevenue) * 100) : 0,
					period: _period
				})
			})

			return propertyNOI
		} catch (error) {
			this.logger.error('Failed to get Net Operating Income via repositories', {
				error: error instanceof Error ? error.message : String(error),
				userId: user.id,
				period: _period
			})
			throw new BadRequestException('Failed to fetch NOI data')
		}
	}
}