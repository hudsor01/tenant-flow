import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { MaintenanceRequest } from '@/types/entities';
import type { TenantWithLeases } from '@/types/relationships';

interface UseTenantDetailDataProps {
  tenantId: string | undefined;
}

interface TenantStats {
  totalPayments: number;
  totalLeases: number;
  activeLeases: number;
}

interface CurrentLeaseInfo {
  currentLease: TenantWithLeases['leases'][number] | undefined;
  currentUnit: TenantWithLeases['leases'][number]['unit'] | undefined;
  currentProperty: TenantWithLeases['leases'][number]['unit']['property'] | undefined;
}

/**
 * Custom hook for managing tenant detail data
 * Handles complex data fetching, calculations, and statistics
 */
export function useTenantDetailData({ tenantId }: UseTenantDetailDataProps) {
  // Fetch tenant with all related data
  const { data: tenant, isLoading, error } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('Tenant')
        .select(`
          *,
          user:User (*),
          leases:Lease (
            *,
            unit:Unit (
              *,
              property:Property (*)
            ),
            payments:Payment (*)
          )
        `)
        .eq('id', tenantId)
        .single();

      if (error) throw error;
      return data as TenantWithLeases;
    },
    enabled: !!tenantId,
  });

  // Fetch maintenance requests for units this tenant has leased
  const { data: maintenanceRequests = [] } = useQuery({
    queryKey: ['tenant-maintenance', tenantId],
    queryFn: async () => {
      if (!tenant?.leases) return [];

      const unitIds = tenant.leases.map(lease => lease.unitId);
      const { data, error } = await supabase
        .from('MaintenanceRequest')
        .select(`
          *,
          unit:Unit (
            *,
            property:Property (*)
          )
        `)
        .in('unitId', unitIds)
        .order('createdAt', { ascending: false });

      if (error) throw error;
      return data as MaintenanceRequest[];
    },
    enabled: !!tenant?.leases,
  });

  // Calculate tenant statistics
  const stats: TenantStats = useMemo(() => {
    if (!tenant?.leases) {
      return {
        totalPayments: 0,
        totalLeases: 0,
        activeLeases: 0,
      };
    }

    const totalPayments = tenant.leases.reduce((sum, lease) =>
      sum + (lease.payments?.reduce((pSum, payment) => pSum + payment.amount, 0) || 0), 0
    );

    const totalLeases = tenant.leases.length;
    const activeLeases = tenant.leases.filter(lease => lease.status === 'ACTIVE').length;

    return {
      totalPayments,
      totalLeases,
      activeLeases,
    };
  }, [tenant?.leases]);

  // Get current lease information
  const currentLeaseInfo: CurrentLeaseInfo = useMemo(() => {
    const currentLease = tenant?.leases?.find(lease => lease.status === 'ACTIVE');
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