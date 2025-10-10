import { Injectable, Logger } from '@nestjs/common'
import type {
	CreatePropertyRequest,
	UpdatePropertyRequest
} from '@repo/shared/types/backend-domain'
import type { PropertyStats } from '@repo/shared/types/core'
import type {
	MaintenanceRequest,
	Property,
	Tables,
	Unit
} from '@repo/shared/types/supabase'
import type { Database } from '@repo/shared/types/supabase-generated'
import { SupabaseService } from '../../database/supabase.service'
import {
	DuplicateEntityError,
	EntityNotFoundError,
	RepositoryError
} from '../interfaces/base-repository.interface'
import {
	IPropertiesRepository,
	PropertyAnalyticsOptions,
	PropertyFilterOptions,
	PropertyFinancialAnalytics,
	PropertyMaintenanceAnalytics,
	PropertyOccupancyAnalytics,
	PropertyPerformanceAnalytics,
	PropertySearchOptions
} from '../interfaces/properties-repository.interface'

type ExpenseRecord = Tables<'expense'>

@Injectable()
export class SupabasePropertiesRepository implements IPropertiesRepository {
	private readonly logger = new Logger(SupabasePropertiesRepository.name)

	constructor(private readonly supabase: SupabaseService) {}

	async findById(id: string): Promise<Property | null> {
		try {
			const { data, error } = await this.supabase
				.getAdminClient()
				.from('property')
				.select('*')
				.eq('id', id)
				.single()

			if (error) {
				if (error.code === 'PGRST116') {
					return null // Not found
				}
				throw new RepositoryError(
					`Failed to find property by ID: ${error.message}`,
					error
				)
			}

			return data
		} catch (error) {
			this.logger.error(
				`Database error in findById: ${error instanceof Error ? error.message : String(error)}`,
				{ id, error }
			)
			if (error instanceof RepositoryError) throw error
			throw new RepositoryError('Database operation failed')
		}
	}

	async findByUserId(
		userId: string,
		filters?: PropertyFilterOptions
	): Promise<Property[]> {
		try {
			let query = this.supabase
				.getAdminClient()
				.from('property')
				.select('*')
				.eq('ownerId', userId)

			if (filters?.status) {
				query = query.eq(
					'status',
					filters.status as Database['public']['Enums']['PropertyStatus']
				)
			}

			if (filters?.propertyType) {
				query = query.eq(
					'propertyType',
					filters.propertyType as Database['public']['Enums']['PropertyType']
				)
			}

			if (filters?.city) {
				query = query.eq('city', filters.city)
			}

			if (filters?.state) {
				query = query.eq('state', filters.state)
			}

			if (filters?.search) {
				query = query.or(
					`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%`
				)
			}

			if (filters?.sort) {
				query = query.order(filters.sort.field, {
					ascending: filters.sort.direction === 'asc'
				})
			}

			if (filters?.limit) {
				query = query.limit(filters.limit)
			}

			if (filters?.offset) {
				query = query.range(
					filters.offset,
					filters.offset + (filters.limit || 10) - 1
				)
			}

			const { data, error } = await query

			if (error) {
				throw new RepositoryError(
					`Failed to find properties by user ID: ${error.message}`,
					error
				)
			}

			return data || []
		} catch (error) {
			this.logger.error('Database error in findByUserId', {
				userId,
				filters,
				error
			})
			if (error instanceof RepositoryError) throw error
			throw new RepositoryError('Database operation failed')
		}
	}

