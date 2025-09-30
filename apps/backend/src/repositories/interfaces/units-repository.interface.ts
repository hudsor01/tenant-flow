import type { Database } from '@repo/shared/types/supabase-generated';
import type { QueryParams, UnitStats, Unit } from '@repo/shared/types/core';

// Type aliases for Input/Update using database schema
export type UnitInput = Database['public']['Tables']['Unit']['Insert'];
export type UnitUpdate = Database['public']['Tables']['Unit']['Update'];

/**
 * Unit query options - extends standard QueryParams with unit-specific filters
 */
export interface UnitQueryOptions extends QueryParams {
  propertyId?: string;
  status?: Database['public']['Enums']['UnitStatus'];
  type?: string;
}

/**
 * Units repository interface
 * Defines all data access operations for Unit functionality
 */
export interface IUnitsRepository {
  /**
   * Find all units for a user with optional filtering
   */
  findByUserIdWithSearch(userId: string, options: UnitQueryOptions): Promise<Unit[]>;

  /**
   * Find unit by ID
   */
  findById(unitId: string): Promise<Unit | null>;

  /**
   * Find units by property ID
   */
  findByPropertyId(propertyId: string): Promise<Unit[]>;

  /**
   * Create new unit
   */
  create(userId: string, unitData: UnitInput): Promise<Unit>;

  /**
   * Update unit
   */
  update(unitId: string, unitData: UnitUpdate): Promise<Unit | null>;

  /**
   * Soft delete unit
   */
  softDelete(userId: string, unitId: string): Promise<{ success: boolean; message: string }>;

  /**
   * Get unit statistics for dashboard
   */
  getStats(userId: string): Promise<UnitStats>;

  /**
   * Get unit analytics for a specific property
   */
  getAnalytics(userId: string, options: { propertyId?: string; timeframe: string }): Promise<Unit[]>;

  /**
   * Get unit occupancy analytics
   */
  getOccupancyAnalytics(userId: string, options: { propertyId?: string; period: string }): Promise<Unit[]>;

  /**
   * Get available units for a property
   */
  getAvailableUnits(propertyId: string): Promise<Unit[]>;

  /**
   * Update unit status (OCCUPIED, VACANT, MAINTENANCE, etc.)
   */
  updateStatus(unitId: string, status: Database['public']['Enums']['UnitStatus']): Promise<Unit | null>;
}