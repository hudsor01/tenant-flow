/**
 * Property Form Hook with React Hook Form Integration
 * Provides form state management with validation and submission for property forms
 */
import { useForm } from 'react-hook-form'
import { logger } from '@/lib/logger'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { propertyFormSchema, type PropertyFormData } from '@repo/shared/validation/properties'
import type { CreatePropertyInput, UpdatePropertyInput, Property } from '@repo/shared'

interface UsePropertyFormOptions {
  mode: 'create' | 'edit'
  property?: Property
  defaultValues?: Partial<PropertyFormData>
  checkCanCreateProperty?: () => boolean
  createProperty: {
    mutateAsync: (data: CreatePropertyInput) => Promise<Property>
    isPending: boolean
  }
  updateProperty: {
    mutateAsync: (data: { id: string; updates: Partial<UpdatePropertyInput> }) => Promise<void>
    isPending: boolean
  }
  onClose?: () => void
}

export function usePropertyForm({
  mode,
  property,
  defaultValues = {},
  checkCanCreateProperty = () => true,
  createProperty,
  updateProperty,
  onClose
}: UsePropertyFormOptions) {
  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      description: '',
      propertyType: 'SINGLE_FAMILY',
      imageUrl: '',
      hasGarage: false,
      hasPool: false,
      numberOfUnits: undefined,
      createUnitsNow: false,
      ...defaultValues
    },
    mode: 'onChange'
  })

  const handleSubmit = useCallback(async (data: PropertyFormData) => {
    try {
      if (mode === 'create') {
        if (!checkCanCreateProperty()) {
          toast.error('You have reached your property limit')
          return
        }
        
        const createData: CreatePropertyInput = {
          name: data.name,
          address: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          description: data.description || undefined,
          propertyType: data.propertyType,
          imageUrl: data.imageUrl || undefined
        }
        
        await createProperty.mutateAsync(createData)
        toast.success('Property created successfully!')
        onClose?.()
      } else if (mode === 'edit' && property) {
        const updates: Partial<UpdatePropertyInput> = {
          name: data.name,
          address: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          description: data.description || undefined,
          propertyType: data.propertyType,
          imageUrl: data.imageUrl || undefined
        }
        
        await updateProperty.mutateAsync({ id: property.id, updates })
        toast.success('Property updated successfully!')
        onClose?.()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save property'
      toast.error(message)
      logger.error('Property form submission error:', error instanceof Error ? error : new Error(String(error)), { component: 'UPropertyFormHook' })
    }
  }, [mode, property, checkCanCreateProperty, createProperty, updateProperty, onClose])

  return {
    form: {
      ...form,
      isSubmitting: createProperty.isPending || updateProperty.isPending
    },
    handleSubmit,
    isPending: createProperty.isPending || updateProperty.isPending,
    propertyType: form.watch('propertyType'),
    numberOfUnits: form.watch('numberOfUnits')
  }
}