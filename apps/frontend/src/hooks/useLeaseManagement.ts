/**
 * Unified lease management hook following TanStack Query best practices
 * Colocates queries, mutations, and form logic for lease operations
 * 
 * Based on TanStack Query official documentation:
 * - https://tanstack.com/query/latest/docs/framework/react/guides/query-options
 * - https://tanstack.com/query/latest/docs/framework/react/guides/mutations
 */

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { useLeases, useCreateLease, useUpdateLease, useDeleteLease } from './useLeases'
import { useProperties } from './useProperties'
import type { LeaseWithRelations } from './useSupabaseLeases'
import { useTenants } from './useTenants'
import { useUnitsByProperty } from './useUnits'
import type { Property, Unit } from '@tenantflow/shared/types/properties'
import type { Tenant } from '@tenantflow/shared/types/tenants'
import type { CreateLeaseInput } from '@tenantflow/shared/types/api-inputs'

// Validation schema
const leaseSchema = z
  .object({
    propertyId: z.string().min(1, 'Please select a property'),
    unitId: z.string().nullable().optional(),
    tenantId: z.string().min(1, 'Please select at least one tenant'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    rentAmount: z
      .number()
      .min(0, 'Rent amount must be positive')
      .max(100000, 'Rent amount too high'),
    securityDeposit: z
      .number()
      .min(0, 'Security deposit must be positive')
      .max(100000, 'Security deposit too high'),
    status: z.enum(['ACTIVE', 'INACTIVE', 'EXPIRED', 'TERMINATED', 'DRAFT'])
  })
  .refine(
    data => {
      const start = new Date(data.startDate)
      const end = new Date(data.endDate)
      return end > start
    },
    {
      message: 'End date must be after start date',
      path: ['endDate']
    }
  )

export type LeaseFormData = z.infer<typeof leaseSchema>

export interface UseLeaseManagementOptions {
  lease?: LeaseWithRelations
  mode?: 'create' | 'edit'
  propertyId?: string
  unitId?: string
  tenantId?: string
  onSuccess?: () => void
  onClose?: () => void
}

/**
 * Unified hook for all lease management operations
 * Following TanStack Query colocation pattern
 */
export function useLeaseManagement(options: UseLeaseManagementOptions = {}) {
  const {
    lease,
    mode = 'create',
    propertyId: defaultPropertyId,
    unitId: defaultUnitId,
    tenantId: defaultTenantId,
    onClose
  } = options

  // Colocated queries
  const queries = {
    leases: useLeases(),
    properties: useProperties(),
    tenants: useTenants(),
    units: useUnitsByProperty((defaultPropertyId || lease?.Unit?.propertyId) ?? '')
  }

  // Data transformation
  const properties = (queries.properties.data as { properties?: Property[] })?.properties || []
  const tenants: Tenant[] = ((queries.tenants.data as { tenants?: Tenant[] })?.tenants || []).map((tenant: Tenant) => ({
    ...tenant,
    phone: tenant.phone || null,
    createdAt: typeof tenant.createdAt === 'string' ? new Date(tenant.createdAt) : tenant.createdAt,
    updatedAt: typeof tenant.updatedAt === 'string' ? new Date(tenant.updatedAt) : tenant.updatedAt
  }))
  
  const propertyUnits: Unit[] = Array.isArray(queries.units.data) 
    ? queries.units.data as Unit[]
    : (queries.units.data as { units?: Unit[] })?.units || []

  // Computed data
  const selectedProperty = properties.find(p => p.id === (defaultPropertyId || lease?.Unit?.propertyId))
  const hasUnits = propertyUnits.length > 0
  const availableUnits = propertyUnits.filter(
    (unit: Unit) => unit.status === 'VACANT' || unit.status === 'RESERVED'
  )

  // Colocated mutations with automatic cache updates
  const createMutation = useCreateLease()
  const updateMutation = useUpdateLease()
  const deleteMutation = useDeleteLease()

  // Form management
  const form = useForm<LeaseFormData>({
    resolver: zodResolver(leaseSchema) as any,
    defaultValues: {
      propertyId: defaultPropertyId || lease?.Unit?.propertyId || '',
      unitId: defaultUnitId || lease?.unitId || '',
      tenantId: defaultTenantId || lease?.tenantId || '',
      startDate: lease?.startDate
        ? format(new Date(lease.startDate), 'yyyy-MM-dd')
        : '',
      endDate: lease?.endDate
        ? format(new Date(lease.endDate), 'yyyy-MM-dd')
        : '',
      rentAmount: lease?.rentAmount || 0,
      securityDeposit: lease?.securityDeposit || 0,
      status: (['ACTIVE', 'INACTIVE', 'EXPIRED', 'TERMINATED', 'DRAFT'] as const).includes(lease?.status as 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'TERMINATED' | 'DRAFT') 
        ? lease?.status as 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'TERMINATED' | 'DRAFT'
        : 'DRAFT'
    }
  })

  // Form submission handler
  const handleSubmit = form.handleSubmit(async (data) => {
    const formattedData = {
      propertyId: data.propertyId,
      unitId: data.unitId || '',
      tenantId: data.tenantId,
      startDate: data.startDate,
      endDate: data.endDate,
      rentAmount: Number(data.rentAmount),
      securityDeposit: Number(data.securityDeposit)
    } as CreateLeaseInput

    if (mode === 'edit' && lease) {
      await updateMutation.mutateAsync({ id: lease.id, ...formattedData })
    } else {
      await createMutation.mutateAsync(formattedData)
    }
  })

  // Computed loading state
  const isLoading = Object.values(queries).some(q => q.isLoading)
  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  return {
    // Organized data queries
    data: {
      leases: queries.leases.data,
      properties,
      tenants,
      units: propertyUnits,
      selectedProperty,
      hasUnits,
      availableUnits
    },
    // Query states
    queries: {
      isLoading,
      errors: {
        leases: queries.leases.error,
        properties: queries.properties.error,
        tenants: queries.tenants.error,
        units: queries.units.error
      }
    },
    // Mutation functions
    mutations: {
      create: createMutation.mutate,
      update: updateMutation.mutate,
      delete: deleteMutation.mutate,
      isPending: isMutating
    },
    // Form instance and handlers
    form,
    handleSubmit,
    // Utility functions
    close: onClose,
    // Schema for external validation
    schema: leaseSchema
  }
}