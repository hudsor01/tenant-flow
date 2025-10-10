import { Injectable, Logger } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase-generated'
import { SupabaseService } from '../../database/supabase.service'
import {
	Activity,
	ActivityInsert,
	ActivityQueryOptions,
	ActivityUpdate,
	IActivityRepository
} from '../interfaces/activity-repository.interface'

@Injectable()
export class SupabaseActivityRepository implements IActivityRepository {
	private readonly logger = new Logger(SupabaseActivityRepository.name)

	constructor(private readonly supabase: SupabaseService) {}

	async findByUserIdWithSearch(
		userId: string,
		options: ActivityQueryOptions
	): Promise<Activity[]> {
		try {
			this.logger.log('Finding activities with search via repository', {
				userId,
				options
			})

			let query = this.supabase
				.getAdminClient()
				.from('activity')
				.select('*')
				.eq('userId', userId)

			if (options.search) {
				query = query.or(
					`action.ilike.%${options.search}%,entityName.ilike.%${options.search}%`
				)
			}

			if (options.entityType) {
				query = query.eq('entityType', options.entityType)
			}

			if (options.entityId) {
				query = query.eq('entityId', options.entityId)
			}

			if (options.action) {
				query = query.ilike('action', `%${options.action}%`)
			}

			if (options.dateFrom) {
				query = query.gte('createdAt', options.dateFrom.toISOString())
			}

			if (options.dateTo) {
				query = query.lte('createdAt', options.dateTo.toISOString())
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
				this.logger.error('Failed to find activities with search', {
					userId,
					error: error.message,
					options
				})
				return []
			}

			return (data as Activity[]) || []
		} catch (error) {
			this.logger.error(
				`Database error in findByUserIdWithSearch: ${error instanceof Error ? error.message : String(error)}`,
				{
					userId,
					error,
					options
				}
			)
			return []
		}
	}

	async findById(activityId: string): Promise<Activity | null> {
		try {
			this.logger.log('Finding activity by ID via repository', { activityId })

			const { data, error } = await this.supabase
				.getAdminClient()
				.from('activity')
				.select('*')
				.eq('id', activityId)
				.single()

			if (error) {
				this.logger.error('Failed to find activity by ID', {
					activityId,
					error: error.message
				})
				return null
			}

			return (data as Activity) || null
		} catch (error) {
			this.logger.error(
				`Database error in findById: ${error instanceof Error ? error.message : String(error)}`,
				{
					activityId,
					error
				}
			)
			return null
		}
	}

	async findByEntity(
		entityType: Database['public']['Enums']['ActivityEntityType'],
		entityId: string
	): Promise<Activity[]> {
		try {
			this.logger.log('Finding activities by entity via repository', {
				entityType,
				entityId
			})

			const { data, error } = await this.supabase
				.getAdminClient()
				.from('activity')
				.select('*')
				.eq('entityType', entityType)
				.eq('entityId', entityId)
				.order('createdAt', { ascending: false })
				.limit(100)

			if (error) {
				this.logger.error('Failed to find activities by entity', {
					entityType,
					entityId,
					error: error.message
				})
				return []
			}

			return (data as Activity[]) || []
		} catch (error) {
			this.logger.error(
				`Database error in findByEntity: ${error instanceof Error ? error.message : String(error)}`,
				{
					entityType,
					entityId,
					error
				}
			)
			return []
		}
	}

