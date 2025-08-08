/**
 * React 19 Form Actions and Server Actions Implementation
 * Pure form handling using React 19's new form action patterns
 */
import { startTransition, useActionState, useOptimistic } from 'react'
import type { 
  CreatePropertyInput, 
  UpdatePropertyInput,
  CreateUnitInput, 
  CreateLeaseInput,
  PropertyType
} from '@repo/shared'
import { api } from '@/lib/api/endpoints'
import { toast } from 'sonner'

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
  _prevState: ActionState<CreatePropertyInput>,
  formData: FormData
): Promise<ActionState<CreatePropertyInput>> {
  try {
    // Extract form data
    const propertyData: CreatePropertyInput = {
      name: (formData.get('name') as string) || '',
      propertyType: formData.get('type') as PropertyType,
      address: (formData.get('address') as string) || '',
      city: (formData.get('city') as string) || '',
      state: (formData.get('state') as string) || '',
      zipCode: (formData.get('zipCode') as string) || '',
      description: (formData.get('description') as string) || undefined,
      // Add other fields as needed
    }

    // Validate required fields
    if (!propertyData.name || !propertyData.address) {
      return {
        ..._prevState,
        error: 'Name and address are required',
        loading: false,
        success: false,
      }
    }

    // Call API
    const response = await api.properties.create(propertyData)
    
    toast.success('Property created successfully!')

    return {
      data: response.data as unknown as CreatePropertyInput,
      loading: false,
      success: true,
      error: undefined,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create property'

    return {
      ..._prevState,
      error: errorMessage,
      loading: false,
      success: false,
    }
  }
}

// Property update action
export async function updatePropertyAction(
  _prevState: ActionState<UpdatePropertyInput>,
  formData: FormData
): Promise<ActionState<UpdatePropertyInput>> {
  try {
    const propertyId = formData.get('id') as string
    const updates: Partial<UpdatePropertyInput> = {}
    
    // Extract only changed fields
    for (const [key, value] of formData.entries()) {
      if (key !== 'id' && value) {
        ;(updates as Record<string, unknown>)[key] = value
      }
    }

    const response = await api.properties.update(propertyId, updates)
    
    toast.success('Property updated successfully!')

    return {
      data: response.data as unknown as UpdatePropertyInput,
      loading: false,
      success: true,
      error: undefined,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update property'
    
    toast.error(errorMessage)

    return {
      ..._prevState,
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
  _prevState: ActionState<CreateUnitInput>,
  formData: FormData
): Promise<ActionState<CreateUnitInput>> {
  try {
    const unitData: CreateUnitInput = {
      propertyId: formData.get('propertyId') as string,
      unitNumber: formData.get('unitNumber') as string,
      bedrooms: parseInt((formData.get('bedrooms') as string) || '0'),
      bathrooms: parseFloat((formData.get('bathrooms') as string) || '0'),
      squareFeet: parseInt((formData.get('squareFeet') as string) || '0') || undefined,
      monthlyRent: parseFloat((formData.get('rent') as string) || '0'),
      securityDeposit: parseFloat((formData.get('deposit') as string) || '0') || undefined,
      description: formData.get('description') as string || undefined,
    }

    const response = await api.units.create(unitData)
    
    toast.success('Unit created successfully!')

    return {
      data: response.data as CreateUnitInput,
      loading: false,
      success: true,
      error: undefined,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create unit'
    
    toast.error(errorMessage)

    return {
      ..._prevState,
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
  _prevState: ActionState<CreateLeaseInput>,
  formData: FormData
): Promise<ActionState<CreateLeaseInput>> {
  try {
    const leaseData: CreateLeaseInput = {
      propertyId: formData.get('propertyId') as string,
      unitId: formData.get('unitId') as string,
      tenantId: formData.get('tenantId') as string,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      rentAmount: parseFloat(formData.get('monthlyRent') as string),
      securityDeposit: parseFloat(formData.get('securityDeposit') as string) || undefined,
      leaseTerms: formData.get('terms') as string || undefined,
    }

    const response = await api.leases.create(leaseData)
    
    toast.success('Lease created successfully!')

    return {
      data: response.data as CreateLeaseInput,
      loading: false,
      success: true,
      error: undefined,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create lease'
    
    toast.error(errorMessage)

    return {
      ..._prevState,
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
  return async (_prevState: ActionState<T>, formData: FormData): Promise<ActionState<T>> => {
    return await action(formData)
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
      data: { ...state.data, ...optimisticData } as T,
      loading: true,
    } as ActionState<T>)
  )

  const [state, formAction, isPending] = useActionState(action, initialState)

  const optimisticAction = (formData: FormData) => {
    // Extract optimistic data from form
    const optimisticData: Partial<T> = {}
    for (const [key, value] of formData.entries()) {
      ;(optimisticData as Record<string, unknown>)[key] = value
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
  const createAction = useFormAction(createPropertyAction)
  const updateAction = useFormAction(updatePropertyAction)
  
  return mode === 'create' ? createAction : updateAction
}

export const useUnitFormAction = () => useFormAction(createUnitAction)

export const useLeaseFormAction = () => useFormAction(createLeaseAction)

// Hook with optimistic updates for better UX
export const useOptimisticPropertyAction = (initialData: CreatePropertyInput) => {
  return useOptimisticFormAction(createPropertyAction, {
    data: initialData,
    loading: false,
    success: false,
  })
}