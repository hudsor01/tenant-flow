/**
 * Consolidated Form Action Factory - DRY principle for Server Actions
 * Eliminates duplication in FormData processing, validation, and Supabase operations
 */

import { createActionClient } from '@/lib/supabase/action-client'
import { revalidatePath } from 'next/cache'
import type { Database } from '@repo/shared'

type SupabaseClient = Awaited<ReturnType<typeof createActionClient>>

// Generic form field processing configuration
interface FormFieldConfig {
  key: string
  parser?: (value: string) => unknown
  required?: boolean
  defaultValue?: unknown
}

// Generic action configuration
interface ActionConfig<T> {
  actionName: string
  table: keyof Database['public']['Tables']
  revalidatePaths?: string[]
  transform?: (data: unknown) => T
}

/**
 * Generic FormData processor - handles string, numeric, and JSON fields
 */
export function processFormData<T extends Record<string, unknown>>(
  formData: FormData,
  fieldConfigs: FormFieldConfig[]
): T {
  const result: Record<string, unknown> = {}
  
  fieldConfigs.forEach(({ key, parser, required, defaultValue }) => {
    const value = formData.get(key)
    
    if (value === null) {
      if (required) {
        throw new Error(`Required field '${key}' is missing`)
      }
      if (defaultValue !== undefined) {
        result[key] = defaultValue
      }
      return
    }
    
    const stringValue = value as string
    
    if (parser) {
      try {
        result[key] = parser(stringValue)
      } catch {
        throw new Error(`Invalid value for field '${key}': ${stringValue}`)
      }
    } else {
      result[key] = stringValue || undefined
    }
  })
  
  return result as T
}

/**
 * Generic Supabase action executor with error handling and revalidation
 */
export async function executeSupabaseAction<TResult>(
  config: ActionConfig<TResult>,
  operation: (supabase: SupabaseClient) => Promise<{ data: unknown; error: Error | null }>
): Promise<TResult> {
  const supabase = await createActionClient()
  
  const { data, error } = await operation(supabase)
  
  if (error || !data) {
    throw new Error(`Failed to ${config.actionName}: ${error?.message || 'No data returned'}`)
  }
  
  // Revalidate paths
  if (config.revalidatePaths) {
    config.revalidatePaths.forEach(path => revalidatePath(path))
  }
  
  // Transform result if transform function provided
  if (config.transform) {
    return config.transform(data)
  }
  
  return data as TResult
}

/**
 * Property-specific field configurations
 */
export const PROPERTY_FORM_FIELDS: FormFieldConfig[] = [
  { key: 'name', required: true },
  { key: 'address', required: true },
  { key: 'city', required: true },
  { key: 'state', required: true },
  { key: 'zip_code', required: true },
  { key: 'description' },
  { key: 'property_type' },
  { key: 'image_url' },
  { key: 'total_units', parser: parseInt },
  { key: 'square_feet', parser: parseInt },
  { key: 'bedrooms', parser: parseInt },
  { key: 'bathrooms', parser: parseFloat },
  { key: 'rentAmount', parser: parseFloat },
  { key: 'amenities', parser: JSON.parse }
]

/**
 * Common parsers for different field types
 */
export const FIELD_PARSERS = {
  int: (value: string) => parseInt(value, 10),
  float: (value: string) => parseFloat(value),
  json: (value: string) => JSON.parse(value),
  boolean: (value: string) => value === 'true' || value === '1',
  date: (value: string) => new Date(value).toISOString()
} as const