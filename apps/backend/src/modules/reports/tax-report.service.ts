import { Injectable } from '@nestjs/common'
import { ExportService } from './export.service'
import { TaxPreparationTemplate } from './templates/tax-preparation.template'
import { AppLogger } from '../../logger/app-logger.service'

export type ReportExportPayload = {
	buffer: Buffer
	contentType: string
	filename: string
}

@Injectable()
export class TaxReportService {
	constructor(
		private readonly exportService: ExportService,
		private readonly taxPreparationTemplate: TaxPreparationTemplate,
		private readonly logger: AppLogger
	) {}

	async generateTaxPreparation(
		user_id: string,
		start_date: string,
		end_date: string
	): Promise<ReportExportPayload> {
		this.logger.log('Generating tax preparation report', { user_id })

		const reportData = await this.taxPreparationTemplate.generateReportData(
			user_id,
			start_date,
			end_date
		)

		const excelData = this.taxPreparationTemplate.formatForExcel(reportData)
		const buffer = await this.exportService.generateExcel(
			excelData,
			'Tax Preparation'
		)

		return {
			buffer,
			contentType:
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			filename: 'tax-preparation-report.xlsx'
		}
	}
}
