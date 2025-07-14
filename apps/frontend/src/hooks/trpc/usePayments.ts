import { trpc } from '@/lib/trpcClient'
import type {
  CreatePaymentSchema,
  UpdatePaymentSchema,
  PaymentQuerySchema,
  CreateStripePaymentSchema
} from '@/types/payments'

// Payments queries
export function usePayments(query?: PaymentQuerySchema) {
  return trpc.payments.list.useQuery(query || {})
}

export function usePayment(id: string) {
  return trpc.payments.byId.useQuery({ id })
}

export function usePaymentStats() {
  return trpc.payments.stats.useQuery()
}

// Payments mutations
export function useCreatePayment() {
  const utils = trpc.useUtils()
  
  return trpc.payments.create.useMutation({
    onSuccess: () => {
      utils.payments.list.invalidate()
      utils.payments.stats.invalidate()
    },
  })
}

export function useUpdatePayment() {
  const utils = trpc.useUtils()
  
  return trpc.payments.update.useMutation({
    onSuccess: (updatedPayment) => {
      utils.payments.byId.setData({ id: updatedPayment.id }, updatedPayment)
      utils.payments.list.invalidate()
      utils.payments.stats.invalidate()
    },
  })
}

export function useDeletePayment() {
  const utils = trpc.useUtils()
  
  return trpc.payments.delete.useMutation({
    onSuccess: () => {
      utils.payments.list.invalidate()
      utils.payments.stats.invalidate()
    },
  })
}

// Stripe integration
export function useCreateStripePayment() {
  const utils = trpc.useUtils()
  
  return trpc.payments.createStripePayment.useMutation({
    onSuccess: () => {
      utils.payments.list.invalidate()
      utils.payments.stats.invalidate()
    },
  })
}

export function useGenerateReceipt() {
  return trpc.payments.generateReceipt.useMutation()
}

// Advanced payment queries with filters
export function usePaymentsByLease(leaseId: string) {
  return usePayments({ leaseId })
}

export function usePaymentsByProperty(propertyId: string) {
  return usePayments({ propertyId })
}

export function useOverduePayments() {
  return usePayments({ 
    status: 'PENDING',
    endDate: new Date().toISOString() // Only past due dates
  })
}

// Payment analytics
export function usePaymentTrends() {
  return trpc.payments.stats.useQuery(undefined, {
    select: (data) => ({
      ...data,
      // Transform data for charts
      collectionRatePercent: Math.round(data.collectionRate * 100) / 100,
      overduePercent: data.totalAmount > 0 
        ? Math.round((data.overdueAmount / data.totalAmount) * 100) 
        : 0,
    }),
  })
}