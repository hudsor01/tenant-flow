import { getApiBaseUrl } from '@repo/shared/utils/api-utils'

export type ReportType =
	| 'executive-monthly'
	| 'financial-performance'
	| 'property-portfolio'
	| 'lease-portfolio'
	| 'maintenance-operations'
	| 'tax-preparation'

export type ReportFormat = 'pdf' | 'excel'

interface Report {
	id: string
	userId: string
	reportType: string
	reportName: string
	format: string
	status: string
	fileUrl: string | null
	filePath: string | null
	fileSize: number | null
	startDate: string
	endDate: string
	metadata: Record<string, unknown>
	errorMessage: string | null
	createdAt: string
	updatedAt: string
}

interface ListReportsResponse {
	success: boolean
	data: Report[]
	pagination: {
		total: number
		limit: number
		offset: number
		hasMore: boolean
	}
}

export interface GenerateReportParams {
	userId: string
	startDate: string
	endDate: string
	format?: ReportFormat
}

export interface CreateScheduleParams {
	userId?: string
	reportType: ReportType
	reportName?: string
	frequency: 'daily' | 'weekly' | 'monthly'
	dayOfWeek?: number
	dayOfMonth?: number
	hour?: number
	timezone?: string
	format?: ReportFormat
	startDate?: string
	endDate?: string
}

export type ScheduledReport = {
	id: string
	userId: string
	reportType: ReportType
	reportName?: string
	frequency: 'daily' | 'weekly' | 'monthly'
	dayOfWeek?: number | null | undefined
	dayOfMonth?: number | null | undefined
	hour?: number | null
	timezone?: string | null
	format: ReportFormat
	nextRunAt?: string | null
	lastRunAt?: string | null
	createdAt: string
	updatedAt: string
}

