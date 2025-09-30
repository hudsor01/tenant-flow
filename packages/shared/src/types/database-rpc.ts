/**
 * Database RPC Function Response Types
 *
 * TypeScript interfaces for RPC function responses from Supabase database functions.
 * These provide type safety for complex database queries that return JSON/JSONB data.
 */

/**
 * Response from get_property_performance RPC function
 */
export interface PropertyPerformanceRpcResponse {
  property_name: string;
  property_id: string;
  total_units: number;
  occupied_units: number;
  vacant_units: number;
  occupancy_rate: number;
  annual_revenue: number;
  monthly_revenue: number;
  potential_revenue: number;
  address: string;
  property_type: string;
  status: string;
}

/**
 * Response for occupancy trends (calculated in-app)
 */
export interface OccupancyTrendResponse {
  month: string;
  occupancy_rate: number;
  total_units: number;
  occupied_units: number;
}

/**
 * Response for revenue trends (calculated in-app)
 */
export interface RevenueTrendResponse {
  month: string;
  revenue: number;
  growth: number;
  previous_period_revenue: number;
}

/**
 * Response from get_maintenance_trend_analytics RPC function
 */
export interface MaintenanceAnalyticsRpcResponse {
  avg_resolution_time: number;
  completion_rate: number;
  priority_breakdown: Record<string, number>;
  trends_over_time: Array<{
    month: string;
    completed: number;
    avg_resolution_days: number;
  }>;
}

/**
 * Type guards for runtime validation
 */
export function isPropertyPerformanceRpcResponse(
  data: unknown
): data is PropertyPerformanceRpcResponse {
  if (!data || typeof data !== 'object') return false;

  const obj = data as Record<string, unknown>;
  return (
    'property_name' in obj &&
    typeof obj.property_name === 'string' &&
    'property_id' in obj &&
    typeof obj.property_id === 'string' &&
    'total_units' in obj &&
    typeof obj.total_units === 'number'
  );
}

export function isMaintenanceAnalyticsRpcResponse(
  data: unknown
): data is MaintenanceAnalyticsRpcResponse {
  if (!data || typeof data !== 'object') return false;

  const obj = data as Record<string, unknown>;
  return (
    'avg_resolution_time' in obj &&
    typeof obj.avg_resolution_time === 'number' &&
    'completion_rate' in obj &&
    typeof obj.completion_rate === 'number'
  );
}