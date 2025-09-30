'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Eye, Edit, Building, MapPin, Calendar, DollarSign, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { propertiesApi } from '@/lib/api-client'
import { toast } from 'sonner'
import type { Tables, TablesUpdate } from '@repo/shared/types/supabase'
import { propertyUpdateSchema, type PropertyUpdate as PropertyUpdateType } from '@repo/shared/validation/properties'
import { createLogger } from '@repo/shared/lib/frontend-logger'

type Property = Tables<'Property'>
type PropertyUpdate = TablesUpdate<'Property'>

interface PropertyActionsProps {
  property: Property
}

export function PropertyEditViewButtons({ property }: PropertyActionsProps) {
  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const queryClient = useQueryClient()
  const logger = createLogger({ component: 'PropertyEditViewButtons' })

  const form = useForm<PropertyUpdateType>({
    resolver: zodResolver(propertyUpdateSchema),
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
    mutationFn: (data: PropertyUpdateType) => propertiesApi.update(property.id, data as PropertyUpdate),
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

  const deleteMutation = useMutation({
    mutationFn: () => propertiesApi.remove(property.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      toast.success('Property deleted successfully')
    },
    onError: (error) => {
      toast.error('Failed to delete property')
      logger.error('Failed to delete property', { action: 'deleteProperty' }, error)
    },
    meta: {
      operation: 'delete',
      entityType: 'property'
    }
  })

  const onSubmit = (data: PropertyUpdateType) => {
    updateMutation.mutate(data)
  }

  return (
    <div className="flex items-center gap-1">
      {/* View Button & Dialog */}
      <Button variant="outline" size="sm" onClick={() => setViewOpen(true)}>
        <Eye className="w-4 h-4" />
        View
      </Button>

      {/* Edit Button & Dialog */}
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        <Edit className="w-4 h-4" />
        Edit
      </Button>

      {/* Delete Button & Dialog */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{property.name}"? This action cannot be undone and will remove all associated data including units, leases, and maintenance records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Property'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gradient">
              Edit Property
            </DialogTitle>
            <DialogDescription>
              Update property information including name, address, and property type.
            </DialogDescription>
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
                onValueChange={(value) => form.setValue('propertyType', value as PropertyUpdateType['propertyType'])}
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
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              {property.name}
            </DialogTitle>
            <DialogDescription>
              View detailed property information including location, type, and status.
            </DialogDescription>
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