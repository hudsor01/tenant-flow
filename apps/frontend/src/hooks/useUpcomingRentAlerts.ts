/**
 * Hook for managing upcoming rent payment alerts
 * Provides notifications for upcoming rent due dates
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface RentAlert {
  id: string;
  tenantId: string;
  tenantName: string;
  propertyAddress: string;
  unitNumber: string;
  dueDate: string;
  amount: number;
  daysUntilDue: number;
  severity: 'info' | 'warning' | 'error';
  title: string;
  type: string;
  message: string;
  property: { address: string; name: string };
  unit: { number: string; name: string };
  tenant: { name: string };
  lease: { id: string; rentAmount: number };
}

export function useUpcomingRentAlerts() {
  const { data: leases, isLoading } = useQuery({
    queryKey: ['leases', 'active'],
    queryFn: async () => {
      // TODO: Implement actual API call to fetch active leases
      // For now, return empty array to prevent runtime errors
      return [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const alerts = useMemo(() => {
    if (!leases) return [];
    
    // TODO: Process leases to generate rent alerts
    // This would calculate which rents are due soon based on lease terms
    const rentAlerts: RentAlert[] = [];
    
    return rentAlerts;
  }, [leases]);

  const criticalAlerts = useMemo(() => 
    alerts.filter(alert => alert.severity === 'error'),
    [alerts]
  );

  const warningAlerts = useMemo(() => 
    alerts.filter(alert => alert.severity === 'warning'),
    [alerts]
  );

  return {
    alerts,
    criticalAlerts,
    warningAlerts,
    isLoading,
    hasAlerts: alerts.length > 0,
    criticalCount: criticalAlerts.length,
    warningCount: warningAlerts.length,
    data: alerts, // For compatibility
  };
}

// Export for backward compatibility
export function useRentAlertCounts() {
  const { criticalCount, warningCount, isLoading } = useUpcomingRentAlerts();
  return { 
    criticalCount, 
    warningCount, 
    isLoading,
    overdue: criticalCount, // Alias for backward compatibility
    due_soon: warningCount, // Alias for backward compatibility
  };
}