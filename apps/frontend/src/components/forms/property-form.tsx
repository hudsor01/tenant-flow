import React, { useTransition, useOptimistic, useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { api } from '@/lib/api'
import Image from 'next/image'
import type { CreatePropertyInput, UpdatePropertyInput, PropertyType, Property } from '@repo/shared'
import { FormProvider } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Upload, X } from 'lucide-react'
import { usePropertyForm } from '@/hooks/usePropertyForm'
import { SupabaseFormField, PropertyTypeField } from './supabase-form-field'
import { useProperties } from '@/hooks/use-properties'
import { useAtom } from 'jotai'
import { closeModalAtom } from '@/atoms/ui/modals'
import { PropertiesApi } from '@/lib/api/properties'
import { toast } from 'sonner'
type PropertyData = Property


// React 19 useFormStatus component - Production implementation
interface SubmitButtonProps {
  children?: React.ReactNode
  loadingText?: string
  className?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

interface PropertyFormProps {
  property?: PropertyData | null
  onSuccess?: (property: PropertyData) => void
  onCancel?: () => void
}

// Action state types
type ActionState = {
  loading: boolean;
  success: boolean;
  data?: PropertyData;
  error?: string;
}

// React 19 Actions for form handling
async function createPropertyAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const propertyData: CreatePropertyInput = {
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      zipCode: formData.get('zipCode') as string,
      description: formData.get('description') as string || undefined,
      propertyType: formData.get('propertyType') as PropertyType
    }
    