	async findByUserIdWithSearch(
		userId: string,
		options: PropertySearchOptions
	): Promise<Property[]> {
		try {
			this.logger.log('Finding properties with search via DIRECT table query', {
				userId,
				options
			})

			let query = this.supabase
				.getAdminClient()
				.from('property')
				.select('*')
				.eq('ownerId', userId)

			if (options.search) {
				query = query.or(
					`name.ilike.%${options.search}%,address.ilike.%${options.search}%,description.ilike.%${options.search}%`
				)
			}

			query = query
				.order('createdAt', { ascending: false })
				.limit(options.limit || 50)
				.range(
					options.offset || 0,
					(options.offset || 0) + (options.limit || 50) - 1
				)

			const { data, error } = await query

			if (error) {
				this.logger.error('Failed to search properties via direct query', {
					userId,
					error: error.message,
					options
				})
				throw new RepositoryError(
					`Failed to search properties: ${error.message}`,
					error
				)
			}

			return (data as unknown as Property[]) || []
		} catch (error) {
			this.logger.error('Database error in findByUserIdWithSearch', {
				userId,
				options,
				error
			})
			if (error instanceof RepositoryError) throw error
			throw new RepositoryError('Database operation failed')
		}
	}

	async findAll(filters?: PropertyFilterOptions): Promise<Property[]> {
		try {
			let query = this.supabase.getAdminClient().from('property').select('*')

			if (filters?.status) {
				query = query.eq(
					'status',
					filters.status as Database['public']['Enums']['PropertyStatus']
				)
			}

			if (filters?.propertyType) {
				query = query.eq(
					'propertyType',
					filters.propertyType as Database['public']['Enums']['PropertyType']
				)
			}

			if (filters?.search) {
				query = query.or(
					`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%`
				)
			}

			if (filters?.sort) {
				query = query.order(filters.sort.field, {
					ascending: filters.sort.direction === 'asc'
				})
			}

			if (filters?.limit) {
				query = query.limit(filters.limit)
			}

			const { data, error } = await query

			if (error) {
				throw new RepositoryError(
					`Failed to find all properties: ${error.message}`,
					error
				)
			}

			return data || []
		} catch (error) {
			this.logger.error('Database error in findAll', { filters, error })
			if (error instanceof RepositoryError) throw error
			throw new RepositoryError('Database operation failed')
		}
	}

