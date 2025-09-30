import { Injectable, Logger } from '@nestjs/common';
import type {
    Database,
    TablesInsert,
    TablesUpdate
} from '@repo/shared/types/supabase-generated';
import type {
    MaintenanceRequest
} from '@repo/shared/types/supabase';
import type {
    MaintenanceRequestInput,
    MaintenanceRequestUpdate,
    MaintenanceStats
} from '@repo/shared/types/core';
import { SupabaseService } from '../../database/supabase.service';
import {
    IMaintenanceRepository,
    MaintenanceQueryOptions
} from '../interfaces/maintenance-repository.interface';

@Injectable()
export class SupabaseMaintenanceRepository implements IMaintenanceRepository {
  private readonly logger = new Logger(SupabaseMaintenanceRepository.name);

  constructor(private readonly supabase: SupabaseService) {}

  async findByUserIdWithSearch(userId: string, options: MaintenanceQueryOptions): Promise<MaintenanceRequest[]> {
    try {
      this.logger.log('Finding maintenance requests with search via repository', { userId, options });

      let query = this.supabase
        .getAdminClient()
        .from('MaintenanceRequest')
        .select('*')
        .eq('userId', userId);

      if (options.search) {
        query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`);
      }

      if (options.propertyId) {
        query = query.eq('propertyId', options.propertyId);
      }

      if (options.unitId) {
        query = query.eq('unitId', options.unitId);
      }

      if (options.tenantId) {
        query = query.eq('tenantId', options.tenantId);
      }

      if (options.status) {
        query = query.eq('status', options.status as Database['public']['Enums']['RequestStatus']);
      }

      if (options.priority) {
        query = query.eq('priority', options.priority);
      }

      if (options.category) {
        query = query.eq('category', options.category);
      }

      if (options.assignedTo) {
        query = query.eq('assignedTo', options.assignedTo);
      }

      if (options.dateFrom) {
        query = query.gte('createdAt', options.dateFrom.toISOString());
      }

      if (options.dateTo) {
        query = query.lte('createdAt', options.dateTo.toISOString());
      }

      query = query
        .order('createdAt', { ascending: false })
        .limit(options.limit || 50)
        .range(options.offset || 0, (options.offset || 0) + (options.limit || 50) - 1);

      const { data, error } = await query;

      if (error) {
        this.logger.error('Failed to find maintenance requests with search', {
          userId,
          error: error.message,
          options
        });
        return [];
      }

      return (data as unknown as MaintenanceRequest[]) || [];
    } catch (error) {
      this.logger.error(`Database error in findByUserIdWithSearch: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        error,
        options
      });
      return [];
    }
  }

  async findById(requestId: string): Promise<MaintenanceRequest | null> {
    try {
      this.logger.log('Finding maintenance request by ID via repository', { requestId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('MaintenanceRequest')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error) {
        this.logger.error('Failed to find maintenance request by ID', {
          requestId,
          error: error.message
        });
        return null;
      }

      return (data as unknown as MaintenanceRequest) || null;
    } catch (error) {
      this.logger.error(`Database error in findById: ${error instanceof Error ? error.message : String(error)}`, {
        requestId,
        error
      });
      return null;
    }
  }

  async findByPropertyId(propertyId: string): Promise<MaintenanceRequest[]> {
    try {
      this.logger.log('Finding maintenance requests by property ID via repository', { propertyId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('MaintenanceRequest')
        .select('*')
        .eq('propertyId', propertyId)
        .order('createdAt', { ascending: false });

      if (error) {
        this.logger.error('Failed to find maintenance requests by property ID', {
          propertyId,
          error: error.message
        });
        return [];
      }

      return (data as unknown as MaintenanceRequest[]) || [];
    } catch (error) {
      this.logger.error(`Database error in findByPropertyId: ${error instanceof Error ? error.message : String(error)}`, {
        propertyId,
        error
      });
      return [];
    }
  }

  async findByUnitId(unitId: string): Promise<MaintenanceRequest[]> {
    try {
      this.logger.log('Finding maintenance requests by unit ID via repository', { unitId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('MaintenanceRequest')
        .select('*')
        .eq('unitId', unitId)
        .order('createdAt', { ascending: false });

      if (error) {
        this.logger.error('Failed to find maintenance requests by unit ID', {
          unitId,
          error: error.message
        });
        return [];
      }

      return (data as unknown as MaintenanceRequest[]) || [];
    } catch (error) {
      this.logger.error(`Database error in findByUnitId: ${error instanceof Error ? error.message : String(error)}`, {
        unitId,
        error
      });
      return [];
    }
  }

  async findByTenantId(tenantId: string): Promise<MaintenanceRequest[]> {
    try {
      this.logger.log('Finding maintenance requests by tenant ID via repository', { tenantId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('MaintenanceRequest')
        .select('*')
        .eq('tenantId', tenantId)
        .order('createdAt', { ascending: false });

      if (error) {
        this.logger.error('Failed to find maintenance requests by tenant ID', {
          tenantId,
          error: error.message
        });
        return [];
      }

      return (data as unknown as MaintenanceRequest[]) || [];
    } catch (error) {
      this.logger.error(`Database error in findByTenantId: ${error instanceof Error ? error.message : String(error)}`, {
        tenantId,
        error
      });
      return [];
    }
  }

  async create(userId: string, requestData: MaintenanceRequestInput): Promise<MaintenanceRequest> {
    try {
      this.logger.log('Creating maintenance request via repository', { userId, requestData });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('MaintenanceRequest')
        .insert({
          ...requestData,
          preferredDate: requestData.preferredDate ? new Date(requestData.preferredDate).toISOString() : null,
          status: 'OPEN' as Database['public']['Enums']['RequestStatus'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as TablesInsert<'MaintenanceRequest'>)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to create maintenance request', {
          userId,
          error: error.message,
          requestData
        });
        throw new Error(`Failed to create maintenance request: ${error.message}`);
      }

      return data as unknown as MaintenanceRequest;
    } catch (error) {
      this.logger.error(`Database error in create: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        error,
        requestData
      });
      throw error;
    }
  }

  async update(requestId: string, requestData: MaintenanceRequestUpdate): Promise<MaintenanceRequest | null> {
    try {
      this.logger.log('Updating maintenance request via repository', { requestId, requestData });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('MaintenanceRequest')
        .update({
          ...requestData,
          preferredDate: requestData.preferredDate,
          completedAt: requestData.completedAt,
          priority: requestData.priority ? requestData.priority as Database['public']['Enums']['Priority'] : undefined,
          category: requestData.category ? requestData.category as Database['public']['Enums']['MaintenanceCategory'] : undefined,
          status: requestData.status ? (requestData.status === 'CANCELED' ? 'CANCELED' as Database['public']['Enums']['RequestStatus'] :
                  requestData.status === 'OPEN' ? 'OPEN' as Database['public']['Enums']['RequestStatus'] :
                  requestData.status as Database['public']['Enums']['RequestStatus']) : undefined,
          updatedAt: new Date().toISOString()
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to update maintenance request', {
          requestId,
          error: error.message,
          requestData
        });
        return null;
      }

      return (data as unknown as MaintenanceRequest) || null;
    } catch (error) {
      this.logger.error(`Database error in update: ${error instanceof Error ? error.message : String(error)}`, {
        requestId,
        error,
        requestData
      });
      return null;
    }
  }

  async softDelete(userId: string, requestId: string): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log('Soft deleting maintenance request via repository', { userId, requestId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('MaintenanceRequest')
        .update({
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .eq('id', requestId)
        .select();

      if (error) {
        this.logger.error('Failed to soft delete maintenance request', {
          userId,
          requestId,
          error: error.message
        });
        return { success: false, message: `Failed to delete maintenance request: ${error.message}` };
      }

      if (!data || data.length === 0) {
        return { success: false, message: 'Maintenance request not found or not authorized' };
      }

      return { success: true, message: 'Maintenance request deleted successfully' };
    } catch (error) {
      this.logger.error(`Database error in softDelete: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        requestId,
        error
      });
      return { success: false, message: 'Failed to delete maintenance request due to database error' };
    }
  }

  async getStats(userId: string): Promise<MaintenanceStats> {
    try {
      this.logger.log('Getting maintenance stats via DIRECT table query', { userId });

      // DIRECT query -
      const { data, error } = await this.supabase
        .getAdminClient()
        .from('MaintenanceRequest')
        .select('*')
        .eq('userId', userId);

      if (error) {
        this.logger.error('Maintenance stats direct query failed', { userId, error: error.message });
        return {
          total: 0,
          open: 0,
          inProgress: 0,
          completed: 0,
          completedToday: 0,
          avgResolutionTime: 0,
          byPriority: { low: 0, medium: 0, high: 0, emergency: 0 }
        };
      }

      // Calculate stats in TypeScript - SIMPLE AND CLEAN
      const requests = data || [];
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const openRequests = requests.filter(r => r.status === 'OPEN');
      const inProgressRequests = requests.filter(r => r.status === 'IN_PROGRESS');
      const completedRequests = requests.filter(r => r.status === 'COMPLETED');
      const completedToday = completedRequests.filter(r => new Date(r.completedAt || r.updatedAt) >= todayStart);

      return {
        total: requests.length,
        open: openRequests.length,
        inProgress: inProgressRequests.length,
        completed: completedRequests.length,
        completedToday: completedToday.length,
        avgResolutionTime: 0, // Resolution timing will be calculated once close date tracking is available
        byPriority: {
          low: requests.filter(r => r.priority === 'LOW').length,
          medium: requests.filter(r => r.priority === 'MEDIUM').length,
          high: requests.filter(r => r.priority === 'HIGH').length,
          emergency: requests.filter(r => r.priority === 'EMERGENCY').length
        }
      };
    } catch (error) {
      this.logger.error(`Database error in getStats: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        error
      });
      return {
        total: 0,
        open: 0,
        inProgress: 0,
        completed: 0,
        completedToday: 0,
        avgResolutionTime: 0,
        byPriority: { low: 0, medium: 0, high: 0, emergency: 0 }
      };
    }
  }

  async getAnalytics(userId: string, options: { propertyId?: string; timeframe: string }): Promise<MaintenanceRequest[]> {
    try {
      this.logger.log('Getting maintenance analytics via DIRECT table query', { userId, options });

      // DIRECT query -
      let query = this.supabase
        .getAdminClient()
        .from('MaintenanceRequest')
        .select('*')
        .eq('userId', userId);

      const startDate = this.calculateStartDate(options.timeframe);
      if (startDate) {
        query = query.gte('createdAt', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Maintenance analytics direct query failed', { userId, error: error.message, options });
        return [];
      }

      // Return data as MaintenanceRequest array
      // Note: propertyId is not available on MaintenanceRequest table
      // Controllers should join with Unit table if propertyId is needed
      return (data as unknown as MaintenanceRequest[]) || [];
    } catch (error) {
      this.logger.error(`Database error in getAnalytics: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        error,
        options
      });
      return [];
    }
  }

  private calculateStartDate(timeframe: string) {
    if (!timeframe) {
      return null;
    }

    const lower = timeframe.toLowerCase();
    if (lower === 'all' || lower === 'lifetime') {
      return null;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const match = lower.match(/^(\d+)([dmy])$/);
    if (match) {
      const value = parseInt(match[1]!, 10);
      const unit = match[2]!;
      const days = unit === 'd' ? value : unit === 'm' ? value * 30 : value * 365;
      now.setDate(now.getDate() - days);
      return now;
    }

    switch (lower) {
      case 'monthly':
        now.setMonth(now.getMonth() - 1);
        break;
      case 'quarterly':
        now.setMonth(now.getMonth() - 3);
        break;
      case 'yearly':
      case 'annually':
        now.setFullYear(now.getFullYear() - 1);
        break;
      default:
        now.setMonth(now.getMonth() - 1);
        break;
    }

    return now;
  }

  async getOverdueRequests(userId: string): Promise<MaintenanceRequest[]> {
    try {
      this.logger.log('Getting overdue maintenance requests via repository', { userId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('MaintenanceRequest')
        .select('*')
        .eq('userId', userId)
        .in('status', ['OPEN', 'IN_PROGRESS'])
        .lt('dueDate', new Date().toISOString())
        .order('dueDate', { ascending: true });

      if (error) {
        this.logger.error('Failed to get overdue maintenance requests', {
          userId,
          error: error.message
        });
        return [];
      }

      return (data as unknown as MaintenanceRequest[]) || [];
    } catch (error) {
      this.logger.error(`Database error in getOverdueRequests: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        error
      });
      return [];
    }
  }

  async getHighPriorityRequests(userId: string): Promise<MaintenanceRequest[]> {
    try {
      this.logger.log('Getting high priority maintenance requests via repository', { userId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('MaintenanceRequest')
        .select('*')
        .eq('userId', userId)
        .in('status', ['OPEN', 'IN_PROGRESS'])
        .in('priority', ['HIGH', 'EMERGENCY'])
        .order('priority', { ascending: false })
        .order('createdAt', { ascending: true });

      if (error) {
        this.logger.error('Failed to get high priority maintenance requests', {
          userId,
          error: error.message
        });
        return [];
      }

      return (data as unknown as MaintenanceRequest[]) || [];
    } catch (error) {
      this.logger.error(`Database error in getHighPriorityRequests: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        error
      });
      return [];
    }
  }

  async assignRequest(requestId: string, assignedTo: string, assignedBy: string): Promise<MaintenanceRequest | null> {
    try {
      this.logger.log('Assigning maintenance request via repository', { requestId, assignedTo, assignedBy });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('MaintenanceRequest')
        .update({
          assignedTo,
          assignedBy,
          assignedAt: new Date().toISOString(),
          status: 'IN_PROGRESS' as Database['public']['Enums']['RequestStatus'],
          updatedAt: new Date().toISOString()
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to assign maintenance request', {
          requestId,
          assignedTo,
          assignedBy,
          error: error.message
        });
        return null;
      }

      return (data as unknown as MaintenanceRequest) || null;
    } catch (error) {
      this.logger.error(`Database error in assignRequest: ${error instanceof Error ? error.message : String(error)}`, {
        requestId,
        assignedTo,
        assignedBy,
        error
      });
      return null;
    }
  }

  async updateStatus(requestId: string, status: string, updatedBy: string, notes?: string): Promise<MaintenanceRequest | null> {
    try {
      this.logger.log('Updating maintenance request status via repository', { requestId, status, updatedBy, notes });

      const updateData: TablesUpdate<'MaintenanceRequest'> = {
        status: status as Database['public']['Enums']['RequestStatus'],
        updatedAt: new Date().toISOString()
      };

      if (notes) {
        updateData.notes = notes;
      }

      if (status === 'COMPLETED') {
        updateData.completedAt = new Date().toISOString();
      }

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('MaintenanceRequest')
        .update(updateData)
        .eq('id', requestId)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to update maintenance request status', {
          requestId,
          status,
          updatedBy,
          notes,
          error: error.message
        });
        return null;
      }

      return (data as unknown as MaintenanceRequest) || null;
    } catch (error) {
      this.logger.error(`Database error in updateStatus: ${error instanceof Error ? error.message : String(error)}`, {
        requestId,
        status,
        updatedBy,
        notes,
        error
      });
      return null;
    }
  }

  async addWorkLog(requestId: string, workLog: {
    description: string;
    hoursWorked?: number;
    cost?: number;
    materials?: string;
    completedBy: string;
  }): Promise<MaintenanceRequest | null> {
    try {
      this.logger.log('Adding work log to maintenance request via repository', { requestId, workLog });

      // Work log functionality will be added when the MaintenanceWorkLog table is provisioned
      this.logger.log('Work log functionality not yet implemented', { requestId, workLog });

      // Then, update the maintenance request timestamp
      const { data, error } = await this.supabase
        .getAdminClient()
        .from('MaintenanceRequest')
        .update({
          updatedAt: new Date().toISOString()
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to update maintenance request after adding work log', {
          requestId,
          error: error.message
        });
        return null;
      }

      return (data as unknown as MaintenanceRequest) || null;
    } catch (error) {
      this.logger.error(`Database error in addWorkLog: ${error instanceof Error ? error.message : String(error)}`, {
        requestId,
        workLog,
        error
      });
      return null;
    }
  }

  async getCostAnalytics(userId: string, options: { propertyId?: string; period: string }): Promise<MaintenanceRequest[]> {
    try {
      this.logger.log('Getting maintenance cost analytics via DIRECT table query', { userId, options });

      // DIRECT query -
      let query = this.supabase
        .getAdminClient()
        .from('MaintenanceRequest')
        .select('*')
        .eq('userId', userId);

      if (options.propertyId) {
        query = query.eq('propertyId', options.propertyId);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Maintenance cost analytics direct query failed', { userId, error: error.message, options });
        return [];
      }

      // Return data as MaintenanceRequest array
      // Note: propertyId is not available on MaintenanceRequest table
      // Controllers should join with Unit table if propertyId is needed
      return (data as unknown as MaintenanceRequest[]) || [];
    } catch (error) {
      this.logger.error(`Database error in getCostAnalytics: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        error,
        options
      });
      return [];
    }
  }

  async getContractorPerformance(userId: string, contractorId?: string): Promise<MaintenanceRequest[]> {
    try {
      this.logger.log('Getting contractor performance metrics via repository', { userId, contractorId });

      // Contractor performance metrics rely on the contractor analytics RPC; hook it up once deployed
      this.logger.log('Contractor performance RPC not yet implemented', { userId, contractorId });
      return [];
    } catch (error) {
      this.logger.error(`Database error in getContractorPerformance: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        contractorId,
        error
      });
      return [];
    }
  }
}
