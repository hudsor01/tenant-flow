import { useFormStatus } from 'react-dom'

/**
 * Enhanced form status hook for React 19 forms
 * Provides additional utilities on top of useFormStatus
 */
export function useEnhancedFormStatus() {
  const { pending, data, method, action } = useFormStatus()
  
  return {
    isSubmitting: pending,
    formData: data,
    method: method || 'post',
    actionUrl: action,
    // Helper methods
    getFieldValue: (name: string) => data?.get(name),
    hasField: (name: string) => data?.has(name) ?? false,
  }
}