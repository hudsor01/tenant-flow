import { useMutation, useQuery } from '@tanstack/react-query'
import type { LeaseFormData } from '@repo/shared'
import type { LeaseGenerationResponse, LeaseValidationResponse } from '@/lib/api/lease-api';
import { generateLease, validateLease } from '@/lib/api/lease-api'
import { toast } from 'sonner'

/**
 * Mutation hook for generating lease agreements
 */
export function useGenerateLease() {
  return useMutation<LeaseGenerationResponse, Error, LeaseFormData>({
    mutationFn: generateLease,
    onSuccess: () => {
      toast.success('Lease agreement generated successfully!')
    },
    onError: (error) => {
      console.error('Error generating lease:', error)
      toast.error(error.message || 'Failed to generate lease agreement')
    },
  })
}

/**
 * Query hook for validating lease data
 * This will run automatically when leaseData or state changes
 */
export function useValidateLease(leaseData: LeaseFormData | null, enabled = true) {
  return useQuery<LeaseValidationResponse, Error>({
    queryKey: ['validate-lease', leaseData?.property?.address?.state, leaseData],
    queryFn: () => {
      if (!leaseData) throw new Error('No lease data provided')
      return validateLease(leaseData)
    },
    enabled: enabled && !!leaseData?.property?.address?.state,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  })
}

/**
 * Mutation hook for validating lease data on demand
 */
export function useValidateLeaseOnDemand() {
  return useMutation<LeaseValidationResponse, Error, LeaseFormData>({
    mutationFn: validateLease,
    onError: (error) => {
      console.error('Error validating lease:', error)
      toast.error(error.message || 'Failed to validate lease data')
    },
  })
}