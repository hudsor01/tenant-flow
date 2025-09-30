import { Injectable, Logger } from '@nestjs/common';
import type {
    Database,
    TablesInsert,
    TablesUpdate
} from '@repo/shared/types/supabase-generated';
import type {
    Unit
} from '@repo/shared/types/supabase';
import type {
    UnitInput,
    UnitStats,
    UnitUpdate
} from '@repo/shared/types/core';
import { SupabaseService } from '../../database/supabase.service';
import {
    IUnitsRepository,
    UnitQueryOptions
} from '../interfaces/units-repository.interface';

@Injectable()
export class SupabaseUnitsRepository implements IUnitsRepository {
  private readonly logger = new Logger(SupabaseUnitsRepository.name);

  constructor(private readonly supabase: SupabaseService) {}

  async findByUserIdWithSearch(userId: string, options: UnitQueryOptions): Promise<Unit[]> {
    try {
      this.logger.log('Finding units with search via repository', { userId, options });

      let query = this.supabase
        .getAdminClient()
        .from('Unit')
        .select('*')
        .eq('userId', userId);

      if (options.search) {
        query = query.or(`unitNumber.ilike.%${options.search}%,description.ilike.%${options.search}%`);
      }

      if (options.propertyId) {
        query = query.eq('propertyId', options.propertyId);
      }

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.type) {
        query = query.eq('type', options.type);
      }

      query = query
        .order('createdAt', { ascending: false })
        .limit(options.limit || 50)
        .range(options.offset || 0, (options.offset || 0) + (options.limit || 50) - 1);

      const { data, error } = await query;

      if (error) {
        this.logger.error('Failed to find units with search', {
          userId,
          error: error.message,
          options
        });
        return [];
      }

      return (data as unknown as Unit[]) || [];
    } catch (error) {
      this.logger.error(`Database error in findByUserIdWithSearch: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        error,
        options
      });
      return [];
    }
  }

  async findById(unitId: string): Promise<Unit | null> {
    try {
      this.logger.log('Finding unit by ID via repository', { unitId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Unit')
        .select('*')
        .eq('id', unitId)
        .single();

      if (error) {
        this.logger.error('Failed to find unit by ID', {
          unitId,
          error: error.message
        });
        return null;
      }

      return (data as unknown as Unit) || null;
    } catch (error) {
      this.logger.error(`Database error in findById: ${error instanceof Error ? error.message : String(error)}`, {
        unitId,
        error
      });
      return null;
    }
  }

  async findByPropertyId(propertyId: string): Promise<Unit[]> {
    try {
      this.logger.log('Finding units by property ID via repository', { propertyId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Unit')
        .select('*')
        .eq('propertyId', propertyId)
        .order('unitNumber', { ascending: true });

      if (error) {
        this.logger.error('Failed to find units by property ID', {
          propertyId,
          error: error.message
        });
        return [];
      }

      return (data as unknown as Unit[]) || [];
    } catch (error) {
      this.logger.error(`Database error in findByPropertyId: ${error instanceof Error ? error.message : String(error)}`, {
        propertyId,
        error
      });
      return [];
    }
  }

  async create(userId: string, unitData: UnitInput): Promise<Unit> {
    try {
      this.logger.log('Creating unit via repository', { userId, unitData });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Unit')
        .insert({
          ...unitData,
          status: 'VACANT' as Database['public']['Enums']['UnitStatus'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as TablesInsert<'Unit'>)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to create unit', {
          userId,
          error: error.message,
          unitData
        });
        throw new Error(`Failed to create unit: ${error.message}`);
      }

      return data as unknown as Unit;
    } catch (error) {
      this.logger.error(`Database error in create: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        error,
        unitData
      });
      throw error;
    }
  }

  async update(unitId: string, unitData: UnitUpdate): Promise<Unit | null> {
    try {
      this.logger.log('Updating unit via repository', { unitId, unitData });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Unit')
        .update({
          ...unitData,
          updatedAt: new Date().toISOString()
        } as TablesUpdate<'Unit'>)
        .eq('id', unitId)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to update unit', {
          unitId,
          error: error.message,
          unitData
        });
        return null;
      }

      return (data as unknown as Unit) || null;
    } catch (error) {
      this.logger.error(`Database error in update: ${error instanceof Error ? error.message : String(error)}`, {
        unitId,
        error,
        unitData
      });
      return null;
    }
  }

  async softDelete(userId: string, unitId: string): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log('Soft deleting unit via repository', { userId, unitId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Unit')
        .update({
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .eq('id', unitId)
        .eq('userId', userId)
        .select();

      if (error) {
        this.logger.error('Failed to soft delete unit', {
          userId,
          unitId,
          error: error.message
        });
        return { success: false, message: `Failed to delete unit: ${error.message}` };
      }

      if (!data || data.length === 0) {
        return { success: false, message: 'Unit not found or not authorized' };
      }

      return { success: true, message: 'Unit deleted successfully' };
    } catch (error) {
      this.logger.error(`Database error in softDelete: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        unitId,
        error
      });
      return { success: false, message: 'Failed to delete unit due to database error' };
    }
  }

  async getStats(userId: string): Promise<UnitStats> {
    try {
      this.logger.log('Getting unit stats via DIRECT table query', { userId });

      // DIRECT query -
      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Unit')
        .select('*')
        .eq('userId', userId);

      if (error) {
        this.logger.error('Unit stats direct query failed', { userId, error: error.message });
        return {
          total: 0,
          occupied: 0,
          vacant: 0,
          maintenance: 0,
          averageRent: 0,
          available: 0,
          occupancyRate: 0,
          occupancyChange: 0,
          totalPotentialRent: 0,
          totalActualRent: 0
        };
      }

      // Calculate stats in TypeScript - SIMPLE AND CLEAN
      const units = data || [];
      const occupiedUnits = units.filter(u => u.status === 'OCCUPIED');
      const vacantUnits = units.filter(u => u.status === 'VACANT');
      const maintenanceUnits = units.filter(u => u.status === 'MAINTENANCE');

      const totalRent = units.reduce((sum, unit) => sum + (unit.rent || 0), 0);
      const actualRent = occupiedUnits.reduce((sum, unit) => sum + (unit.rent || 0), 0);

      return {
        total: units.length,
        occupied: occupiedUnits.length,
        vacant: vacantUnits.length,
        maintenance: maintenanceUnits.length,
        averageRent: units.length > 0 ? Math.round(totalRent / units.length) : 0,
        available: vacantUnits.length,
        occupancyRate: units.length > 0 ? Math.round((occupiedUnits.length / units.length) * 100) : 0,
        occupancyChange: 0, // Historical trend calculation will be enabled when data snapshots are available
        totalPotentialRent: totalRent,
        totalActualRent: actualRent
      };
    } catch (error) {
      this.logger.error(`Database error in getStats: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        error
      });
      return {
        total: 0,
        occupied: 0,
        vacant: 0,
        maintenance: 0,
        averageRent: 0,
        available: 0,
        occupancyRate: 0,
        occupancyChange: 0,
        totalPotentialRent: 0,
        totalActualRent: 0
      };
    }
  }

  async getAnalytics(userId: string, options: { propertyId?: string; timeframe: string }): Promise<Unit[]> {
    try {
      this.logger.log('Getting unit analytics via DIRECT table query', { userId, options });

      let query = this.supabase
        .getAdminClient()
        .from('Unit')
        .select('*')
        .eq('userId', userId);

      if (options.propertyId) {
        query = query.eq('propertyId', options.propertyId);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Unit analytics direct query failed', { userId, error: error.message, options });
        return [];
      }

      // Return Unit array directly
      return (data as unknown as Unit[]) || [];
    } catch (error) {
      this.logger.error(`Database error in getAnalytics: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        error,
        options
      });
      return [];
    }
  }

  async getOccupancyAnalytics(userId: string, options: { propertyId?: string; period: string }): Promise<Unit[]> {
    try {
      this.logger.log('Getting unit occupancy analytics via DIRECT table query', { userId, options });

      // DIRECT query -
      let query = this.supabase
        .getAdminClient()
        .from('Unit')
        .select('*')
        .eq('userId', userId);

      if (options.propertyId) {
        query = query.eq('propertyId', options.propertyId);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Unit occupancy analytics direct query failed', { userId, error: error.message, options });
        return [];
      }

      // Calculate occupancy analytics in TypeScript - SIMPLE AND CLEAN
      // Return Unit array directly
      return (data as unknown as Unit[]) || [];
    } catch (error) {
      this.logger.error(`Database error in getOccupancyAnalytics: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        error,
        options
      });
      return [];
    }
  }

  async getAvailableUnits(propertyId: string): Promise<Unit[]> {
    try {
      this.logger.log('Getting available units via repository', { propertyId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Unit')
        .select('*')
        .eq('propertyId', propertyId)
        .eq('status', 'VACANT')
        .is('deletedAt', null)
        .order('unitNumber', { ascending: true });

      if (error) {
        this.logger.error('Failed to get available units', {
          propertyId,
          error: error.message
        });
        return [];
      }

      return (data as unknown as Unit[]) || [];
    } catch (error) {
      this.logger.error(`Database error in getAvailableUnits: ${error instanceof Error ? error.message : String(error)}`, {
        propertyId,
        error
      });
      return [];
    }
  }

  async updateStatus(unitId: string, status: Database['public']['Enums']['UnitStatus']): Promise<Unit | null> {
    try {
      this.logger.log('Updating unit status via repository', { unitId, status });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Unit')
        .update({
          status,
          updatedAt: new Date().toISOString()
        } as TablesUpdate<'Unit'>)
        .eq('id', unitId)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to update unit status', {
          unitId,
          status,
          error: error.message
        });
        return null;
      }

      return (data as unknown as Unit) || null;
    } catch (error) {
      this.logger.error(`Database error in updateStatus: ${error instanceof Error ? error.message : String(error)}`, {
        unitId,
        status,
        error
      });
      return null;
    }
  }
}
