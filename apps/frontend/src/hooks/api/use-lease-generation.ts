'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { clientFetch, getAuthHeaders } from '#lib/api/client'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type { LeaseGenerationFormData } from '@repo/shared/validation/lease-generation.schemas'
import { toast } from 'sonner'
import { logger } from '@repo/shared/lib/frontend-logger'
import { handleMutationError } from '#lib/mutation-error-handler'
import { env } from '#config/env'

/**
 * Query keys for lease generation
 */
export const leaseGenerationKeys = {
	all: ['lease-generation'] as const,
	autoFill: (propertyId: string, unitId: string, tenantId: string) =>
		[...leaseGenerationKeys.all, 'auto-fill', propertyId, unitId, tenantId] as const
}

/**
 * Hook to fetch auto-filled lease form data
 * propertyId, unitId, and tenantId are all REQUIRED
 */
export function useLeaseAutoFill(propertyId: string, unitId: string, tenantId: string) {
	return useQuery({
		queryKey: leaseGenerationKeys.autoFill(propertyId, unitId, tenantId),
		queryFn: () =>
			clientFetch<Partial<LeaseGenerationFormData>>(
				`/api/v1/leases/auto-fill/${propertyId}/${unitId}/${tenantId}`
			),
		enabled: !!propertyId && !!unitId && !!tenantId,
		...QUERY_CACHE_TIMES.DETAIL
	})
}

/**
 * Hook to generate and download Texas lease PDF
 */
export function useGenerateLease() {
	return useMutation({
		mutationFn: async (data: LeaseGenerationFormData) => {
			// Get auth headers for authenticated request
			const headers = await getAuthHeaders()

			const response = await fetch(
				`${env.NEXT_PUBLIC_API_BASE_URL}/api/v1/leases/generate`,
				{
					method: 'POST',
					headers,
					body: JSON.stringify(data)
				}
			)

			if (!response.ok) {
				const errorText = await response.text()
				throw new Error(`Failed to generate lease: ${response.status} ${errorText}`)
			}

			// SECURITY: Validate content-type before processing
			const contentType = response.headers.get('content-type')
			if (!contentType?.includes('application/pdf')) {
				throw new Error(`Invalid response type: expected PDF, got ${contentType}`)
			}

			// Get the PDF blob
			const blob = await response.blob()

			// Generate safe filename (handle empty propertyAddress)
			const sanitizedAddress = (data.propertyAddress || 'property')
				.replace(/[^a-zA-Z0-9]/g, '-')
				.replace(/-+/g, '-')
				.slice(0, 50) // Limit length
			const timestamp = Date.now()
			const filename = `lease-${sanitizedAddress}-${timestamp}.pdf`

			// Create download link with proper cleanup
			const url = window.URL.createObjectURL(blob)
			try {
				const a = document.createElement('a')
				a.href = url
				a.download = filename
				document.body.appendChild(a)
				a.click()
				document.body.removeChild(a)
			} finally {
				// MEMORY LEAK FIX: Always revoke URL even if error occurs
				window.URL.revokeObjectURL(url)
			}

			return { success: true, filename }
		},
		onSuccess: () => {
			toast.success('Lease generated and downloaded successfully')
			logger.info('Lease generated', {
				action: 'generate_lease'
			})
		},
		onError: error => {
			logger.error('Error generating lease', {
				action: 'generate_lease_error',
				metadata: { error: String(error) }
			})
			handleMutationError(error, 'Generate lease')
		}
	})
}

/**
 * Hook to generate and email Texas lease PDF
 * TODO: Implement proper email endpoint
 */
export function useEmailLease() {
	return useMutation({
		mutationFn: async (data: LeaseGenerationFormData & { emailTo: string }) => {
			// Get auth headers for authenticated request
			const headers = await getAuthHeaders()

			const response = await fetch(
				`${env.NEXT_PUBLIC_API_BASE_URL}/api/v1/leases/generate`,
				{
					method: 'POST',
					headers,
					body: JSON.stringify(data)
				}
			)

			if (!response.ok) {
				const errorText = await response.text()
				throw new Error(`Failed to generate lease: ${response.status} ${errorText}`)
			}

			const blob = await response.blob()
			return { success: true, blob }
		},
		onSuccess: () => {
			toast.success('Lease generated - email functionality coming soon')
		},
		onError: error => {
			logger.error('Error generating lease for email', {
				action: 'email_lease_error',
				metadata: { error: String(error) }
			})
			handleMutationError(error, 'Generate lease for email')
		}
	})
}
