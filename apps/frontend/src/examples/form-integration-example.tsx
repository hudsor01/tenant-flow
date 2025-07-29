/**
 * Comprehensive example demonstrating all React Hook Form + Supabase patterns
 * 
 * This file shows how to integrate:
 * - React Hook Form v7 advanced features
 * - Supabase type-safe forms
 * - React 19 optimistic updates
 * - Multi-step forms with validation
 * - Dynamic field arrays
 * - Auto-save functionality
 * - Cross-field validation
 */

import React, { useState, useEffect, useOptimistic, useTransition } from 'react'
import { FormProvider, useFieldArray, useWatch } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, Circle, Loader2 } from 'lucide-react'

import { useSupabaseForm, createPropertySchema } from '@/hooks/useSupabaseForm'
import { SupabaseFormField, PropertyTypeField } from '@/components/forms/SupabaseFormField'
import { createMultiStepForm, createAutoSave, createFormWatcher, type FormStep } from '@/utils/form-utils'
import { usePropertyStore } from '@/stores/property-store'
import { z } from 'zod'

// Extended schema for multi-step form
const extendedPropertySchema = createPropertySchema.extend({
  // Step 2: Financial Information
  expectedRent: z.number().min(0, 'Expected rent must be positive'),
  propertyValue: z.number().min(0, 'Property value must be positive'),
  
  // Step 3: Units (dynamic array)
  units: z.array(z.object({
    unitNumber: z.string().min(1, 'Unit number required'),
    bedrooms: z.number().min(0, 'Bedrooms must be 0 or more'),
    bathrooms: z.number().min(0, 'Bathrooms must be 0 or more'),
    rent: z.number().min(0, 'Rent must be positive'),
    status: z.enum(['VACANT', 'OCCUPIED', 'MAINTENANCE'])
  })).min(1, 'At least one unit is required'),
  
  // Step 4: Additional Details
  amenities: z.array(z.string()).optional(),
  parkingSpaces: z.number().min(0).optional(),
  petPolicy: z.enum(['ALLOWED', 'NOT_ALLOWED', 'CASE_BY_CASE']).optional()
})

type ExtendedPropertyFormData = z.infer<typeof extendedPropertySchema>

// Multi-step form configuration
const formSteps: FormStep[] = [
  {
    id: 'basic',
    title: 'Basic Information',
    description: 'Property name, address, and type',
    fields: ['name', 'address', 'city', 'state', 'zipCode', 'propertyType', 'description']
  },
  {
    id: 'financial',
    title: 'Financial Details',
    description: 'Rent and property value information',
    fields: ['expectedRent', 'propertyValue']
  },
  {
    id: 'units',
    title: 'Unit Configuration',
    description: 'Define the units in this property',
    fields: ['units']
  },
  {
    id: 'additional',
    title: 'Additional Details',
    description: 'Amenities and policies',
    fields: ['amenities', 'parkingSpaces', 'petPolicy'],
    optional: true
  }
]

const multiStepForm = createMultiStepForm(formSteps)

