import { Injectable, Logger } from '@nestjs/common';
import type {
  Tenant,
  TenantInput,
  TenantUpdate,
  TenantStats,
  Activity,
  TablesInsert,
  TablesUpdate
} from '@repo/shared';
import { SupabaseService } from '../../database/supabase.service';
import {
  ITenantsRepository,
  TenantQueryOptions
} from '../interfaces/tenants-repository.interface';

@Injectable()
export class SupabaseTenantsRepository implements ITenantsRepository {
  private readonly logger = new Logger(SupabaseTenantsRepository.name);

  constructor(private readonly supabase: SupabaseService) {}

  async findByUserIdWithSearch(userId: string, options: TenantQueryOptions): Promise<Tenant[]> {
    try {
      this.logger.log('Finding tenants with search via repository', { userId, options });

      let query = this.supabase
        .getAdminClient()
        .from('Tenant')
        .select('*')
        .eq('userId', userId);

      if (options.search) {
        query = query.or(`firstName.ilike.%${options.search}%,lastName.ilike.%${options.search}%,email.ilike.%${options.search}%`);
      }

      // Note: propertyId filter removed as it doesn't exist on Tenant table

      if (options.status) {
        query = query.eq('status', options.status);
      }

      query = query
        .order('createdAt', { ascending: false })
        .limit(options.limit || 50)
        .range(options.offset || 0, (options.offset || 0) + (options.limit || 50) - 1);

      const { data, error } = await query;

      if (error) {
        this.logger.error('Failed to find tenants with search', {
          userId,
          error: error.message,
          options
        });
        return [];
      }

      return (data as unknown as Tenant[]) || [];
    } catch (error) {
      this.logger.error(`Database error in findByUserIdWithSearch: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        error,
        options
      });
      return [];
    }
  }

  async findById(tenantId: string): Promise<Tenant | null> {
    try {
      this.logger.log('Finding tenant by ID via repository', { tenantId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Tenant')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error) {
        this.logger.error('Failed to find tenant by ID', {
          tenantId,
          error: error.message
        });
        return null;
      }

      return (data as unknown as Tenant) || null;
    } catch (error) {
      this.logger.error(`Database error in findById: ${error instanceof Error ? error.message : String(error)}`, {
        tenantId,
        error
      });
      return null;
    }
  }

  async findByPropertyId(propertyId: string): Promise<Tenant[]> {
    try {
      this.logger.log('Finding tenants by property ID via repository', { propertyId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Tenant')
        .select('*')
        .eq('propertyId', propertyId)
        .order('createdAt', { ascending: false });

      if (error) {
        this.logger.error('Failed to find tenants by property ID', {
          propertyId,
          error: error.message
        });
        return [];
      }

      return (data as unknown as Tenant[]) || [];
    } catch (error) {
      this.logger.error(`Database error in findByPropertyId: ${error instanceof Error ? error.message : String(error)}`, {
        propertyId,
        error
      });
      return [];
    }
  }

  async create(userId: string, tenantData: TenantInput): Promise<Tenant> {
    try {
      this.logger.log('Creating tenant via repository', { userId, tenantData });

      const insertData: TablesInsert<'Tenant'> = {
        ...tenantData,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Tenant')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to create tenant', {
          userId,
          error: error.message,
          tenantData
        });
        throw new Error(`Failed to create tenant: ${error.message}`);
      }

      return data as unknown as Tenant;
    } catch (error) {
      this.logger.error(`Database error in create: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        error,
        tenantData
      });
      throw error;
    }
  }

  async update(tenantId: string, tenantData: TenantUpdate): Promise<Tenant | null> {
    try {
      this.logger.log('Updating tenant via repository', { tenantId, tenantData });

      const updateData: TablesUpdate<'Tenant'> = {
        ...tenantData,
        updatedAt: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Tenant')
        .update(updateData)
        .eq('id', tenantId)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to update tenant', {
          tenantId,
          error: error.message,
          tenantData
        });
        return null;
      }

      return (data as unknown as Tenant) || null;
    } catch (error) {
      this.logger.error(`Database error in update: ${error instanceof Error ? error.message : String(error)}`, {
        tenantId,
        error,
        tenantData
      });
      return null;
    }
  }

  async softDelete(userId: string, tenantId: string): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log('Soft deleting tenant via repository', { userId, tenantId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Tenant')
        .update({
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .eq('id', tenantId)
        .eq('userId', userId)
        .select();

      if (error) {
        this.logger.error('Failed to soft delete tenant', {
          userId,
          tenantId,
          error: error.message
        });
        return { success: false, message: `Failed to delete tenant: ${error.message}` };
      }

      if (!data || data.length === 0) {
        return { success: false, message: 'Tenant not found or not authorized' };
      }

      return { success: true, message: 'Tenant deleted successfully' };
    } catch (error) {
      this.logger.error(`Database error in softDelete: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        tenantId,
        error
      });
      return { success: false, message: 'Failed to delete tenant due to database error' };
    }
  }

  async getStats(userId: string): Promise<TenantStats> {
    try {
      this.logger.log('Getting tenant stats via DIRECT table query', { userId });

      // DIRECT query - NO RPC BULLSHIT
      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Tenant')
        .select('*')
        .eq('userId', userId);

      if (error) {
        this.logger.error('Tenant stats direct query failed', { userId, error: error.message });
        return { total: 0, active: 0, inactive: 0, newThisMonth: 0 };
      }

      // Calculate stats in TypeScript - SIMPLE AND CLEAN
      const tenants = data || [];
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      return {
        total: tenants.length,
        active: tenants.length, // All tenants in table are active (soft delete not implemented yet)
        inactive: 0,
        newThisMonth: tenants.filter(t => new Date(t.createdAt) >= thisMonthStart).length
      };
    } catch (error) {
      this.logger.error(`Database error in getStats: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        error
      });
      return { total: 0, active: 0, inactive: 0, newThisMonth: 0 };
    }
  }

  async getAnalytics(userId: string, options: { propertyId?: string; timeframe: string }): Promise<Tenant[]> {
    try {
      this.logger.log('Getting tenant analytics via DIRECT table query', { userId, options });

      // DIRECT query - NO RPC BULLSHIT
      const query = this.supabase
        .getAdminClient()
        .from('Tenant')
        .select('*')
        .eq('userId', userId);

      // Note: propertyId filter removed as it doesn't exist on Tenant table

      const { data, error } = await query;

      if (error) {
        this.logger.error('Tenant analytics direct query failed', { userId, error: error.message, options });
        return [];
      }

      // Return Tenant array directly
      return (data as unknown as Tenant[]) || [];
    } catch (error) {
      this.logger.error(`Database error in getAnalytics: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        error,
        options
      });
      return [];
    }
  }

  async getActivity(userId: string, tenantId: string): Promise<Activity[]> {
    try {
      this.logger.log('Getting tenant activity via repository', { userId, tenantId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Activity')
        .select('*')
        .eq('userId', userId)
        .eq('relatedEntityId', tenantId)
        .eq('entityType', 'tenant')
        .order('createdAt', { ascending: false })
        .limit(50);

      if (error) {
        this.logger.error('Failed to get tenant activity', {
          userId,
          tenantId,
          error: error.message
        });
        return [];
      }

      return (data || []) as Activity[];
    } catch (error) {
      this.logger.error(`Database error in getActivity: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        tenantId,
        error
      });
      return [];
    }
  }
}