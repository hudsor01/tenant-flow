'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CreditCard } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tenantsApi } from '@/lib/api-client'
import { toast } from 'sonner'

const rentPaymentSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  dueDate: z.string().min(1, 'Due date is required'),
  description: z.string().optional()
})

type RentPaymentFormData = z.infer<typeof rentPaymentSchema>

export function RentCollectionDialog() {
  const [open, setOpen] = useState(false)
  const _queryClient = useQueryClient()

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => tenantsApi.list()
  })

  const form = useForm<RentPaymentFormData>({
    resolver: zodResolver(rentPaymentSchema),
    defaultValues: {
      tenantId: '',
      amount: 0,
      dueDate: '',
      description: ''
    }
  })

  const createPaymentMutation = useMutation({
    mutationFn: async (_data: RentPaymentFormData) => {
      // TODO: Implement payments controller in NestJS backend
      // Backend needs: apps/backend/src/payments/payments.controller.ts
      // Route should be: ${API_BASE_URL}/api/v1/payments/create-rent-payment
      toast.info('Payment collection feature coming soon!')
      return Promise.resolve({ success: false })
    },
    onSuccess: () => {
      setOpen(false)
      form.reset()
    },
    onError: (error) => {
      toast.error(`Failed to create payment: ${error.message}`)
    }
  })

  const onSubmit = (data: RentPaymentFormData) => {
    createPaymentMutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <CreditCard className="size-4" />
          Collect Rent
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Rent Payment Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenantId">Tenant</Label>
            <Controller
              name="tenantId"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name} - Unit {tenant.unit?.unitNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              {...form.register('amount', { valueAsNumber: true })}
              placeholder="2500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              {...form.register('dueDate')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              {...form.register('description')}
              placeholder="Monthly rent for January 2025"
            />
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
              disabled={createPaymentMutation.isPending}
            >
              {createPaymentMutation.isPending ? 'Creating...' : 'Send Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
