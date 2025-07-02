import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/utils';

interface UseTenantDetailDataProps {
  tenantId: string | undefined;
}

interface TenantStats {
  totalPayments: number;
  totalLeases: number;
  activeLeases: number;
}

interface Property {
  [key: string]: Property | string;
}

interface Unit {
  property: string;
  [key: string]: Unit | string;
}

interface Lease {
  status: string;
  unit: Unit;
  [key: string]: string | Unit;
}

interface CurrentLeaseInfo {
  currentLease: (Lease & { unit: Unit & { property: Property } }) | undefined;
  currentUnit: (Unit & { property: Property }) | undefined;
  currentProperty: Property | undefined;
}

/**
 * Custom hook for managing tenant detail data
 * Handles complex data fetching, calculations, and statistics
 */
export function useTenantDetailData({ tenantId }: UseTenantDetailDataProps) {
  // Fetch tenant with related data using API client
  const { data: tenant, isLoading, error } = useQuery({
    queryKey: queryKeys.tenants.detail(tenantId || ''),
    queryFn: () => apiClient.tenants.getById(tenantId || ''),
    enabled: !!tenantId,
  });

  // Placeholder for maintenanceRequests if needed
  const maintenanceRequests = useMemo(() => {
    // TODO: Replace with actual logic when maintenance requests are available
    return [];
  }, []);

  // Calculate stats
  const stats: TenantStats = useMemo(() => {
    if (!tenant?.leases) {
      return {
        totalPayments: 0,
        totalLeases: 0,
        activeLeases: 0,
      };
    }

    // TODO: Update this when payment data is included in tenant API response
    const totalPayments = 0; // Will need to be calculated from API data
    const totalLeases = tenant.leases.length;
    const activeLeases = (tenant.leases as unknown as Lease[]).filter(lease => lease.status === 'ACTIVE').length;

    return {
      totalPayments,
      totalLeases,
      activeLeases,
    };
  }, [tenant?.leases]);

  // Get current lease information
  const currentLeaseInfo: CurrentLeaseInfo = useMemo(() => {
    const currentLease = tenant?.leases?.find(
      (lease) => (lease as unknown as Lease).status === 'ACTIVE'
    ) as Lease & { unit: Unit & { property: Property } } | undefined;
    const currentUnit = currentLease?.unit;
    const currentProperty = currentUnit?.property;

    return {
      currentLease,
      currentUnit,
      currentProperty,
    };
  }, [tenant?.leases]);

  return {
    tenant,
    isLoading,
    error,
    maintenanceRequests,
    stats,
    currentLeaseInfo,
  };
}

/**
 * Helper function to get status icon based on status string
 */
export function getStatusIconName(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'CheckCircle';
    case 'PENDING':
      return 'Clock';
    case 'EXPIRED':
    case 'TERMINATED':
      return 'XCircle';
    default:
      return 'AlertCircle';
  }
}

/**
 * Helper function to get badge variant for status
 */
export function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'ACTIVE':
    case 'COMPLETED':
      return 'default';
    case 'EXPIRED':
    case 'IN_PROGRESS':
      return 'secondary';
    case 'TERMINATED':
      return 'destructive';
    default:
      return 'outline';
  }
}

/**
 * Helper function to get maintenance badge variant
 */
export function getMaintenanceBadgeVariant(
  status: string, 
  priority?: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'COMPLETED') return 'default';
  if (status === 'IN_PROGRESS') return 'secondary';
  if (priority === 'EMERGENCY') return 'destructive';
  return 'outline';
}