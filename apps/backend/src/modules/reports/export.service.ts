import { Injectable, Logger } from '@nestjs/common'
import ExcelJS from 'exceljs'
import React from 'react'
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'

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
	 * Generate PDF export using @react-pdf/renderer
	 * Creates a formatted PDF document from analytics data
	 */
	async generatePDF(
		payload: unknown,
		title = 'Analytics Export'
	): Promise<Buffer> {
		try {
			const records = this.normalizeRecords(payload)
			const doc = this.createPDFDocument(records, title)
			const buffer = await renderToBuffer(doc)
			return Buffer.from(buffer)
		} catch (error) {
			this.logger.error('Failed to generate PDF export', {
				error: error instanceof Error ? error.message : String(error),
				title
			})
			throw new Error('Failed to generate PDF export. Please try Excel or CSV format.')
		}
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

	/**
	 * Create PDF document component using @react-pdf/renderer
	 */
	private createPDFDocument(records: Record<string, unknown>[], title: string) {
		const styles = StyleSheet.create({
			page: {
				padding: 30,
				fontSize: 12,
				fontFamily: 'Helvetica'
			},
			title: {
				fontSize: 18,
				fontWeight: 'bold',
				marginBottom: 20,
				textAlign: 'center'
			},
			table: {
				marginTop: 10
			},
			tableHeader: {
				flexDirection: 'row',
				borderBottomWidth: 1,
				borderBottomColor: '#000',
				borderBottomStyle: 'solid',
				paddingBottom: 5,
				marginBottom: 5
			},
			tableRow: {
				flexDirection: 'row',
				borderBottomWidth: 1,
				borderBottomColor: '#ccc',
				borderBottomStyle: 'solid',
				paddingVertical: 3
			},
			headerCell: {
				fontWeight: 'bold',
				fontSize: 10
			},
			cell: {
				fontSize: 9,
				paddingHorizontal: 2
			},
			noData: {
				textAlign: 'center',
				marginTop: 50,
				fontSize: 14
			},
			generatedAt: {
				position: 'absolute',
				bottom: 30,
				right: 30,
				fontSize: 8,
				color: '#666'
			}
		})

		if (!records.length) {
			return React.createElement(Document, null,
				React.createElement(Page, { size: 'A4', style: styles.page },
					React.createElement(Text, { style: styles.title }, title),
					React.createElement(Text, { style: styles.noData }, 'No data available'),
					React.createElement(Text, { style: styles.generatedAt },
						`Generated on ${new Date().toLocaleString()}`
					)
				)
			)
		}

		const [firstRecord] = records
		const headers = firstRecord ? Object.keys(firstRecord) : []

		if (!headers.length) {
			return React.createElement(Document, null,
				React.createElement(Page, { size: 'A4', style: styles.page },
					React.createElement(Text, { style: styles.title }, title),
					React.createElement(Text, { style: styles.noData }, 'No structured data available'),
					React.createElement(Text, { style: styles.generatedAt },
						`Generated on ${new Date().toLocaleString()}`
					)
				)
			)
		}

		// Create table structure
		const columnWidth = Math.max(60, 500 / headers.length) // Distribute width evenly

		const headerCells = headers.map(header =>
			React.createElement(Text, {
				key: header,
				style: [styles.headerCell, styles.cell, { width: columnWidth }]
			}, this.toTitleCase(header))
		)

		const tableRows = records.map((record, index) =>
			React.createElement(View, { key: index, style: styles.tableRow },
				headers.map(header =>
					React.createElement(Text, {
						key: header,
						style: [styles.cell, { width: columnWidth }]
					}, String(record[header] ?? ''))
				)
			)
		)

		return React.createElement(Document, null,
			React.createElement(Page, { size: 'A4', style: styles.page },
				React.createElement(Text, { style: styles.title }, title),
				React.createElement(View, { style: styles.table },
					React.createElement(View, { style: styles.tableHeader }, headerCells),
					tableRows
				),
				React.createElement(Text, { style: styles.generatedAt },
					`Generated on ${new Date().toLocaleString()} | ${records.length} records`
				)
			)
		)
	}
}