export function ComprehensiveFormExample() {
  const [currentStepId, setCurrentStepId] = useState('basic')
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  
  // React 19 features
  const [isPending, startTransition] = useTransition()
  const [optimisticProperty, addOptimistic] = useOptimistic(
    null as ExtendedPropertyFormData | null,
    (state, newData: Partial<ExtendedPropertyFormData>) => ({
      ...state,
      ...newData
    } as ExtendedPropertyFormData)
  )
  
  // Property store integration
  const { createProperty } = usePropertyStore()
  
  // Enhanced form with all features
  const form = useSupabaseForm({
    table: 'Property',
    schema: extendedPropertySchema,
    defaultValues: {
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      propertyType: 'SINGLE_FAMILY',
      description: '',
      expectedRent: 0,
      propertyValue: 0,
      units: [{ 
        unitNumber: '1', 
        bedrooms: 1, 
        bathrooms: 1, 
        rent: 0, 
        status: 'VACANT' as const 
      }],
      amenities: [],
      parkingSpaces: 0,
      petPolicy: 'CASE_BY_CASE' as const
    },
    enableAutoSave: true,
    enableOptimisticUpdates: true,
    onSuccess: (data) => {
      console.log('Property created:', data)
    }
  })
  
  const { control, handleSubmit, watch, formState: { errors }, trigger } = form
  
  // Dynamic field arrays for units
  const { fields: unitFields, append: addUnit, remove: removeUnit } = useFieldArray({
    control,
    name: 'units'
  })
  
  // Form watching utilities
  const formWatcher = createFormWatcher(watch)
  const watchedValues = useWatch({ control })
  
  // Auto-save setup
  useEffect(() => {
    const cleanup = createAutoSave(
      watch,
      async (data) => {
        // Save draft to localStorage or Supabase
        localStorage.setItem('property-draft', JSON.stringify(data))
      },
      {
        delay: 2000,
        enabled: true,
        fields: ['name', 'address', 'description'] // Only auto-save certain fields
      }
    )
    
    return cleanup
  }, [watch])
  
  // Watch for changes that affect other fields
  useEffect(() => {
    const subscription = formWatcher.watchField('propertyType', (propertyType) => {
      // Auto-adjust units based on property type
      if (propertyType === 'SINGLE_FAMILY' && unitFields.length > 1) {
        // Single family should typically have one unit
        while (unitFields.length > 1) {
          removeUnit(unitFields.length - 1)
        }
      }
    })
    
    return () => subscription?.unsubscribe?.()
  }, [formWatcher, unitFields.length, removeUnit])
  
  // Calculate form progress
  const progress = multiStepForm.getProgress(currentStepId)
  const currentStep = multiStepForm.steps.find(s => s.id === currentStepId)!
  
  // Step navigation
  const goToNextStep = async () => {
    // Validate current step
    const stepValidation = multiStepForm.validateStep(
      currentStepId, 
      watchedValues, 
      extendedPropertySchema
    )
    
    if (!stepValidation.isValid && !currentStep.optional) {
      return // Stay on current step if validation fails
    }
    
    // Mark step as completed
    setCompletedSteps(prev => [...prev.filter(id => id !== currentStepId), currentStepId])
    
    // Move to next step
    const nextStep = multiStepForm.getNextStep(currentStepId)
    if (nextStep) {
      setCurrentStepId(nextStep.id)
    }
  }
  
  const goToPreviousStep = () => {
    const prevStep = multiStepForm.getPreviousStep(currentStepId)
    if (prevStep) {
      setCurrentStepId(prevStep.id)
    }
  }
  
  // Final form submission
  const handleFinalSubmit = handleSubmit(async (data) => {
    startTransition(() => {
      // Show optimistic update
      addOptimistic(data)
    })
    
    try {
      // Transform data for Supabase (remove extended fields)
      const { units, amenities, parkingSpaces, petPolicy, expectedRent, propertyValue, ...propertyData } = data
      
      // Create property in Supabase
      const property = await form.submitToSupabase(propertyData)
      
      // Create units separately (in real app, this would be a transaction)
      for (const unit of units) {
        // await createUnit({ ...unit, propertyId: property.id })
        console.log('Would create unit:', unit, 'for property:', property.id)
      }
      
      console.log('Multi-step form completed successfully!')
    } catch (error) {
      console.error('Form submission failed:', error)
    }
  })
  
  // Render current step content
  const renderStepContent = () => {
    switch (currentStepId) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  placeholder="Street address"
                  required
                />
              </div>
              
              <SupabaseFormField
                name="city"
                control={control}
                label="City"
                required
              />
              
              <SupabaseFormField
                name="state"
                control={control}
                label="State"
                required
              />
              
              <SupabaseFormField
                name="zipCode"
                control={control}
                label="ZIP Code"
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
                  multiline
                  rows={3}
                />
              </div>
            </div>
          </div>
        )
      
      case 'financial':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SupabaseFormField
                name="expectedRent"
                control={control}
                type="number"
                label="Expected Monthly Rent"
                placeholder="0"
                min={0}
                required
              />
              
              <SupabaseFormField
                name="propertyValue"
                control={control}
                type="number"
                label="Property Value"
                placeholder="0"
                min={0}
                required
              />
            </div>
            
            {/* Show calculated metrics */}
            {watchedValues.expectedRent > 0 && watchedValues.propertyValue > 0 && (
              <Card className="p-4 bg-blue-50">
                <h4 className="font-semibold mb-2">Investment Analysis</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Annual Rent:</span>
                    <div className="font-semibold">
                      ${(watchedValues.expectedRent * 12).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Gross Yield:</span>
                    <div className="font-semibold">
                      {((watchedValues.expectedRent * 12 / watchedValues.propertyValue) * 100).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )
      
      case 'units':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Units</h3>
              <Button
                type="button"
                onClick={() => addUnit({
                  unitNumber: (unitFields.length + 1).toString(),
                  bedrooms: 1,
                  bathrooms: 1,
                  rent: watchedValues.expectedRent || 0,
                  status: 'VACANT' as const
                })}
              >
                Add Unit
              </Button>
            </div>
            
            {unitFields.map((field, index) => (
              <Card key={field.id} className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium">Unit {index + 1}</h4>
                  {unitFields.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeUnit(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <SupabaseFormField
                    name={`units.${index}.unitNumber`}
                    control={control}
                    label="Unit Number"
                    required
                  />
                  
                  <SupabaseFormField
                    name={`units.${index}.bedrooms`}
                    control={control}
                    type="number"
                    label="Bedrooms"
                    min={0}
                    required
                  />
                  
                  <SupabaseFormField
                    name={`units.${index}.bathrooms`}
                    control={control}
                    type="number"
                    label="Bathrooms"
                    min={0}
                    step={0.5}
                    required
                  />
                  
                  <SupabaseFormField
                    name={`units.${index}.rent`}
                    control={control}
                    type="number"
                    label="Rent"
                    min={0}
                    required
                  />
                </div>
              </Card>
            ))}
          </div>
        )
      
      case 'additional':
        return (
          <div className="space-y-6">
            <SupabaseFormField
              name="parkingSpaces"
              control={control}
              type="number"
              label="Parking Spaces"
              min={0}
            />
            
            <SupabaseFormField
              name="petPolicy"
              control={control}
              type="select"
              label="Pet Policy"
              options={[
                { value: 'ALLOWED', label: 'Pets Allowed' },
                { value: 'NOT_ALLOWED', label: 'No Pets' },
                { value: 'CASE_BY_CASE', label: 'Case by Case' }
              ]}
            />
          </div>
        )
      
      default:
        return null
    }
  }
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Property - Multi-Step Form</CardTitle>
          
          {/* Progress indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Step {progress.current} of {progress.total}</span>
              <span>{progress.percentage}% Complete</span>
            </div>
            <Progress value={progress.percentage} className="w-full" />
          </div>
          
          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {multiStepForm.steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center ${
                  index < multiStepForm.steps.length - 1 ? 'flex-1' : 'flex-none'
                }`}
              >
                <div className="flex flex-col items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    completedSteps.includes(step.id)
                      ? 'bg-green-500 text-white'
                      : step.id === currentStepId
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {completedSteps.includes(step.id) ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-xs mt-1 text-center">
                    {step.title}
                  </span>
                  {step.optional && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      Optional
                    </Badge>
                  )}
                </div>
                
                {index < multiStepForm.steps.length - 1 && (
                  <div className="flex-1 h-px bg-gray-200 mx-4 mt-4" />
                )}
              </div>
            ))}
          </div>
        </CardHeader>
        
        <CardContent>
          <FormProvider {...form}>
            <div className="space-y-6">
              {/* Current step content */}
              <div>
                <h2 className="text-xl font-semibold mb-2">{currentStep.title}</h2>
                {currentStep.description && (
                  <p className="text-gray-600 mb-6">{currentStep.description}</p>
                )}
                
                {renderStepContent()}
              </div>
              
              <Separator />
              
              {/* Navigation buttons */}
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goToPreviousStep}
                  disabled={!multiStepForm.getPreviousStep(currentStepId)}
                >
                  Previous
                </Button>
                
                <div className="flex gap-2">
                  {multiStepForm.getNextStep(currentStepId) ? (
                    <Button
                      type="button"
                      onClick={goToNextStep}
                      disabled={isPending}
                    >
                      {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Next
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleFinalSubmit}
                      disabled={isPending}
                    >
                      {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Create Property
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </FormProvider>
        </CardContent>
      </Card>
      
      {/* Debug information */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Form Values:</h4>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {JSON.stringify(watchedValues, null, 2)}
                </pre>
              </div>
              
              <div>
                <h4 className="font-medium">Form Errors:</h4>
                <pre className="text-xs bg-red-50 p-2 rounded overflow-auto">
                  {JSON.stringify(errors, null, 2)}
                </pre>
              </div>
              
              <div>
                <h4 className="font-medium">Completed Steps:</h4>
                <div className="flex gap-2">
                  {completedSteps.map(stepId => (
                    <Badge key={stepId} variant="secondary">
                      {stepId}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}