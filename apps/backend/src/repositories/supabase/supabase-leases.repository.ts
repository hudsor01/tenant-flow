import { Injectable, Logger } from '@nestjs/common';
import type {
    Database,
    TablesInsert,
    TablesUpdate
} from '@repo/shared/types/supabase-generated';
import type {
    Lease,
    RentPayment
} from '@repo/shared/types/supabase';
import type {
    LeaseStats
} from '@repo/shared/types/core';
import type {
    CreateLeaseInput as LeaseInput,
    UpdateLeaseInput as LeaseUpdate
} from '@repo/shared/types/api-inputs';
import { SupabaseService } from '../../database/supabase.service';
import {
    ILeasesRepository,
    LeaseQueryOptions
} from '../interfaces/leases-repository.interface';

@Injectable()
export class SupabaseLeasesRepository implements ILeasesRepository {
  private readonly logger = new Logger(SupabaseLeasesRepository.name);

  constructor(private readonly supabase: SupabaseService) {}

  async findByUserIdWithSearch(userId: string, options: LeaseQueryOptions): Promise<Lease[]> {
    try {
      this.logger.log('Finding leases with search via repository', { userId, options });

      let query = this.supabase
        .getAdminClient()
        .from('Lease')
        .select('*')
        .eq('userId', userId);

      if (options.search) {
        query = query.or(`leaseNumber.ilike.%${options.search}%,description.ilike.%${options.search}%`);
      }

      if (options.propertyId) {
        query = query.eq('propertyId', options.propertyId);
      }

      if (options.tenantId) {
        query = query.eq('tenantId', options.tenantId);
      }

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.startDate) {
        query = query.gte('startDate', options.startDate.toISOString());
      }

      if (options.endDate) {
        query = query.lte('endDate', options.endDate.toISOString());
      }

      query = query
        .order('createdAt', { ascending: false })
        .limit(options.limit || 50)
        .range(options.offset || 0, (options.offset || 0) + (options.limit || 50) - 1);

      const { data, error } = await query;

      if (error) {
        this.logger.error('Failed to find leases with search', {
          userId,
          error: error.message,
          options
        });
        return [];
      }

      return (data as unknown as Lease[]) || [];
    } catch (error) {
      this.logger.error(`Database error in findByUserIdWithSearch: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        error,
        options
      });
      return [];
    }
  }

  async findById(leaseId: string): Promise<Lease | null> {
    try {
      this.logger.log('Finding lease by ID via repository', { leaseId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Lease')
        .select('*')
        .eq('id', leaseId)
        .single();

      if (error) {
        this.logger.error('Failed to find lease by ID', {
          leaseId,
          error: error.message
        });
        return null;
      }

      return (data as unknown as Lease) || null;
    } catch (error) {
      this.logger.error(`Database error in findById: ${error instanceof Error ? error.message : String(error)}`, {
        leaseId,
        error
      });
      return null;
    }
  }

  async findByPropertyId(propertyId: string): Promise<Lease[]> {
    try {
      this.logger.log('Finding leases by property ID via repository', { propertyId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Lease')
        .select('*')
        .eq('propertyId', propertyId)
        .order('startDate', { ascending: false });

      if (error) {
        this.logger.error('Failed to find leases by property ID', {
          propertyId,
          error: error.message
        });
        return [];
      }

      return (data as unknown as Lease[]) || [];
    } catch (error) {
      this.logger.error(`Database error in findByPropertyId: ${error instanceof Error ? error.message : String(error)}`, {
        propertyId,
        error
      });
      return [];
    }
  }

  async findByTenantId(tenantId: string): Promise<Lease[]> {
    try {
      this.logger.log('Finding leases by tenant ID via repository', { tenantId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Lease')
        .select('*')
        .eq('tenantId', tenantId)
        .order('startDate', { ascending: false });

      if (error) {
        this.logger.error('Failed to find leases by tenant ID', {
          tenantId,
          error: error.message
        });
        return [];
      }

      return (data as unknown as Lease[]) || [];
    } catch (error) {
      this.logger.error(`Database error in findByTenantId: ${error instanceof Error ? error.message : String(error)}`, {
        tenantId,
        error
      });
      return [];
    }
  }

  async create(userId: string, leaseData: LeaseInput): Promise<Lease> {
    try {
      this.logger.log('Creating lease via repository', { userId, leaseData });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Lease')
        .insert({
          ...leaseData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as TablesInsert<'Lease'>)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to create lease', {
          userId,
          error: error.message,
          leaseData
        });
        throw new Error(`Failed to create lease: ${error.message}`);
      }

      return data as unknown as Lease;
    } catch (error) {
      this.logger.error(`Database error in create: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        error,
        leaseData
      });
      throw error;
    }
  }

  async update(leaseId: string, leaseData: LeaseUpdate): Promise<Lease | null> {
    try {
      this.logger.log('Updating lease via repository', { leaseId, leaseData });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Lease')
        .update({
          ...leaseData,
          updatedAt: new Date().toISOString()
        } as TablesUpdate<'Lease'>)
        .eq('id', leaseId)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to update lease', {
          leaseId,
          error: error.message,
          leaseData
        });
        return null;
      }

      return (data as unknown as Lease) || null;
    } catch (error) {
      this.logger.error(`Database error in update: ${error instanceof Error ? error.message : String(error)}`, {
        leaseId,
        error,
        leaseData
      });
      return null;
    }
  }

  async softDelete(userId: string, leaseId: string): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log('Soft deleting lease via repository', { userId, leaseId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Lease')
        .update({
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .eq('id', leaseId)
        .eq('userId', userId)
        .select();

      if (error) {
        this.logger.error('Failed to soft delete lease', {
          userId,
          leaseId,
          error: error.message
        });
        return { success: false, message: `Failed to delete lease: ${error.message}` };
      }

      if (!data || data.length === 0) {
        return { success: false, message: 'Lease not found or not authorized' };
      }

      return { success: true, message: 'Lease deleted successfully' };
    } catch (error) {
      this.logger.error(`Database error in softDelete: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        leaseId,
        error
      });
      return { success: false, message: 'Failed to delete lease due to database error' };
    }
  }

  async getStats(userId: string): Promise<LeaseStats> {
    try {
      this.logger.log('Getting lease stats via DIRECT table query', { userId });

      // DIRECT query -
      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Lease')
        .select('*')
        .eq('userId', userId);

      if (error) {
        this.logger.error('Lease stats direct query failed', { userId, error: error.message });
        return { total: 0, active: 0, expired: 0, expiringSoon: 0 };
      }

      // Calculate stats in TypeScript - SIMPLE AND CLEAN
      const leases = data || [];
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

      const activeLeases = leases.filter(l => l.status === 'ACTIVE');
      const expiredLeases = leases.filter(l => l.status === 'EXPIRED');
      const expiringSoon = activeLeases.filter(l => new Date(l.endDate) <= thirtyDaysFromNow);

      return {
        total: leases.length,
        active: activeLeases.length,
        expired: expiredLeases.length,
        expiringSoon: expiringSoon.length
      };
    } catch (error) {
      this.logger.error(`Database error in getStats: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        error
      });
      return { total: 0, active: 0, expired: 0, expiringSoon: 0 };
    }
  }

  async getAnalytics(userId: string, options: { propertyId?: string; timeframe: string }): Promise<Lease[]> {
    try {
      this.logger.log('Getting lease analytics via DIRECT table query', { userId, options });

      // DIRECT query -
      let query = this.supabase
        .getAdminClient()
        .from('Lease')
        .select('*')
        .eq('userId', userId);

      if (options.propertyId) {
        query = query.eq('propertyId', options.propertyId);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Lease analytics direct query failed', { userId, error: error.message, options });
        return [];
      }

      // Return Lease array directly
      return (data as unknown as Lease[]) || [];
    } catch (error) {
      this.logger.error(`Database error in getAnalytics: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        error,
        options
      });
      return [];
    }
  }

  async getExpiringSoon(userId: string, days: number): Promise<Lease[]> {
    try {
      this.logger.log('Getting leases expiring soon via repository', { userId, days });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Lease')
        .select('*')
        .eq('userId', userId)
        .eq('status', 'ACTIVE')
        .lte('endDate', futureDate.toISOString())
        .gte('endDate', new Date().toISOString())
        .order('endDate', { ascending: true });

      if (error) {
        this.logger.error('Failed to get leases expiring soon', {
          userId,
          days,
          error: error.message
        });
        return [];
      }

      return (data as unknown as Lease[]) || [];
    } catch (error) {
      this.logger.error(`Database error in getExpiringSoon: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        days,
        error
      });
      return [];
    }
  }

  async getActiveLeases(propertyId: string): Promise<Lease[]> {
    try {
      this.logger.log('Getting active leases for property via repository', { propertyId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Lease')
        .select('*')
        .eq('propertyId', propertyId)
        .eq('status', 'ACTIVE')
        .is('deletedAt', null)
        .order('startDate', { ascending: false });

      if (error) {
        this.logger.error('Failed to get active leases', {
          propertyId,
          error: error.message
        });
        return [];
      }

      return (data as unknown as Lease[]) || [];
    } catch (error) {
      this.logger.error(`Database error in getActiveLeases: ${error instanceof Error ? error.message : String(error)}`, {
        propertyId,
        error
      });
      return [];
    }
  }

  async renewLease(leaseId: string, renewalData: Partial<LeaseInput>): Promise<Lease> {
    try {
      this.logger.log('Renewing lease via repository', { leaseId, renewalData });

      // First get the existing lease data
      const existingLease = await this.findById(leaseId);
      if (!existingLease) {
        throw new Error('Lease not found for renewal');
      }

      // Create new lease based on existing one with renewal data
      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Lease')
        .insert({
          ...existingLease,
          ...renewalData,
          id: undefined, // Let database generate new ID
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'ACTIVE' as Database['public']['Enums']['LeaseStatus']
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to renew lease', {
          leaseId,
          error: error.message,
          renewalData
        });
        throw new Error(`Failed to renew lease: ${error.message}`);
      }

      return data as unknown as Lease;
    } catch (error) {
      this.logger.error(`Database error in renewLease: ${error instanceof Error ? error.message : String(error)}`, {
        leaseId,
        error,
        renewalData
      });
      throw error;
    }
  }

  async terminateLease(leaseId: string, terminationDate: Date, reason?: string): Promise<Lease | null> {
    try {
      this.logger.log('Terminating lease via repository', { leaseId, terminationDate, reason });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Lease')
        .update({
          status: 'TERMINATED' as Database['public']['Enums']['LeaseStatus'],
          endDate: terminationDate.toISOString(),
          terminationReason: reason,
          updatedAt: new Date().toISOString()
        } as TablesUpdate<'Lease'>)
        .eq('id', leaseId)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to terminate lease', {
          leaseId,
          terminationDate,
          reason,
          error: error.message
        });
        return null;
      }

      return (data as unknown as Lease) || null;
    } catch (error) {
      this.logger.error(`Database error in terminateLease: ${error instanceof Error ? error.message : String(error)}`, {
        leaseId,
        terminationDate,
        reason,
        error
      });
      return null;
    }
  }

  async getPaymentHistory(leaseId: string): Promise<RentPayment[]> {
    try {
      this.logger.log('Getting lease payment history via repository', { leaseId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('RentPayments')
        .select('*')
        .eq('rentDueId', leaseId)
        .order('createdAt', { ascending: false });

      if (error) {
        this.logger.error('Failed to get lease payment history', {
          leaseId,
          error: error.message
        });
        return [];
      }

      return (data as unknown as RentPayment[]) || [];
    } catch (error) {
      this.logger.error(`Database error in getPaymentHistory: ${error instanceof Error ? error.message : String(error)}`, {
        leaseId,
        error
      });
      return [];
    }
  }
}
