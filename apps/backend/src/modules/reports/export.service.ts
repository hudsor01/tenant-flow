import { Injectable, Logger } from '@nestjs/common'
import ExcelJS from 'exceljs'

@Injectable()
export class ExportService {
	private readonly logger = new Logger(ExportService.name)

	async generateExcel(
		payload: unknown,
		sheetName = 'Analytics'
	): Promise<Buffer> {
		const workbook = new ExcelJS.Workbook()
		const worksheet = workbook.addWorksheet(sheetName)

		const records = this.normalizeRecords(payload)

		if (!records.length) {
			worksheet.columns = [
				{ header: 'Field', key: 'field', width: 24 },
				{ header: 'Value', key: 'value', width: 32 }
			]
			worksheet.addRow({ field: 'message', value: 'No data available' })
		} else {
			const [firstRecord] = records
			const headers = firstRecord ? Object.keys(firstRecord) : []

			if (headers.length === 0) {
				worksheet.columns = [
					{ header: 'Field', key: 'field', width: 24 },
					{ header: 'Value', key: 'value', width: 32 }
				]
				records.forEach((record, index) => {
					worksheet.addRow({
						field: `record_${index + 1}`,
						value: JSON.stringify(record)
					})
				})
			} else {
				worksheet.columns = headers.map(key => ({
					header: this.toTitleCase(key),
					key,
					width: Math.min(Math.max(key.length * 1.5, 14), 40)
				}))

				records.forEach(record => {
					worksheet.addRow(record)
				})
			}
		}

		worksheet.getRow(1).font = { bold: true }

		try {
			const buffer = await workbook.xlsx.writeBuffer()
			return Buffer.from(buffer)
		} catch (error) {
			this.logger.error('Failed to generate Excel export', {
				error: error instanceof Error ? error.message : String(error)
			})
			return Buffer.from('')
		}
	}

	async generateCSV(payload: unknown): Promise<string> {
		const records = this.normalizeRecords(payload)

		if (!records.length) {
			return 'Field,Value\nmessage,No data available'
		}

		const [firstRecord] = records
		const headers = firstRecord ? Object.keys(firstRecord) : []

		if (!headers.length) {
			const rows = records.map(
				(record, index) =>
					`record_${index + 1},"${JSON.stringify(record).replace(/"/g, '""')}"`
			)
			return ['record,value', ...rows].join('\n')
		}
		const headerRow = headers.join(',')
		const rows = records.map(record =>
			headers
				.map(key => {
					const value = record[key]
					if (value === undefined || value === null) {
						return ''
					}
					const stringValue = String(value).replace(/"/g, '""')
					return stringValue.includes(',') || stringValue.includes('\n')
						? `"${stringValue}"`
						: stringValue
				})
				.join(',')
		)

		return [headerRow, ...rows].join('\n')
	}

	/**
	 * PDF export disabled (pdfkit removed)
	 * Use Excel or CSV exports instead
	 * TODO: Implement PDF export using @react-pdf/renderer if needed
	 */
	async generatePDF(
		_payload: unknown,
		_title = 'Analytics Export'
	): Promise<Buffer> {
		this.logger.warn('PDF export not implemented - use Excel or CSV')
		throw new Error('PDF export is not currently supported. Please use Excel or CSV format.')
	}

	private normalizeRecords(payload: unknown): Record<string, unknown>[] {
		if (Array.isArray(payload)) {
			if (payload.length === 0) {
				return []
			}

			if (payload.every(item => typeof item === 'object' && item !== null)) {
				return payload.map(item =>
					this.flattenRecord(item as Record<string, unknown>)
				)
			}

			return payload.map((value, index) => ({ index, value }))
		}

		if (payload && typeof payload === 'object') {
			return [this.flattenRecord(payload as Record<string, unknown>)]
		}

		return []
	}

	private flattenRecord(
		record: Record<string, unknown>,
		prefix = ''
	): Record<string, unknown> {
		return Object.entries(record).reduce<Record<string, unknown>>(
			(acc, [key, value]) => {
				const compositeKey = prefix ? `${prefix}.${key}` : key

				if (Array.isArray(value)) {
					acc[compositeKey] = value.length
				} else if (value && typeof value === 'object') {
					Object.assign(
						acc,
						this.flattenRecord(value as Record<string, unknown>, compositeKey)
					)
				} else {
					acc[compositeKey] = value ?? ''
				}

				return acc
			},
			{}
		)
	}

	private toTitleCase(value: string): string {
		return value
			.replace(/[_.]/g, ' ')
			.replace(/([a-z])([A-Z])/g, '$1 $2')
			.replace(/\s+/g, ' ')
			.trim()
			.replace(/\b\w/g, match => match.toUpperCase())
	}
}
