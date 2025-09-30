'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Eye, Edit, Trash2, Send, Mail, Phone, Building, MapPin, Calendar, DollarSign } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantsApi } from '@/lib/api-client'
import { toast } from 'sonner'
import { tenantUpdateSchema, type TenantUpdate } from '@repo/shared/validation/tenants'
import type { TenantWithLeaseInfo } from '@repo/shared/types/relations'

interface TenantActionButtonsProps {
  tenant: TenantWithLeaseInfo
}

export function TenantActionButtons({ tenant }: TenantActionButtonsProps) {
  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<TenantUpdate>({
    resolver: zodResolver(tenantUpdateSchema),
    defaultValues: {
      firstName: tenant.name?.split(' ')[0] || '',
      lastName: tenant.name?.split(' ').slice(1).join(' ') || '',
      email: tenant.email || '',
      phone: tenant.phone || '',
      emergencyContact: tenant.emergencyContact || ''
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data: TenantUpdate) => tenantsApi.update(tenant.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      toast.success('Tenant updated successfully')
      setEditOpen(false)
    },
    onError: (error) => {
      toast.error(`Failed to update tenant: ${error.message}`)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: () => tenantsApi.remove(tenant.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['tenant-stats'] })
      toast.success('Tenant deleted successfully')
    },
    onError: (error) => {
      toast.error(`Failed to delete tenant: ${error.message}`)
    }
  })

  const inviteMutation = useMutation({
    mutationFn: () =>
      fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/tenants/${tenant.id}/invite`, {
        method: 'POST'
      }),
    onSuccess: () => {
      toast.success('Invitation sent successfully')
    },
    onError: () => {
      toast.error('Failed to send invitation')
    }
  })

  const onSubmit = (data: TenantUpdate) => {
    updateMutation.mutate(data)
  }

  return (
    <div className="flex items-center gap-1">
      {/* Edit Button & Dialog */}
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        <Edit className="w-4 h-4" />
      </Button>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>
              Update tenant information including contact details and emergency contacts.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-firstName">First Name</Label>
              <Input
                id="edit-firstName"
                {...form.register('firstName')}
                placeholder="John"
              />
              {form.formState.errors.firstName && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.firstName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-lastName">Last Name</Label>
              <Input
                id="edit-lastName"
                {...form.register('lastName')}
                placeholder="Smith"
              />
              {form.formState.errors.lastName && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.lastName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                {...form.register('email')}
                placeholder="john@example.com"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone (Optional)</Label>
              <Input
                id="edit-phone"
                {...form.register('phone')}
                placeholder="(555) 123-4567"
              />
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
                {updateMutation.isPending ? 'Updating...' : 'Update Tenant'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Button & Dialog */}
      <Button variant="outline" size="sm" onClick={() => setViewOpen(true)}>
        <Eye className="w-4 h-4" />
      </Button>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-semibold text-primary">
                  {(tenant.name || '').split(' ').map((n: string) => n[0]).join('')}
                </span>
              </div>
              {tenant.name}
            </DialogTitle>
            <DialogDescription>
              View complete tenant information including contact details, property, and lease information.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                Contact Information
              </h3>

              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{tenant.email}</p>
                </div>
              </div>

              {tenant.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{tenant.phone}</p>
                  </div>
                </div>
              )}

              {tenant.emergencyContact && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Emergency Contact</p>
                    <p className="text-sm text-muted-foreground">{tenant.emergencyContact}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Property & Lease Information */}
            {tenant.property && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Property Information
                </h3>

                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{tenant.property.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {tenant.property.address}, {tenant.property.city}, {tenant.property.state}
                    </p>
                  </div>
                </div>

                {tenant.unit && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Unit {tenant.unit.unitNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {tenant.unit.bedrooms} bed, {tenant.unit.bathrooms} bath
                        {tenant.unit.squareFootage && ` • ${tenant.unit.squareFootage} sq ft`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Lease Information */}
            {tenant.currentLease && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Lease Information
                </h3>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Monthly Rent</span>
                  </div>
                  <span className="font-semibold">
                    ${tenant.currentLease.rentAmount.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Lease Period</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(tenant.currentLease.startDate).toLocaleDateString()} - {' '}
                    {new Date(tenant.currentLease.endDate).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Status</span>
                  </div>
                  <Badge
                    style={{
                      backgroundColor: tenant.currentLease.status === 'active' ? 'var(--chart-1)' : 'var(--chart-5)',
                      color: 'hsl(var(--primary-foreground))'
                    }}
                  >
                    {tenant.currentLease.status}
                  </Badge>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between pt-4 border-t gap-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => inviteMutation.mutate()}
                  disabled={inviteMutation.isPending}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Invite
                </Button>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setViewOpen(false)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setViewOpen(false)
                    setEditOpen(true)
                  }}
                >
                  Edit Tenant
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          if (confirm(`Are you sure you want to delete ${tenant.name}? This action cannot be undone.`)) {
            deleteMutation.mutate()
          }
        }}
        disabled={deleteMutation.isPending}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  )
}