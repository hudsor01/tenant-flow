import { cache } from 'react';
import { logger } from '@/lib/logger'
import { apiClient } from '@/lib/api-client';
import type { DashboardStats } from '@repo/shared';

// Dashboard statistics
export const getDashboardStats = cache(async (): Promise<DashboardStats> => {
  try {
    const response = await apiClient.get('/dashboard/stats');
    
    if (!response.success) {
      logger.error('Failed to fetch dashboard stats:', response.message instanceof Error ? response.message : new Error(String(response.message)), { component: 'UdashboardData' });
      // Return mock data as fallback
      return {
        properties: {
          totalUnits: 0,
          occupiedUnits: 0,
          vacantUnits: 0,
          occupancyRate: 0,
          totalMonthlyRent: 0,
          potentialRent: 0
        },
        tenants: {
          totalTenants: 0,
          activeTenants: 0,
          inactiveTenants: 0,
          pendingInvitations: 0
        },
        units: {
          totalUnits: 0,
          availableUnits: 0,
          occupiedUnits: 0,
          maintenanceUnits: 0,
          averageRent: 0
        },
        leases: {
          totalLeases: 0,
          activeLeases: 0,
          expiredLeases: 0,
          pendingLeases: 0,
          totalRentRoll: 0
        },
        maintenanceRequests: {
          total: 0,
          open: 0,
          inProgress: 0,
          completed: 0
        },
        notifications: {
          total: 0,
          unread: 0
        }
      };
    }

    return response.data as DashboardStats;
  } catch (error) {
    logger.error('Get dashboard stats error:', error instanceof Error ? error : new Error(String(error)), { component: 'UdashboardData' });
    // Return mock data as fallback
    return {
      properties: {
        totalUnits: 0,
        occupiedUnits: 0,
        vacantUnits: 0,
        occupancyRate: 0,
        totalMonthlyRent: 0,
        potentialRent: 0
      },
      tenants: {
        totalTenants: 0,
        activeTenants: 0,
        inactiveTenants: 0,
        pendingInvitations: 0
      },
      units: {
        totalUnits: 0,
        availableUnits: 0,
        occupiedUnits: 0,
        maintenanceUnits: 0,
        averageRent: 0
      },
      leases: {
        totalLeases: 0,
        activeLeases: 0,
        expiredLeases: 0,
        pendingLeases: 0,
        totalRentRoll: 0
      },
      maintenanceRequests: {
        total: 0,
        open: 0,
        inProgress: 0,
        completed: 0
      },
      notifications: {
        total: 0,
        unread: 0
      }
    };
  }
});

// Cached data fetchers for Dashboard components
export const getDashboardOverview = cache(async () => {
  try {
    const response = await apiClient.get('/dashboard/overview');
    
    if (!response.success) {
      logger.error('Failed to fetch dashboard overview:', response.message instanceof Error ? response.message : new Error(String(response.message)), { component: 'UdashboardData' });
      return null;
    }

    return response.data;
  } catch (error) {
    logger.error('Get dashboard overview error:', error instanceof Error ? error : new Error(String(error)), { component: 'UdashboardData' });
    return null;
  }
});

export const getRecentActivity = cache(async () => {
  try {
    const response = await apiClient.get('/dashboard/activity');
    
    if (!response.success) {
      logger.error('Failed to fetch recent activity:', response.message instanceof Error ? response.message : new Error(String(response.message)), { component: 'UdashboardData' });
      return [];
    }

    return response.data || [];
  } catch (error) {
    logger.error('Get recent activity error:', error instanceof Error ? error : new Error(String(error)), { component: 'UdashboardData' });
    return [];
  }
});

export const getUpcomingTasks = cache(async () => {
  try {
    const response = await apiClient.get('/dashboard/tasks');
    
    if (!response.success) {
      logger.error('Failed to fetch upcoming tasks:', response.message instanceof Error ? response.message : new Error(String(response.message)), { component: 'UdashboardData' });
      return [];
    }

    return response.data || [];
  } catch (error) {
    logger.error('Get upcoming tasks error:', error instanceof Error ? error : new Error(String(error)), { component: 'UdashboardData' });
    return [];
  }
});

export const getDashboardAlerts = cache(async () => {
  try {
    const response = await apiClient.get('/dashboard/alerts');
    
    if (!response.success) {
      logger.error('Failed to fetch dashboard alerts:', response.message instanceof Error ? response.message : new Error(String(response.message)), { component: 'UdashboardData' });
      return [];
    }

    return response.data || [];
  } catch (error) {
    logger.error('Get dashboard alerts error:', error instanceof Error ? error : new Error(String(error)), { component: 'UdashboardData' });
    return [];
  }
});

// Aggregated dashboard data
export const getDashboardData = cache(async () => {
  try {
    const [overview, activity, tasks, alerts] = await Promise.all([
      getDashboardOverview(),
      getRecentActivity(),
      getUpcomingTasks(),
      getDashboardAlerts(),
    ]);

    return {
      overview,
      activity,
      tasks,
      alerts,
    };
  } catch (error) {
    logger.error('Get dashboard data error:', error instanceof Error ? error : new Error(String(error)), { component: 'UdashboardData' });
    return {
      overview: null,
      activity: [],
      tasks: [],
      alerts: [],
    };
  }
});