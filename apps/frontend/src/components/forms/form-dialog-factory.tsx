/**
 * Form Dialog Factory
 * 
 * Reusable factory component for creating consistent form dialogs
 * across the application. Combines BaseFormModal with FormPatterns
 * to eliminate duplication and ensure consistent UX.
 * 
 * Features:
 * - Consistent modal structure and animations
 * - Built-in form state management
 * - Standardized error handling and validation
 * - Optimistic updates integration
 * - Analytics tracking hooks
 */

"use client"

import React, { useState, useTransition, useCallback } from 'react'
import { logger } from '@/lib/logger'
import type { ReactNode } from 'react'
import { logger } from '@/lib/logger'
import type { LucideIcon } from 'lucide-react'
import { logger } from '@/lib/logger'
import { BaseFormModal } from '@/components/modals/base-form-modal'
import { logger } from '@/lib/logger'
import { useFormState } from './form-patterns'
import { logger } from '@/lib/logger'
import { usePostHog } from '@/hooks/use-posthog'
import { logger } from '@/lib/logger'
import { motion } from '@/lib/framer-motion'
import { logger } from '@/lib/logger'
import { AlertCircle } from 'lucide-react'
import { logger } from '@/lib/logger'

// ============================================================================
// FORM DIALOG FACTORY TYPES
// ============================================================================

export interface FormDialogConfig<TData, TFormData = TData> {
  // Modal Configuration
  title: string
  description?: string
  icon?: LucideIcon
  iconBgColor?: string
  iconColor?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  
  // Form Configuration
  mode: 'create' | 'edit'
  initialData?: TData
  
  // Labels
  submitLabel?: string
  cancelLabel?: string
  
  // Event Handlers
  onSubmit: (formData: TFormData) => Promise<TData>
  onSuccess?: (result: TData) => void
  onCancel?: () => void
  
  // Validation
  validate?: (formData: TFormData) => Record<string, string>
  
  // Analytics
  trackingConfig?: {
    formType: string
    additionalProperties?: Record<string, unknown>
  }
  
  // Transform functions
  transformInitialData?: (data: TData) => TFormData
  transformSubmitData?: (formData: TFormData) => TFormData
}

interface FormDialogProps<TData, TFormData = TData> extends FormDialogConfig<TData, TFormData> {
  isOpen: boolean
  onClose: () => void
  children: (params: FormRenderParams<TFormData>) => ReactNode
}

export interface FormRenderParams<TFormData> {
  formData: TFormData
  errors: Record<string, string>
  isSubmitting: boolean
  onChange: (field: keyof TFormData, value: unknown) => void
  onFieldError: (field: string, error?: string) => void
}

// ============================================================================
// FORM DIALOG FACTORY COMPONENT
// ============================================================================

