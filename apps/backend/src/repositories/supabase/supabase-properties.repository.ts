import { Injectable, Logger } from '@nestjs/common';
import type {
  Property,
  PropertyStats,
  CreatePropertyRequest,
  UpdatePropertyRequest,
  Database,
  Unit,
  MaintenanceRequest
} from '@repo/shared';
import { SupabaseService } from '../../database/supabase.service';
import {
  IPropertiesRepository,
  PropertyFilterOptions,
  PropertySearchOptions,
  PropertyAnalyticsOptions,
  PropertyPerformanceAnalytics,
  PropertyOccupancyAnalytics,
  PropertyFinancialAnalytics,
  PropertyMaintenanceAnalytics
} from '../interfaces/properties-repository.interface';
import {
  RepositoryError,
  EntityNotFoundError,
  DuplicateEntityError
} from '../interfaces/base-repository.interface';

@Injectable()
export class SupabasePropertiesRepository implements IPropertiesRepository {
  private readonly logger = new Logger(SupabasePropertiesRepository.name);

  constructor(private readonly supabase: SupabaseService) {}

  async findById(id: string): Promise<Property | null> {
    try {
      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Property')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw new RepositoryError(`Failed to find property by ID: ${error.message}`, error);
      }

      return data;
    } catch (error) {
      this.logger.error(`Database error in findById: ${error instanceof Error ? error.message : String(error)}`, { id, error });
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError('Database operation failed');
    }
  }

  async findByUserId(userId: string, filters?: PropertyFilterOptions): Promise<Property[]> {
    try {
      let query = this.supabase
        .getAdminClient()
        .from('Property')
        .select('*')
        .eq('ownerId', userId);

      if (filters?.status) {
        query = query.eq('status', filters.status as Database['public']['Enums']['PropertyStatus']);
      }

      if (filters?.propertyType) {
        query = query.eq('propertyType', filters.propertyType as Database['public']['Enums']['PropertyType']);
      }

      if (filters?.city) {
        query = query.eq('city', filters.city);
      }

      if (filters?.state) {
        query = query.eq('state', filters.state);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%`);
      }

      if (filters?.sort) {
        query = query.order(filters.sort.field, { ascending: filters.sort.direction === 'asc' });
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw new RepositoryError(`Failed to find properties by user ID: ${error.message}`, error);
      }

      return data || [];
    } catch (error) {
      this.logger.error('Database error in findByUserId', { userId, filters, error });
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError('Database operation failed');
    }
  }

  async findByUserIdWithSearch(
    userId: string,
    options: PropertySearchOptions
  ): Promise<Property[]> {
    try {
      this.logger.log('Finding properties with search via DIRECT table query', { userId, options });

      let query = this.supabase
        .getAdminClient()
        .from('Property')
        .select('*')
        .eq('ownerId', userId);

      if (options.search) {
        query = query.or(`name.ilike.%${options.search}%,address.ilike.%${options.search}%,description.ilike.%${options.search}%`);
      }

      query = query
        .order('createdAt', { ascending: false })
        .limit(options.limit || 50)
        .range(options.offset || 0, (options.offset || 0) + (options.limit || 50) - 1);

      const { data, error } = await query;

      if (error) {
        this.logger.error('Failed to search properties via direct query', {
          userId,
          error: error.message,
          options
        });
        throw new RepositoryError(`Failed to search properties: ${error.message}`, error);
      }

      return (data as unknown as Property[]) || [];
    } catch (error) {
      this.logger.error('Database error in findByUserIdWithSearch', { userId, options, error });
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError('Database operation failed');
    }
  }

  async findAll(filters?: PropertyFilterOptions): Promise<Property[]> {
    try {
      let query = this.supabase.getAdminClient().from('Property').select('*');

      if (filters?.status) {
        query = query.eq('status', filters.status as Database['public']['Enums']['PropertyStatus']);
      }

      if (filters?.propertyType) {
        query = query.eq('propertyType', filters.propertyType as Database['public']['Enums']['PropertyType']);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%`);
      }

      if (filters?.sort) {
        query = query.order(filters.sort.field, { ascending: filters.sort.direction === 'asc' });
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        throw new RepositoryError(`Failed to find all properties: ${error.message}`, error);
      }

      return data || [];
    } catch (error) {
      this.logger.error('Database error in findAll', { filters, error });
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError('Database operation failed');
    }
  }

  async create(userId: string, data: CreatePropertyRequest): Promise<Property> {
    try {
      this.logger.log('Creating property via DIRECT table insert', { userId, data });

      const propertyData = {
        ownerId: userId,
        name: data.name,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        propertyType: data.propertyType as Database['public']['Enums']['PropertyType'],
        description: data.description || null,
        status: 'ACTIVE' as Database['public']['Enums']['PropertyStatus'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const { data: result, error } = await this.supabase
        .getAdminClient()
        .from('Property')
        .insert(propertyData)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to create property via direct insert', {
          userId,
          error: error.message,
          data
        });
        if (error.code === '23505') { // Unique constraint violation
          throw new DuplicateEntityError('Property', 'name', data.name);
        }
        throw new RepositoryError(`Failed to create property: ${error.message}`, error);
      }

      return result as unknown as Property;
    } catch (error) {
      this.logger.error('Database error in create', { userId, data, error });
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError('Database operation failed');
    }
  }

  async update(id: string, data: UpdatePropertyRequest): Promise<Property> {
    try {
      this.logger.log('Updating property via DIRECT table update', { id, data });

      const updateData = {
        name: data.name,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        propertyType: data.propertyType as Database['public']['Enums']['PropertyType'],
        description: data.description || null,
        updatedAt: new Date().toISOString()
      };

      const { data: result, error } = await this.supabase
        .getAdminClient()
        .from('Property')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to update property via direct update', {
          id,
          error: error.message,
          data
        });
        if (error.code === 'PGRST116') {
          throw new EntityNotFoundError('Property', id);
        }
        throw new RepositoryError(`Failed to update property: ${error.message}`, error);
      }

      if (!result) {
        throw new EntityNotFoundError('Property', id);
      }

      return result as unknown as Property;
    } catch (error) {
      this.logger.error('Database error in update', { id, data, error });
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError('Database operation failed');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      this.logger.log('Deleting property via DIRECT table delete', { id });

      const { error } = await this.supabase
        .getAdminClient()
        .from('Property')
        .delete()
        .eq('id', id);

      if (error) {
        this.logger.error('Failed to delete property via direct delete', {
          id,
          error: error.message
        });
        throw new RepositoryError(`Failed to delete property: ${error.message}`, error);
      }
    } catch (error) {
      this.logger.error('Database error in delete', { id, error });
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError('Database operation failed');
    }
  }

  async softDelete(userId: string, propertyId: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.delete(propertyId);
      return { success: true, message: 'Property deleted successfully' };
    } catch (error) {
      this.logger.error('Database error in softDelete', { userId, propertyId, error });
      throw new RepositoryError('Failed to delete property');
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const property = await this.findById(id);
      return property !== null;
    } catch (error) {
      this.logger.error('Database error in exists', { id, error });
      throw new RepositoryError('Database operation failed');
    }
  }

  async count(filters?: PropertyFilterOptions): Promise<number> {
    try {
      let query = this.supabase
        .getAdminClient()
        .from('Property')
        .select('*', { count: 'exact', head: true });

      if (filters?.status) {
        query = query.eq('status', filters.status as Database['public']['Enums']['PropertyStatus']);
      }

      if (filters?.propertyType) {
        query = query.eq('propertyType', filters.propertyType as Database['public']['Enums']['PropertyType']);
      }

      const { count, error } = await query;

      if (error) {
        throw new RepositoryError(`Failed to count properties: ${error.message}`, error);
      }

      return count || 0;
    } catch (error) {
      this.logger.error('Database error in count', { filters, error });
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError('Database operation failed');
    }
  }

  async findAllWithUnits(
    userId: string,
    options: PropertySearchOptions
  ): Promise<Property[]> {
    try {
      this.logger.log('Finding properties with units via DIRECT table join', { userId, options });

      let query = this.supabase
        .getAdminClient()
        .from('Property')
        .select('*, Unit(*)')
        .eq('ownerId', userId);

      if (options.search) {
        query = query.or(`name.ilike.%${options.search}%,address.ilike.%${options.search}%,description.ilike.%${options.search}%`);
      }

      query = query
        .order('createdAt', { ascending: false })
        .limit(options.limit || 50)
        .range(options.offset || 0, (options.offset || 0) + (options.limit || 50) - 1);

      const { data, error } = await query;

      if (error) {
        this.logger.error('Failed to find properties with units via direct join', {
          userId,
          error: error.message,
          options
        });
        throw new RepositoryError(`Failed to find properties with units: ${error.message}`, error);
      }

      return (data as unknown as Property[]) || [];
    } catch (error) {
      this.logger.error('Database error in findAllWithUnits', { userId, options, error });
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError('Database operation failed');
    }
  }

  async getStats(userId: string): Promise<PropertyStats> {
    try {
      this.logger.log('Getting property stats via DIRECT table queries', { userId });

      // DIRECT queries - NO RPC BULLSHIT
      const [properties, units] = await Promise.all([
        this.supabase.getAdminClient().from('Property').select('*').eq('ownerId', userId),
        this.supabase.getAdminClient().from('Unit').select('*').eq('userId', userId)
      ]);

      if (properties.error || units.error) {
        this.logger.error('Direct queries failed for property stats', {
          userId,
          errors: {
            properties: properties.error?.message,
            units: units.error?.message
          }
        });
        throw new RepositoryError('Failed to get property stats via direct queries');
      }

      // Calculate stats in TypeScript - SIMPLE AND CLEAN
      const propertyData = properties.data || [];
      const unitData = units.data || [];

      const occupiedUnits = unitData.filter(u => u.status === 'OCCUPIED');
      const vacantUnits = unitData.filter(u => u.status === 'VACANT');
      const totalRent = unitData.reduce((sum, unit) => sum + (unit.rent || 0), 0);

      const stats: PropertyStats = {
        total: propertyData.length,
        occupied: occupiedUnits.length,
        vacant: vacantUnits.length,
        occupancyRate: unitData.length > 0 ? Math.round((occupiedUnits.length / unitData.length) * 100) : 0,
        totalMonthlyRent: totalRent,
        averageRent: unitData.length > 0 ? Math.round(totalRent / unitData.length) : 0
      };

      return stats;
    } catch (error) {
      this.logger.error('Database error in getStats', { userId, error });
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError('Database operation failed');
    }
  }

  async getPerformanceAnalytics(
    userId: string,
    options: PropertyAnalyticsOptions
  ): Promise<PropertyPerformanceAnalytics[]> {
    try {
      this.logger.log('Getting performance analytics via DIRECT table queries', { userId, options });

      let query = this.supabase
        .getAdminClient()
        .from('Property')
        .select('*, Unit(*)')
        .eq('ownerId', userId);

      if (options.propertyId) {
        query = query.eq('id', options.propertyId);
      }

      query = query.limit(options.limit || 10);

      const { data, error } = await query;

      if (error) {
        this.logger.error('Performance analytics direct query failed', {
          userId,
          error: error.message,
          options
        });
        throw new RepositoryError(`Failed to get performance analytics: ${error.message}`, error);
      }

      // Calculate performance analytics with proper typing
      const analytics: PropertyPerformanceAnalytics[] = (data || []).map(property => {
        const units = (property.Unit || []) as Unit[];
        const occupiedUnits = units.filter((u) => u.status === 'OCCUPIED');
        const monthlyRevenue = occupiedUnits.reduce((sum, unit) => sum + (unit.rent || 0), 0);
        const revenue = monthlyRevenue * 12; // Annual revenue
        const expenses = 0; // TODO: Calculate from actual expense data
        const netIncome = revenue - expenses;

        return {
          propertyId: property.id,
          propertyName: property.name,
          period: options.period || 'monthly',
          occupancyRate: units.length > 0 ? Math.round((occupiedUnits.length / units.length) * 100) : 0,
          revenue: revenue,
          expenses: expenses,
          netIncome: netIncome,
          roi: revenue > 0 ? Math.round((netIncome / revenue) * 100) : 0
        };
      });

      return analytics;
    } catch (error) {
      this.logger.error('Database error in getPerformanceAnalytics', { userId, options, error });
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError('Database operation failed');
    }
  }

  async getOccupancyAnalytics(
    userId: string,
    options: PropertyAnalyticsOptions
  ): Promise<PropertyOccupancyAnalytics[]> {
    try {
      this.logger.log('Getting occupancy analytics via DIRECT table queries', { userId, options });

      let query = this.supabase
        .getAdminClient()
        .from('Property')
        .select('*, Unit(*)')
        .eq('ownerId', userId);

      if (options.propertyId) {
        query = query.eq('id', options.propertyId);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Occupancy analytics direct query failed', {
          userId,
          error: error.message,
          options
        });
        throw new RepositoryError(`Failed to get occupancy analytics: ${error.message}`, error);
      }

      // Calculate occupancy analytics with proper typing
      const analytics: PropertyOccupancyAnalytics[] = (data || []).map(property => {
        const units = property.Unit || [];
        const statusCounts = (units as Unit[]).reduce((acc: Record<string, number>, unit) => {
          acc[unit.status] = (acc[unit.status] || 0) + 1;
          return acc;
        }, {});

        const occupiedUnits = statusCounts.OCCUPIED || 0;
        const totalUnits = units.length;

        return {
          propertyId: property.id,
          propertyName: property.name,
          period: options.period || 'monthly',
          occupancyRate: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
          unitsOccupied: occupiedUnits,
          unitsTotal: totalUnits,
          moveIns: 0, // TODO: Calculate from lease data
          moveOuts: 0 // TODO: Calculate from lease data
        };
      });

      return analytics;
    } catch (error) {
      this.logger.error('Database error in getOccupancyAnalytics', { userId, options, error });
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError('Database operation failed');
    }
  }

  async getFinancialAnalytics(
    userId: string,
    options: PropertyAnalyticsOptions
  ): Promise<PropertyFinancialAnalytics[]> {
    try {
      this.logger.log('Getting financial analytics via DIRECT table queries', { userId, options });

      let query = this.supabase
        .getAdminClient()
        .from('Property')
        .select('*, Unit(*), Lease(*)')
        .eq('ownerId', userId);

      if (options.propertyId) {
        query = query.eq('id', options.propertyId);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Financial analytics direct query failed', {
          userId,
          error: error.message,
          options
        });
        throw new RepositoryError(`Failed to get financial analytics: ${error.message}`, error);
      }

      // Calculate financial analytics with proper typing
      const analytics: PropertyFinancialAnalytics[] = (data || []).map(property => {
        const units = property.Unit || [];

        const occupiedUnits = (units as Unit[]).filter((u) => u.status === 'OCCUPIED');

        const revenue = occupiedUnits.reduce((sum: number, unit) => sum + (unit.rent || 0), 0) * 12; // Annual
        const expenses = 0; // TODO: Calculate from actual expense data
        const netIncome = revenue - expenses;
        const operatingExpenses = 0; // TODO: Calculate from expense categories
        const maintenanceExpenses = 0; // TODO: Calculate from maintenance requests
        const capexExpenses = 0; // TODO: Calculate from capital expenditures
        const cashFlow = netIncome;

        return {
          propertyId: property.id,
          propertyName: property.name,
          period: options.period || 'monthly',
          revenue: revenue,
          expenses: expenses,
          netIncome: netIncome,
          operatingExpenses: operatingExpenses,
          maintenanceExpenses: maintenanceExpenses,
          capexExpenses: capexExpenses,
          cashFlow: cashFlow
        };
      });

      return analytics;
    } catch (error) {
      this.logger.error('Database error in getFinancialAnalytics', { userId, options, error });
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError('Database operation failed');
    }
  }

  async getMaintenanceAnalytics(
    userId: string,
    options: PropertyAnalyticsOptions
  ): Promise<PropertyMaintenanceAnalytics[]> {
    try {
      this.logger.log('Getting maintenance analytics via DIRECT table queries', { userId, options });

      // Get properties, units, and maintenance requests
      let propertyQuery = this.supabase
        .getAdminClient()
        .from('Property')
        .select('*')
        .eq('ownerId', userId);

      if (options.propertyId) {
        propertyQuery = propertyQuery.eq('id', options.propertyId);
      }

      const [properties, units, maintenanceRequests] = await Promise.all([
        propertyQuery,
        this.supabase
          .getAdminClient()
          .from('Unit')
          .select('*')
          .eq('userId', userId),
        this.supabase
          .getAdminClient()
          .from('MaintenanceRequest')
          .select('*')
          .eq('userId', userId)
      ]);

      if (properties.error || units.error || maintenanceRequests.error) {
        this.logger.error('Maintenance analytics direct queries failed', {
          userId,
          errors: {
            properties: properties.error?.message,
            units: units.error?.message,
            maintenance: maintenanceRequests.error?.message
          },
          options
        });
        throw new RepositoryError('Failed to get maintenance analytics via direct queries');
      }

      // Create unit to property mapping
      const unitToPropertyMap: Record<string, string> = {};
      (units.data || []).forEach(unit => {
        if (unit.propertyId) {
          unitToPropertyMap[unit.id] = unit.propertyId;
        }
      });

      // Calculate maintenance analytics with proper typing
      const analytics: PropertyMaintenanceAnalytics[] = (properties.data || []).map(property => {
        const requests = ((maintenanceRequests.data || []) as MaintenanceRequest[]).filter(
          (req) => req.unitId && unitToPropertyMap[req.unitId] === property.id
        );

        const statusCounts = requests.reduce((acc: Record<string, number>, req) => {
          acc[req.status] = (acc[req.status] || 0) + 1;
          return acc;
        }, {});

        const completedRequests = statusCounts.COMPLETED || 0;
        const pendingRequests = (statusCounts.OPEN || 0) + (statusCounts.IN_PROGRESS || 0);
        const totalCost = requests.reduce((sum, req) => sum + (req.actualCost || req.estimatedCost || 0), 0);
        const avgCost = requests.length > 0 ? Math.round(totalCost / requests.length) : 0;
        const emergencyRequests = requests.filter(req => req.priority === 'EMERGENCY').length;

        return {
          propertyId: property.id,
          propertyName: property.name,
          period: options.period || 'monthly',
          totalRequests: requests.length,
          completedRequests: completedRequests,
          pendingRequests: pendingRequests,
          avgResolutionTime: 0, // TODO: Calculate from completion dates
          totalCost: totalCost,
          avgCost: avgCost,
          emergencyRequests: emergencyRequests
        };
      });

      return analytics;
    } catch (error) {
      this.logger.error('Database error in getMaintenanceAnalytics', { userId, options, error });
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError('Database operation failed');
    }
  }
}