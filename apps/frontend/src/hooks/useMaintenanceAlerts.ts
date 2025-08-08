/**
 * Hook for managing maintenance request alerts
 * Provides notifications for overdue or urgent maintenance requests
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface MaintenanceAlert {
  id: string;
  requestId: string;
  propertyAddress: string;
  unitNumber?: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'overdue';
  createdAt: string;
  daysOpen: number;
  daysOld: number;
  severity: 'info' | 'warning' | 'error';
  message: string;
  request: {
    property?: { address: string };
    propertyName?: string;
    unit?: { number: string };
    unitNumber?: string;
    priority: string;
    status: string;
  };
}

export function useMaintenanceAlerts() {
  const { data: maintenanceRequests, isLoading } = useQuery({
    queryKey: ['maintenance-requests', 'active'],
    queryFn: async () => {
      // TODO: Implement actual API call to fetch maintenance requests
      // For now, return empty array to prevent runtime errors
      return [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const alerts = useMemo(() => {
    if (!maintenanceRequests) return [];
    
    // TODO: Process maintenance requests to generate alerts
    // This would identify overdue requests, urgent priorities, etc.
    const maintenanceAlerts: MaintenanceAlert[] = [];
    
    return maintenanceAlerts;
  }, [maintenanceRequests]);

  const urgentAlerts = useMemo(() => 
    alerts.filter(alert => alert.severity === 'error'),
    [alerts]
  );

  const overdueAlerts = useMemo(() => 
    alerts.filter(alert => alert.status === 'overdue'),
    [alerts]
  );

  return {
    alerts,
    urgentAlerts,
    overdueAlerts,
    isLoading,
    hasAlerts: alerts.length > 0,
    urgentCount: urgentAlerts.length,
    overdueCount: overdueAlerts.length,
  };
}

// Export for backward compatibility
export function useMaintenanceAlertCounts() {
  const { urgentCount, overdueCount, isLoading } = useMaintenanceAlerts();
  return { 
    urgentCount, 
    overdueCount, 
    isLoading,
    emergency: urgentCount, // Alias for backward compatibility
    high_priority: overdueCount, // Alias for backward compatibility
  };
}