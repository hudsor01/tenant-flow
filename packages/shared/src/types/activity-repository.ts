import type { Database, TablesInsert, TablesUpdate } from './supabase-generated.js'
import type { QueryParams } from './core.js'
import type { Activity } from './activity.js'

export type ActivityInsert = TablesInsert<'Activity'>
export type ActivityUpdate = TablesUpdate<'Activity'>

export interface ActivityQueryOptions extends QueryParams {
  entityType?: Database['public']['Enums']['ActivityEntityType']
  entityId?: string
  action?: string
  dateFrom?: Date
  dateTo?: Date
}

export interface ActivityRepositoryContract {
  findByUserIdWithSearch(userId: string, options: ActivityQueryOptions): Promise<Activity[]>
  findById(activityId: string): Promise<Activity | null>
  findByEntity(
    entityType: Database['public']['Enums']['ActivityEntityType'],
    entityId: string
  ): Promise<Activity[]>
  create(activityData: ActivityInsert): Promise<Activity>
  update(activityId: string, activityData: ActivityUpdate): Promise<Activity | null>
  delete(activityId: string): Promise<{ success: boolean; message: string }>
  getRecentActivities(userId: string, limit?: number): Promise<Activity[]>
  logActivity(
    userId: string,
    entityType: Database['public']['Enums']['ActivityEntityType'],
    entityId: string,
    action: string,
    entityName?: string
  ): Promise<Activity>
  getActivityStats(
    userId: string,
    options: { period?: string }
  ): Promise<{ total: number; today: number; thisWeek: number; thisMonth: number }>
  getEntityTimeline(
    entityType: Database['public']['Enums']['ActivityEntityType'],
    entityId: string
  ): Promise<Activity[]>
}
