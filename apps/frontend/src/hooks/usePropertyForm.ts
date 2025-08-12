/**
 * Property Form Hook with React Hook Form Integration
 * Provides form state management with validation and submission for property forms
 */
import { useForm } from 'react-hook-form'
import { logger } from '@/lib/logger'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCallback } from 'react'
import { toast } from 'sonner'
import type { CreatePropertyInput, UpdatePropertyInput, Property } from '@repo/shared'

// Form validation schema
const propertyFormSchema = z.object({
  name: z.string().min(1, 'Property name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'ZIP code is required'),
  description: z.string().optional(),
  propertyType: z.enum(['SINGLE_FAMILY', 'MULTI_UNIT', 'APARTMENT', 'COMMERCIAL']),
  imageUrl: z.string().optional(),
  hasGarage: z.boolean().optional(),
  hasPool: z.boolean().optional(),
  numberOfUnits: z.number().optional(),
  createUnitsNow: z.boolean().optional()
})

// Use shared PropertyFormData type instead of local definition
type LocalPropertyFormData = z.infer<typeof propertyFormSchema>

interface UsePropertyFormOptions {
  mode: 'create' | 'edit'
  property?: Property
  defaultValues?: Partial<LocalPropertyFormData>
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
  const form = useForm<LocalPropertyFormData>({
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

  const handleSubmit = useCallback(async (data: LocalPropertyFormData) => {
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