    const response = await api.properties.create(propertyData)
    return { loading: false, success: true, data: response.data as PropertyData }
  } catch (error) {
    console.error('Create property error:', error)
    return { loading: false, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function updatePropertyAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const id = formData.get('id') as string
    const updates: Partial<UpdatePropertyInput> = {}
    
    // Extract only changed fields
    const fields = ['name', 'address', 'city', 'state', 'zipCode', 'description', 'propertyType', 'imageUrl']
    fields.forEach(field => {
      const value = formData.get(field)
      if (value !== null && value !== '' && typeof value === 'string') {
        (updates as Record<string, string | PropertyType | undefined>)[field] = value
      }
    })
    
    const response = await api.properties.update(id, updates as Partial<UpdatePropertyInput>)
    return { loading: false, success: true, data: response.data as PropertyData }
  } catch (error) {
    console.error('Update property error:', error)
    return { loading: false, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function PropertyForm({ property = null, onSuccess, onCancel }: PropertyFormProps) {
  const { createProperty, updateProperty } = useProperties()
  const [, closeModal] = useAtom(closeModalAtom)
  
  // React 19 features
  const [isPending] = useTransition()
  
  // Optimistic state for immediate UI feedback
  const [optimisticProperty, addOptimisticProperty] = useOptimistic(
    property,
    (state, newProperty: Partial<PropertyData>) => ({
      ...state,
      ...newProperty
    } as PropertyData)
  )
  
  // Upload property image function
  const uploadPropertyImage = async (propertyId: string, file: File): Promise<string> => {
    const response = await PropertiesApi.uploadPropertyImage(propertyId, file)
    return response.url
  }
  
  // Use react-hook-form directly
  const propertyFormResult = usePropertyForm({
    mode: property ? 'edit' : 'create',
    property: property || undefined,
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
      propertyType: 'SINGLE_FAMILY' as const,
      imageUrl: ''
    },
    checkCanCreateProperty: () => true, // No subscription limits for now
    createProperty: {
      mutateAsync: async (data) => {
        // Convert to the format expected by the store
        const storeData: CreatePropertyInput = {
          name: data.name,
          address: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          description: data.description || undefined,
          imageUrl: data.imageUrl || undefined,
          propertyType: data.propertyType || 'SINGLE_FAMILY'
        }
        const result = await createProperty(storeData)
        if (result.success && result.data) {
          onSuccess?.(result.data)
          return result.data
        } else {
          throw new Error(result.error || 'Failed to create property')
        }
      },
      isPending: false
    },
    updateProperty: {
      mutateAsync: async ({ id, updates }) => {
        const result = await updateProperty(id, updates)
        if (result.success && result.data) {
          onSuccess?.(result.data)
        } else {
          throw new Error(result.error || 'Failed to update property')
        }
      },
      isPending: false
    },
    onClose: () => {
      closeModal('propertyForm')
      closeModal('editProperty')
      onCancel?.()
    }
  })
  
  const formInstance = propertyFormResult.form
  const formHandleSubmit = propertyFormResult.handleSubmit
  
  // Get form methods from the form instance
  const control = formInstance.control
  const watch = formInstance.watch
  const setValue = formInstance.setValue
  const errors = formInstance.formState.errors || {}
  const isSubmitting = formInstance.isSubmitting || false
  
  // Watch for changes to enable optimistic updates
  const watchedValues = watch() || {} as PropertyData
  
  // File upload handler
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !property?.id) return
    
    try {
      // Show optimistic update
      addOptimisticProperty({ imageUrl: URL.createObjectURL(file) })
      
      const imageUrl = await uploadPropertyImage(property.id, file)
      setValue('imageUrl', imageUrl)
      
      toast.success('Image uploaded successfully!')
    } catch {
      toast.error('Failed to upload image')
      // Revert optimistic update
      setValue('imageUrl', property?.imageUrl || '')
    }
  }
  
  // Form submission with React 19 patterns
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void formInstance.handleSubmit(formHandleSubmit)(e)
  }
  
  // React 19 Action-based form (alternative approach)
  const [createActionState, createAction] = useActionState(createPropertyAction, {
    loading: false,
    success: false,
    data: undefined,
    error: undefined
  } as ActionState)
  
  const [updateActionState, updateAction] = useActionState(updatePropertyAction, {
    loading: false,
    success: false,
    data: property || undefined,
    error: undefined
  } as ActionState)
  
  // Handle success from React 19 actions
  React.useEffect(() => {
    if (createActionState.success && createActionState.data) {
      toast.success('Property created successfully!')
      onSuccess?.(createActionState.data)
      closeModal('propertyForm')
    }
  }, [createActionState.success, createActionState.data, onSuccess, closeModal])
  
  React.useEffect(() => {
    if (updateActionState.success && updateActionState.data) {
      toast.success('Property updated successfully!')
      onSuccess?.(updateActionState.data)
      closeModal('editProperty')
    }
  }, [updateActionState.success, updateActionState.data, onSuccess, closeModal])
  
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
        <FormProvider {...formInstance}>
            {/* Traditional React Hook Form approach */}
            <form onSubmit={handleFormSubmit} className="space-y-6">
            
            {/* Image Upload Section */}
            {property && (
              <div className="space-y-4">
                <label className="text-sm font-medium">Property Image</label>
                <div className="flex items-center space-x-4">
                  {optimisticProperty?.imageUrl && (
                    <div className="relative w-20 h-20">
                      <Image
                        src={optimisticProperty.imageUrl}
                        alt="Property"
                        width={80}
                        height={80}
                        className="object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setValue('imageUrl', '')}
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
                      onChange={(e) => { void handleImageUpload(e); }}
                      className="hidden"
                      id="image-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('image-upload')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Form Fields */}
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
                disabled={isSubmitting || isPending}
                className="min-w-[120px]"
              >
                {(isSubmitting || isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {property ? 'Update' : 'Create'} Property
              </Button>
            </div>
            </form>
        </FormProvider>
        
        {/* React 19 Action-based form (alternative) */}
        {process.env.DEV && (
          <div className="mt-8 p-4 border-t">
            <h3 className="text-sm font-medium mb-4">React 19 Action Form (Demo)</h3>
            <form action={property?.id ? (formData) => updateAction(formData) : (formData) => createAction(formData)} className="space-y-4">
              {property?.id && <input type="hidden" name="id" value={property.id} />}
              <input
                name="name"
                placeholder="Property name"
                defaultValue={watchedValues?.name || ''}
                className="w-full p-2 border rounded"
              />
              <input
                name="address"
                placeholder="Address"
                defaultValue={watchedValues?.address || ''}
                className="w-full p-2 border rounded"
              />
              <select
                name="propertyType"
                defaultValue={watchedValues?.propertyType || 'SINGLE_FAMILY'}
                className="w-full p-2 border rounded"
              >
                <option value="SINGLE_FAMILY">Single Family</option>
                <option value="MULTI_UNIT">Multi Unit</option>
                <option value="APARTMENT">Apartment</option>
                <option value="COMMERCIAL">Commercial</option>
              </select>
              <Button type="submit" disabled={isPending || createActionState.loading || updateActionState.loading} variant="secondary">
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit with Action
              </Button>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  )
}



export function SubmitButton({ 
  children = 'Submit',
  loadingText = 'Submitting...',
  className,
  variant = 'default',
  size = 'default'
}: SubmitButtonProps) {
  const { pending } = useFormStatus()
  
  return (
    <Button 
      type="submit" 
      disabled={pending}
      className={className}
      variant={variant}
      size={size}
    >
      {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
      {pending ? loadingText : children}
    </Button>
  )
}

