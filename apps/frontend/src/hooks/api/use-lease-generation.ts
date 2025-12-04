'use client'

import { handleMutationError } from '#lib/mutation-error-handler'
import { createClient } from '#utils/supabase/client'
import { apiRequest } from '#lib/api-request'


async function getAuthHeaders(): Promise<Record<string, string>> {
	const supabase = createClient()
	const { data: { session } } = await supabase.auth.getSession()
	return {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${session?.access_token}`
	}
}
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { logger } from '@repo/shared/lib/frontend-logger'
import type { LeaseGenerationFormData } from '@repo/shared/validation/lease-generation.schemas'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

/**
 * Query keys for lease generation
 */
export const leaseGenerationKeys = {
	all: ['lease-generation'] as const,
	autoFill: (property_id: string, unit_id: string, tenant_id: string) =>
		[...leaseGenerationKeys.all, 'auto-fill', property_id, unit_id, tenant_id] as const
}

/**
 * Hook to fetch auto-filled lease form data
 * property_id, unit_id, and tenant_id are all REQUIRED
 */
export function useLeaseAutoFill(property_id: string, unit_id: string, tenant_id: string) {
	return useQuery({
		queryKey: leaseGenerationKeys.autoFill(property_id, unit_id, tenant_id),
		queryFn: () =>
			apiRequest<Partial<LeaseGenerationFormData>>(
				`/api/v1/leases/auto-fill/${property_id}/${unit_id}/${tenant_id}`
			),
		enabled: !!property_id && !!unit_id && !!tenant_id,
		...QUERY_CACHE_TIMES.DETAIL
	})
}

/** PDF generation timeout in milliseconds */
const PDF_GENERATION_TIMEOUT_MS = 60000 // 1 minute for large documents

/**
 * Generate a safe filename from property address
 */
function generateSafeFilename(propertyAddress: string | undefined): string {
	const sanitizedAddress = (propertyAddress || 'property')
		.replace(/[^a-zA-Z0-9]/g, '-')
		.replace(/-+/g, '-')
		.slice(0, 50)
	const timestamp = Date.now()
	return `lease-${sanitizedAddress}-${timestamp}.pdf`
}

/**
 * Download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
	const url = window.URL.createObjectURL(blob)
	try {
		const anchor = document.createElement('a')
		anchor.href = url
		anchor.download = filename
		document.body.appendChild(anchor)
		anchor.click()
		document.body.removeChild(anchor)
	} finally {
		// Always revoke URL to prevent memory leaks
		window.URL.revokeObjectURL(url)
	}
}

/**
 * Hook to generate and download Texas lease PDF
 */
export function useGenerateLease() {
	return useMutation({
		mutationFn: async (data: LeaseGenerationFormData) => {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), PDF_GENERATION_TIMEOUT_MS)

			try {
				const headers = await getAuthHeaders()

				const response = await fetch(
					`${process.env.NEXT_PUBLIC_API_BASE_URL!}/api/v1/leases/generate`,
					{
						method: 'POST',
						headers,
						body: JSON.stringify(data),
						signal: controller.signal
					}
				)

				if (!response.ok) {
					const errorText = await response.text()
					throw new Error(`Failed to generate lease: ${response.status} ${errorText}`)
				}

				// Validate content-type before processing
				const contentType = response.headers.get('content-type')
				if (!contentType?.includes('application/pdf')) {
					throw new Error(`Invalid response type: expected PDF, got ${contentType}`)
				}

				const blob = await response.blob()
				const filename = generateSafeFilename(data.propertyAddress)
				downloadBlob(blob, filename)

				return { success: true, filename }
			} catch (error) {
				// Re-throw with user-friendly message for timeout
				if (error instanceof Error && error.name === 'AbortError') {
					throw new Error('PDF generation timed out. Please try again.')
				}
				throw error
			} finally {
				clearTimeout(timeoutId)
			}
		},
		onSuccess: () => {
			toast.success('Lease generated and downloaded successfully')
			logger.info('Lease generated', { action: 'generate_lease' })
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
 */
export function useEmailLease() {
	return useMutation({
		mutationFn: async (data: LeaseGenerationFormData & { emailTo: string }) => {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), PDF_GENERATION_TIMEOUT_MS)

			try {
				const headers = await getAuthHeaders()

				const response = await fetch(
					`${process.env.NEXT_PUBLIC_API_BASE_URL!}/api/v1/leases/email`,
					{
						method: 'POST',
						headers,
						body: JSON.stringify(data),
						signal: controller.signal
					}
				)

				if (!response.ok) {
					const errorText = await response.text()
					throw new Error(`Failed to email lease: ${response.status} ${errorText}`)
				}

				const result = (await response.json()) as { success: boolean }
				return { success: result?.success ?? true }
			} catch (error) {
				if (error instanceof Error && error.name === 'AbortError') {
					throw new Error('Email request timed out. Please try again.')
				}
				throw error
			} finally {
				clearTimeout(timeoutId)
			}
		},
		onSuccess: (_data, variables) => {
			toast.success(`Lease sent to ${variables.emailTo}`)
			logger.info('Lease emailed', {
				action: 'email_lease',
				metadata: { emailTo: variables.emailTo }
			})
		},
		onError: error => {
			logger.error('Error generating lease for email', {
				action: 'email_lease_error',
				metadata: { error: String(error) }
			})
			handleMutationError(error, 'Email lease')
		}
	})
}
