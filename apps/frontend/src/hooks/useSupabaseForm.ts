// import type { useFieldArray } from 'react-hook-form';
import { useForm, useWatch, type UseFormProps, type FieldValues, type Path } from 'react-hook-form'
import { zodResolver } from '@/lib/zod-resolver-helper'
import { z } from 'zod'
import { supabase } from '@/lib/clients'
import { toast } from 'sonner'
import { useCallback, useEffect } from 'react'
import type { Database } from '@/types/supabase-generated'

// Types
type Tables = Database['public']['Tables']
type TableName = keyof Tables
type TableInsert<T extends TableName> = Tables[T]['Insert']
// type _TableUpdate<T extends TableName> = Tables[T]['Update'] // Reserved for future use
type TableRow<T extends TableName> = Tables[T]['Row']

interface UseSupabaseFormOptions<
  TTableName extends TableName,
  TFieldValues extends FieldValues = FieldValues
> extends Omit<UseFormProps<TFieldValues>, 'resolver'> {
  table: TTableName
  schema: z.ZodType<TFieldValues>
  onSuccess?: (data: TableRow<TTableName>) => void | Promise<void>
  onError?: (error: Error) => void
  enableAutoSave?: boolean
  autoSaveDelay?: number
  enableOptimisticUpdates?: boolean
}

interface SupabaseFormReturn<
  TTableName extends TableName,
  TFieldValues extends FieldValues
> extends ReturnType<typeof useForm<TFieldValues>> {
  // Enhanced form methods
  submitToSupabase: (data: TFieldValues) => Promise<TableRow<TTableName>>
  updateInSupabase: (id: string, data: Partial<TFieldValues>) => Promise<TableRow<TTableName>>
  deleteFromSupabase: (id: string) => Promise<void>
  
  // Field array helpers - simplified to avoid complex generic constraints
  fieldArrays: Record<string, unknown>
  
  // Watch helpers
  watchedValues: TFieldValues
  watchField: <TFieldName extends Path<TFieldValues>>(name: TFieldName) => TFieldValues[TFieldName]
  
  // Loading states
  isSubmitting: boolean
  isUpdating: boolean
  isDeleting: boolean
  
  // Auto-save functionality
  enableAutoSave: () => void
  disableAutoSave: () => void
  
  // Utilities
  resetWithDefaults: (data?: Partial<TFieldValues>) => void
  loadFromSupabase: (id: string) => Promise<void>
}

// Validation schemas for common tables
export const createPropertySchema = z.object({
  name: z.string().min(1, 'Property name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().min(5, 'Valid zip code is required'),
  description: z.string().optional(),
  propertyType: z.enum(['SINGLE_FAMILY', 'MULTI_UNIT', 'APARTMENT', 'COMMERCIAL']),
  imageUrl: z.string().url().optional().or(z.literal(''))
})

export const createLeaseSchema = z.object({
  unitId: z.string().min(1, 'Unit selection is required'),
  tenantId: z.string().min(1, 'Tenant selection is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  rentAmount: z.number().min(0, 'Rent amount must be positive'),
  securityDeposit: z.number().min(0, 'Security deposit must be positive'),
  status: z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED']).default('DRAFT')
})

export const createTenantSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  emergencyContact: z.string().optional()
})

export const createUnitSchema = z.object({
  unitNumber: z.string().min(1, 'Unit number is required'),
  propertyId: z.string().min(1, 'Property selection is required'),
  bedrooms: z.number().min(0, 'Bedrooms must be 0 or more'),
  bathrooms: z.number().min(0, 'Bathrooms must be 0 or more'),
  squareFeet: z.number().min(0, 'Square feet must be positive').optional(),
  rent: z.number().min(0, 'Rent must be positive'),
  status: z.enum(['VACANT', 'OCCUPIED', 'MAINTENANCE', 'RESERVED']).default('VACANT')
})

export function useSupabaseForm<
  TTableName extends TableName,
  TFieldValues extends FieldValues = TableInsert<TTableName>