export const reportsClient = {
	/**
	 * Generate a report and download the file
	 * @param reportType - Type of report to generate
	 * @param params - Report parameters (userId, date range, format)
	 * @returns Promise that resolves when download starts
	 */
	async generateReport(
		reportType: ReportType,
		params: GenerateReportParams
	): Promise<void> {
		const format = params.format || 'pdf'
		const apiBaseUrl = getApiBaseUrl()
		const endpoint = `${apiBaseUrl}/reports/generate/${reportType}`

		// Fetch binary data
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: await getAuthHeaders(),
			body: JSON.stringify({
				userId: params.userId,
				startDate: params.startDate,
				endDate: params.endDate,
				format
			})
		})

		if (!response.ok) {
			const { ApiErrorCode, createApiErrorFromResponse } = await import(
				'@repo/shared/utils/api-error'
			)
			throw createApiErrorFromResponse(
				response,
				ApiErrorCode.REPORT_GENERATION_FAILED
			)
		}

		// Create blob from binary response
		const blob = await response.blob()

		// Create download link
		const url = window.URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = `${reportType}-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		setTimeout(() => window.URL.revokeObjectURL(url), 100)
	},

	/**
	 * List generated reports with pagination
	 */
	async listReports(params?: {
		limit?: number
		offset?: number
	}): Promise<ListReportsResponse> {
		const apiBaseUrl = getApiBaseUrl()
		const queryParams = new URLSearchParams()

		if (params?.limit) queryParams.append('limit', params.limit.toString())
		if (params?.offset) queryParams.append('offset', params.offset.toString())

		const endpoint = `${apiBaseUrl}/reports?${queryParams.toString()}`

		const response = await fetch(endpoint, {
			method: 'GET',
			headers: await getAuthHeaders()
		})

		if (!response.ok) {
			const { ApiErrorCode, createApiErrorFromResponse } = await import(
				'@repo/shared/utils/api-error'
			)
			throw createApiErrorFromResponse(
				response,
				ApiErrorCode.REPORT_LIST_FAILED
			)
		}

		return response.json()
	},

	/**
	 * Download a generated report
	 */
	async downloadReport(reportId: string): Promise<void> {
		const apiBaseUrl = getApiBaseUrl()
		const endpoint = `${apiBaseUrl}/reports/${reportId}/download`

		const response = await fetch(endpoint, {
			method: 'GET',
			headers: await getAuthHeaders()
		})

		if (!response.ok) {
			const { ApiErrorCode, createApiErrorFromResponse } = await import(
				'@repo/shared/utils/api-error'
			)
			throw createApiErrorFromResponse(
				response,
				ApiErrorCode.REPORT_DOWNLOAD_FAILED
			)
		}

		// Extract filename from Content-Disposition header
		const contentDisposition = response.headers.get('Content-Disposition')
		const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
		const filename = filenameMatch?.[1] || 'report.pdf'

		// Create blob and download
		const blob = await response.blob()
		const url = window.URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = filename
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		setTimeout(() => window.URL.revokeObjectURL(url), 100)
	},

	/**
	 * Delete a generated report
	 */
	async deleteReport(reportId: string): Promise<void> {
		const apiBaseUrl = getApiBaseUrl()
		const endpoint = `${apiBaseUrl}/reports/${reportId}`

		const response = await fetch(endpoint, {
			method: 'DELETE',
			headers: await getAuthHeaders()
		})

		if (!response.ok) {
			const { ApiErrorCode, createApiErrorFromResponse } = await import(
				'@repo/shared/utils/api-error'
			)
			throw createApiErrorFromResponse(
				response,
				ApiErrorCode.REPORT_DELETE_FAILED
			)
		}
	},

	/**
	 * Generate Executive Monthly Report
	 */
	async generateExecutiveMonthly(params: GenerateReportParams): Promise<void> {
		return this.generateReport('executive-monthly', params)
	},

	/**
	 * Generate Financial Performance Report
	 */
	async generateFinancialPerformance(
		params: GenerateReportParams
	): Promise<void> {
		return this.generateReport('financial-performance', params)
	},

	/**
	 * Generate Property Portfolio Report
	 */
	async generatePropertyPortfolio(params: GenerateReportParams): Promise<void> {
		return this.generateReport('property-portfolio', params)
	},

	/**
	 * Generate Lease Portfolio Report
	 */
	async generateLeasePortfolio(params: GenerateReportParams): Promise<void> {
		return this.generateReport('lease-portfolio', params)
	},

	/**
	 * Generate Maintenance Operations Report
	 */
	async generateMaintenanceOperations(
		params: GenerateReportParams
	): Promise<void> {
		return this.generateReport('maintenance-operations', params)
	},

	/**
	 * Generate Tax Preparation Report (Excel only)
	 */
	async generateTaxPreparation(params: GenerateReportParams): Promise<void> {
		return this.generateReport('tax-preparation', {
			...params,
			format: 'excel'
		})
	},

	/**
	 * Create a scheduled report
	 */
	async createSchedule(params: CreateScheduleParams): Promise<ScheduledReport> {
		const apiBaseUrl = getApiBaseUrl()
		const endpoint = `${apiBaseUrl}/reports/schedules`

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: await getAuthHeaders(),
			body: JSON.stringify(params)
		})

		if (!response.ok) {
			const { ApiErrorCode, createApiErrorFromResponse } = await import(
				'@repo/shared/utils/api-error'
			)
			throw createApiErrorFromResponse(
				response,
				ApiErrorCode.REPORT_SCHEDULE_FAILED
			)
		}

		const result = await response.json()
		return result.data
	},

	/**
	 * List user's scheduled reports
	 */
	async listSchedules(): Promise<ScheduledReport[]> {
		const apiBaseUrl = getApiBaseUrl()
		const endpoint = `${apiBaseUrl}/reports/schedules`

		const response = await fetch(endpoint, {
			method: 'GET',
			headers: await getAuthHeaders()
		})

		if (!response.ok) {
			const { ApiErrorCode, createApiErrorFromResponse } = await import(
				'@repo/shared/utils/api-error'
			)
			throw createApiErrorFromResponse(
				response,
				ApiErrorCode.REPORT_SCHEDULE_FAILED
			)
		}

		const result = await response.json()
		return result.data
	},

	/**
	 * Delete a scheduled report
	 */
	async deleteSchedule(scheduleId: string): Promise<void> {
		const apiBaseUrl = getApiBaseUrl()
		const endpoint = `${apiBaseUrl}/reports/schedules/${scheduleId}`

		const response = await fetch(endpoint, {
			method: 'DELETE',
			headers: await getAuthHeaders()
		})

		if (!response.ok) {
			const { ApiErrorCode, createApiErrorFromResponse } = await import(
				'@repo/shared/utils/api-error'
			)
			throw createApiErrorFromResponse(
				response,
				ApiErrorCode.REPORT_SCHEDULE_FAILED
			)
		}
	}
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	}

	try {
		if (typeof window !== 'undefined') {
			// Use Supabase session (consistent with rest of app)
			const { createBrowserClient } = await import('@supabase/ssr')
			const supabase = createBrowserClient(
				process.env.NEXT_PUBLIC_SUPABASE_URL!,
				process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
			)
			const {
				data: { session },
				error
			} = await supabase.auth.getSession()

			if (error) {
				// Log auth errors in development mode
				const { logErrorInDev } = await import('@repo/shared/utils/api-error')
				logErrorInDev(error, 'getAuthHeaders')
			}

			if (session?.access_token) {
				headers['Authorization'] = `Bearer ${session.access_token}`
			}
		} else if (process.env.API_TOKEN) {
			headers['Authorization'] = `Bearer ${process.env.API_TOKEN}`
		}
	} catch (err) {
		// Log errors in development mode instead of silently ignoring
		const { logErrorInDev } = await import('@repo/shared/utils/api-error')
		logErrorInDev(err, 'getAuthHeaders')
	}

	return headers
}
