/**
 * Tenant Form Hooks
 * TanStack Form hooks for tenant-related form patterns with shared validation
 */

import { useForm } from '@tanstack/react-form'
import { tenantFormSchema } from '@repo/shared/validation/tenants'
import type { TenantInput, TenantUpdate } from '@repo/shared/types/core'
import { useState, useCallback } from 'react'

/**
 * Hook for tenant creation forms with shared validation and state management
 */
export function useTenantForm(initialValues?: Partial<TenantInput>) {
  return useForm({
  defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      emergencyContact: '',
      avatarUrl: null,
      userId: null,
      ...initialValues
    } as TenantInput,
    onSubmit: async ({ value }) => {
      // Validation is handled by the schema
      return value
    },
    validators: {
      onSubmit: tenantFormSchema
    }
  })
}

/**
 * Hook for tenant update forms with shared validation and state management
 */
export function useTenantUpdateForm(initialValues?: Partial<TenantUpdate>) {
  return useForm({
  defaultValues: {
      firstName: null,
      lastName: null,
      email: null,
      phone: null,
      emergencyContact: null,
      avatarUrl: null,
      ...initialValues
    } as TenantUpdate,
    onSubmit: async ({ value }) => {
      // Validation is handled by the schema
      return value
    },
    validators: {
      onSubmit: tenantFormSchema
    }
  })
}

/**
 * Hook for multi-step tenant forms (e.g., onboarding, lease setup)
 */
export function useMultiStepTenantForm(): {
  form: ReturnType<typeof useTenantForm>;
  currentStep: number;
  nextStep: () => void;
  prevStep: () => void;
  updateFormData: (data: Partial<TenantInput>) => void;
  progress: number;
} {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Partial<TenantInput>>({})

  const form = useTenantForm(formData as TenantInput)

  const nextStep = () => {
    // Provide a field name and cause for validateField
    if (form.validateField('firstName', 'change')) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(0, prev - 1))
  }

  const updateFormData = (data: Partial<TenantInput>) => {
    setFormData(prev => ({ ...prev, ...data }))
  }

  return {
    form,
    currentStep,
    nextStep,
    prevStep,
    updateFormData,
    progress: (currentStep + 1) / 3 // Assuming 3 steps total
  }
}

/**
 * Custom validation hook for tenant forms
 */
export function useTenantValidation() {
  const validateEmail = useCallback((email: string): Record<string, string> | undefined => {
    if (!email) return { email: 'Email is required' }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { email: 'Please enter a valid email address' }
    }
    return undefined
  }, [])

  const validatePhone = useCallback((phone: string): Record<string, string> | undefined => {
    if (phone && !/^\+?[\d\s\-\(\)]{10,}$/.test(phone)) {
      return { phone: 'Please enter a valid phone number' }
    }
    return undefined
  }, [])

  const validateName = useCallback((name: string): Record<string, string> | undefined => {
    if (!name) return { firstName: 'First name is required' }
    if (name.length < 2) return { firstName: 'Name must be at least 2 characters' }
    if (name.length > 50) return { firstName: 'Name must be less than 50 characters' }
    return undefined
 }, [])

  return {
    validateEmail,
    validatePhone,
    validateName
  }
}

/**
 * Hook for form state management with tenant-specific logic
 */
export function useTenantFormState() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetFormState = useCallback(() => {
    setIsSubmitting(false)
    setIsSuccess(false)
    setError(null)
  }, [])

  return {
    isSubmitting,
    isSuccess,
    error,
    setIsSubmitting,
    setIsSuccess,
    setError,
    resetFormState
  }
}

/**
 * Combined hook for complete tenant form functionality
 */
export function useTenantFormComplete(initialValues?: Partial<TenantInput>) {
  const form = useTenantForm(initialValues)
  const validation = useTenantValidation()
  const formState = useTenantFormState()

  return {
    form,
    validation,
    formState,
    reset: () => {
      form.reset()
      formState.resetFormState()
    }
 }
}
