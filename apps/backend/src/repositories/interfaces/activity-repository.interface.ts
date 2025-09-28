import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  QueryParams
} from '@repo/shared';

// Use confirmed Activity table type from Supabase
export type Activity = Tables<'Activity'>;
export type ActivityInsert = TablesInsert<'Activity'>;
export type ActivityUpdate = TablesUpdate<'Activity'>;

/**
 * Activity query options - extends standard QueryParams with activity-specific filters
 */
export interface ActivityQueryOptions extends QueryParams {
  entityType?: Database['public']['Enums']['ActivityEntityType'];
  entityId?: string;
  action?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Activity repository interface
 * Defines all data access operations for Activity functionality
 */
export interface IActivityRepository {
  /**
   * Find all activities for a user with optional filtering
   */
  findByUserIdWithSearch(userId: string, options: ActivityQueryOptions): Promise<Activity[]>;

  /**
   * Find activity by ID
   */
  findById(activityId: string): Promise<Activity | null>;

  /**
   * Find activities by entity (property, unit, tenant, etc.)
   */
  findByEntity(entityType: Database['public']['Enums']['ActivityEntityType'], entityId: string): Promise<Activity[]>;

  /**
   * Create new activity log entry
   */
  create(activityData: ActivityInsert): Promise<Activity>;

  /**
   * Update activity log entry
   */
  update(activityId: string, activityData: ActivityUpdate): Promise<Activity | null>;

  /**
   * Delete activity log entry
   */
  delete(activityId: string): Promise<{ success: boolean; message: string }>;

  /**
   * Get recent activities for a user (dashboard feed)
   */
  getRecentActivities(userId: string, limit?: number): Promise<Activity[]>;

  /**
   * Log a new activity (convenience method)
   */
  logActivity(
    userId: string,
    entityType: Database['public']['Enums']['ActivityEntityType'],
    entityId: string,
    action: string,
    entityName?: string
  ): Promise<Activity>;

  /**
   * Get activity statistics for dashboard
   */
  getActivityStats(userId: string, options: { period?: string }): Promise<{
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  }>;

  /**
   * Get activity timeline for a specific entity
   */
  getEntityTimeline(
    entityType: Database['public']['Enums']['ActivityEntityType'],
    entityId: string
  ): Promise<Activity[]>;
}