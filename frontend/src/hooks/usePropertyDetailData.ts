import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PropertyWithUnitsAndLeases } from '@/types/relationships';
import type { PropertyWithDetails } from '@/types/api';

interface UsePropertyDetailDataProps {
  propertyId: string | undefined;
}

interface PropertyStats {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
  totalMonthlyRent: number;
  potentialRent: number;
}

/**
 * Custom hook for managing property detail data and statistics
 * Handles complex property fetching with units, leases, tenants, and payments
 */
export function usePropertyDetailData({ propertyId }: UsePropertyDetailDataProps) {
  // Fetch property with all related data
  const { data: apiProperty, isLoading, error } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      if (!propertyId) throw new Error('Property ID is required');
      return await apiClient.properties.getById(propertyId);
    },
    enabled: !!propertyId,
  });

  // Transform API response to match existing interface
  const property: PropertyWithUnitsAndLeases | undefined = useMemo(() => {
    if (!apiProperty) return undefined;
    
    return {
      ...apiProperty,
      units: apiProperty.units?.map(unit => ({
        ...unit,
        leases: unit.leases?.map(lease => ({
          ...lease,
          tenant: lease.tenant || {} as any
        })) || []
      })) || []
    } as PropertyWithUnitsAndLeases;
  }, [apiProperty]);

  // Calculate property statistics
  const stats: PropertyStats = useMemo(() => {
    if (!property?.units) {
      return {
        totalUnits: 0,
        occupiedUnits: 0,
        vacantUnits: 0,
        occupancyRate: 0,
        totalMonthlyRent: 0,
        potentialRent: 0,
      };
    }

    const totalUnits = property.units.length;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const occupiedUnits = property.units.filter((unit: any) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      unit.status === 'OCCUPIED' && unit.leases?.some((lease: any) => lease.status === 'ACTIVE')
    ).length;

    const vacantUnits = totalUnits - occupiedUnits;
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalMonthlyRent = property.units.reduce((sum: number, unit: any) => {
      if (unit.status === 'OCCUPIED' && unit.leases && unit.leases.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const activeLeases = unit.leases.filter((lease: any) => lease.status === 'ACTIVE');
        return sum + (activeLeases.length > 0 ? activeLeases[0].rentAmount : 0);
      }
      return sum;
    }, 0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const potentialRent = property.units.reduce((sum: number, unit: any) => sum + unit.rent, 0);

    return {
      totalUnits,
      occupiedUnits,
      vacantUnits,
      occupancyRate,
      totalMonthlyRent,
      potentialRent,
    };
  }, [property?.units]);

  // Animation configuration
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  };

  return {
    property,
    isLoading,
    error,
    stats,
    fadeInUp,
  };
}

/**
 * Helper function to get unit lease information
 */
export function getUnitLeaseInfo(unit: unknown) {
  const unitData = unit as { leases?: Array<{ status: string; tenant?: unknown }> };
  const activeLease = unitData.leases?.find((lease) => lease.status === 'ACTIVE');
  const tenant = activeLease?.tenant;
  
  return {
    activeLease,
    tenant,
    hasActiveLease: !!activeLease,
  };
}

/**
 * Helper function to format currency
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString();
}