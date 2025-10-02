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
			throw new Error(`Report generation failed: ${response.statusText}`)
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
		window.URL.revokeObjectURL(url)
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
			throw new Error(`Failed to fetch reports: ${response.statusText}`)
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
			throw new Error(`Failed to download report: ${response.statusText}`)
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
		window.URL.revokeObjectURL(url)
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
			throw new Error(`Failed to delete report: ${response.statusText}`)
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
			throw new Error(`Failed to create schedule: ${response.statusText}`)
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
			throw new Error(`Failed to fetch schedules: ${response.statusText}`)
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
			throw new Error(`Failed to delete schedule: ${response.statusText}`)
		}
	}
}
export function getApiBaseUrl() {
	// Prefer explicit env var when available
	const envBase = process.env.NEXT_PUBLIC_API_BASE_URL

	if (envBase) {
		const cleaned = envBase.replace(/\/$/, '')
		try {
			const parsed = new URL(cleaned)
			// If the URL has a pathname with /api, treat it as already pointing to the API
			if (
				parsed.pathname &&
				parsed.pathname !== '/' &&
				parsed.pathname.includes('/api')
			) {
				return cleaned
			}
			return `${cleaned}/api/v1`
		} catch {
			// Not an absolute URL (maybe a relative path like '/api'), check directly
			return cleaned.startsWith('/api') ? cleaned : `${cleaned}/api/v1`
		}
	}

	// On the client, prefer a relative API route
	if (typeof window !== 'undefined') {
		return '/api/v1'
	}

	// Server-side fallback for local dev
	return 'http://localhost:3001/api/v1'
}

export async function getAuthHeaders(): Promise<HeadersInit> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	}

	try {
		if (typeof window !== 'undefined') {
			const win = window as unknown as { __TF_AUTH_TOKEN__?: string }
			const token = win.__TF_AUTH_TOKEN__ || localStorage.getItem('tf_token')
			if (token) headers['Authorization'] = `Bearer ${token}`
		} else if (process.env.API_TOKEN) {
			headers['Authorization'] = `Bearer ${process.env.API_TOKEN}`
		}
	} catch {
		// ignore
	}

	return headers
}