>({
  table,
  schema,
  onSuccess,
  onError,
  enableAutoSave = false,
  // Future features
  // _autoSaveDelay = 2000,
  // _enableOptimisticUpdates = false,
  ...formOptions
}: UseSupabaseFormOptions<TTableName, TFieldValues>): SupabaseFormReturn<TTableName, TFieldValues> {
  
  // Initialize form with Zod resolver
  const form = useForm<TFieldValues>({
    ...formOptions,
    resolver: zodResolver(schema),
    mode: 'onChange' // Enable real-time validation
  })
  
  // Watch all values for auto-save and optimistic updates
  const watchedValues = useWatch({ control: form.control }) as TFieldValues
  
  // Track loading states
  const { formState: { isSubmitting } } = form
  
  // Submit to Supabase
  const submitToSupabase = useCallback(async (data: TFieldValues): Promise<TableRow<TTableName>> => {
    try {
      const { data: result, error } = await supabase
        .from(table)
        .insert(data as unknown as TableInsert<TTableName>)
        .select()
        .single()
      
      if (error) throw error
      
      toast.success(`${table} created successfully`)
      
      if (onSuccess) {
        await onSuccess(result)
      }
      
      form.reset()
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create record'
      toast.error(errorMessage)
      
      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage))
      }
      
      throw error
    }
  }, [table, onSuccess, onError, form])
  
  // Update in Supabase
  const updateInSupabase = useCallback(async (
    id: string, 
    data: Partial<TFieldValues>
  ): Promise<TableRow<TTableName>> => {
    try {
      const { data: result, error } = await supabase
        .from(table)
        .update(data as Partial<TableInsert<TTableName>>)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      
      toast.success(`${table} updated successfully`)
      
      if (onSuccess) {
        await onSuccess(result)
      }
      
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update record'
      toast.error(errorMessage)
      
      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage))
      }
      
      throw error
    }
  }, [table, onSuccess, onError])
  
  // Delete from Supabase
  const deleteFromSupabase = useCallback(async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      toast.success(`${table} deleted successfully`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete record'
      toast.error(errorMessage)
      
      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage))
      }
      
      throw error
    }
  }, [table, onError])
  
  // Load data from Supabase
  const loadFromSupabase = useCallback(async (id: string): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      
      form.reset(data as TFieldValues)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load record'
      toast.error(errorMessage)
      
      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage))
      }
    }
  }, [table, form, onError])
  
  // Enhanced reset with defaults
  const resetWithDefaults = useCallback((data?: Partial<TFieldValues>) => {
    form.reset(data as TFieldValues)
  }, [form])
  
  // Watch specific field - moved useWatch outside callback
  const watchField = <TFieldName extends Path<TFieldValues>>(name: TFieldName) => {
    return form.watch(name)
  }
  
  // Auto-save functionality
  useEffect(() => {
    if (!enableAutoSave) return
    
    const subscription = form.watch((data) => {
      // Implement auto-save logic here
      // This would typically debounce and save draft data
      console.log('Auto-save triggered:', data)
    })
    
    return () => subscription.unsubscribe()
  }, [enableAutoSave, form])
  
  // Construct the return object with proper typing
  const formReturn = {
    // Spread all form methods
    control: form.control,
    register: form.register,
    handleSubmit: form.handleSubmit,
    reset: form.reset,
    resetField: form.resetField,
    watch: form.watch,
    setValue: form.setValue,
    getValues: form.getValues,
    getFieldState: form.getFieldState,
    setError: form.setError,
    clearErrors: form.clearErrors,
    setFocus: form.setFocus,
    trigger: form.trigger,
    formState: form.formState,
    unregister: form.unregister,
    subscribe: form.subscribe,
    
    // Enhanced methods
    submitToSupabase,
    updateInSupabase,
    deleteFromSupabase,
    loadFromSupabase,
    resetWithDefaults,
    
    // Field arrays (would be initialized based on schema)
    fieldArrays: {},
    
    // Watch helpers
    watchedValues,
    watchField,
    
    // Loading states
    isSubmitting,
    isUpdating: false, // Would track update state
    isDeleting: false, // Would track delete state
    
    // Auto-save controls
    enableAutoSave: () => {}, // Implementation would toggle auto-save
    disableAutoSave: () => {}
  }
  
  return formReturn
}

// Typed form hooks for specific tables
export function usePropertyForm(options?: Partial<UseSupabaseFormOptions<'Property'>>) {
  return useSupabaseForm({
    table: 'Property',
    schema: createPropertySchema,
    ...options
  })
}

export function useLeaseForm(options?: Partial<UseSupabaseFormOptions<'Lease'>>) {
  return useSupabaseForm({
    table: 'Lease',
    schema: createLeaseSchema,
    ...options
  })
}

export function useTenantForm(options?: Partial<UseSupabaseFormOptions<'Tenant'>>) {
  return useSupabaseForm({
    table: 'Tenant',
    schema: createTenantSchema,
    ...options
  })
}

export function useUnitForm(options?: Partial<UseSupabaseFormOptions<'Unit'>>) {
  return useSupabaseForm({
    table: 'Unit',
    schema: createUnitSchema,
    ...options
  })
}