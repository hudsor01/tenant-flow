/**
 * Property Form Hook
 * Provides form state management with validation and submission
 */
import { useAtom } from 'jotai'
import { useCallback } from 'react'
import { toast } from 'sonner'
import {
  propertyFormAtom,
  propertyFormDirtyAtom,
  propertyFormSubmittingAtom,
  type PropertyFormData,
} from '@/atoms/forms/property-form'
import { PropertiesApi } from '@/lib/api/properties'

export function usePropertyForm(propertyId?: string) {
  const [formData, setFormData] = useAtom(propertyFormAtom)
  // Form history for future use
  // const [formHistory, setFormHistory] = useAtom(propertyFormWithHistoryAtom)
  const [isDirty, setIsDirty] = useAtom(propertyFormDirtyAtom)
  const [isSubmitting, setIsSubmitting] = useAtom(propertyFormSubmittingAtom)

  // Handle field changes
  const updateField = useCallback((
    field: keyof PropertyFormData,
    value: string | number | boolean | undefined | null | string[]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
    setIsDirty(true)
  }, [setFormData, setIsDirty])

  // Batch update multiple fields
  const updateFields = useCallback((
    updates: Partial<PropertyFormData>
  ) => {
    setFormData((prev) => ({
      ...prev,
      ...updates,
    }))
    setIsDirty(true)
  }, [setFormData, setIsDirty])

  // Validate single field
  const validateField = useCallback((
    field: keyof PropertyFormData
  ): string | null => {
    const value = formData[field]
    
    // Add your validation logic here
    switch (field) {
      case 'name':
        return !value ? 'Property name is required' : null
      case 'address':
        return !value ? 'Address is required' : null
      case 'monthlyRent':
        return (typeof value === 'number' && value < 0) ? 'Rent must be positive' : null
      default:
        return null
    }
  }, [formData])

  // Validate entire form
  const validateForm = useCallback((): boolean => {
    const requiredFields: (keyof PropertyFormData)[] = [
      'name', 'address', 'city', 'state', 'zipCode'
    ]
    
    for (const field of requiredFields) {
      if (!formData[field]) {
        toast.error(`${field} is required`)
        return false
      }
    }
    
    return true
  }, [formData])

  // Submit form
  const submitForm = useCallback(async () => {
    if (!validateForm()) {
      return { success: false, error: 'Validation failed' }
    }

    setIsSubmitting(true)
    try {
      let result
      if (propertyId) {
        // Update existing property
        result = await PropertiesApi.updateProperty(propertyId, formData)
        toast.success('Property updated successfully')
      } else {
        // Create new property
        result = await PropertiesApi.createProperty(formData)
        toast.success('Property created successfully')
      }
      
      setIsDirty(false)
      return { success: true, data: result }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save property'
      toast.error(message)
      return { success: false, error: message }
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, propertyId, validateForm, setIsSubmitting, setIsDirty])

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      propertyType: 'SINGLE_FAMILY',
      bedrooms: 3,
      bathrooms: 2,
      squareFootage: undefined,
      monthlyRent: 0,
      securityDeposit: 0,
      description: '',
      amenities: [],
      images: [],
    })
    setIsDirty(false)
  }, [setFormData, setIsDirty])

  // Undo/Redo support
  const undo = useCallback(() => {
    // Implement undo logic with formHistory
    toast.info('Undo action')
  }, [])

  const redo = useCallback(() => {
    // Implement redo logic with formHistory
    toast.info('Redo action')
  }, [])

  return {
    // Form data
    formData,
    isDirty,
    isSubmitting,
    
    // Actions
    updateField,
    updateFields,
    validateField,
    validateForm,
    submitForm,
    resetForm,
    undo,
    redo,
  }
}