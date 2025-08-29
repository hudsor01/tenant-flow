/**
 * Server Action Utilities
 * 
 * ARCHITECTURE: DRY utilities for Next.js server actions
 * PURPOSE: Eliminate boilerplate while maintaining action-specific logic
 */

import { createActionClient } from '@/lib/supabase/action-client'
import { revalidatePath, revalidateTag } from 'next/cache'

/**
 * Get authenticated Supabase client for server actions
 * Eliminates duplicate client setup across actions
 */
export async function getActionClient() {
  return await createActionClient()
}

/**
 * Standard property revalidation after mutations
 * Consolidates cache invalidation patterns
 */
export function revalidateProperties() {
  revalidatePath('/properties')
  revalidatePath('/dashboard') 
  revalidateTag('properties')
}

/**
 * Standard tenant revalidation after mutations
 */
export function revalidateTenants() {
  revalidatePath('/tenants')
  revalidatePath('/dashboard')
  revalidateTag('tenants')
}

/**
 * Parse form data with type safety
 * Generic utility for extracting typed data from FormData
 */
export function parseFormData<T extends Record<string, unknown>>(
  formData: FormData,
  fields: Array<keyof T>
): Partial<T> {
  const result: Partial<T> = {}
  
  fields.forEach(field => {
    const value = formData.get(String(field))
    if (value !== null) {
      result[field] = value as T[keyof T]
    }
  })
  
  return result
}

/**
 * Handle server action errors with consistent format
 */
export function handleActionError(error: unknown, operation: string): never {
  console.error(`Server action failed: ${operation}`, error)
  throw new Error(error instanceof Error ? error.message : 'Unknown error')
}