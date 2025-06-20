import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Building2, MapPin, Image, Save, X, Home, Car, Waves } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Property } from '@/types/entities';

// Form data type
interface PropertyFormData {
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  imageUrl?: string
  propertyType: 'SINGLE_FAMILY' | 'MULTI_UNIT' | 'APARTMENT' | 'COMMERCIAL'
  // Property features (for editing)
  hasGarage?: boolean
  hasPool?: boolean
  // Unit fields for multi-unit properties
  numberOfUnits?: number
  createUnitsNow?: boolean
}
import { useCreateProperty, useUpdateProperty } from '../../hooks/useProperties'
import { toast } from 'sonner'

// Form validation schema
const propertySchema = z.object({
  name: z.string().min(1, 'Property name is required').max(100, 'Name must be less than 100 characters'),
  address: z.string().min(1, 'Address is required').max(255, 'Address must be less than 255 characters'),
  city: z.string().min(1, 'City is required').max(100, 'City must be less than 100 characters'),
  state: z.string().min(2, 'State is required').max(50, 'State must be less than 50 characters'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code'),
  imageUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  propertyType: z.enum(['SINGLE_FAMILY', 'MULTI_UNIT', 'APARTMENT', 'COMMERCIAL']),
  hasGarage: z.boolean().optional(),
  hasPool: z.boolean().optional(),
  numberOfUnits: z.number().min(1).max(500).optional(),
  createUnitsNow: z.boolean().optional(),
})

interface PropertyFormModalProps {
  isOpen: boolean
  onClose: () => void
  property?: Property
  mode?: 'create' | 'edit'
}

export default function PropertyFormModal({
  isOpen,
  onClose,
  property,
  mode = 'create'
}: PropertyFormModalProps) {
  const createProperty = useCreateProperty()
  const updateProperty = useUpdateProperty()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      imageUrl: '',
      propertyType: 'SINGLE_FAMILY',
      hasGarage: false,
      hasPool: false,
      numberOfUnits: undefined,
      createUnitsNow: false,
    }
  })

  const propertyType = watch('propertyType')
  const numberOfUnits = watch('numberOfUnits')

  // Reset form when modal opens/closes or property changes
  useEffect(() => {
    if (isOpen) {
      if (property && mode === 'edit') {
        reset({
          name: property.name,
          address: property.address,
          city: property.city,
          state: property.state,
          zipCode: property.zipCode,
          imageUrl: property.imageUrl || '',
          propertyType: (property).propertyType || 'SINGLE_FAMILY', // Use existing or default
          hasGarage: false,
          hasPool: false,
          numberOfUnits: undefined,
          createUnitsNow: false,
        })
      } else {
        reset({
          name: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          imageUrl: '',
          propertyType: 'SINGLE_FAMILY',
          hasGarage: false,
          hasPool: false,
          numberOfUnits: undefined,
          createUnitsNow: false,
        })
      }
    }
  }, [isOpen, property, mode, reset])

  const onSubmit = async (data: PropertyFormData) => {
    try {
      if (mode === 'edit' && property) {
        await updateProperty.mutateAsync({ id: property.id, data })
        toast.success('Property updated successfully!')
      } else {
        const result = await createProperty.mutateAsync(data)
        if ((result as { unitsCreated?: number })?.unitsCreated) {
          toast.success(`Property created successfully with ${(result as { unitsCreated: number }).unitsCreated} units!`)
        } else {
          toast.success('Property created successfully!')
        }
      }
      onClose()
    } catch (error) {
      toast.error(mode === 'edit' ? 'Failed to update property' : 'Failed to create property')
      console.error('Property form error:', error)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.2 }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  }

  const fieldVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.3
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <DialogHeader className="pb-4">
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  {mode === 'edit' ? 'Edit Property' : 'Add New Property'}
                </DialogTitle>
                <DialogDescription>
                  {mode === 'edit'
                    ? 'Update the essential property information below'
                    : 'Add the essential details to quickly create a new property'
                  }
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <motion.div
              variants={fieldVariants}
              initial="hidden"
              animate="visible"
              custom={0}
              className="space-y-4"
            >
              <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                <Building2 className="h-4 w-4 text-gray-600" />
                <h3 className="font-medium text-gray-900">Basic Information</h3>
              </div>

              {/* Property Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Property Name *
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Sunset Apartments"
                  className="transition-colors focus:border-blue-500"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* Property Type */}
              <div className="space-y-2">
                <Label htmlFor="propertyType" className="text-sm font-medium text-gray-700">
                  Property Type *
                </Label>
                <select
                  id="propertyType"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors focus:border-blue-500"
                  {...register('propertyType')}
                >
                  <option value="SINGLE_FAMILY">Single Family Home</option>
                  <option value="MULTI_UNIT">Multi-Unit Property (2-4 units)</option>
                  <option value="APARTMENT">Apartment Building (5+ units)</option>
                  <option value="COMMERCIAL">Commercial Property</option>
                </select>
                {errors.propertyType && (
                  <p className="text-sm text-red-600">{errors.propertyType.message}</p>
                )}
                <p className="text-xs text-gray-500">
                  {propertyType === 'SINGLE_FAMILY'
                    ? 'Single family homes automatically get one unit created'
                    : 'Multi-unit properties can have units created during setup'
                  }
                </p>
              </div>

              {/* Units Section - Only show for multi-unit properties */}
              {propertyType !== 'SINGLE_FAMILY' && (
                <div className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <Home className="h-4 w-4 text-blue-600" />
                    <h4 className="font-medium text-blue-900">Unit Configuration</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="numberOfUnits" className="text-sm font-medium text-gray-700">
                        Number of Units
                      </Label>
                      <Input
                        id="numberOfUnits"
                        type="number"
                        min="1"
                        max="500"
                        placeholder="e.g., 4"
                        className="transition-colors focus:border-blue-500"
                        {...register('numberOfUnits', { valueAsNumber: true })}
                      />
                      {errors.numberOfUnits && (
                        <p className="text-sm text-red-600">{errors.numberOfUnits.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Unit Creation
                      </Label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="createUnitsNow"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          {...register('createUnitsNow')}
                        />
                        <Label htmlFor="createUnitsNow" className="text-sm text-gray-700">
                          Create units now
                        </Label>
                      </div>
                      <p className="text-xs text-gray-500">
                        {watch('createUnitsNow')
                          ? `Will create ${numberOfUnits || 0} basic units after property creation`
                          : 'You can create units later from the property detail page'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>

            {/* Location Information */}
            <motion.div
              variants={fieldVariants}
              initial="hidden"
              animate="visible"
              custom={1}
              className="space-y-4"
            >
              <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                <MapPin className="h-4 w-4 text-gray-600" />
                <h3 className="font-medium text-gray-900">Location</h3>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                  Street Address *
                </Label>
                <Input
                  id="address"
                  placeholder="e.g., 123 Main Street"
                  className="transition-colors focus:border-blue-500"
                  {...register('address')}
                />
                {errors.address && (
                  <p className="text-sm text-red-600">{errors.address.message}</p>
                )}
              </div>

              {/* City, State, ZIP */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-medium text-gray-700">
                    City *
                  </Label>
                  <Input
                    id="city"
                    placeholder="e.g., San Francisco"
                    className="transition-colors focus:border-blue-500"
                    {...register('city')}
                  />
                  {errors.city && (
                    <p className="text-sm text-red-600">{errors.city.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state" className="text-sm font-medium text-gray-700">
                    State *
                  </Label>
                  <Input
                    id="state"
                    placeholder="e.g., CA"
                    className="transition-colors focus:border-blue-500"
                    {...register('state')}
                  />
                  {errors.state && (
                    <p className="text-sm text-red-600">{errors.state.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode" className="text-sm font-medium text-gray-700">
                    ZIP Code *
                  </Label>
                  <Input
                    id="zipCode"
                    placeholder="e.g., 94102"
                    className="transition-colors focus:border-blue-500"
                    {...register('zipCode')}
                  />
                  {errors.zipCode && (
                    <p className="text-sm text-red-600">{errors.zipCode.message}</p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Property Features */}
            {mode === 'edit' && (
              <motion.div
                variants={fieldVariants}
                initial="hidden"
                animate="visible"
                custom={2}
                className="space-y-4"
              >
                <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                  <Home className="h-4 w-4 text-gray-600" />
                  <h3 className="font-medium text-gray-900">Property Features</h3>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Amenities</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="hasGarage"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        {...register('hasGarage')}
                      />
                      <Car className="h-4 w-4 text-gray-400" />
                      <Label htmlFor="hasGarage" className="text-sm">Garage</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="hasPool"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        {...register('hasPool')}
                      />
                      <Waves className="h-4 w-4 text-gray-400" />
                      <Label htmlFor="hasPool" className="text-sm">Swimming Pool</Label>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Media */}
            <motion.div
              variants={fieldVariants}
              initial="hidden"
              animate="visible"
              custom={2}
              className="space-y-4"
            >
              <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                <Image className="h-4 w-4 text-gray-600" />
                <h3 className="font-medium text-gray-900">Media</h3>
              </div>

              {/* Image URL */}
              <div className="space-y-2">
                <Label htmlFor="imageUrl" className="text-sm font-medium text-gray-700">
                  Property Image URL
                </Label>
                <Input
                  id="imageUrl"
                  type="url"
                  placeholder="https://example.com/property-image.jpg"
                  className="transition-colors focus:border-blue-500"
                  {...register('imageUrl')}
                />
                {errors.imageUrl && (
                  <p className="text-sm text-red-600">{errors.imageUrl.message}</p>
                )}
                <p className="text-xs text-gray-500">
                  Optional: Provide a URL to an image of the property
                </p>
              </div>
            </motion.div>

            <DialogFooter className="pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {mode === 'edit' ? 'Updating...' : 'Creating...'}
                  </div>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {mode === 'edit' ? 'Update Property' : 'Create Property'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
