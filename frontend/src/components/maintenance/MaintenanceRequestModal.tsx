import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Wrench, Home, AlertTriangle, FileText, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useQuery } from '@tanstack/react-query'
import { useSendMaintenanceNotification, createMaintenanceNotification, getNotificationType } from '@/hooks/useMaintenanceNotifications'

// Form validation schema
const maintenanceRequestSchema = z.object({
  unitId: z.string().min(1, 'Please select a unit'),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(10, 'Please provide a detailed description').max(1000, 'Description must be less than 1000 characters'),
  category: z.enum(['plumbing', 'electrical', 'hvac', 'appliances', 'structural', 'landscaping', 'security', 'cleaning', 'pest_control', 'other']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']),
})

interface MaintenanceRequestModalProps {
  isOpen: boolean
  onClose: () => void
}

type MaintenanceRequestFormData = z.infer<typeof maintenanceRequestSchema>

export default function MaintenanceRequestModal({ isOpen, onClose }: MaintenanceRequestModalProps) {
  const { user } = useAuthStore()
  const sendNotification = useSendMaintenanceNotification()
  
  // Get all units from all user properties
  const { data: allUnits = [] } = useQuery({
    queryKey: ['all-units', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      
      const { data, error } = await supabase
        .from('Unit')
        .select(`
          id,
          unitNumber,
          property:Property!inner (
            id,
            name,
            address,
            ownerId,
            owner:User!inner (
              id,
              name,
              email
            )
          )
        `)
        .eq('property.ownerId', user.id)
        
      if (error) throw error
      return data || []
    },
    enabled: !!user?.id,
  })
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MaintenanceRequestFormData>({
    resolver: zodResolver(maintenanceRequestSchema),
    defaultValues: {
      category: 'other',
      priority: 'MEDIUM',
    },
  })

  const selectedUnitId = watch('unitId')

  const onSubmit = async (data: MaintenanceRequestFormData) => {
    try {
      // Create the maintenance request
      const { data: newRequest, error } = await supabase
        .from('MaintenanceRequest')
        .insert({
          unitId: data.unitId,
          title: data.title,
          description: data.description,
          category: data.category,
          priority: data.priority,
          status: 'OPEN',
        })
        .select(`
          *,
          unit:Unit!inner (
            unitNumber,
            property:Property!inner (
              name,
              address,
              owner:User!inner (
                name,
                email
              )
            )
          )
        `)
        .single()

      if (error) throw error

      // Find the selected unit data for property owner info
      const selectedUnit = allUnits.find(unit => unit.id === data.unitId)
      if (selectedUnit && newRequest) {
        // Send notification to property owner
        const notificationType = getNotificationType(data.priority, true)
        const actionUrl = `${window.location.origin}/maintenance`
        
        const notificationRequest = createMaintenanceNotification(
          {
            ...newRequest,
            unit: {
              unitNumber: selectedUnit.unitNumber,
              property: {
                name: selectedUnit.property.name,
                address: selectedUnit.property.address
              }
            }
          },
          {
            email: selectedUnit.property.owner.email,
            name: selectedUnit.property.owner.name,
            role: 'owner'
          },
          notificationType,
          actionUrl
        )

        // Send notification (don't block the UI if it fails)
        sendNotification.mutate(notificationRequest)
      }

      toast.success('Maintenance request created successfully!')
      handleClose()
    } catch (error) {
      logger.error('Error creating maintenance request', error as Error, { 
        unitId: data.unitId,
        category: data.category,
        priority: data.priority 
      })
      toast.error('Failed to create maintenance request')
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }


  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center">
            <Wrench className="mr-2 h-6 w-6 text-primary" />
            New Maintenance Request
          </DialogTitle>
          <DialogDescription>
            Report a maintenance issue for one of your properties
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Unit Selection */}
          <div className="space-y-2">
            <Label htmlFor="unitId">Property & Unit</Label>
            <Select
              value={selectedUnitId}
              onValueChange={(value) => setValue('unitId', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a property and unit" />
              </SelectTrigger>
              <SelectContent>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {allUnits.map((unit: any) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    <div className="flex items-center">
                      <Home className="mr-2 h-4 w-4" />
                      {unit.property?.name || 'Unknown Property'} - Unit {unit.unitNumber}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.unitId && (
              <p className="text-sm text-destructive">{errors.unitId.message}</p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Issue Title</Label>
            <Input
              id="title"
              placeholder="Brief description of the issue"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={watch('category')}
              onValueChange={(value) => setValue('category', value as 'plumbing' | 'electrical' | 'hvac' | 'appliances' | 'structural' | 'landscaping' | 'security' | 'cleaning' | 'pest_control' | 'other')}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plumbing">🚰 Plumbing</SelectItem>
                <SelectItem value="electrical">⚡ Electrical</SelectItem>
                <SelectItem value="hvac">❄️ HVAC</SelectItem>
                <SelectItem value="appliances">🏠 Appliances</SelectItem>
                <SelectItem value="structural">🏗️ Structural</SelectItem>
                <SelectItem value="landscaping">🌳 Landscaping</SelectItem>
                <SelectItem value="security">🔒 Security</SelectItem>
                <SelectItem value="cleaning">🧹 Cleaning</SelectItem>
                <SelectItem value="pest_control">🐛 Pest Control</SelectItem>
                <SelectItem value="other">📝 Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category.message}</p>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={watch('priority')}
              onValueChange={(value) => setValue('priority', value as 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY')}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select priority level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                    Low - Can wait a few days
                  </div>
                </SelectItem>
                <SelectItem value="MEDIUM">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2" />
                    Medium - Address soon
                  </div>
                </SelectItem>
                <SelectItem value="HIGH">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-2" />
                    High - Needs quick attention
                  </div>
                </SelectItem>
                <SelectItem value="EMERGENCY">
                  <div className="flex items-center">
                    <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />
                    Emergency - Immediate attention
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.priority && (
              <p className="text-sm text-destructive">{errors.priority.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Detailed Description</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea
                id="description"
                className="pl-10 min-h-[120px]"
                placeholder="Please provide details about the issue, when it started, and any relevant information..."
                {...register('description')}
              />
            </div>
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Create Request
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}