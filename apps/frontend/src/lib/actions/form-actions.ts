/**
 * React 19 Form Actions and Server Actions Implementation
 * Pure form handling using React 19's new form action patterns
 */
import { startTransition, useActionState, useOptimistic } from 'react'
import type { PropertyFormData, UnitFormData, LeaseFormData } from '@tenantflow/shared/types/api-inputs'
import { api } from '@/lib/api/axios-client'
import { useGlobalStore } from '@/stores/global-state'
import { useWorkflowStore } from '@/stores/workflow-state'

// =====================================================
// 1. ACTION STATE TYPES
// =====================================================

export interface ActionState<T = unknown> {
  data?: T
  error?: string
  loading: boolean
  success: boolean
}

export interface FormActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  validationErrors?: Record<string, string[]>
}

// =====================================================
// 2. PROPERTY FORM ACTIONS
// =====================================================

// Property creation action
export async function createPropertyAction(
  prevState: ActionState<PropertyFormData>,
  formData: FormData
): Promise<ActionState<PropertyFormData>> {
  try {
    // Extract form data
    const propertyData: PropertyFormData = {
      name: formData.get('name') as string,
      type: formData.get('type') as any,
      address: formData.get('address') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      zipCode: formData.get('zipCode') as string,
      description: formData.get('description') as string || undefined,
      // Add other fields as needed
    }

    // Validate required fields
    if (!propertyData.name || !propertyData.address) {
      return {
        ...prevState,
        error: 'Name and address are required',
        loading: false,
        success: false,
      }
    }

    // Call API
    const response = await api.properties.create(propertyData)
    
    // Update global state
    const { addNotification } = useGlobalStore.getState()
    addNotification({
      type: 'success',
      message: 'Property created successfully!',
    })

    return {
      data: response.data,
      loading: false,
      success: true,
      error: undefined,
    }
  } catch (error) {
    const { addNotification } = useGlobalStore.getState()
    const errorMessage = error instanceof Error ? error.message : 'Failed to create property'
    
    addNotification({
      type: 'error',
      message: errorMessage,
    })

    return {
      ...prevState,
      error: errorMessage,
      loading: false,
      success: false,
    }
  }
}

