import { atom } from 'jotai'
import { atomWithMutation } from 'jotai-tanstack-query'
import type { Tenant, PropertyWithUnits } from '@repo/shared'

// Mutation functions (these would be implemented based on your API)
const createProperty = async (data: Omit<PropertyWithUnits, 'id' | 'createdAt' | 'updatedAt'>): Promise<PropertyWithUnits> => {
  const response = await fetch('/api/properties', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to create property')
  return response.json()
}

const updateProperty = async ({ id, ...data }: Partial<PropertyWithUnits> & { id: string }): Promise<PropertyWithUnits> => {
  const response = await fetch(`/api/properties/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to update property')
  return response.json()
}

const deleteProperty = async (id: string): Promise<void> => {
  const response = await fetch(`/api/properties/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error('Failed to delete property')
}

const createTenant = async (data: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tenant> => {
  const response = await fetch('/api/tenants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to create tenant')
  return response.json()
}

const updateTenant = async ({ id, ...data }: Partial<Tenant> & { id: string }): Promise<Tenant> => {
  const response = await fetch(`/api/tenants/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to update tenant')
  return response.json()
}

const deleteTenant = async (id: string): Promise<void> => {
  const response = await fetch(`/api/tenants/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error('Failed to delete tenant')
}

// Property mutations with optimistic updates
export const createPropertyMutationAtom = atomWithMutation(() => ({
  mutationFn: createProperty,
  onSuccess: () => {
    // Invalidate and refetch properties list
    // This would be handled by the QueryClient invalidation
  },
  onError: (error: unknown) => {
    console.error('Failed to create property:', error)
  },
}))

export const updatePropertyMutationAtom = atomWithMutation(() => ({
  mutationFn: updateProperty,
  onMutate: async () => {
    // Cancel outgoing refetches
    // Return context for rollback
    return { previousProperty: null }
  },
  onError: (error: unknown) => {
    // Rollback optimistic update
    console.error('Failed to update property:', error)
  },
  onSettled: () => {
    // Always refetch after error or success
  },
}))

export const deletePropertyMutationAtom = atomWithMutation(() => ({
  mutationFn: deleteProperty,
  onSuccess: () => {
    // Invalidate properties list
  },
  onError: (error: unknown) => {
    console.error('Failed to delete property:', error)
  },
}))

// Tenant mutations
export const createTenantMutationAtom = atomWithMutation(() => ({
  mutationFn: createTenant,
  onSuccess: () => {
    // Invalidate tenants list
  },
  onError: (error: unknown) => {
    console.error('Failed to create tenant:', error)
  },
}))

export const updateTenantMutationAtom = atomWithMutation(() => ({
  mutationFn: updateTenant,
  onMutate: async () => {
    return { previousTenant: null }
  },
  onError: (error: unknown) => {
    console.error('Failed to update tenant:', error)
  },
}))

export const deleteTenantMutationAtom = atomWithMutation(() => ({
  mutationFn: deleteTenant,
  onSuccess: () => {
    // Invalidate tenants list
  },
  onError: (error: unknown) => {
    console.error('Failed to delete tenant:', error)
  },
}))

// Optimistic update helpers
export const optimisticPropertyUpdateAtom = atom(
  null,
  () => {
    // This would optimistically update the local state
    // while the mutation is in progress
  }
)

export const optimisticTenantUpdateAtom = atom(
  null,
  () => {
    // This would optimistically update the local state
    // while the mutation is in progress
  }
)