'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface DashboardStats {
  properties?: { total: number; occupied: number };
  tenants?: { active: number; pending: number };
  maintenance?: { open: number; urgent: number };
  revenue?: { monthly: number; growth: number };
}

export interface ActivityItem {
  id: string | number;
  type: 'maintenance' | 'tenant' | 'lease' | string;
  title: string;
  description: string;
  timestamp: string;
  status?: 'completed' | 'urgent' | string;
}

interface DashboardData {
  stats: DashboardStats | null;
  activities: ActivityItem[] | null;
  isLoading: boolean;
  isStatsLoading: boolean;
  isActivitiesLoading: boolean;
  error: Error | null;
}

export function useDashboardData(
  userId: string | null | undefined, 
  selectedPeriod: '7d' | '30d' | '90d' = '30d'
): DashboardData {
  // Fetch dashboard statistics
  const { 
    data: statsResponse, 
    isLoading: isStatsLoading,
    error: statsError
  } = useQuery({
    queryKey: ['dashboard-stats', userId, selectedPeriod],
    queryFn: async () => {
      const response = await apiClient.get(`/dashboard/stats?period=${selectedPeriod}`);
      return response;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });

  // Fetch recent activities
  const { 
    data: activitiesResponse, 
    isLoading: isActivitiesLoading,
    error: activitiesError
  } = useQuery({
    queryKey: ['recent-activities', userId],
    queryFn: async () => {
      const response = await apiClient.get('/dashboard/recent-activities?limit=5');
      return response;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2
  });

  return {
    stats: statsResponse?.data || null,
    activities: Array.isArray(activitiesResponse?.data) ? activitiesResponse.data : null,
    isLoading: isStatsLoading || isActivitiesLoading,
    isStatsLoading,
    isActivitiesLoading,
    error: statsError || activitiesError || null
  };
}