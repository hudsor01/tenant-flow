import { atom } from 'jotai'
import { atomWithMutation } from 'jotai-tanstack-query'
import { PropertiesApi } from '../../lib/api/properties'
import { propertiesQueryAtom } from '../business/properties'
import type { CreatePropertyInput, UpdatePropertyInput } from '@repo/shared'

// Property mutation atoms with proper error handling
export const createPropertyMutationAtom = atomWithMutation(() => ({
  mutationFn: PropertiesApi.createProperty,
  onSuccess: () => {
    // This will be handled by React Query cache invalidation
  },
  onError: (error: unknown) => {
    console.error('Failed to create property:', error)
  },
}))

export const updatePropertyMutationAtom = atomWithMutation(() => ({
  mutationFn: ({ id, data }: { id: string; data: UpdatePropertyInput }) => {
    return PropertiesApi.updateProperty(id, data)
  },
  onSuccess: () => {
    // Cache will be invalidated automatically
  },
  onError: (error: unknown) => {
    console.error('Failed to update property:', error)
  },
}))

export const deletePropertyMutationAtom = atomWithMutation(() => ({
  mutationFn: (id: string) => {
    return PropertiesApi.deleteProperty(id)
  },
  onSuccess: () => {
    // Cache invalidation handled by React Query
  },
  onError: (error: unknown) => {
    console.error('Failed to delete property:', error)
  },
}))

// Combined property action atom that uses mutations
export const propertyActionAtom = atom(
  null,
  async (get, set, action: 
    | { type: 'create'; data: CreatePropertyInput }
    | { type: 'update'; id: string; data: UpdatePropertyInput }  
    | { type: 'delete'; id: string }
  ) => {
    try {
      switch (action.type) {
        case 'create': {
          const createMutation = get(createPropertyMutationAtom)
          const result = await createMutation.mutateAsync(action.data)
          
          // Refetch properties list
          const propertiesQuery = get(propertiesQueryAtom)
          propertiesQuery.refetch?.()
          
          return { success: true, data: result }
        }
        
        case 'update': {
          const updateMutation = get(updatePropertyMutationAtom)
          const result = await updateMutation.mutateAsync({ 
            id: action.id, 
            data: action.data 
          })
          
          // Refetch properties list
          const propertiesQuery = get(propertiesQueryAtom)
          propertiesQuery.refetch?.()
          
          return { success: true, data: result }
        }
        
        case 'delete': {
          const deleteMutation = get(deletePropertyMutationAtom)
          await deleteMutation.mutateAsync(action.id)
          
          // Refetch properties list
          const propertiesQuery = get(propertiesQueryAtom)
          propertiesQuery.refetch?.()
          
          return { success: true }
        }
        
        default:
          throw new Error('Invalid property action type')
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }
)

// Loading states derived from mutations
export const propertyMutationLoadingAtom = atom((get) => {
  const createMutation = get(createPropertyMutationAtom)
  const updateMutation = get(updatePropertyMutationAtom)  
  const deleteMutation = get(deletePropertyMutationAtom)
  
  return {
    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending,
    isAnyLoading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  }
})

// Error states derived from mutations
export const propertyMutationErrorAtom = atom((get) => {
  const createMutation = get(createPropertyMutationAtom)
  const updateMutation = get(updatePropertyMutationAtom)
  const deleteMutation = get(deletePropertyMutationAtom)
  
  return {
    createError: createMutation.error ? String(createMutation.error) : null,
    updateError: updateMutation.error ? String(updateMutation.error) : null,
    deleteError: deleteMutation.error ? String(deleteMutation.error) : null,
    hasAnyError: !!(createMutation.error || updateMutation.error || deleteMutation.error)
  }
})

// Reset mutation states atom
export const resetPropertyMutationStatesAtom = atom(
  null,
  (get, _set) => {
    const createMutation = get(createPropertyMutationAtom)
    const updateMutation = get(updatePropertyMutationAtom)
    const deleteMutation = get(deletePropertyMutationAtom)
    
    createMutation.reset()
    updateMutation.reset()
    deleteMutation.reset()
  }
)

// Enhanced hook-like atom for properties with mutations
export const usePropertiesMutationsAtom = atom((get) => {
  const createMutation = get(createPropertyMutationAtom)
  const updateMutation = get(updatePropertyMutationAtom)
  const deleteMutation = get(deletePropertyMutationAtom)
  const loadingStates = get(propertyMutationLoadingAtom)
  const errorStates = get(propertyMutationErrorAtom)
  
  return {
    // Mutation functions
    createProperty: createMutation.mutateAsync,
    updateProperty: updateMutation.mutateAsync,
    deleteProperty: deleteMutation.mutateAsync,
    
    // Loading states
    ...loadingStates,
    
    // Error states
    ...errorStates,
    
    // Reset functions
    resetCreate: createMutation.reset,
    resetUpdate: updateMutation.reset,
    resetDelete: deleteMutation.reset,
  }
})