// Property update action
export async function updatePropertyAction(
  prevState: ActionState<PropertyFormData>,
  formData: FormData
): Promise<ActionState<PropertyFormData>> {
  try {
    const propertyId = formData.get('id') as string
    const updates: Partial<PropertyFormData> = {}
    
    // Extract only changed fields
    for (const [key, value] of formData.entries()) {
      if (key !== 'id' && value) {
        ;(updates as any)[key] = value
      }
    }

    const response = await api.properties.update(propertyId, updates)
    
    const { addNotification } = useGlobalStore.getState()
    addNotification({
      type: 'success',
      message: 'Property updated successfully!',
    })

    return {
      data: response.data,
      loading: false,
      success: true,
      error: undefined,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update property'
    
    const { addNotification } = useGlobalStore.getState()
    addNotification({
      type: 'error',
      message: errorMessage,
    })

    return {
      ...prevState,
      error: errorMessage,
      loading: false,
      success: false,
    }
  }
}

// =====================================================
// 3. UNIT FORM ACTIONS
// =====================================================

export async function createUnitAction(
  prevState: ActionState<UnitFormData>,
  formData: FormData
): Promise<ActionState<UnitFormData>> {
  try {
    const unitData: UnitFormData = {
      propertyId: formData.get('propertyId') as string,
      unitNumber: formData.get('unitNumber') as string,
      bedrooms: parseInt(formData.get('bedrooms') as string),
      bathrooms: parseFloat(formData.get('bathrooms') as string),
      squareFeet: parseInt(formData.get('squareFeet') as string) || undefined,
      rent: parseFloat(formData.get('rent') as string),
      deposit: parseFloat(formData.get('deposit') as string) || undefined,
      description: formData.get('description') as string || undefined,
    }

    const response = await api.units.create(unitData)
    
    const { addNotification } = useGlobalStore.getState()
    addNotification({
      type: 'success',
      message: 'Unit created successfully!',
    })

    return {
      data: response.data,
      loading: false,
      success: true,
      error: undefined,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create unit'
    
    const { addNotification } = useGlobalStore.getState()
    addNotification({
      type: 'error',
      message: errorMessage,
    })

    return {
      ...prevState,
      error: errorMessage,
      loading: false,
      success: false,
    }
  }
}

// =====================================================
// 4. LEASE FORM ACTIONS
// =====================================================

export async function createLeaseAction(
  prevState: ActionState<LeaseFormData>,
  formData: FormData
): Promise<ActionState<LeaseFormData>> {
  try {
    const leaseData: LeaseFormData = {
      propertyId: formData.get('propertyId') as string,
      unitId: formData.get('unitId') as string,
      tenantId: formData.get('tenantId') as string,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      monthlyRent: parseFloat(formData.get('monthlyRent') as string),
      securityDeposit: parseFloat(formData.get('securityDeposit') as string),
      terms: formData.get('terms') as string || undefined,
    }

    const response = await api.leases.create(leaseData)
    
    const { addNotification } = useGlobalStore.getState()
    addNotification({
      type: 'success',
      message: 'Lease created successfully!',
    })

    return {
      data: response.data,
      loading: false,
      success: true,
      error: undefined,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create lease'
    
    const { addNotification } = useGlobalStore.getState()
    addNotification({
      type: 'error',
      message: errorMessage,
    })

    return {
      ...prevState,
      error: errorMessage,
      loading: false,
      success: false,
    }
  }
}

// =====================================================
// 5. WORKFLOW INTEGRATION ACTIONS
// =====================================================

// Action that integrates with workflow state
export async function workflowFormAction<T>(
  workflowId: string,
  stepId: string,
  action: (formData: FormData) => Promise<ActionState<T>>
) {
  return async (prevState: ActionState<T>, formData: FormData): Promise<ActionState<T>> => {
    // Update workflow step as in-progress
    const { updateStepData, validateStep, completeStep } = useWorkflowStore.getState()
    
    updateStepData(workflowId, stepId, { loading: true })
    
    try {
      const result = await action(formData)
      
      if (result.success) {
        // Mark step as completed
        completeStep(workflowId, stepId, result.data)
        validateStep(workflowId, stepId, { isValid: true })
      } else {
        // Mark step as invalid
        validateStep(workflowId, stepId, { 
          isValid: false, 
          errors: result.error ? [result.error] : [] 
        })
      }
      
      updateStepData(workflowId, stepId, { loading: false })
      
      return result
    } catch (error) {
      updateStepData(workflowId, stepId, { loading: false })
      validateStep(workflowId, stepId, { 
        isValid: false, 
        errors: ['An unexpected error occurred'] 
      })
      
      throw error
    }
  }
}

// =====================================================
// 6. HOOKS FOR FORM ACTIONS
// =====================================================

// Generic hook for form actions with React 19 useActionState
export function useFormAction<T>(
  action: (prevState: ActionState<T>, formData: FormData) => Promise<ActionState<T>>,
  initialState?: ActionState<T>
) {
  const [state, formAction, isPending] = useActionState(action, initialState || {
    loading: false,
    success: false,
  })

  return {
    state,
    action: formAction,
    isPending,
    isLoading: isPending || state.loading,
    isSuccess: state.success,
    error: state.error,
    data: state.data,
  }
}

// Optimistic update hook for immediate UI feedback
export function useOptimisticFormAction<T>(
  action: (prevState: ActionState<T>, formData: FormData) => Promise<ActionState<T>>,
  initialState: ActionState<T>
) {
  const [optimisticState, addOptimistic] = useOptimistic(
    initialState,
    (state, optimisticData: Partial<T>) => ({
      ...state,
      data: { ...state.data, ...optimisticData },
      loading: true,
    })
  )

  const [state, formAction, isPending] = useActionState(action, initialState)

  const optimisticAction = (formData: FormData) => {
    // Extract optimistic data from form
    const optimisticData: Partial<T> = {}
    for (const [key, value] of formData.entries()) {
      ;(optimisticData as any)[key] = value
    }

    // Add optimistic update
    startTransition(() => {
      addOptimistic(optimisticData)
    })

    // Trigger actual action
    return formAction(formData)
  }

  return {
    state: isPending ? optimisticState : state,
    action: optimisticAction,
    isPending,
    isLoading: isPending || state.loading,
    isSuccess: state.success,
    error: state.error,
    data: isPending ? optimisticState.data : state.data,
  }
}

// Specific hooks for each form type
export const usePropertyFormAction = (mode: 'create' | 'edit' = 'create') => {
  const action = mode === 'create' ? createPropertyAction : updatePropertyAction
  return useFormAction(action)
}

export const useUnitFormAction = () => useFormAction(createUnitAction)

export const useLeaseFormAction = () => useFormAction(createLeaseAction)

// Hook with optimistic updates for better UX
export const useOptimisticPropertyAction = (initialData: PropertyFormData) => {
  return useOptimisticFormAction(createPropertyAction, {
    data: initialData,
    loading: false,
    success: false,
  })
}