/**
 * Property Form Data Hook
 * Provides data and state management for property forms
 */
import { useCallback, useState } from 'react'
import { logger } from '@/lib/logger'
import type { UseFormReturn } from 'react-hook-form'
import { logger } from '@/lib/logger'
import type { Property, PropertyFormData, CreatePropertyInput, UpdatePropertyInput } from '@repo/shared'
import { logger } from '@/lib/logger'
import { useSubscription } from './useSubscription'
import { logger } from '@/lib/logger'

interface UsePropertyFormDataProps {
  property?: Property
  mode: 'create' | 'edit'
  isOpen: boolean
}

// Mock mutations for now - these would normally be from React Query
const createPropertyMutation = {
  mutateAsync: async (data: CreatePropertyInput): Promise<Property> => {
    // Note: API call will be implemented with React Query integration
    logger.info('Creating property:', { component: 'UPropertyFormDataHook', data: data })
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
    return { ...data, id: 'new-id', createdAt: new Date(), updatedAt: new Date() } as Property
  },
  isPending: false
}

const updatePropertyMutation = {
  mutateAsync: async (data: { id: string; updates: Partial<UpdatePropertyInput> }): Promise<void> => {
    // Note: API call will be implemented with React Query integration
    logger.info('Updating property:', { component: 'UPropertyFormDataHook', data: data })
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
  },
  isPending: false
}

export function usePropertyFormData({ property, mode, isOpen }: UsePropertyFormDataProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const { subscription, isLoading: isSubscriptionLoading } = useSubscription()

  const userPlan = subscription?.planType

  // Check if user can create properties
  const checkCanCreateProperty = useCallback(() => {
    // Note: Entitlement checking will be implemented with subscription service
    if (mode === 'edit') return true
    
    // For now, allow property creation
    // This would normally check subscription limits
    return true
  }, [mode])

  const getUpgradeReason = useCallback((_feature: string) => {
    return `This feature requires a higher subscription plan.`
  }, [])

  // Get default values for form
  const getDefaultValues = useCallback((): PropertyFormData => ({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    description: '',
    imageUrl: '',
    propertyType: 'SINGLE_FAMILY'
  }), [])

  // Initialize form when modal opens
  const initializeForm = useCallback((form: UseFormReturn<PropertyFormData>) => {
    if (!isOpen) return

    if (mode === 'edit' && property) {
      form.reset({
        name: property.name,
        address: property.address,
        city: property.city,
        state: property.state,
        zipCode: property.zipCode,
        description: property.description || '',
        imageUrl: property.imageUrl || '',
        propertyType: property.propertyType || 'SINGLE_FAMILY'
      })
    } else if (mode === 'create') {
      form.reset(getDefaultValues())
    }
  }, [isOpen, mode, property, getDefaultValues])

  return {
    showUpgradeModal,
    setShowUpgradeModal,
    userPlan,
    createProperty: createPropertyMutation,
    updateProperty: updatePropertyMutation,
    getUpgradeReason,
    initializeForm,
    checkCanCreateProperty,
    getDefaultValues,
    isLoading: isSubscriptionLoading
  }
}