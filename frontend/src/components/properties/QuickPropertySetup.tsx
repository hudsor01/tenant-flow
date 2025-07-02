import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Building2, Plus, Home, Check } from 'lucide-react'
import { useCreateProperty } from '@/hooks/useApiProperties'
import { useCreateUnit } from '@/hooks/useUnits'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

const quickSetupSchema = z.object({
  // Property info
  propertyName: z.string().min(1, 'Property name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(5, 'Valid zip code required'),

  // Units info
  numberOfUnits: z.number().min(1, 'At least 1 unit required').max(50, 'Maximum 50 units'),
  baseRent: z.number().min(1, 'Base rent is required'),
  bedrooms: z.number().min(0, 'Bedrooms cannot be negative').max(10),
  bathrooms: z.number().min(0.5, 'At least 0.5 bathrooms required').max(10),
})

type QuickSetupFormData = z.infer<typeof quickSetupSchema>

interface QuickPropertySetupProps {
  onComplete?: (propertyId: string) => void
}

export default function QuickPropertySetup({ onComplete }: QuickPropertySetupProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const createProperty = useCreateProperty()
  const createUnit = useCreateUnit()

  const form = useForm<QuickSetupFormData>({
    resolver: zodResolver(quickSetupSchema),
    defaultValues: {
      propertyName: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      numberOfUnits: 1,
      baseRent: 1200,
      bedrooms: 1,
      bathrooms: 1,
    },
  })

  const onSubmit = async (data: QuickSetupFormData) => {
    setIsSubmitting(true)

    try {
      // 1. Create the property
      const property = await createProperty.mutateAsync({
        name: data.propertyName,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        type: 'RESIDENTIAL'
      })

      // 2. Create units for the property
      const unitPromises = Array.from({ length: data.numberOfUnits }, (_, index) =>
        createUnit.mutateAsync({
          propertyId: property.id,
          unitNumber: (index + 1).toString(),
          bedrooms: data.bedrooms,
          bathrooms: data.bathrooms,
          rent: data.baseRent,
          status: 'VACANT',
        })
      )

      await Promise.all(unitPromises)

      toast.success(`Property "${data.propertyName}" created with ${data.numberOfUnits} unit${data.numberOfUnits > 1 ? 's' : ''}!`)
      setIsComplete(true)

      if (onComplete) {
        onComplete(property.id)
      }

    } catch (error) {
      console.error('Quick setup failed:', error)
      toast.error('Failed to create property. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Property Created Successfully!</h3>
        <p className="text-gray-600 mb-4">
          Your property and units are ready. You can now invite tenants and create leases.
        </p>
        <Button onClick={() => setIsComplete(false)} variant="outline">
          Create Another Property
        </Button>
      </motion.div>
    )
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Quick Property Setup
        </CardTitle>
        <CardDescription>
          Create a new property with units in just a few steps
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Property Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                <Building2 className="h-3 w-3 mr-1" />
                Property Details
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="propertyName">Property Name *</Label>
                <Input
                  id="propertyName"
                  {...form.register('propertyName')}
                  placeholder="e.g., Sunset Apartments"
                />
                {form.formState.errors.propertyName && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.propertyName.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  {...form.register('address')}
                  placeholder="123 Main Street"
                />
                {form.formState.errors.address && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.address.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  {...form.register('city')}
                  placeholder="San Francisco"
                />
                {form.formState.errors.city && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.city.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  {...form.register('state')}
                  placeholder="CA"
                />
                {form.formState.errors.state && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.state.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="zipCode">Zip Code *</Label>
                <Input
                  id="zipCode"
                  {...form.register('zipCode')}
                  placeholder="94102"
                />
                {form.formState.errors.zipCode && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.zipCode.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Unit Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="bg-green-50 text-green-700">
                <Home className="h-3 w-3 mr-1" />
                Unit Configuration
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="numberOfUnits">Number of Units *</Label>
                <Input
                  id="numberOfUnits"
                  type="number"
                  min="1"
                  max="50"
                  {...form.register('numberOfUnits', { valueAsNumber: true })}
                />
                {form.formState.errors.numberOfUnits && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.numberOfUnits.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="baseRent">Base Rent (per unit) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <Input
                    id="baseRent"
                    type="number"
                    min="1"
                    className="pl-7"
                    {...form.register('baseRent', { valueAsNumber: true })}
                  />
                </div>
                {form.formState.errors.baseRent && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.baseRent.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  min="0"
                  max="10"
                  {...form.register('bedrooms', { valueAsNumber: true })}
                />
                {form.formState.errors.bedrooms && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.bedrooms.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  min="0.5"
                  max="10"
                  step="0.5"
                  {...form.register('bathrooms', { valueAsNumber: true })}
                />
                {form.formState.errors.bathrooms && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.bathrooms.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Setup Summary:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• {form.watch('numberOfUnits')} unit{form.watch('numberOfUnits') !== 1 ? 's' : ''} will be created</li>
              <li>• Each unit will have {form.watch('bedrooms')} bedroom{form.watch('bedrooms') !== 1 ? 's' : ''} and {form.watch('bathrooms')} bathroom{form.watch('bathrooms') !== 1 ? 's' : ''}</li>
              <li>• Base rent: ${form.watch('baseRent')?.toLocaleString()}/month per unit</li>
              <li>• All units will start as "VACANT" and ready for tenants</li>
            </ul>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Creating Property...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Property & Units
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
