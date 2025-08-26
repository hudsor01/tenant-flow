/**
 * PDF API - Backend PDF generation endpoints connection
 * Connects to backend PDF controller at /pdf/*
 */

import { apiClient } from '@/lib/api-client'
import { z } from 'zod'

// Response schemas for PDF operations
const PDFHealthSchema = z.object({
	status: z.string(),
	timestamp: z.string(),
	message: z.string().optional()
})

const PDFGenerationResponseSchema = z.object({
	success: z.boolean(),
	pdfUrl: z.string().optional(),
	downloadUrl: z.string().optional(),
	message: z.string().optional(),
	fileName: z.string().optional()
})

/**
 * PDF API functions - Direct backend calls
 * These connect to the backend PDF controller endpoints
 */
export const pdfApi = {
	/**
	 * Check PDF service health - GET /pdf/health
	 */
	async checkHealth() {
		return apiClient.getValidated<{
			status: string
			timestamp: string
			message?: string
		}>(
			'/pdf/health',
			PDFHealthSchema,
			'PDFHealth'
		)
	},

	/**
	 * Generate lease PDF - POST /pdf/lease
	 * Note: This endpoint may not exist yet in backend, 
	 * but included for future expansion
	 */
	async generateLeasePDF(leaseId: string) {
		try {
			return await apiClient.postValidated<{
				success: boolean
				pdfUrl?: string
				downloadUrl?: string
				message?: string
				fileName?: string
			}>(
				'/pdf/lease',
				PDFGenerationResponseSchema,
				'PDFGeneration',
				{ leaseId }
			)
		} catch (error) {
			// If endpoint doesn't exist, provide fallback
			console.warn('PDF generation endpoint not available:', error)
			return {
				success: false,
				message: 'PDF generation service is not available. Please contact support.'
			}
		}
	},

	/**
	 * Generate property report PDF - POST /pdf/property-report
	 */
	async generatePropertyReportPDF(propertyId: string, reportType: 'summary' | 'detailed' = 'summary') {
		try {
			return await apiClient.postValidated<{
				success: boolean
				pdfUrl?: string
				downloadUrl?: string
				message?: string
				fileName?: string
			}>(
				'/pdf/property-report',
				PDFGenerationResponseSchema,
				'PDFGeneration',
				{ propertyId, reportType }
			)
		} catch (error) {
			// If endpoint doesn't exist, provide fallback
			console.warn('PDF generation endpoint not available:', error)
			return {
				success: false,
				message: 'PDF generation service is not available. Please contact support.'
			}
		}
	},

	/**
	 * Generate tenant report PDF - POST /pdf/tenant-report
	 */
	async generateTenantReportPDF(tenantId: string) {
		try {
			return await apiClient.postValidated<{
				success: boolean
				pdfUrl?: string
				downloadUrl?: string
				message?: string
				fileName?: string
			}>(
				'/pdf/tenant-report',
				PDFGenerationResponseSchema,
				'PDFGeneration',
				{ tenantId }
			)
		} catch (error) {
			// If endpoint doesn't exist, provide fallback
			console.warn('PDF generation endpoint not available:', error)
			return {
				success: false,
				message: 'PDF generation service is not available. Please contact support.'
			}
		}
	},

	/**
	 * Generate maintenance report PDF - POST /pdf/maintenance-report
	 */
	async generateMaintenanceReportPDF(params: {
		propertyId?: string
		dateFrom?: string
		dateTo?: string
		status?: string
	}) {
		try {
			return await apiClient.postValidated<{
				success: boolean
				pdfUrl?: string
				downloadUrl?: string
				message?: string
				fileName?: string
			}>(
				'/pdf/maintenance-report',
				PDFGenerationResponseSchema,
				'PDFGeneration',
				params
			)
		} catch (error) {
			// If endpoint doesn't exist, provide fallback
			console.warn('PDF generation endpoint not available:', error)
			return {
				success: false,
				message: 'PDF generation service is not available. Please contact support.'
			}
		}
	},

	/**
	 * Download generated PDF - GET /pdf/download/:fileName
	 */
	async downloadPDF(fileName: string) {
		try {
			// Get auth headers for download
			const { getSession } = await import('@/lib/supabase/client')
			const { session } = await getSession()
			const headers: Record<string, string> = {}
			
			if (session?.access_token) {
				headers.Authorization = `Bearer ${session.access_token}`
			}

			// Use direct fetch for file downloads
			const response = await fetch(`/api/pdf/download/${fileName}`, {
				method: 'GET',
				headers,
			})

			if (!response.ok) {
				throw new Error(`Failed to download PDF: ${response.status}`)
			}

			return response.blob()
		} catch (error) {
			console.warn('PDF download endpoint not available:', error)
			throw new Error('PDF download service is not available. Please contact support.')
		}
	}
}

/**
 * Query keys for React Query caching
 */
export const pdfKeys = {
	all: ['pdf'] as const,
	health: () => [...pdfKeys.all, 'health'] as const,
	lease: (leaseId: string) => [...pdfKeys.all, 'lease', leaseId] as const,
	propertyReport: (propertyId: string, type: string) => 
		[...pdfKeys.all, 'property-report', propertyId, type] as const,
	tenantReport: (tenantId: string) => 
		[...pdfKeys.all, 'tenant-report', tenantId] as const,
	maintenanceReport: (params: Record<string, unknown>) => 
		[...pdfKeys.all, 'maintenance-report', params] as const
}