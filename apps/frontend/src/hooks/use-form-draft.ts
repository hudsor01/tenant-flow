/**
 * React 19 native form draft hook
 * Integrates useFormState with backend persistence
 * Replaces localStorage with secure server-side storage
 */

'use client'

import { useEffect, useState, useDeferredValue, startTransition } from 'react'
import { authDraftApi } from '@/lib/api-client'

type FormType = 'signup' | 'login' | 'reset'
type DraftData = { email?: string; name?: string; password?: string; confirmPassword?: string }

interface FormDraftState {
  data: DraftData | null
  sessionId: string | null
  isLoading: boolean
  error: string | null
}

/**
 * React 19 native form draft hook
 * Automatically persists form data to backend with 30-minute expiration
 */
export function useFormDraft(formType: FormType) {
  const [state, setState] = useState<FormDraftState>({
    data: null,
    sessionId: null,
    isLoading: true,
    error: null
  })

  // Load draft on mount - only after hydration
  useEffect(() => {
    let mounted = true
    
    const loadDraft = async () => {
      // Ensure we're on the client side and hydration is complete
      if (typeof window === 'undefined') return
      
      try {
        const savedSessionId = sessionStorage.getItem(`${formType}-session-id`)
        const data = await authDraftApi.load(formType, savedSessionId || undefined)
        
        if (mounted) {
          setState(prev => ({
            ...prev,
            data,
            sessionId: savedSessionId,
            isLoading: false
          }))
        }
      } catch (error) {
        if (mounted) {
          setState(prev => ({
            ...prev,
            error: error instanceof Error ? error.message : 'Failed to load draft',
            isLoading: false
          }))
        }
      }
    }

    // Delay to ensure hydration is complete
    const timeoutId = setTimeout(loadDraft, 100)
    
    return () => {
      mounted = false
      clearTimeout(timeoutId)
    }
  }, [formType])

  // Save draft function with automatic backend sync (excludes sensitive data)
  const saveDraft = async (data: DraftData): Promise<void> => {
    try {
      // Skip if no meaningful data to save
      if (!data.email && !data.name) return

      // Security: Never save passwords to server drafts
      const { password: _password, confirmPassword: _confirmPassword, ...safeData } = data
      const response = await authDraftApi.save({ ...safeData, formType })
      
      if (response.sessionId) {
        // Store session ID for future loads
        sessionStorage.setItem(`${formType}-session-id`, response.sessionId)
        
        setState(prev => ({
          ...prev,
          data: safeData, // Only store safe data in state
          sessionId: response.sessionId,
          error: null
        }))
      }
    } catch (error) {
      // Graceful degradation - don't break the form
      console.warn('Failed to save form draft:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to save draft'
      }))
    }
  }

  // Clear draft (on successful submission)
  const clearDraft = () => {
    sessionStorage.removeItem(`${formType}-session-id`)
    setState(prev => ({
      ...prev,
      data: null,
      sessionId: null,
      error: null
    }))
  }

  return {
    ...state,
    saveDraft,
    clearDraft
  }
}

/**
 * React 19 enhanced form state hook
 * Combines useFormState with automatic draft persistence
 */
export function useFormWithDraft<T extends DraftData>(
  formType: FormType,
  onSubmit: (data: T) => Promise<void>,
  defaultValues: T
) {
  const draft = useFormDraft(formType)
  const [formData, setFormData] = useState<T>(defaultValues) // Start with clean defaults
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  // Mark as hydrated on client
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // React 19: Use deferred values for non-urgent updates
  const deferredFormData = useDeferredValue(formData)

  // Auto-save draft when form data changes (deferred) - only after hydration, excluding passwords
  useEffect(() => {
    if (isHydrated && !draft.isLoading && (deferredFormData.email || deferredFormData.name)) {
      startTransition(() => {
        // Security: Never auto-save passwords
        const { password: _password, confirmPassword: _confirmPassword, ...safeData } = deferredFormData
        draft.saveDraft(safeData)
      })
    }
  }, [deferredFormData, draft, isHydrated])

  // Restore draft data when loaded - only after hydration
  useEffect(() => {
    if (isHydrated && draft.data && !draft.isLoading) {
      setFormData(prev => ({ ...prev, ...draft.data }))
    }
  }, [draft.data, draft.isLoading, isHydrated])

  const handleSubmit = async (data: T) => {
    setIsSubmitting(true)
    setSubmitError(null)
    
    try {
      await onSubmit(data)
      draft.clearDraft()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Submission failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateField = <K extends keyof T>(field: K, value: T[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return {
    formData,
    updateField,
    handleSubmit,
    isSubmitting,
    submitError,
    isHydrated,
    draft: {
      isLoading: draft.isLoading,
      error: draft.error,
      hasData: !!draft.data
    }
  }
}