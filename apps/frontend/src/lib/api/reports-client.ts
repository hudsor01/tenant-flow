import { apiRequestRaw } from '#lib/api-request'

export type ReportType =
	| 'executive-monthly'
	| 'financial-performance'
	| 'property-portfolio'
	| 'lease-portfolio'
	| 'maintenance-operations'
	| 'tax-preparation'

export type ReportFormat = 'pdf' | 'excel'

export interface GenerateReportParams {
	user_id: string
	start_date: string
	end_date: string
	format?: ReportFormat
}

export const reportsClient = {
	/**
	 * Generate a report and download the file
	 * @param reportType - Type of report to generate
	 * @param params - Report parameters (user_id, date range, format)
	 * @returns Promise that resolves when download starts
	 */
	async generateReport(
		reportType: ReportType,
		params: GenerateReportParams
	): Promise<void> {
		const format = params.format || 'pdf'

		// Fetch binary data
		const response = await apiRequestRaw(`/reports/generate/${reportType}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				user_id: params.user_id,
				start_date: params.start_date,
				end_date: params.end_date,
				format
			})
		})

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
	}
}
