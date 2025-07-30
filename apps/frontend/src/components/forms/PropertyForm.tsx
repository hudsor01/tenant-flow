import React, { useTransition, useOptimistic, useActionState } from 'react'
import { api } from '@/lib/api/axios-client'
import type { CreatePropertyInput, UpdatePropertyInput, PropertyType } from '@tenantflow/shared'
import { FormProvider } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Upload, X } from 'lucide-react'
import { usePropertyForm } from '@/hooks/useSupabaseForm'
import { SupabaseFormField, PropertyTypeField } from './SupabaseFormField'
import { usePropertyStore } from '@/stores/property-store'
import { useAppStore } from '@/stores/app-store'
import { toast } from 'sonner'
import type { SupabaseTableData } from '@/hooks/use-infinite-query'

type PropertyData = SupabaseTableData<'Property'>

interface PropertyFormProps {
  property?: PropertyData | null
  onSuccess?: (property: PropertyData) => void
  onCancel?: () => void
}

// React 19 Actions for form handling
async function createPropertyAction(_prevState: { loading: boolean; success: boolean; data?: PropertyData }, formData: FormData) {
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
    
    const response = await api.properties.create(propertyData as unknown as Record<string, unknown>)
    return { loading: false, success: true, data: response.data }
  } catch (error) {
    console.error('Create property error:', error)
    return { loading: false, success: false }
  }
}

async function updatePropertyAction(_prevState: { loading: boolean; success: boolean; data?: PropertyData }, formData: FormData) {
  try {
    const id = formData.get('id') as string
    const updates: Partial<UpdatePropertyInput> = {}
    
    // Extract only changed fields
    const fields = ['name', 'address', 'city', 'state', 'zipCode', 'description', 'propertyType', 'imageUrl']
    fields.forEach(field => {
      const value = formData.get(field)
      if (value !== null && value !== '') {
        (updates as Record<string, unknown>)[field] = value
      }
    })
    
    const response = await api.properties.update(id, updates as Record<string, unknown>)
    return { loading: false, success: true, data: response.data }
  } catch (error) {
    console.error('Update property error:', error)
    return { loading: false, success: false }
  }
}

export function PropertyForm({ property = null, onSuccess, onCancel }: PropertyFormProps) {
  const { uploadPropertyImage } = usePropertyStore()
  const { closeModal } = useAppStore()
  
  // React 19 features
  const [isPending, startTransition] = useTransition()
  
  // Optimistic state for immediate UI feedback
  const [optimisticProperty, addOptimisticProperty] = useOptimistic(
    property,
    (state, newProperty: Partial<PropertyData>) => ({
      ...state,
      ...newProperty
    } as PropertyData)
  )
  
  // Enhanced form with Supabase integration
  const form = usePropertyForm({
    defaultValues: property || {
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      description: '',
      propertyType: 'SINGLE_FAMILY' as const,
      imageUrl: ''
    },
    onSuccess: (data) => {
      toast.success('Property saved successfully!')
      onSuccess?.(data)
      closeModal('propertyForm')
      closeModal('editProperty')
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })
  
  const { handleSubmit, control, watch, setValue, formState: { isSubmitting, errors } } = form
  
  // Watch for changes to enable optimistic updates
  const watchedValues = watch()
  
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
  const handleFormSubmit = handleSubmit(async (data) => {
    startTransition(() => {
      // Show optimistic update immediately
      addOptimisticProperty(data)
    })
    
    try {
      if (property?.id) {
        // Update existing property
        await form.updateInSupabase(property.id, data)
      } else {
        // Create new property
        await form.submitToSupabase(data)
      }
    } catch (error) {
      // Error handling is managed by the form hook
      console.error('Form submission error:', error)
    }
  })
  
  // React 19 Action-based form (alternative approach)
  const [createActionState, createAction] = useActionState(createPropertyAction, {
    loading: false,
    success: false,
    data: undefined
  })
  
  const [updateActionState, updateAction] = useActionState(updatePropertyAction, {
    loading: false,
    success: false,
    data: property || undefined
  })
  
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
        <FormProvider {...form}>
          {/* Traditional React Hook Form approach */}
          <form onSubmit={handleFormSubmit} className="space-y-6">
            
            {/* Image Upload Section */}
            {property && (
              <div className="space-y-4">
                <label className="text-sm font-medium">Property Image</label>
                <div className="flex items-center space-x-4">
                  {optimisticProperty?.imageUrl && (
                    <div className="relative">
                      <img
                        src={optimisticProperty.imageUrl}
                        alt="Property"
                        className="w-20 h-20 object-cover rounded-lg"
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
                      onChange={handleImageUpload}
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
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 border-t">
            <h3 className="text-sm font-medium mb-4">React 19 Action Form (Demo)</h3>
            <form action={property?.id ? (formData) => updateAction(formData) : (formData) => createAction(formData)} className="space-y-4">
              {property?.id && <input type="hidden" name="id" value={property.id} />}
              <input
                name="name"
                placeholder="Property name"
                defaultValue={watchedValues.name}
                className="w-full p-2 border rounded"
              />
              <input
                name="address"
                placeholder="Address"
                defaultValue={watchedValues.address}
                className="w-full p-2 border rounded"
              />
              <select
                name="propertyType"
                defaultValue={watchedValues.propertyType}
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

// React 19 useFormStatus component
function SubmitButton() {
  // This would use React 19's useFormStatus in a real implementation
  // const { pending } = useFormStatus()
  const pending = false // Placeholder
  
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
      Submit
    </Button>
  )
}

export { SubmitButton }