export function FormDialogFactory<TData, TFormData = TData>({
  isOpen,
  onClose,
  title,
  description,
  icon,
  iconBgColor = 'bg-blue-100',
  iconColor = 'text-blue-600',
  maxWidth = 'lg',
  mode,
  initialData,
  submitLabel,
  cancelLabel = 'Cancel',
  onSubmit,
  onSuccess,
  onCancel,
  validate,
  trackingConfig,
  transformInitialData,
  transformSubmitData,
  children
}: FormDialogProps<TData, TFormData>) {
  const [isPending, startTransition] = useTransition()
  const { trackEvent } = usePostHog()
  const isEditing = mode === 'edit' && Boolean(initialData)
  
  // Initialize form data
  const getInitialFormData = useCallback((): TFormData => {
    if (isEditing && initialData) {
      return transformInitialData ? transformInitialData(initialData) : initialData as unknown as TFormData
    }
    return {} as TFormData
  }, [isEditing, initialData, transformInitialData])
  
  const [formData, setFormData] = useState<TFormData>(getInitialFormData)
  const { state, setLoading, setError, setSuccess, setFieldError, reset } = useFormState()
  
  // Track form view on open
  React.useEffect(() => {
    if (isOpen && trackingConfig) {
      trackEvent('form_viewed', {
        form_type: trackingConfig.formType,
        form_mode: mode,
        has_existing_data: !!initialData,
        ...trackingConfig.additionalProperties,
      })
    }
  }, [isOpen, trackingConfig, trackEvent, mode, initialData])
  
  // Form handlers
  const handleFieldChange = useCallback((field: keyof TFormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field error when user starts typing
    if (state.errors[field as string]) {
      setFieldError(field as string, undefined)
    }
  }, [state.errors, setFieldError])
  
  const handleFieldError = useCallback((field: string, error?: string) => {
    setFieldError(field, error)
  }, [setFieldError])
  
  const handleValidation = useCallback((): boolean => {
    if (!validate) return true
    
    const validationErrors = validate(formData)
    
    // Set all field errors
    Object.entries(validationErrors).forEach(([field, error]) => {
      setFieldError(field, error)
    })
    
    if (Object.keys(validationErrors).length > 0 && trackingConfig) {
      trackEvent('form_validation_failed', {
        form_type: trackingConfig.formType,
        form_mode: mode,
        errors: Object.keys(validationErrors),
        error_count: Object.keys(validationErrors).length,
        ...trackingConfig.additionalProperties,
      })
    }
    
    return Object.keys(validationErrors).length === 0
  }, [formData, validate, setFieldError, trackingConfig, trackEvent, mode])
  
  const handleSubmit = useCallback(async () => {
    if (!handleValidation()) {
      return
    }
    
    // Track submission attempt
    if (trackingConfig) {
      trackEvent('form_submitted', {
        form_type: trackingConfig.formType,
        form_mode: mode,
        has_existing_data: !!initialData,
        ...trackingConfig.additionalProperties,
      })
    }
    
    setLoading(true)
    setError(undefined)
    
    startTransition(async () => {
      try {
        const submitData = transformSubmitData ? transformSubmitData(formData) : formData
        const result = await onSubmit(submitData)
        
        // Track successful submission
        if (trackingConfig) {
          trackEvent(isEditing ? 'property_updated' : 'property_created', {
            form_type: trackingConfig.formType,
            entity_id: (result as Record<string, unknown>)?.id,
            ...trackingConfig.additionalProperties,
          })
        }
        
        setSuccess(isEditing ? 'Updated successfully' : 'Created successfully')
        
        // Call success handler
        onSuccess?.(result)
        
        // Reset form for create mode
        if (!isEditing) {
          setFormData({} as TFormData)
          reset()
        }
        
      } catch (error) {
        logger.error('Form submission error:', error instanceof Error ? error : new Error(String(error)), { component: 'formdialogfactory' })
        
        const errorMessage = error instanceof Error ? error.message : 'An error occurred. Please try again.'
        setError(errorMessage)
        
        // Track submission error
        if (trackingConfig) {
          trackEvent('form_submission_failed', {
            form_type: trackingConfig.formType,
            form_mode: mode,
            error_message: errorMessage,
            ...trackingConfig.additionalProperties,
          })
        }
      } finally {
        setLoading(false)
      }
    })
  }, [
    handleValidation, trackingConfig, trackEvent, mode, initialData, setLoading, 
    setError, transformSubmitData, formData, onSubmit, isEditing, setSuccess, 
    onSuccess, reset
  ])
  
  const handleCancel = useCallback(() => {
    reset()
    onCancel?.()
    onClose()
  }, [reset, onCancel, onClose])
  
  const isSubmitting = state.loading || isPending
  
  return (
    <BaseFormModal
      isOpen={isOpen}
      onClose={handleCancel}
      title={title}
      description={description}
      icon={icon}
      iconBgColor={iconBgColor}
      iconColor={iconColor}
      maxWidth={maxWidth}
      submitLabel={submitLabel || (isEditing ? 'Update' : 'Create')}
      cancelLabel={cancelLabel}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      hideFooter={false}
    >
      <div className="space-y-6">
        {/* Global Error Display */}
        {state.error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">
              {state.error}
            </p>
          </motion.div>
        )}
        
        {/* Success Message */}
        {state.success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
          >
            <p className="text-sm text-green-700 dark:text-green-300">
              {state.success}
            </p>
          </motion.div>
        )}
        
        {/* Form Content */}
        {children({
          formData,
          errors: state.errors,
          isSubmitting,
          onChange: handleFieldChange,
          onFieldError: handleFieldError,
        })}
      </div>
    </BaseFormModal>
  )
}

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for managing form dialog state
 */
export function useFormDialog() {
  const [isOpen, setIsOpen] = useState(false)
  
  const openDialog = useCallback(() => setIsOpen(true), [])
  const closeDialog = useCallback(() => setIsOpen(false), [])
  
  return {
    isOpen,
    openDialog,
    closeDialog,
  }
}

// ============================================================================
// COMMON VALIDATION UTILITIES
// ============================================================================

export const commonValidations = {
  required: (value: unknown, fieldName: string) => 
    !value || (typeof value === 'string' && !value.trim()) 
      ? `${fieldName} is required` 
      : undefined,
      
  email: (value: string) =>
    value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ? 'Please enter a valid email address'
      : undefined,
      
  phone: (value: string) =>
    value && !/^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/\s/g, ''))
      ? 'Please enter a valid phone number'
      : undefined,
      
  minLength: (value: string, min: number, fieldName: string) =>
    value && value.length < min
      ? `${fieldName} must be at least ${min} characters`
      : undefined,
      
  maxLength: (value: string, max: number, fieldName: string) =>
    value && value.length > max
      ? `${fieldName} must be no more than ${max} characters`
      : undefined,
      
  dateAfter: (startDate: string, endDate: string, fieldName: string) => {
    if (!startDate || !endDate) return undefined
    return new Date(endDate) <= new Date(startDate)
      ? `${fieldName} must be after the start date`
      : undefined
  }
}