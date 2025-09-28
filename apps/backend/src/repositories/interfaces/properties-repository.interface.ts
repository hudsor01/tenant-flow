import type {
  Property,
  PropertyStats,
  CreatePropertyRequest,
  UpdatePropertyRequest
} from '@repo/shared';
import type { BaseRepository, BaseFilterOptions } from './base-repository.interface';

/**
 * Properties-specific filter options
 */
export interface PropertyFilterOptions extends BaseFilterOptions {
  status?: string;
  propertyType?: string;
  city?: string;
  state?: string;
}

/**
 * Property search query options
 */
export interface PropertySearchOptions {
  search?: string | null;
  limit: number;
  offset: number;
}

/**
 * Analytics query options
 */
export interface PropertyAnalyticsOptions {
  propertyId?: string;
  timeframe?: string;
  period?: string;
  limit?: number;
}

/**
 * Analytics result interfaces
 */
export interface PropertyPerformanceAnalytics {
  propertyId: string;
  propertyName: string;
  period: string;
  occupancyRate: number;
  revenue: number;
  expenses: number;
  netIncome: number;
  roi: number;
}

export interface PropertyOccupancyAnalytics {
  propertyId: string;
  propertyName: string;
  period: string;
  occupancyRate: number;
  unitsOccupied: number;
  unitsTotal: number;
  moveIns: number;
  moveOuts: number;
}

export interface PropertyFinancialAnalytics {
  propertyId: string;
  propertyName: string;
  period: string;
  revenue: number;
  expenses: number;
  netIncome: number;
  operatingExpenses: number;
  maintenanceExpenses: number;
  capexExpenses: number;
  cashFlow: number;
}

export interface PropertyMaintenanceAnalytics {
  propertyId: string;
  propertyName: string;
  period: string;
  totalRequests: number;
  completedRequests: number;
  pendingRequests: number;
  avgResolutionTime: number;
  totalCost: number;
  avgCost: number;
  emergencyRequests: number;
}

/**
 * Properties repository interface
 * Defines all data access operations for Property entities
 */
export interface IPropertiesRepository extends BaseRepository<
  Property,
  CreatePropertyRequest,
  UpdatePropertyRequest,
  PropertyFilterOptions
> {
  /**
   * Find properties by user ID with search and pagination
   */
  findByUserIdWithSearch(
    userId: string,
    options: PropertySearchOptions
  ): Promise<Property[]>;

  /**
   * Find properties with their associated units
   */
  findAllWithUnits(
    userId: string,
    options: PropertySearchOptions
  ): Promise<Property[]>;

  /**
   * Get property statistics for a user
   */
  getStats(userId: string): Promise<PropertyStats>;

  /**
   * Get property performance analytics
   */
  getPerformanceAnalytics(
    userId: string,
    options: PropertyAnalyticsOptions
  ): Promise<PropertyPerformanceAnalytics[]>;

  /**
   * Get property occupancy analytics
   */
  getOccupancyAnalytics(
    userId: string,
    options: PropertyAnalyticsOptions
  ): Promise<PropertyOccupancyAnalytics[]>;

  /**
   * Get property financial analytics
   */
  getFinancialAnalytics(
    userId: string,
    options: PropertyAnalyticsOptions
  ): Promise<PropertyFinancialAnalytics[]>;

  /**
   * Get property maintenance analytics
   */
  getMaintenanceAnalytics(
    userId: string,
    options: PropertyAnalyticsOptions
  ): Promise<PropertyMaintenanceAnalytics[]>;

  /**
   * Soft delete property (set status to inactive)
   */
  softDelete(userId: string, propertyId: string): Promise<{ success: boolean; message: string }>;
}

/**
 * Property-specific DTOs for repository operations
 */
export interface CreatePropertyData {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  description?: string;
  imageUrl?: string;
}

export interface UpdatePropertyData {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  propertyType?: string;
  description?: string;
  imageUrl?: string;
  status?: string;
}