	async create(activityData: ActivityInsert): Promise<Activity> {
		try {
			this.logger.log('Creating activity via repository', { activityData })

			const { data, error } = await this.supabase
				.getAdminClient()
				.from('activity')
				.insert({
					...activityData,
					createdAt: new Date().toISOString()
				})
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to create activity', {
					error: error.message,
					activityData
				})
				throw new Error(`Failed to create activity: ${error.message}`)
			}

			return data as Activity
		} catch (error) {
			this.logger.error(
				`Database error in create: ${error instanceof Error ? error.message : String(error)}`,
				{
					error,
					activityData
				}
			)
			throw error
		}
	}

	async update(
		activityId: string,
		activityData: ActivityUpdate
	): Promise<Activity | null> {
		try {
			this.logger.log('Updating activity via repository', {
				activityId,
				activityData
			})

			const { data, error } = await this.supabase
				.getAdminClient()
				.from('activity')
				.update(activityData)
				.eq('id', activityId)
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to update activity', {
					activityId,
					error: error.message,
					activityData
				})
				return null
			}

			return (data as Activity) || null
		} catch (error) {
			this.logger.error(
				`Database error in update: ${error instanceof Error ? error.message : String(error)}`,
				{
					activityId,
					error,
					activityData
				}
			)
			return null
		}
	}

	async delete(
		activityId: string
	): Promise<{ success: boolean; message: string }> {
		try {
			this.logger.log('Deleting activity via repository', { activityId })

			const { data, error } = await this.supabase
				.getAdminClient()
				.from('activity')
				.delete()
				.eq('id', activityId)
				.select()

			if (error) {
				this.logger.error('Failed to delete activity', {
					activityId,
					error: error.message
				})
				return {
					success: false,
					message: `Failed to delete activity: ${error.message}`
				}
			}

			if (!data || data.length === 0) {
				return { success: false, message: 'Activity not found' }
			}

			return { success: true, message: 'Activity deleted successfully' }
		} catch (error) {
			this.logger.error(
				`Database error in delete: ${error instanceof Error ? error.message : String(error)}`,
				{
					activityId,
					error
				}
			)
			return {
				success: false,
				message: 'Failed to delete activity due to database error'
			}
		}
	}

	async getRecentActivities(userId: string, limit = 20): Promise<Activity[]> {
		try {
			this.logger.log('Getting recent activities via repository', {
				userId,
				limit
			})

			const { data, error } = await this.supabase
				.getAdminClient()
				.from('activity')
				.select('*')
				.eq('userId', userId)
				.order('createdAt', { ascending: false })
				.limit(limit)

			if (error) {
				this.logger.error('Failed to get recent activities', {
					userId,
					limit,
					error: error.message
				})
				return []
			}

			return (data as Activity[]) || []
		} catch (error) {
			this.logger.error(
				`Database error in getRecentActivities: ${error instanceof Error ? error.message : String(error)}`,
				{
					userId,
					limit,
					error
				}
			)
			return []
		}
	}

	async logActivity(
		userId: string,
		entityType: Database['public']['Enums']['ActivityEntityType'],
		entityId: string,
		action: string,
		entityName?: string
	): Promise<Activity> {
		try {
			this.logger.log('Logging activity via repository', {
				userId,
				entityType,
				entityId,
				action,
				entityName
			})

			const activityData: ActivityInsert = {
				userId,
				entityType,
				entityId,
				action,
				entityName: entityName || null
			}

			return await this.create(activityData)
		} catch (error) {
			this.logger.error(
				`Database error in logActivity: ${error instanceof Error ? error.message : String(error)}`,
				{
					userId,
					entityType,
					entityId,
					action,
					entityName,
					error
				}
			)
			throw error
		}
	}

	async getActivityStats(
		userId: string,
		options: { period?: string } = {}
	): Promise<{
		total: number
		today: number
		thisWeek: number
		thisMonth: number
	}> {
		try {
			this.logger.log('Getting activity stats via repository', {
				userId,
				options
			})

			const now = new Date()
			const todayStart = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate()
			)
			const weekStart = new Date(
				todayStart.getTime() - todayStart.getDay() * 24 * 60 * 60 * 1000
			)
			const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

			// Get total activities
			const { count: total, error: totalError } = await this.supabase
				.getAdminClient()
				.from('activity')
				.select('*', { count: 'exact', head: true })
				.eq('userId', userId)

			// Get today's activities
			const { count: today, error: todayError } = await this.supabase
				.getAdminClient()
				.from('activity')
				.select('*', { count: 'exact', head: true })
				.eq('userId', userId)
				.gte('createdAt', todayStart.toISOString())

			// Get this week's activities
			const { count: thisWeek, error: weekError } = await this.supabase
				.getAdminClient()
				.from('activity')
				.select('*', { count: 'exact', head: true })
				.eq('userId', userId)
				.gte('createdAt', weekStart.toISOString())

			// Get this month's activities
			const { count: thisMonth, error: monthError } = await this.supabase
				.getAdminClient()
				.from('activity')
				.select('*', { count: 'exact', head: true })
				.eq('userId', userId)
				.gte('createdAt', monthStart.toISOString())

			if (totalError || todayError || weekError || monthError) {
				this.logger.error('Failed to get activity stats', {
					userId,
					totalError: totalError?.message,
					todayError: todayError?.message,
					weekError: weekError?.message,
					monthError: monthError?.message
				})
				return { total: 0, today: 0, thisWeek: 0, thisMonth: 0 }
			}

			return {
				total: total || 0,
				today: today || 0,
				thisWeek: thisWeek || 0,
				thisMonth: thisMonth || 0
			}
		} catch (error) {
			this.logger.error(
				`Database error in getActivityStats: ${error instanceof Error ? error.message : String(error)}`,
				{
					userId,
					options,
					error
				}
			)
			return { total: 0, today: 0, thisWeek: 0, thisMonth: 0 }
		}
	}

	async getEntityTimeline(
		entityType: Database['public']['Enums']['ActivityEntityType'],
		entityId: string
	): Promise<Activity[]> {
		try {
			this.logger.log('Getting entity timeline via repository', {
				entityType,
				entityId
			})

			const { data, error } = await this.supabase
				.getAdminClient()
				.from('activity')
				.select('*')
				.eq('entityType', entityType)
				.eq('entityId', entityId)
				.order('createdAt', { ascending: true })

			if (error) {
				this.logger.error('Failed to get entity timeline', {
					entityType,
					entityId,
					error: error.message
				})
				return []
			}

			return (data as Activity[]) || []
		} catch (error) {
			this.logger.error(
				`Database error in getEntityTimeline: ${error instanceof Error ? error.message : String(error)}`,
				{
					entityType,
					entityId,
					error
				}
			)
			return []
		}
	}
}
