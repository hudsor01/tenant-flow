'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { maintenanceApi, propertiesApi, unitsApi } from '@/lib/api-client'
import { toast } from 'sonner'
import { maintenanceRequestInputSchema, type MaintenanceRequestInput } from '@repo/shared/validation'

export function CreateMaintenanceDialog() {
  const [open, setOpen] = useState(false)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const queryClient = useQueryClient()

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertiesApi.list()
  })

  const { data: units = [] } = useQuery({
    queryKey: ['units', selectedPropertyId],
    queryFn: () => unitsApi.list(),
    enabled: !!selectedPropertyId
  })

  const form = useForm({
    resolver: zodResolver(maintenanceRequestInputSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'MEDIUM',
      category: '',
      unitId: '',
      assignedTo: undefined,
      estimatedCost: undefined,
      photos: [],
      notes: undefined,
      preferredDate: undefined,
      allowEntry: false
    }
  })

  const createMutation = useMutation({
    mutationFn: maintenanceApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] })
      queryClient.invalidateQueries({ queryKey: ['maintenance-stats'] })
      toast.success('Maintenance request created successfully')
      setOpen(false)
      form.reset()
    },
    onError: (error) => {
      toast.error(`Failed to create request: ${error.message}`)
    }
  })

  const onSubmit = (data: MaintenanceRequestInput) => {
    const requestData = {
      ...data,
      photos: data.photos || [],
      preferredDate: data.preferredDate
    }
    createMutation.mutate(requestData as MaintenanceRequestInput)
  }

  const categories = [
    'Plumbing',
    'Electrical',
    'HVAC',
    'Appliances',
    'Flooring',
    'Painting',
    'Cleaning',
    'Landscaping',
    'Security',
    'Other'
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="size-4" />
          New Request
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Maintenance Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((data) => onSubmit(data as MaintenanceRequestInput))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="propertyId">Property</Label>
            <Select
              value={selectedPropertyId}
              onValueChange={setSelectedPropertyId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPropertyId && units.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="unitId">Unit (Optional)</Label>
              <Controller
                name="unitId"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          Unit {unit.unitNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              {...form.register('title')}
              placeholder="Kitchen faucet leak"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Detailed description of the maintenance issue..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Controller
                name="category"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Controller
                name="priority"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="EMERGENCY">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedCost">Estimated Cost (Optional)</Label>
            <Input
              id="estimatedCost"
              type="number"
              {...form.register('estimatedCost', { valueAsNumber: true })}
              placeholder="250"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredDate">Preferred Date (Optional)</Label>
            <Input
              id="preferredDate"
              type="date"
              {...form.register('preferredDate')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="allowEntry" className="flex items-center gap-2">
              <input
                id="allowEntry"
                type="checkbox"
                {...form.register('allowEntry')}
                className="rounded border border-input"
              />
              Allow entry when tenant is not present
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
