// Purpose: Centralized resource client and mapping types for CRUD hooks.
// Assumptions: All resource types are imported from '@/types/api'.

import type {
    PropertyWithDetails,
    LeaseWithDetails,
    PaymentWithDetails,
    TenantWithDetails,
    UnitWithDetails,
    MaintenanceWithDetails,
    NotificationWithDetails,
} from '@/types/api'

// Generic resource client interface for CRUD operations
export interface ResourceClient<T, CreateDto = Partial<T>> {
    getAll(): Promise<T[]>
    create(data: CreateDto): Promise<T>
    update(id: string, data: Partial<T>): Promise<T>
    delete(id: string): Promise<{ message: string }>
}

import type { CreateNotificationDto } from '@/types/api'

// Mapping of resource names to their client types
export interface ResourceMap {
    leases: ResourceClient<LeaseWithDetails>
    properties: ResourceClient<PropertyWithDetails>
    units: ResourceClient<UnitWithDetails>
    tenants: ResourceClient<TenantWithDetails>
    maintenance: ResourceClient<MaintenanceWithDetails>
    payments: ResourceClient<PaymentWithDetails>
    notifications: ResourceClient<NotificationWithDetails, CreateNotificationDto>
}

export type ResourceName = keyof ResourceMap

import type { UseQueryOptions } from '@tanstack/react-query'

// Config for resource hooks
export interface ResourceConfig<T> extends Partial<UseQueryOptions<T[], Error>> {
    autoRefresh?: boolean
    showSuccessToast?: boolean
    showErrorToast?: boolean
    cacheTime?: number
}

// Result shape for resource hooks
export interface UseResourceResult<T, CreateDto = Partial<T>> {
    data: T[]
    loading: boolean
    error: Error | null
    refresh: () => void
    cancel: () => void
    mutate: (data: T[]) => void
    create: (data: CreateDto) => Promise<void>
    update: (id: string, data: Partial<T>) => Promise<void>
    remove: (id: string) => Promise<void>
    creating: boolean
    updating: boolean
    deleting: boolean
}
