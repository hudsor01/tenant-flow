import { Injectable, Logger } from '@nestjs/common';
import type {
  DashboardStats,
  PropertyPerformance,
  SystemUptime,
  PropertyStats,
  TenantStats,
  UnitStats,
  LeaseStats,
  MaintenanceStats,
  Unit
} from '@repo/shared';
import { SupabaseService } from '../../database/supabase.service';
import {
  IDashboardRepository,
  BillingInsightsOptions
} from '../interfaces/dashboard-repository.interface';
import type { ActivityQueryOptions } from '../interfaces/activity-repository.interface';

@Injectable()
export class SupabaseDashboardRepository implements IDashboardRepository {
  private readonly logger = new Logger(SupabaseDashboardRepository.name);

  constructor(private readonly supabase: SupabaseService) {}

  async getStats(userId: string): Promise<DashboardStats> {
    try {
      this.logger.log('Fetching dashboard stats via DIRECT table queries', { userId });

      // DIRECT queries - NO RPC BULLSHIT
      const [properties, tenants, units, leases, maintenance] = await Promise.all([
        this.supabase.getAdminClient().from('Property').select('*').eq('ownerId', userId),
        this.supabase.getAdminClient().from('Tenant').select('*').eq('userId', userId),
        this.supabase.getAdminClient().from('Unit').select('*').eq('userId', userId),
        this.supabase.getAdminClient().from('Lease').select('*').eq('userId', userId),
        this.supabase.getAdminClient().from('MaintenanceRequest').select('*').eq('userId', userId)
      ]);

      // Check for errors in any query
      if (properties.error || tenants.error || units.error || leases.error || maintenance.error) {
        this.logger.error('One or more direct queries failed', {
          userId,
          errors: {
            properties: properties.error?.message,
            tenants: tenants.error?.message,
            units: units.error?.message,
            leases: leases.error?.message,
            maintenance: maintenance.error?.message
          }
        });
      }

      // Calculate stats in TypeScript - SIMPLE AND CLEAN
      const propertyData = properties.data || [];
      const tenantData = tenants.data || [];
      const unitData = units.data || [];
      const leaseData = leases.data || [];
      const maintenanceData = maintenance.data || [];

      // Property stats
      const propertyStats: PropertyStats = {
        total: propertyData.length,
        occupied: unitData.filter(u => u.status === 'OCCUPIED').length,
        vacant: unitData.filter(u => u.status === 'VACANT').length,
        occupancyRate: unitData.length > 0 ? Math.round((unitData.filter(u => u.status === 'OCCUPIED').length / unitData.length) * 100) : 0,
        totalMonthlyRent: unitData.reduce((sum, unit) => sum + (unit.rent || 0), 0),
        averageRent: unitData.length > 0 ? Math.round(unitData.reduce((sum, unit) => sum + (unit.rent || 0), 0) / unitData.length) : 0
      };

      // Tenant stats
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const tenantStats: TenantStats = {
        total: tenantData.length,
        active: tenantData.length, // All tenants in table are active (soft delete not implemented yet)
        inactive: 0,
        newThisMonth: tenantData.filter(t => new Date(t.createdAt) >= thisMonthStart).length
      };

      // Unit stats
      const unitStats: UnitStats = {
        total: unitData.length,
        occupied: unitData.filter(u => u.status === 'OCCUPIED').length,
        vacant: unitData.filter(u => u.status === 'VACANT').length,
        maintenance: unitData.filter(u => u.status === 'MAINTENANCE').length,
        averageRent: unitData.length > 0 ? Math.round(unitData.reduce((sum, unit) => sum + (unit.rent || 0), 0) / unitData.length) : 0,
        available: unitData.filter(u => u.status === 'VACANT').length,
        occupancyRate: unitData.length > 0 ? Math.round((unitData.filter(u => u.status === 'OCCUPIED').length / unitData.length) * 100) : 0,
        occupancyChange: 0, // TODO: Calculate change from previous period
        totalPotentialRent: unitData.reduce((sum, unit) => sum + (unit.rent || 0), 0),
        totalActualRent: unitData.filter(u => u.status === 'OCCUPIED').reduce((sum, unit) => sum + (unit.rent || 0), 0)
      };

      // Lease stats
      const activeLeases = leaseData.filter(l => l.status === 'ACTIVE');
      const expiredLeases = leaseData.filter(l => l.status === 'EXPIRED');
      const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
      const expiringSoon = activeLeases.filter(l => new Date(l.endDate) <= thirtyDaysFromNow);

      const leaseStats: LeaseStats = {
        total: leaseData.length,
        active: activeLeases.length,
        expired: expiredLeases.length,
        expiringSoon: expiringSoon.length
      };

      // Maintenance stats
      const openMaintenance = maintenanceData.filter(m => m.status === 'OPEN');
      const inProgressMaintenance = maintenanceData.filter(m => m.status === 'IN_PROGRESS');
      const completedMaintenance = maintenanceData.filter(m => m.status === 'COMPLETED');
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const completedToday = completedMaintenance.filter(m => new Date(m.updatedAt) >= todayStart);

      const maintenanceStats: MaintenanceStats = {
        total: maintenanceData.length,
        open: openMaintenance.length,
        inProgress: inProgressMaintenance.length,
        completed: completedMaintenance.length,
        completedToday: completedToday.length,
        avgResolutionTime: 0, // TODO: Calculate average resolution time
        byPriority: {
          low: maintenanceData.filter(m => m.priority === 'LOW').length,
          medium: maintenanceData.filter(m => m.priority === 'MEDIUM').length,
          high: maintenanceData.filter(m => m.priority === 'HIGH').length,
          emergency: maintenanceData.filter(m => m.priority === 'EMERGENCY').length
        }
      };

      // Revenue stats
      const revenue = {
        monthly: unitStats.totalActualRent,
        yearly: unitStats.totalActualRent * 12,
        growth: 0 // TODO: Calculate growth from previous period
      };

      return {
        properties: propertyStats,
        tenants: tenantStats,
        units: unitStats,
        leases: leaseStats,
        maintenance: maintenanceStats,
        revenue
      };

    } catch (error) {
      this.logger.error(`Database error in getStats: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        error
      });

      // Return fallback empty stats on any error
      return {
        properties: {
          total: 0,
          occupied: 0,
          vacant: 0,
          occupancyRate: 0,
          totalMonthlyRent: 0,
          averageRent: 0
        },
        tenants: { total: 0, active: 0, inactive: 0, newThisMonth: 0 },
        units: {
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
        },
        leases: { total: 0, active: 0, expired: 0, expiringSoon: 0 },
        maintenance: {
          total: 0,
          open: 0,
          inProgress: 0,
          completed: 0,
          completedToday: 0,
          avgResolutionTime: 0,
          byPriority: { low: 0, medium: 0, high: 0, emergency: 0 }
        },
        revenue: { monthly: 0, yearly: 0, growth: 0 }
      };
    }
  }

  async getActivity(userId: string, options?: ActivityQueryOptions): Promise<{ activities: unknown[] }> {
    try {
      this.logger.log('Fetching dashboard activity via DIRECT table query', { userId });

      const { data, error } = await this.supabase
        .getAdminClient()
        .from('Activity')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false })
        .limit(options?.limit || 20);

      if (error) {
        this.logger.error('Failed to get activity from repository', {
          userId,
          error: error.message
        });
        return { activities: [] };
      }

      return { activities: data || [] };
    } catch (error) {
      this.logger.error(`Database error in getActivity: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        error
      });
      return { activities: [] };
    }
  }

  async getPropertyPerformance(userId: string): Promise<PropertyPerformance[]> {
    try {
      this.logger.log('Fetching property performance via DIRECT table queries', { userId });

      // Get properties with their units and leases for performance calculation
      const { data: properties, error: propertiesError } = await this.supabase
        .getAdminClient()
        .from('Property')
        .select('*, Unit(*), Lease(*)')
        .eq('ownerId', userId);

      if (propertiesError) {
        this.logger.error('Failed to get property performance', {
          userId,
          error: propertiesError.message
        });
        return [];
      }

      // Calculate performance metrics for each property
      const performance: PropertyPerformance[] = (properties || []).map(property => {
        const units = (property.Unit || []) as Unit[];
        const occupiedUnits = units.filter((u) => u.status === 'OCCUPIED');
        const vacantUnits = units.filter((u) => u.status === 'VACANT');
        const occupancyRate = units.length > 0 ? Math.round((occupiedUnits.length / units.length) * 100) : 0;
        const monthlyRevenue = occupiedUnits.reduce((sum, unit) => sum + (unit.rent || 0), 0);

        const potentialRevenue = units.reduce((sum, unit) => sum + (unit.rent || 0), 0) * 12;
        const status: 'NO_UNITS' | 'VACANT' | 'FULL' | 'PARTIAL' =
          units.length === 0 ? 'NO_UNITS' :
          occupiedUnits.length === 0 ? 'VACANT' :
          occupiedUnits.length === units.length ? 'FULL' : 'PARTIAL';

        return {
          property: property.name,
          propertyId: property.id,
          units: units.length,
          totalUnits: units.length,
          occupiedUnits: occupiedUnits.length,
          vacantUnits: vacantUnits.length,
          occupancy: `${occupancyRate}%`,
          occupancyRate: occupancyRate,
          revenue: monthlyRevenue * 12, // Annual revenue
          monthlyRevenue: monthlyRevenue,
          potentialRevenue: potentialRevenue,
          address: `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`,
          propertyType: property.propertyType,
          status: status
        };
      });

      return performance;
    } catch (error) {
      this.logger.error(`Database error in getPropertyPerformance: ${error instanceof Error ? error.message : String(error)}`, {
        userId,
        error
      });
      return [];
    }
  }

  async getUptime(): Promise<SystemUptime> {
    // Return static uptime data since we don't have a system uptime table
    return {
      uptime: '99.9%',
      uptimePercentage: 99.9,
      sla: '99.5%',
      slaStatus: 'excellent',
      status: 'operational',
      lastIncident: null,
      responseTime: 150,
      timestamp: new Date().toISOString()
    };
  }

  async getBillingInsights(options?: BillingInsightsOptions): Promise<Record<string, unknown>> {
    try {
      // Get billing data from leases and payments
      const { data: leases, error } = await this.supabase
        .getAdminClient()
        .from('Lease')
        .select('*')
        .gte('startDate', options?.startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .lte('endDate', options?.endDate?.toISOString() || new Date().toISOString());

      if (error) {
        this.logger.error('Failed to get billing insights', { error: error.message, options });
        return {};
      }

      const totalRevenue = (leases || []).reduce((sum, lease) => sum + (lease.rentAmount || 0), 0);
      const activeLeases = (leases || []).filter(l => l.status === 'ACTIVE').length;

      return {
        totalRevenue,
        activeLeases,
        averageRent: activeLeases > 0 ? Math.round(totalRevenue / activeLeases) : 0,
        period: {
          start: options?.startDate?.toISOString(),
          end: options?.endDate?.toISOString()
        }
      };
    } catch (error) {
      this.logger.error(`Database error in getBillingInsights: ${error instanceof Error ? error.message : String(error)}`, {
        error,
        options
      });
      return {};
    }
  }

  async isBillingInsightsAvailable(): Promise<boolean> {
    // Always return true since we're using direct table queries
    return true;
  }
}