	async create(userId: string, data: CreatePropertyRequest): Promise<Property> {
		try {
			this.logger.log('Creating property via DIRECT table insert', {
				userId,
				data
			})

			const propertyData = {
				ownerId: userId,
				name: data.name,
				address: data.address,
				city: data.city,
				state: data.state,
				zipCode: data.zipCode,
				propertyType:
					data.propertyType as Database['public']['Enums']['PropertyType'],
				description: data.description || null,
				status: 'ACTIVE' as Database['public']['Enums']['PropertyStatus'],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}

			const { data: result, error } = await this.supabase
				.getAdminClient()
				.from('property')
				.insert(propertyData)
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to create property via direct insert', {
					userId,
					error: error.message,
					data
				})
				if (error.code === '23505') {
					// Unique constraint violation
					throw new DuplicateEntityError('Property', 'name', data.name)
				}
				throw new RepositoryError(
					`Failed to create property: ${error.message}`,
					error
				)
			}

			return result as unknown as Property
		} catch (error) {
			this.logger.error('Database error in create', { userId, data, error })
			if (error instanceof RepositoryError) throw error
			throw new RepositoryError('Database operation failed')
		}
	}

	async update(id: string, data: UpdatePropertyRequest): Promise<Property> {
		try {
			this.logger.log('Updating property via DIRECT table update', { id, data })

			const updateData = {
				name: data.name,
				address: data.address,
				city: data.city,
				state: data.state,
				zipCode: data.zipCode,
				propertyType:
					data.propertyType as Database['public']['Enums']['PropertyType'],
				description: data.description || null,
				updatedAt: new Date().toISOString()
			}

			const { data: result, error } = await this.supabase
				.getAdminClient()
				.from('property')
				.update(updateData)
				.eq('id', id)
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to update property via direct update', {
					id,
					error: error.message,
					data
				})
				if (error.code === 'PGRST116') {
					throw new EntityNotFoundError('Property', id)
				}
				throw new RepositoryError(
					`Failed to update property: ${error.message}`,
					error
				)
			}

			if (!result) {
				throw new EntityNotFoundError('Property', id)
			}

			return result as unknown as Property
		} catch (error) {
			this.logger.error('Database error in update', { id, data, error })
			if (error instanceof RepositoryError) throw error
			throw new RepositoryError('Database operation failed')
		}
	}

	async delete(id: string): Promise<void> {
		try {
			this.logger.log('Deleting property via DIRECT table delete', { id })

			const { error } = await this.supabase
				.getAdminClient()
				.from('property')
				.delete()
				.eq('id', id)

			if (error) {
				this.logger.error('Failed to delete property via direct delete', {
					id,
					error: error.message
				})
				throw new RepositoryError(
					`Failed to delete property: ${error.message}`,
					error
				)
			}
		} catch (error) {
			this.logger.error('Database error in delete', { id, error })
			if (error instanceof RepositoryError) throw error
			throw new RepositoryError('Database operation failed')
		}
	}

	async softDelete(
		userId: string,
		propertyId: string
	): Promise<{ success: boolean; message: string }> {
		try {
			await this.delete(propertyId)
			return { success: true, message: 'Property deleted successfully' }
		} catch (error) {
			this.logger.error('Database error in softDelete', {
				userId,
				propertyId,
				error
			})
			throw new RepositoryError('Failed to delete property')
		}
	}

	async exists(id: string): Promise<boolean> {
		try {
			const property = await this.findById(id)
			return property !== null
		} catch (error) {
			this.logger.error('Database error in exists', { id, error })
			throw new RepositoryError('Database operation failed')
		}
	}

	async count(filters?: PropertyFilterOptions): Promise<number> {
		try {
			let query = this.supabase
				.getAdminClient()
				.from('property')
				.select('*', { count: 'exact', head: true })

			if (filters?.status) {
				query = query.eq(
					'status',
					filters.status as Database['public']['Enums']['PropertyStatus']
				)
			}

			if (filters?.propertyType) {
				query = query.eq(
					'propertyType',
					filters.propertyType as Database['public']['Enums']['PropertyType']
				)
			}

			const { count, error } = await query

			if (error) {
				throw new RepositoryError(
					`Failed to count properties: ${error.message}`,
					error
				)
			}

			return count || 0
		} catch (error) {
			this.logger.error('Database error in count', { filters, error })
			if (error instanceof RepositoryError) throw error
			throw new RepositoryError('Database operation failed')
		}
	}

	async findAllWithUnits(
		userId: string,
		options: PropertySearchOptions
	): Promise<Property[]> {
		try {
			this.logger.log('Finding properties with units via DIRECT table join', {
				userId,
				options
			})

			let query = this.supabase
				.getAdminClient()
				.from('property')
				.select('*, unit(*)')
				.eq('ownerId', userId)

			if (options.search) {
				query = query.or(
					`name.ilike.%${options.search}%,address.ilike.%${options.search}%,description.ilike.%${options.search}%`
				)
			}

			query = query
				.order('createdAt', { ascending: false })
				.limit(options.limit || 50)
				.range(
					options.offset || 0,
					(options.offset || 0) + (options.limit || 50) - 1
				)

			const { data, error } = await query

			if (error) {
				this.logger.error(
					'Failed to find properties with units via direct join',
					{
						userId,
						error: error.message,
						options
					}
				)
				throw new RepositoryError(
					`Failed to find properties with units: ${error.message}`,
					error
				)
			}

			return (data as unknown as Property[]) || []
		} catch (error) {
			this.logger.error('Database error in findAllWithUnits', {
				userId,
				options,
				error
			})
			if (error instanceof RepositoryError) throw error
			throw new RepositoryError('Database operation failed')
		}
	}

	async getStats(userId: string): Promise<PropertyStats> {
		try {
			this.logger.log('Getting property stats via DIRECT table queries', {
				userId
			})

			// DIRECT queries -
			const [properties, units] = await Promise.all([
				this.supabase
					.getAdminClient()
					.from('property')
					.select('*')
					.eq('ownerId', userId),
				this.supabase
					.getAdminClient()
					.from('unit')
					.select('*')
					.eq('userId', userId)
			])

			if (properties.error || units.error) {
				this.logger.error('Direct queries failed for property stats', {
					userId,
					errors: {
						properties: properties.error?.message,
						units: units.error?.message
					}
				})
				throw new RepositoryError(
					'Failed to get property stats via direct queries'
				)
			}

			// Calculate stats in TypeScript - SIMPLE AND CLEAN
			const propertyData = properties.data || []
			const unitData = units.data || []

			const occupiedUnits = unitData.filter(u => u.status === 'OCCUPIED')
			const vacantUnits = unitData.filter(u => u.status === 'VACANT')
			const totalRent = unitData.reduce(
				(sum, unit) => sum + (unit.rent || 0),
				0
			)

			const stats: PropertyStats = {
				total: propertyData.length,
				occupied: occupiedUnits.length,
				vacant: vacantUnits.length,
				occupancyRate:
					unitData.length > 0
						? Math.round((occupiedUnits.length / unitData.length) * 100)
						: 0,
				totalMonthlyRent: totalRent,
				averageRent:
					unitData.length > 0 ? Math.round(totalRent / unitData.length) : 0
			}

			return stats
		} catch (error) {
			this.logger.error('Database error in getStats', { userId, error })
			if (error instanceof RepositoryError) throw error
			throw new RepositoryError('Database operation failed')
		}
	}

	async getPerformanceAnalytics(
		userId: string,
		options: PropertyAnalyticsOptions
	): Promise<PropertyPerformanceAnalytics[]> {
		try {
			this.logger.log(
				'Getting performance analytics via DIRECT table queries',
				{ userId, options }
			)

			let query = this.supabase
				.getAdminClient()
				.from('property')
				.select('*, unit(*)')
				.eq('ownerId', userId)

			if (options.propertyId) {
				query = query.eq('id', options.propertyId)
			}

			query = query.limit(options.limit || 10)

			const { data, error } = await query

			if (error) {
				this.logger.error('Performance analytics direct query failed', {
					userId,
					error: error.message,
					options
				})
				throw new RepositoryError(
					`Failed to get performance analytics: ${error.message}`,
					error
				)
			}

			const properties = data || []
			const propertyIds = properties.map(property => property.id)
			const { startDate, endDate } = this.calculateDateRange(
				options.timeframe || '12m'
			)
			const expenses = await this.fetchExpenses(propertyIds, startDate, endDate)
			const expensesByProperty = this.groupExpensesByProperty(expenses)
			const timeframeMonths = this.convertTimeframeToMonths(
				options.timeframe || '12m'
			)

			const analytics: PropertyPerformanceAnalytics[] = properties.map(
				property => {
					const units = (property.unit || []) as Unit[]
					const totalUnits = units.length
					const occupiedUnits = units.filter(u => u.status === 'OCCUPIED')
					const monthlyRevenue = occupiedUnits.reduce(
						(sum, unit) => sum + (unit.rent || 0),
						0
					)
					const revenue = monthlyRevenue * timeframeMonths
					const expensesTotal = expensesByProperty.get(property.id) ?? 0
					const netIncome = revenue - expensesTotal

					return {
						propertyId: property.id,
						propertyName: property.name,
						period: options.period || options.timeframe || 'custom',
						occupancyRate:
							totalUnits > 0
								? Math.round((occupiedUnits.length / totalUnits) * 100)
								: 0,
						revenue,
						expenses: expensesTotal,
						netIncome,
						roi: revenue > 0 ? Math.round((netIncome / revenue) * 100) : 0
					}
				}
			)

			return analytics
		} catch (error) {
			this.logger.error('Database error in getPerformanceAnalytics', {
				userId,
				options,
				error
			})
			if (error instanceof RepositoryError) throw error
			throw new RepositoryError('Database operation failed')
		}
	}

	async getOccupancyAnalytics(
		userId: string,
		options: PropertyAnalyticsOptions
	): Promise<PropertyOccupancyAnalytics[]> {
		try {
			this.logger.log('Getting occupancy analytics via DIRECT table queries', {
				userId,
				options
			})

			let query = this.supabase
				.getAdminClient()
				.from('property')
				.select('*, unit(*)')
				.eq('ownerId', userId)

			if (options.propertyId) {
				query = query.eq('id', options.propertyId)
			}

			const { data, error } = await query

			if (error) {
				this.logger.error('Occupancy analytics direct query failed', {
					userId,
					error: error.message,
					options
				})
				throw new RepositoryError(
					`Failed to get occupancy analytics: ${error.message}`,
					error
				)
			}

			const properties = data || []
			const units = properties.flatMap(
				property => (property.unit || []) as Unit[]
			)
			const unitIds = units.map(unit => unit.id)
			const unitToProperty = new Map<string, string>()
			for (const unit of units) {
				if (unit.id && unit.propertyId) {
					unitToProperty.set(unit.id, unit.propertyId)
				}
			}

			const { startDate, endDate } = this.calculatePeriodRange(
				options.period || 'monthly'
			)
			const leases = await this.fetchLeases(unitIds, startDate, endDate)

			const moveCounts = new Map<
				string,
				{ moveIns: number; moveOuts: number }
			>()
			for (const lease of leases) {
				const propertyId = unitToProperty.get(lease.unitId ?? '')
				if (!propertyId) {
					continue
				}
				if (!moveCounts.has(propertyId)) {
					moveCounts.set(propertyId, { moveIns: 0, moveOuts: 0 })
				}
				const counts = moveCounts.get(propertyId)!
				const start = new Date(lease.startDate)
				const end = new Date(lease.endDate)
				if (startDate && start >= startDate && (!endDate || start <= endDate)) {
					counts.moveIns += 1
				}
				if (endDate && end >= startDate! && end <= endDate) {
					counts.moveOuts += 1
				}
			}

			const analytics: PropertyOccupancyAnalytics[] = properties.map(
				property => {
					const propertyUnits = (property.unit || []) as Unit[]
					const statusCounts = propertyUnits.reduce(
						(acc: Record<string, number>, unit) => {
							acc[unit.status] = (acc[unit.status] || 0) + 1
							return acc
						},
						{}
					)

					const occupiedUnits = statusCounts.OCCUPIED || 0
					const totalUnits = propertyUnits.length
					const counts = moveCounts.get(property.id) || {
						moveIns: 0,
						moveOuts: 0
					}

					return {
						propertyId: property.id,
						propertyName: property.name,
						period: options.period || 'monthly',
						occupancyRate:
							totalUnits > 0
								? Math.round((occupiedUnits / totalUnits) * 100)
								: 0,
						unitsOccupied: occupiedUnits,
						unitsTotal: totalUnits,
						moveIns: counts.moveIns,
						moveOuts: counts.moveOuts
					}
				}
			)

			return analytics
		} catch (error) {
			this.logger.error('Database error in getOccupancyAnalytics', {
				userId,
				options,
				error
			})
			if (error instanceof RepositoryError) throw error
			throw new RepositoryError('Database operation failed')
		}
	}

	async getFinancialAnalytics(
		userId: string,
		options: PropertyAnalyticsOptions
	): Promise<PropertyFinancialAnalytics[]> {
		try {
			this.logger.log('Getting financial analytics via DIRECT table queries', {
				userId,
				options
			})

			let query = this.supabase
				.getAdminClient()
				.from('property')
				.select('*, unit(*), lease(*)')
				.eq('ownerId', userId)

			if (options.propertyId) {
				query = query.eq('id', options.propertyId)
			}

			const { data, error } = await query

			if (error) {
				this.logger.error('Financial analytics direct query failed', {
					userId,
					error: error.message,
					options
				})
				throw new RepositoryError(
					`Failed to get financial analytics: ${error.message}`,
					error
				)
			}

			const properties = data || []
			const propertyIds = properties.map(property => property.id)
			const { startDate, endDate } = this.calculateDateRange(
				options.timeframe || '12m'
			)
			const expenses = await this.fetchExpenses(propertyIds, startDate, endDate)
			const expensesByProperty = this.groupExpensesByCategory(expenses)
			const timeframeMonths = this.convertTimeframeToMonths(
				options.timeframe || '12m'
			)

			const analytics: PropertyFinancialAnalytics[] = properties.map(
				property => {
					const units = (property.unit || []) as Unit[]
					const occupiedUnits = units.filter(unit => unit.status === 'OCCUPIED')
					const monthlyRevenue = occupiedUnits.reduce(
						(sum, unit) => sum + (unit.rent || 0),
						0
					)
					const revenue = monthlyRevenue * timeframeMonths

					const expenseSummary = expensesByProperty.get(property.id) || {
						total: 0,
						operating: 0,
						maintenance: 0,
						capex: 0
					}

					const netIncome = revenue - expenseSummary.total
					const cashFlow = netIncome

					return {
						propertyId: property.id,
						propertyName: property.name,
						period: options.period || options.timeframe || 'custom',
						revenue,
						expenses: expenseSummary.total,
						netIncome,
						operatingExpenses: expenseSummary.operating,
						maintenanceExpenses: expenseSummary.maintenance,
						capexExpenses: expenseSummary.capex,
						cashFlow
					}
				}
			)

			return analytics
		} catch (error) {
			this.logger.error('Database error in getFinancialAnalytics', {
				userId,
				options,
				error
			})
			if (error instanceof RepositoryError) throw error
			throw new RepositoryError('Database operation failed')
		}
	}

	private async fetchExpenses(
		propertyIds: string[],
		startDate?: Date | null,
		endDate?: Date | null
	) {
		if (!propertyIds.length) {
			return [] as ExpenseRecord[]
		}

		try {
			let query = this.supabase
				.getAdminClient()
				.from('expense')
				.select('*')
				.in('propertyId', propertyIds)

			if (startDate) {
				query = query.gte('date', startDate.toISOString())
			}
			if (endDate) {
				query = query.lte('date', endDate.toISOString())
			}

			const { data, error } = await query
			if (error) {
				this.logger.error('Expense query failed for property analytics', {
					error: error.message,
					propertyIds,
					startDate: startDate?.toISOString(),
					endDate: endDate?.toISOString()
				})
				return []
			}

			return (data as ExpenseRecord[]) ?? []
		} catch (error) {
			this.logger.error(
				'Unexpected error fetching expenses for property analytics',
				{
					error: error instanceof Error ? error.message : String(error),
					propertyIds,
					startDate: startDate?.toISOString(),
					endDate: endDate?.toISOString()
				}
			)
			return []
		}
	}

	private groupExpensesByProperty(expenses: ExpenseRecord[]) {
		const map = new Map<string, number>()
		for (const expense of expenses) {
			if (!expense.propertyId) {
				continue
			}
			map.set(
				expense.propertyId,
				(map.get(expense.propertyId) ?? 0) + (expense.amount ?? 0)
			)
		}
		return map
	}

	private groupExpensesByCategory(expenses: ExpenseRecord[]) {
		const map = new Map<
			string,
			{ total: number; operating: number; maintenance: number; capex: number }
		>()

		for (const expense of expenses) {
			if (!expense.propertyId) {
				continue
			}

			if (!map.has(expense.propertyId)) {
				map.set(expense.propertyId, {
					total: 0,
					operating: 0,
					maintenance: 0,
					capex: 0
				})
			}

			const summary = map.get(expense.propertyId)!
			const amount = expense.amount ?? 0
			summary.total += amount

			const category = expense.category?.toLowerCase() ?? ''
			if (category.includes('maintenance') || category.includes('repair')) {
				summary.maintenance += amount
			} else if (
				category.includes('capex') ||
				category.includes('capital') ||
				category.includes('improvement')
			) {
				summary.capex += amount
			} else {
				summary.operating += amount
			}
		}

		return map
	}

	private calculateDateRange(timeframe: string) {
		const lower = (timeframe || '12m').toLowerCase()
		if (lower === 'all' || lower === 'lifetime') {
			return { startDate: null, endDate: null }
		}

		const now = new Date()
		now.setHours(23, 59, 59, 999)

		const match = lower.match(/^(\d+)([dmy])$/)
		if (match) {
			const value = parseInt(match[1]!, 10)
			const unit = match[2]!
			const start = new Date(now)
			if (unit === 'd') {
				start.setDate(start.getDate() - value)
			} else if (unit === 'm') {
				start.setMonth(start.getMonth() - value)
			} else {
				start.setFullYear(start.getFullYear() - value)
			}
			start.setHours(0, 0, 0, 0)
			return { startDate: start, endDate: now }
		}

		switch (lower) {
			case 'weekly': {
				const start = new Date(now)
				start.setDate(start.getDate() - 7)
				start.setHours(0, 0, 0, 0)
				return { startDate: start, endDate: now }
			}
			case 'monthly': {
				const start = new Date(now)
				start.setMonth(start.getMonth() - 1)
				start.setHours(0, 0, 0, 0)
				return { startDate: start, endDate: now }
			}
			case 'quarterly': {
				const start = new Date(now)
				start.setMonth(start.getMonth() - 3)
				start.setHours(0, 0, 0, 0)
				return { startDate: start, endDate: now }
			}
			case 'yearly':
			case 'annually':
			default: {
				const start = new Date(now)
				start.setFullYear(start.getFullYear() - 1)
				start.setHours(0, 0, 0, 0)
				return { startDate: start, endDate: now }
			}
		}
	}

	private convertTimeframeToMonths(timeframe: string) {
		const lower = (timeframe || '12m').toLowerCase()
		if (lower === 'all' || lower === 'lifetime') {
			return 12
		}

		const match = lower.match(/^(\d+)([dmy])$/)
		if (match) {
			const value = parseInt(match[1]!, 10)
			const unit = match[2]!
			if (unit === 'd') {
				return value / 30
			}
			if (unit === 'm') {
				return value
			}
			if (unit === 'y') {
				return value * 12
			}
		}

		switch (lower) {
			case 'weekly':
				return 0.25
			case 'monthly':
				return 1
			case 'quarterly':
				return 3
			case 'yearly':
			case 'annually':
				return 12
			default:
				return 12
		}
	}

	private calculatePeriodRange(period: string) {
		const now = new Date()
		now.setHours(23, 59, 59, 999)
		const start = new Date(now)

		switch (period.toLowerCase()) {
			case 'daily':
				start.setDate(start.getDate() - 1)
				break
			case 'weekly':
				start.setDate(start.getDate() - 7)
				break
			case 'monthly':
				start.setMonth(start.getMonth() - 1)
				break
			case 'quarterly':
				start.setMonth(start.getMonth() - 3)
				break
			case 'yearly':
				start.setFullYear(start.getFullYear() - 1)
				break
			default:
				start.setMonth(start.getMonth() - 1)
				break
		}

		start.setHours(0, 0, 0, 0)

		return { startDate: start, endDate: now }
	}

	private async fetchLeases(
		unitIds: string[],
		startDate?: Date | null,
		endDate?: Date | null
	) {
		if (!unitIds.length) {
			return [] as Tables<'lease'>[]
		}

		try {
			let query = this.supabase
				.getAdminClient()
				.from('lease')
				.select('*')
				.in('unitId', unitIds)

			if (startDate) {
				query = query.gte('startDate', startDate.toISOString())
			}
			if (endDate) {
				query = query.lte('endDate', endDate.toISOString())
			}

			const { data, error } = await query
			if (error) {
				this.logger.error('Lease query failed for occupancy analytics', {
					error: error.message,
					unitCount: unitIds.length,
					startDate: startDate?.toISOString(),
					endDate: endDate?.toISOString()
				})
				return []
			}

			return (data as Tables<'lease'>[]) ?? []
		} catch (error) {
			this.logger.error(
				'Unexpected error fetching leases for occupancy analytics',
				{
					error: error instanceof Error ? error.message : String(error),
					unitCount: unitIds.length,
					startDate: startDate?.toISOString(),
					endDate: endDate?.toISOString()
				}
			)
			return []
		}
	}

	async getMaintenanceAnalytics(
		userId: string,
		options: PropertyAnalyticsOptions
	): Promise<PropertyMaintenanceAnalytics[]> {
		try {
			this.logger.log(
				'Getting maintenance analytics via DIRECT table queries',
				{ userId, options }
			)

			// Get properties, units, and maintenance requests
			let propertyQuery = this.supabase
				.getAdminClient()
				.from('property')
				.select('*')
				.eq('ownerId', userId)

			if (options.propertyId) {
				propertyQuery = propertyQuery.eq('id', options.propertyId)
			}

			const [properties, units, maintenanceRequests] = await Promise.all([
				propertyQuery,
				this.supabase
					.getAdminClient()
					.from('unit')
					.select('*')
					.eq('userId', userId),
				this.supabase
					.getAdminClient()
					.from('maintenance_request')
					.select('*')
					.eq('userId', userId)
			])

			if (properties.error || units.error || maintenanceRequests.error) {
				this.logger.error('Maintenance analytics direct queries failed', {
					userId,
					errors: {
						properties: properties.error?.message,
						units: units.error?.message,
						maintenance: maintenanceRequests.error?.message
					},
					options
				})
				throw new RepositoryError(
					'Failed to get maintenance analytics via direct queries'
				)
			}

			// Create unit to property mapping
			const unitToPropertyMap: Record<string, string> = {}
			;(units.data || []).forEach(unit => {
				if (unit.propertyId) {
					unitToPropertyMap[unit.id] = unit.propertyId
				}
			})

			// Calculate maintenance analytics with proper typing
			const analytics: PropertyMaintenanceAnalytics[] = (
				properties.data || []
			).map(property => {
				const requests = (
					(maintenanceRequests.data || []) as MaintenanceRequest[]
				).filter(
					req => req.unitId && unitToPropertyMap[req.unitId] === property.id
				)

				const statusCounts = requests.reduce(
					(acc: Record<string, number>, req) => {
						acc[req.status] = (acc[req.status] || 0) + 1
						return acc
					},
					{}
				)

				const completedRequests = statusCounts.COMPLETED || 0
				const pendingRequests =
					(statusCounts.OPEN || 0) + (statusCounts.IN_PROGRESS || 0)
				const totalCost = requests.reduce(
					(sum, req) => sum + (req.actualCost || req.estimatedCost || 0),
					0
				)
				const avgCost =
					requests.length > 0 ? Math.round(totalCost / requests.length) : 0
				const emergencyRequests = requests.filter(
					req => req.priority === 'EMERGENCY'
				).length

				return {
					propertyId: property.id,
					propertyName: property.name,
					period: options.period || 'monthly',
					totalRequests: requests.length,
					completedRequests: completedRequests,
					pendingRequests: pendingRequests,
					avgResolutionTime: 0, // Average resolution time pending once completion timestamps are available
					totalCost: totalCost,
					avgCost: avgCost,
					emergencyRequests: emergencyRequests
				}
			})

			return analytics
		} catch (error) {
			this.logger.error('Database error in getMaintenanceAnalytics', {
				userId,
				options,
				error
			})
			if (error instanceof RepositoryError) throw error
			throw new RepositoryError('Database operation failed')
		}
	}
}
