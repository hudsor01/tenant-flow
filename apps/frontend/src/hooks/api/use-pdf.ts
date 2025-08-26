/**
 * React Query hooks for PDF Generation
 * Native TanStack Query implementation - connects to backend PDF endpoints
 */
import {
	useQuery,
	useMutation,
	type UseQueryResult,
	type UseMutationResult
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { pdfApi, pdfKeys } from '@/lib/api/pdf'

/**
 * Check PDF service health
 */
export function usePDFHealth(): UseQueryResult<{
	status: string
	timestamp: string
	message?: string
}> {
	return useQuery({
		queryKey: pdfKeys.health(),
		queryFn: () => pdfApi.checkHealth(),
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 5 * 60 * 1000, // 5 minutes
		retry: 2
	})
}

/**
 * Generate lease PDF mutation
 */
export function useGenerateLeasePDF(): UseMutationResult<
	{
		success: boolean
		pdfUrl?: string
		downloadUrl?: string
		message?: string
		fileName?: string
	},
	Error,
	string
> {
	return useMutation({
		mutationFn: (leaseId: string) => pdfApi.generateLeasePDF(leaseId),
		onSuccess: data => {
			if (data.success) {
				toast.success('Lease PDF generated successfully!')
				// Auto-download if URL is provided
				if (data.downloadUrl) {
					window.open(data.downloadUrl, '_blank')
				}
			} else {
				toast.warning(data.message || 'PDF generation failed')
			}
		},
		onError: (error: Error) => {
			toast.error(`PDF generation failed: ${error.message}`)
		}
	})
}

/**
 * Generate property report PDF mutation
 */
export function useGeneratePropertyReportPDF(): UseMutationResult<
	{
		success: boolean
		pdfUrl?: string
		downloadUrl?: string
		message?: string
		fileName?: string
	},
	Error,
	{ propertyId: string; reportType?: 'summary' | 'detailed' }
> {
	return useMutation({
		mutationFn: ({ propertyId, reportType = 'summary' }) =>
			pdfApi.generatePropertyReportPDF(propertyId, reportType),
		onSuccess: data => {
			if (data.success) {
				toast.success('Property report generated successfully!')
				// Auto-download if URL is provided
				if (data.downloadUrl) {
					window.open(data.downloadUrl, '_blank')
				}
			} else {
				toast.warning(data.message || 'Report generation failed')
			}
		},
		onError: (error: Error) => {
			toast.error(`Report generation failed: ${error.message}`)
		}
	})
}

/**
 * Generate tenant report PDF mutation
 */
export function useGenerateTenantReportPDF(): UseMutationResult<
	{
		success: boolean
		pdfUrl?: string
		downloadUrl?: string
		message?: string
		fileName?: string
	},
	Error,
	string
> {
	return useMutation({
		mutationFn: (tenantId: string) =>
			pdfApi.generateTenantReportPDF(tenantId),
		onSuccess: data => {
			if (data.success) {
				toast.success('Tenant report generated successfully!')
				// Auto-download if URL is provided
				if (data.downloadUrl) {
					window.open(data.downloadUrl, '_blank')
				}
			} else {
				toast.warning(data.message || 'Report generation failed')
			}
		},
		onError: (error: Error) => {
			toast.error(`Report generation failed: ${error.message}`)
		}
	})
}

/**
 * Generate maintenance report PDF mutation
 */
export function useGenerateMaintenanceReportPDF(): UseMutationResult<
	{
		success: boolean
		pdfUrl?: string
		downloadUrl?: string
		message?: string
		fileName?: string
	},
	Error,
	{
		propertyId?: string
		dateFrom?: string
		dateTo?: string
		status?: string
	}
> {
	return useMutation({
		mutationFn: params => pdfApi.generateMaintenanceReportPDF(params),
		onSuccess: data => {
			if (data.success) {
				toast.success('Maintenance report generated successfully!')
				// Auto-download if URL is provided
				if (data.downloadUrl) {
					window.open(data.downloadUrl, '_blank')
				}
			} else {
				toast.warning(data.message || 'Report generation failed')
			}
		},
		onError: (error: Error) => {
			toast.error(`Report generation failed: ${error.message}`)
		}
	})
}

/**
 * Download PDF file mutation
 */
export function useDownloadPDF(): UseMutationResult<Blob, Error, string> {
	return useMutation({
		mutationFn: (fileName: string) => pdfApi.downloadPDF(fileName),
		onSuccess: (blob, fileName) => {
			// Create download link for the blob
			const url = window.URL.createObjectURL(blob)
			const link = document.createElement('a')
			link.href = url
			link.download = fileName.includes('.pdf')
				? fileName
				: `${fileName}.pdf`
			document.body.appendChild(link)
			link.click()
			link.remove()
			window.URL.revokeObjectURL(url)

			toast.success('PDF downloaded successfully!')
		},
		onError: (error: Error) => {
			toast.error(`Download failed: ${error.message}`)
		}
	})
}

/**
 * Utility hook for PDF operations
 */
export function usePDFOperations() {
	const generateLease = useGenerateLeasePDF()
	const generatePropertyReport = useGeneratePropertyReportPDF()
	const generateTenantReport = useGenerateTenantReportPDF()
	const generateMaintenanceReport = useGenerateMaintenanceReportPDF()
	const downloadPDF = useDownloadPDF()
	const health = usePDFHealth()

	const isGenerating =
		generateLease.isPending ||
		generatePropertyReport.isPending ||
		generateTenantReport.isPending ||
		generateMaintenanceReport.isPending

	const isDownloading = downloadPDF.isPending

	return {
		// Individual operations
		generateLease: generateLease.mutate,
		generatePropertyReport: generatePropertyReport.mutate,
		generateTenantReport: generateTenantReport.mutate,
		generateMaintenanceReport: generateMaintenanceReport.mutate,
		downloadPDF: downloadPDF.mutate,

		// Status
		isGenerating,
		isDownloading,
		isHealthy: health.data?.status === 'ok',

		// Async versions for programmatic use
		generateLeaseAsync: generateLease.mutateAsync,
		generatePropertyReportAsync: generatePropertyReport.mutateAsync,
		generateTenantReportAsync: generateTenantReport.mutateAsync,
		generateMaintenanceReportAsync: generateMaintenanceReport.mutateAsync,
		downloadPDFAsync: downloadPDF.mutateAsync
	}
}
