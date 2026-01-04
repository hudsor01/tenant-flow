import { Injectable } from '@nestjs/common'
import { ExportService } from './export.service'
import { ExecutiveMonthlyTemplate } from './templates/executive-monthly.template'
import { AppLogger } from '../../logger/app-logger.service'

export type ReportExportPayload = {
	buffer: Buffer
	contentType: string
	filename: string
}

@Injectable()
export class ExecutiveReportService {
	constructor(
		private readonly exportService: ExportService,
		private readonly executiveMonthlyTemplate: ExecutiveMonthlyTemplate,
		private readonly logger: AppLogger
	) {}

	async generateMonthlyReport(
		user_id: string,
		start_date: string,
		end_date: string,
		format: 'pdf' | 'excel' = 'pdf'
	): Promise<ReportExportPayload> {
		this.logger.log('Generating executive monthly report', { user_id, format })

		const reportData = await this.executiveMonthlyTemplate.generateReportData(
			user_id,
			start_date,
			end_date
		)

		if (format === 'excel') {
			const excelData = this.executiveMonthlyTemplate.formatForExcel(reportData)
			const buffer = await this.exportService.generateExcel(
				excelData,
				'Executive Report'
			)

			return {
				buffer,
				contentType:
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				filename: 'executive-monthly-report.xlsx'
			}
		}

		const pdfContent = this.executiveMonthlyTemplate.formatForPDF(reportData)
		const buffer = await this.exportService.generatePDF(
			pdfContent as unknown as
				| Record<string, unknown>
				| Record<string, unknown>[],
			'Executive Monthly Report'
		)

		return {
			buffer,
			contentType: 'application/pdf',
			filename: 'executive-monthly-report.pdf'
		}
	}
}
