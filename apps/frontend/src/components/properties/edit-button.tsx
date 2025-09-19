'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Eye, Edit, Building, MapPin, Calendar, DollarSign } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { propertiesApi } from '@/lib/api-client'
import { toast } from 'sonner'
import type { Tables, TablesUpdate } from '@repo/shared'

type Property = Tables<'Property'>
type PropertyUpdate = TablesUpdate<'Property'>

interface PropertyActionsProps {
  property: Property
}

const editPropertySchema = z.object({
  name: z.string().min(1, 'Property name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'Zip code is required'),
  propertyType: z.enum(['SINGLE_FAMILY', 'MULTI_UNIT', 'APARTMENT', 'COMMERCIAL', 'CONDO', 'TOWNHOUSE', 'OTHER'])
})

type EditPropertyFormData = z.infer<typeof editPropertySchema>

export function PropertyEditViewButtons({ property }: PropertyActionsProps) {
  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<EditPropertyFormData>({
    resolver: zodResolver(editPropertySchema),
    defaultValues: {
      name: property.name,
      address: property.address,
      city: property.city,
      state: property.state,
      zipCode: property.zipCode,
      propertyType: property.propertyType
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data: PropertyUpdate) => propertiesApi.update(property.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      toast.success('Property updated successfully')
      setEditOpen(false)
    },
    meta: {
      operation: 'update',
      entityType: 'property'
    }
  })

  const onSubmit = (data: EditPropertyFormData) => {
    updateMutation.mutate(data)
  }

  return (
    <div className="flex items-center gap-1">
      {/* Edit Button & Dialog */}
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        <Edit className="w-4 h-4" />
        Edit
      </Button>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gradient-authority">
              Edit Property
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Property Name</Label>
              <Input
                id="edit-name"
                {...form.register('name')}
                placeholder="e.g. Sunset Apartments"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                {...form.register('address')}
                placeholder="123 Main St"
              />
              {form.formState.errors.address && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.address.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label htmlFor="edit-city">City</Label>
                <Input id="edit-city" {...form.register('city')} />
                {form.formState.errors.city && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.city.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-state">State</Label>
                <Input id="edit-state" {...form.register('state')} />
                {form.formState.errors.state && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.state.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-zipCode">Zip Code</Label>
                <Input id="edit-zipCode" {...form.register('zipCode')} />
                {form.formState.errors.zipCode && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.zipCode.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-propertyType">Property Type</Label>
              <Select
                value={form.watch('propertyType')}
                onValueChange={(value) => form.setValue('propertyType', value as EditPropertyFormData['propertyType'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SINGLE_FAMILY">Single Family</SelectItem>
                  <SelectItem value="MULTI_UNIT">Multi Unit</SelectItem>
                  <SelectItem value="APARTMENT">Apartment</SelectItem>
                  <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                  <SelectItem value="CONDO">Condo</SelectItem>
                  <SelectItem value="TOWNHOUSE">Townhouse</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Updating...' : 'Update Property'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Button & Dialog */}
      <Button variant="outline" size="sm" onClick={() => setViewOpen(true)}>
        <Eye className="w-4 h-4" />
        View
      </Button>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              {property.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Property Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{property.address}</p>
                  <p className="text-sm text-muted-foreground">
                    {property.city}, {property.state} {property.zipCode}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Property Type</span>
                </div>
                <Badge variant="outline" className="capitalize">
                  {property.propertyType?.toLowerCase().replace('_', ' ')}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Created</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {property.createdAt
                    ? new Date(property.createdAt).toLocaleDateString()
                    : 'Unknown'
                  }
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Status</span>
                </div>
                <Badge
                  style={{
                    backgroundColor: 'var(--chart-1)',
                    color: 'hsl(var(--primary-foreground))'
                  }}
                >
                  Active
                </Badge>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setViewOpen(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setViewOpen(false)
                  setEditOpen(true)
                }}
              >
                Edit Property
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}