import { cache } from 'react';
import { apiClient } from '@/lib/api-client';

// Dashboard statistics types
export interface DashboardStats {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  totalTenants: number;
  activeTenants: number;
  activeLeases: number;
  expiringLeases: number;
  pendingMaintenance: number;
}

// Dashboard statistics
export const getDashboardStats = cache(async (): Promise<DashboardStats> => {
  try {
    const response = await apiClient.get('/dashboard/stats');
    
    if (!response.success) {
      console.error('Failed to fetch dashboard stats:', response.message);
      // Return mock data as fallback
      return {
        totalProperties: 0,
        totalUnits: 0,
        occupiedUnits: 0,
        totalTenants: 0,
        activeTenants: 0,
        activeLeases: 0,
        expiringLeases: 0,
        pendingMaintenance: 0,
      };
    }

    return response.data as DashboardStats;
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    // Return mock data as fallback
    return {
      totalProperties: 0,
      totalUnits: 0,
      occupiedUnits: 0,
      totalTenants: 0,
      activeTenants: 0,
      activeLeases: 0,
      expiringLeases: 0,
      pendingMaintenance: 0,
    };
  }
});

// Cached data fetchers for Dashboard components
export const getDashboardOverview = cache(async () => {
  try {
    const response = await apiClient.get('/dashboard/overview');
    
    if (!response.success) {
      console.error('Failed to fetch dashboard overview:', response.message);
      return null;
    }

    return response.data;
  } catch (error) {
    console.error('Get dashboard overview error:', error);
    return null;
  }
});

export const getRecentActivity = cache(async () => {
  try {
    const response = await apiClient.get('/dashboard/activity');
    
    if (!response.success) {
      console.error('Failed to fetch recent activity:', response.message);
      return [];
    }

    return response.data || [];
  } catch (error) {
    console.error('Get recent activity error:', error);
    return [];
  }
});

export const getUpcomingTasks = cache(async () => {
  try {
    const response = await apiClient.get('/dashboard/tasks');
    
    if (!response.success) {
      console.error('Failed to fetch upcoming tasks:', response.message);
      return [];
    }

    return response.data || [];
  } catch (error) {
    console.error('Get upcoming tasks error:', error);
    return [];
  }
});

export const getDashboardAlerts = cache(async () => {
  try {
    const response = await apiClient.get('/dashboard/alerts');
    
    if (!response.success) {
      console.error('Failed to fetch dashboard alerts:', response.message);
      return [];
    }

    return response.data || [];
  } catch (error) {
    console.error('Get dashboard alerts error:', error);
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
    console.error('Get dashboard data error:', error);
    return {
      overview: null,
      activity: [],
      tasks: [],
      alerts: [],
    };
  }
});