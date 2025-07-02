import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { queryKeys, handleApiError } from '../lib/utils'
import type {
  PaymentWithDetails,
  CreatePaymentDto,
  UpdatePaymentDto,
  PaymentQuery,
} from '../types/api'
import { toast } from 'sonner'

// Payments list hook
export function usePayments(query?: PaymentQuery) {
  return useQuery({
    queryKey: queryKeys.payments.list(query ? { ...query } : {}),
    queryFn: () => apiClient.payments.getAll(query as Record<string, unknown> | undefined),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: apiClient.auth.isAuthenticated(),
  })
}

// Payments by lease hook
export function usePaymentsByLease(leaseId: string) {
  return useQuery({
    queryKey: queryKeys.payments.list({ leaseId }),
    queryFn: () => apiClient.payments.getAll({ leaseId }),
    staleTime: 5 * 60 * 1000,
    enabled: !!leaseId && apiClient.auth.isAuthenticated(),
  })
}

// Single payment hook
export function usePayment(id: string) {
  return useQuery({
    queryKey: queryKeys.payments.detail(id),
    queryFn: () => apiClient.payments.getById(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id && apiClient.auth.isAuthenticated(),
  })
}

// Payment statistics hook
export function usePaymentStats() {
  return useQuery({
    queryKey: queryKeys.payments.stats(),
    queryFn: () => apiClient.payments.getStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: apiClient.auth.isAuthenticated(),
  })
}

// Create payment mutation
export function useCreatePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreatePaymentDto) => apiClient.payments.create(data),
    onSuccess: (newPayment: PaymentWithDetails) => {
      // Invalidate and refetch payments list
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.stats() })
      
      // Also invalidate lease-specific queries
      if (newPayment.leaseId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.payments.list({ leaseId: newPayment.leaseId })
        })
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.leases.detail(String(newPayment.leaseId))
        })
      }
      
      // Add the new payment to cache
      queryClient.setQueryData(
        queryKeys.payments.detail(newPayment.id),
        newPayment
      )
      
      toast.success('Payment created successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// Update payment mutation
export function useUpdatePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePaymentDto }) =>
      apiClient.payments.update(id, data),
    onSuccess: (updatedPayment: PaymentWithDetails) => {
      // Update the payment in cache
      queryClient.setQueryData(
        queryKeys.payments.detail(updatedPayment.id),
        updatedPayment
      )
      
      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.stats() })
      
      // Invalidate lease-specific data
      if (updatedPayment.leaseId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.payments.list({ leaseId: updatedPayment.leaseId })
        })
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.leases.detail(updatedPayment.leaseId)
        })
      }
      
      toast.success('Payment updated successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// Delete payment mutation
export function useDeletePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.payments.delete(id),
    onSuccess: (_, deletedId) => {
      // Remove payment from cache
      queryClient.removeQueries({ queryKey: queryKeys.payments.detail(deletedId) })
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.stats() })
      
      // Also invalidate related data
      queryClient.invalidateQueries({ queryKey: queryKeys.leases.lists() })
      
      toast.success('Payment deleted successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// Combined hook for payment management
export function usePaymentActions() {
  const createPayment = useCreatePayment()
  const updatePayment = useUpdatePayment()
  const deletePayment = useDeletePayment()

  return {
    create: createPayment,
    update: updatePayment,
    delete: deletePayment,
    isLoading:
      createPayment.isPending ||
      updatePayment.isPending ||
      deletePayment.isPending,
  }
}

// Hook for payment calculations and analysis
export function usePaymentCalculations(payments?: PaymentWithDetails[]) {
  return {
    totalAmount: payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0,
    
    averageAmount: payments?.length 
      ? payments.reduce((sum, payment) => sum + payment.amount, 0) / payments.length
      : 0,
    
    paymentsByType: payments?.reduce((acc, payment) => {
      acc[payment.type] = (acc[payment.type] || 0) + payment.amount
      return acc
    }, {} as Record<string, number>) || {},
    
    monthlyBreakdown: payments?.reduce((acc, payment) => {
      const monthKey = new Date(payment.date).toISOString().slice(0, 7) // YYYY-MM
      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey, amount: 0, count: 0 }
      }
      acc[monthKey].amount += payment.amount
      acc[monthKey].count += 1
      return acc
    }, {} as Record<string, { month: string; amount: number; count: number }>) || {},
    
    recentPayments: payments
      ?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      ?.slice(0, 10) || [],
  }
}