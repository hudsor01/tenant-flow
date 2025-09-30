import type { Database, Tables } from '@repo/shared/types/supabase-generated';
import type { QueryParams, TenantStats, Tenant } from '@repo/shared/types/core';

// Type aliases for Input/Update using database schema
export type TenantInput = Database['public']['Tables']['Tenant']['Insert'];
export type TenantUpdate = Database['public']['Tables']['Tenant']['Update'];

/**
 * Tenant query options - extends standard QueryParams with tenant-specific filters
 */
export interface TenantQueryOptions extends QueryParams {
  propertyId?: string;
  status?: string;
}

/**
 * Tenants repository interface
 * Defines all data access operations for Tenant functionality
 */
export interface ITenantsRepository {
  /**
   * Find all tenants for a user with optional filtering
   */
  findByUserIdWithSearch(userId: string, options: TenantQueryOptions): Promise<Tenant[]>;

  /**
   * Find tenant by ID
   */
  findById(tenantId: string): Promise<Tenant | null>;

  /**
   * Find tenants by property ID
   */
  findByPropertyId(propertyId: string): Promise<Tenant[]>;

  /**
   * Create new tenant
   */
  create(userId: string, tenantData: TenantInput): Promise<Tenant>;

  /**
   * Update tenant
   */
  update(tenantId: string, tenantData: TenantUpdate): Promise<Tenant | null>;

  /**
   * Soft delete tenant
   */
  softDelete(userId: string, tenantId: string): Promise<{ success: boolean; message: string }>;

  /**
   * Get tenant statistics for dashboard
   */
  getStats(userId: string): Promise<TenantStats>;

  /**
   * Get tenant analytics for a specific property
   */
  getAnalytics(userId: string, options: { propertyId?: string; timeframe: string }): Promise<Tenant[]>;

  /**
   * Get tenant activity history
   */
  getActivity(userId: string, tenantId: string): Promise<Tables<'Activity'>[]>;
}