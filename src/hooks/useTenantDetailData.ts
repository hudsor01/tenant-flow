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
  // Fetch tenant with related data using safe step-by-step approach
  const { data: tenant, isLoading, error } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant ID')

      try {
        // Step 1: Get basic tenant data
        const { data: tenantData, error: tenantError } = await supabase
          .from('Tenant')
          .select('*')
          .eq('id', tenantId)
          .single()

        if (tenantError) throw tenantError

        // Step 2: Get user data if userId exists
        let userData = null
        if (tenantData.userId) {
          const { data: userResult, error: userError } = await supabase
            .from('User')
            .select('*')
            .eq('id', tenantData.userId)
            .single()
          
          if (!userError) {
            userData = userResult
          }
        }

        // Step 3: Get lease data for this tenant
        const { data: leases, error: leasesError } = await supabase
          .from('Lease')
          .select('*')
          .eq('tenantId', tenantId)

        if (leasesError && leasesError.code !== 'PGRST116') {
          console.warn('Could not fetch lease data:', leasesError)
        }

        // Step 4: Get unit data if leases exist
        let unitsData = []
        if (leases && leases.length > 0) {
          const unitIds = [...new Set(leases.map(l => l.unitId))]
          const { data: units, error: unitsError } = await supabase
            .from('Unit')
            .select('*')
            .in('id', unitIds)

          if (unitsError && unitsError.code !== 'PGRST116') {
            console.warn('Could not fetch unit data:', unitsError)
          } else {
            unitsData = units || []
          }
        }

        // Step 5: Get property data if units exist
        let propertiesData = []
        if (unitsData.length > 0) {
          const propertyIds = [...new Set(unitsData.map(u => u.propertyId))]
          const { data: properties, error: propertiesError } = await supabase
            .from('Property')
            .select('*')
            .in('id', propertyIds)

          if (propertiesError && propertiesError.code !== 'PGRST116') {
            console.warn('Could not fetch property data:', propertiesError)
          } else {
            propertiesData = properties || []
          }
        }

        // Step 6: Get payment data if leases exist
        let paymentsData = []
        if (leases && leases.length > 0) {
          const leaseIds = leases.map(l => l.id)
          const { data: payments, error: paymentsError } = await supabase
            .from('Payment')
            .select('*')
            .in('leaseId', leaseIds)

          if (paymentsError && paymentsError.code !== 'PGRST116') {
            console.warn('Could not fetch payment data:', paymentsError)
          } else {
            paymentsData = payments || []
          }
        }

        // Step 7: Combine data client-side
        const leasesWithRelations = (leases || []).map(lease => {
          const unit = unitsData.find(u => u.id === lease.unitId)
          const property = unit ? propertiesData.find(p => p.id === unit.propertyId) : null
          const leasePayments = paymentsData.filter(p => p.leaseId === lease.id)

          return {
            ...lease,
            unit: unit ? {
              ...unit,
              property: property || null
            } : null,
            payments: leasePayments
          }
        })

        return {
          ...tenantData,
          user: userData,
          leases: leasesWithRelations
        } as TenantWithLeases

      } catch (error) {
        console.error('Error in useTenantDetailData:', error)
        throw error
      }
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