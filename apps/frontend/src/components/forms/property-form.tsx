import React, { useState } from 'react'
import { logger } from '@/lib/logger'
import Image from 'next/image'
import { logger } from '@/lib/logger'
import type { CreatePropertyInput, UpdatePropertyInput, Property } from '@repo/shared'
import { logger } from '@/lib/logger'
import { useForm, FormProvider, type Control } from 'react-hook-form'
import { logger } from '@/lib/logger'
import { zodResolver } from '@hookform/resolvers/zod'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { logger } from '@/lib/logger'
import { Loader2, Upload, X } from 'lucide-react'
import { logger } from '@/lib/logger'
import { SupabaseFormField, PropertyTypeField } from './supabase-form-field'
import { logger } from '@/lib/logger'
import { useCreateProperty, useUpdateProperty } from '@/hooks/api/use-properties'
import { logger } from '@/lib/logger'
import { useAtom } from 'jotai'
import { logger } from '@/lib/logger'
import { closeModalAtom } from '@/atoms/ui/modals'
import { logger } from '@/lib/logger'
import { PropertiesApi } from '@/lib/api/properties'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

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
})

type PropertyFormData = z.infer<typeof propertyFormSchema>
type PropertyData = Property

interface PropertyImageUploadProps {
  propertyId: string
  currentImageUrl?: string
  onImageChange: (imageUrl: string) => void
  disabled?: boolean
}

function PropertyImageUpload({ propertyId, currentImageUrl, onImageChange, disabled }: PropertyImageUploadProps) {
  const [uploading, setUploading] = useState(false)

  const uploadPropertyImage = async (propertyId: string, file: File): Promise<string> => {
    const response = await PropertiesApi.uploadPropertyImage(propertyId, file)
    return response.url
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    setUploading(true)
    try {
      const imageUrl = await uploadPropertyImage(propertyId, file)
      onImageChange(imageUrl)
      toast.success('Image uploaded successfully!')
    } catch {
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium">Property Image</label>
      <div className="flex items-center space-x-4">
        {currentImageUrl && (
          <div className="relative w-20 h-20">
            <Image
              src={currentImageUrl}
              alt="Property"
              width={80}
              height={80}
              className="object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={() => onImageChange('')}
              className="absolute -top-2 -right-2 p-1 bg-destructive rounded-full text-destructive-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="image-upload"
            disabled={uploading || disabled}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('image-upload')?.click()}
            disabled={uploading || disabled}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {uploading ? 'Uploading...' : 'Upload Image'}
          </Button>
        </div>
      </div>
    </div>
  )
}

interface PropertyFormFieldsProps {
  control: Control<PropertyFormData>
}

function PropertyFormFields({ control }: PropertyFormFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="md:col-span-2">
        <SupabaseFormField
          name="name"
          control={control}
          label="Property Name"
          placeholder="Enter property name"
          required
        />
      </div>
      
      <div className="md:col-span-2">
        <SupabaseFormField
          name="address"
          control={control}
          label="Address"
          placeholder="Enter street address"
          required
        />
      </div>
      
      <SupabaseFormField
        name="city"
        control={control}
        label="City"
        placeholder="Enter city"
        required
      />
      
      <SupabaseFormField
        name="state"
        control={control}
        label="State"
        placeholder="CA"
        required
      />
      
      <SupabaseFormField
        name="zipCode"
        control={control}
        label="ZIP Code"
        placeholder="12345"
        required
      />
      
      <PropertyTypeField
        name="propertyType"
        control={control}
        label="Property Type"
        required
      />
      
      <div className="md:col-span-2">
        <SupabaseFormField
          name="description"
          control={control}
          label="Description"
          placeholder="Describe the property..."
          multiline
          rows={3}
        />
      </div>
    </div>
  )
}

interface PropertyFormProps {
  property?: PropertyData | null
  onSuccess?: (property: PropertyData) => void
  onCancel?: () => void
}

export function PropertyForm({ property = null, onSuccess, onCancel }: PropertyFormProps) {
  const [, closeModal] = useAtom(closeModalAtom)
  
  // React Query mutations
  const createPropertyMutation = useCreateProperty()
  const updatePropertyMutation = useUpdateProperty()
  
  // Form setup
  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: property ? {
      name: property.name,
      address: property.address,
      city: property.city,
      state: property.state,
      zipCode: property.zipCode,
      description: property.description ?? '',
      propertyType: property.propertyType,
      imageUrl: property.imageUrl ?? ''
    } : {
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      description: '',
      propertyType: 'SINGLE_FAMILY',
      imageUrl: ''
    },
    mode: 'onChange'
  })
  
  const { control, handleSubmit, setValue, watch, formState: { errors } } = form
  const isSubmitting = createPropertyMutation.isPending || updatePropertyMutation.isPending
  
  // Separate handlers for create and update operations
  const handleCreateProperty = async (data: PropertyFormData) => {
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
    
    const result = await createPropertyMutation.mutateAsync(createData)
    onSuccess?.(result)
    closeModal('propertyForm')
    onCancel?.()
  }

  const handleUpdateProperty = async (data: PropertyFormData) => {
    if (!property) return

    const updateData: UpdatePropertyInput = {
      name: data.name,
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      description: data.description || undefined,
      propertyType: data.propertyType,
      imageUrl: data.imageUrl || undefined
    }
    
    const result = await updatePropertyMutation.mutateAsync({
      id: property.id,
      data: updateData
    })
    
    onSuccess?.(result)
    closeModal('editProperty')
    onCancel?.()
  }

  // Form submission handler
  const onSubmit = async (data: PropertyFormData) => {
    try {
      if (property) {
        await handleUpdateProperty(data)
      } else {
        await handleCreateProperty(data)
      }
    } catch (error) {
      // Error handling is done by React Query hooks with toast notifications
      logger.error('Form submission error:', error instanceof Error ? error : new Error(String(error)), { component: 'propertyform' })
    }
  }
  
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {property ? 'Edit Property' : 'Add New Property'}
        </CardTitle>
        <CardDescription>
          {property 
            ? 'Update property information and settings' 
            : 'Create a new property in your portfolio'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <FormProvider {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Image Upload Section */}
            {property && (
              <PropertyImageUpload
                propertyId={property.id}
                currentImageUrl={watch('imageUrl')}
                onImageChange={(imageUrl) => setValue('imageUrl', imageUrl)}
                disabled={isSubmitting}
              />
            )}
            
            {/* Form Fields */}
            <PropertyFormFields control={control} />
            
            {/* Error Display */}
            {Object.keys(errors).length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  Please fix the errors above and try again.
                </AlertDescription>
              </Alert>
            )}
            
            {/* Actions */}
            <div className="flex justify-end space-x-3">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {property ? 'Update' : 'Create'} Property
              </Button>
            </div>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  )
}
