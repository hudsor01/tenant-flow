import type {
  DashboardStats,
  PropertyPerformance,
  SystemUptime
} from '@repo/shared';
import type { ActivityQueryOptions } from './activity-repository.interface';

/**
 * Billing insights query options
 */
export interface BillingInsightsOptions {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Dashboard repository interface
 * Defines all data access operations for Dashboard functionality
 */
export interface IDashboardRepository {
  /**
   * Get comprehensive dashboard statistics for a user
   */
  getStats(userId: string): Promise<DashboardStats>;

  /**
   * Get recent activity feed from Activity table
   */
  getActivity(userId: string, options?: ActivityQueryOptions): Promise<{ activities: unknown[] }>;

  /**
   * Get property performance metrics for dashboard
   */
  getPropertyPerformance(userId: string): Promise<PropertyPerformance[]>;

  /**
   * Get system uptime metrics
   */
  getUptime(): Promise<SystemUptime>;

  /**
   * Get comprehensive billing insights using RPC
   */
  getBillingInsights(options?: BillingInsightsOptions): Promise<Record<string, unknown>>;

  /**
   * Check if billing insights are available (health check)
   */
  isBillingInsightsAvailable(): Promise<boolean>;
}