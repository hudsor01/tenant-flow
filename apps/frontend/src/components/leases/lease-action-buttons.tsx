'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Edit, Eye, RotateCcw, Calendar, DollarSign, FileText, Building, Users } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import { leasesApi } from '@/lib/api-client'
import { toast } from 'sonner'
import type { Tables } from '@repo/shared'
import { leaseUpdateSchema, type LeaseUpdate } from '@repo/shared/validation/leases'

type Lease = Tables<'Lease'>

interface LeaseActionButtonsProps {
  lease: Lease
}

export function LeaseActionButtons({ lease }: LeaseActionButtonsProps) {
  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [renewOpen, setRenewOpen] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm({
    defaultValues: {
      startDate: lease.startDate,
      endDate: lease.endDate,
      rentAmount: lease.rentAmount,
      securityDeposit: lease.securityDeposit,
      terms: lease.terms || ''
    },
    onSubmit: async ({ value }) => {
      updateMutation.mutate(value)
    },
    validators: {
      onChange: ({ value }) => {
        const result = leaseUpdateSchema.safeParse(value)
        if (!result.success) {
          return result.error.format()
        }
        return undefined
      }
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data: LeaseUpdate) =>
      leasesApi.updateLeaseWithFinancialCalculations(lease.id, {
        ...data,
        status: data.status as Tables<'Lease'>['status']
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] })
      toast.success('Lease updated successfully')
      setEditOpen(false)
    },
    onError: (error) => {
      toast.error(`Failed to update lease: ${error.message}`)
    }
  })

  const renewMutation = useMutation({
    mutationFn: (data: { endDate: string; rentAmount: number }) => {
      const currentEndDate = new Date(lease.endDate)
      const newEndDate = new Date(data.endDate)

      return leasesApi.updateLeaseWithFinancialCalculations(lease.id, {
        endDate: data.endDate,
        rentAmount: data.rentAmount,
        terms: `${lease.terms || ''}\n\nRenewed on ${new Date().toLocaleDateString()} - Extended from ${currentEndDate.toLocaleDateString()} to ${newEndDate.toLocaleDateString()}`
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] })
      queryClient.invalidateQueries({ queryKey: ['lease-stats'] })
      toast.success('Lease renewed successfully')
      setRenewOpen(false)
    },
    onError: (error) => {
      toast.error(`Failed to renew lease: ${error.message}`)
    }
  })

  const terminateMutation = useMutation({
    mutationFn: () => leasesApi.terminateLeaseWithFinancialCalculations(lease.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] })
      queryClient.invalidateQueries({ queryKey: ['lease-stats'] })
      toast.success('Lease terminated successfully')
    },
    onError: (error) => {
      toast.error(`Failed to terminate lease: ${error.message}`)
    }
  })


  const handleRenew = (data: { endDate: string; rentAmount: number }) => {
    renewMutation.mutate(data)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="flex items-center gap-1">
      {/* Edit Button & Dialog */}
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        <Edit className="w-4 h-4" />
      </Button>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Lease Agreement</DialogTitle>
            <DialogDescription>
              Update lease terms including dates, rent amount, and conditions.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={e => {
              e.preventDefault()
              form.handleSubmit()
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <form.Field name="startDate">
                {field => (
                  <div className="space-y-2">
                    <Label htmlFor="edit-startDate">Start Date</Label>
                    <Input
                      id="edit-startDate"
                      type="date"
                      value={field.state.value}
                      onChange={e => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors?.length ? (
                      <p className="text-sm text-destructive">
                        {String(field.state.meta.errors[0])}
                      </p>
                    ) : null}
                  </div>
                )}
              </form.Field>

              <form.Field name="endDate">
                {field => (
                  <div className="space-y-2">
                    <Label htmlFor="edit-endDate">End Date</Label>
                    <Input
                      id="edit-endDate"
                      type="date"
                      value={field.state.value}
                      onChange={e => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors?.length ? (
                      <p className="text-sm text-destructive">
                        {String(field.state.meta.errors[0])}
                      </p>
                    ) : null}
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="rentAmount">
                {field => (
                  <div className="space-y-2">
                    <Label htmlFor="edit-rentAmount">Monthly Rent</Label>
                    <Input
                      id="edit-rentAmount"
                      type="number"
                      value={field.state.value}
                      onChange={e => field.handleChange(Number(e.target.value))}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors?.length ? (
                      <p className="text-sm text-destructive">
                        {String(field.state.meta.errors[0])}
                      </p>
                    ) : null}
                  </div>
                )}
              </form.Field>

              <form.Field name="securityDeposit">
                {field => (
                  <div className="space-y-2">
                    <Label htmlFor="edit-securityDeposit">Security Deposit</Label>
                    <Input
                      id="edit-securityDeposit"
                      type="number"
                      value={field.state.value}
                      onChange={e => field.handleChange(Number(e.target.value))}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors?.length ? (
                      <p className="text-sm text-destructive">
                        {String(field.state.meta.errors[0])}
                      </p>
                    ) : null}
                  </div>
                )}
              </form.Field>
            </div>

            <form.Field name="terms">
              {field => (
                <div className="space-y-2">
                  <Label htmlFor="edit-terms">Terms & Conditions</Label>
                  <Textarea
                    id="edit-terms"
                    value={field.state.value}
                    onChange={e => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    rows={3}
                  />
                  {field.state.meta.errors?.length ? (
                    <p className="text-sm text-destructive">
                      {String(field.state.meta.errors[0])}
                    </p>
                  ) : null}
                </div>
              )}
            </form.Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Updating...' : 'Update Lease'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Renew Button & Dialog */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setRenewOpen(true)}
        disabled={lease.status !== 'ACTIVE'}
      >
        <RotateCcw className="w-4 h-4" />
      </Button>

      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renew Lease Agreement</DialogTitle>
            <DialogDescription>
              Extend the lease period and update rental terms for the tenant.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.target as HTMLFormElement)
            handleRenew({
              endDate: formData.get('newEndDate') as string,
              rentAmount: Number(formData.get('newRentAmount'))
            })
          }} className="space-y-4">
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Current Lease</p>
                <p className="text-sm text-muted-foreground">
                  Expires: {new Date(lease.endDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Rent: {formatCurrency(lease.rentAmount)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newEndDate">New End Date</Label>
                <Input
                  id="newEndDate"
                  name="newEndDate"
                  type="date"
                  required
                  min={lease.endDate}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newRentAmount">New Monthly Rent</Label>
                <Input
                  id="newRentAmount"
                  name="newRentAmount"
                  type="number"
                  required
                  defaultValue={lease.rentAmount}
                  min="1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenewOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={renewMutation.isPending}>
                {renewMutation.isPending ? 'Renewing...' : 'Renew Lease'}
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
              <FileText className="w-5 h-5" />
              Lease Agreement
            </DialogTitle>
            <DialogDescription>
              View complete lease agreement details including terms, financial information, and status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Lease Information */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Lease Period</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(lease.startDate).toLocaleDateString()} - {' '}
                  {new Date(lease.endDate).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Monthly Rent</span>
                </div>
                <span className="font-semibold">
                  {formatCurrency(lease.rentAmount)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Security Deposit</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatCurrency(lease.securityDeposit)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status</span>
                </div>
                <Badge
                  style={{
                    backgroundColor: lease.status === 'ACTIVE' ? 'var(--chart-1)' : 'var(--chart-5)',
                    color: 'hsl(var(--primary-foreground))'
                  }}
                >
                  {lease.status}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Tenant ID</span>
                </div>
                <span className="text-sm text-muted-foreground font-mono">
                  {lease.tenantId}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Unit ID</span>
                </div>
                <span className="text-sm text-muted-foreground font-mono">
                  {lease.unitId}
                </span>
              </div>
            </div>

            {/* Terms & Conditions */}
            {lease.terms && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Terms & Conditions
                </h3>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{lease.terms}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between pt-4 border-t gap-2">
              <div className="flex gap-2">
                {lease.status === 'ACTIVE' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm('Are you sure you want to terminate this lease? This action cannot be undone.')) {
                        terminateMutation.mutate()
                        setViewOpen(false)
                      }
                    }}
                    disabled={terminateMutation.isPending}
                  >
                    Terminate Lease
                  </Button>
                )}
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
                  Edit Lease
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}