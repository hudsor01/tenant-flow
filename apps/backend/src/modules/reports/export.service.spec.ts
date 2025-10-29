import ExcelJS from 'exceljs'
import { ExportService } from './export.service'

describe('ExportService', () => {
	let service: ExportService

	beforeEach(() => {
		service = new ExportService()
	})

	describe('generateExcel', () => {
		it('flattens nested analytics data into tabular rows', async () => {
			const payload = [
				{
					property: 'Pine Estates',
					metrics: {
						occupancy: 0.92,
						units: 120
					},
					tags: ['stabilized', 'urban']
				},
				{
					property: 'Maple Court',
					metrics: {
						occupancy: 0.88,
						units: 85
					},
					tags: []
				}
			]

			const buffer = await service.generateExcel(payload, 'Portfolio')
			const workbook = new ExcelJS.Workbook()
			await workbook.xlsx.load(buffer as any)
			const worksheet = workbook.getWorksheet('Portfolio')

			expect(worksheet).toBeDefined()
			const headerRow = worksheet?.getRow(1)
			const headerValues = Array.isArray(headerRow?.values)
				? headerRow.values.slice(1)
				: []
			expect(headerValues).toEqual([
				'Property',
				'Metrics Occupancy',
				'Metrics Units',
				'Tags'
			])

			const firstRow = worksheet?.getRow(2)
			const firstRowValues = Array.isArray(firstRow?.values)
				? firstRow.values.slice(1)
				: []
			const secondRow = worksheet?.getRow(3)
			const secondRowValues = Array.isArray(secondRow?.values)
				? secondRow.values.slice(1)
				: []
			expect(firstRowValues).toEqual(['Pine Estates', 0.92, 120, 2])
			expect(secondRowValues).toEqual(['Maple Court', 0.88, 85, 0])
		})

		it('provides a fallback row when the payload is empty', async () => {
			const buffer = await service.generateExcel([], 'Empty')
			const workbook = new ExcelJS.Workbook()
			await workbook.xlsx.load(buffer as any)
			const worksheet = workbook.getWorksheet('Empty')

			const row = worksheet?.getRow(2)
			const rowValues = Array.isArray(row?.values) ? row.values.slice(1) : []
			expect(rowValues).toEqual(['message', 'No data available'])
		})
	})

	describe('generateCSV', () => {
		it('renders CSV output with flattened keys', async () => {
			const csv = await service.generateCSV([
				{
					property: 'Elm Residences',
					metrics: { occupancy: 0.95 },
					tags: ['stabilized']
				}
			])

			expect(csv.split('\n')).toEqual([
				'property,metrics.occupancy,tags',
				'Elm Residences,0.95,1'
			])
		})

		it('returns a friendly message when no data is present', async () => {
			const csv = await service.generateCSV(null)
			expect(csv).toBe('Field,Value\nmessage,No data available')
		})
	})

	describe('generatePDF', () => {
		it('throws error indicating PDF export is disabled', async () => {
			await expect(
				service.generatePDF(
					[
						{
							property: 'Oak Villas',
							metrics: { occupancy: 0.9 }
						}
					],
					'Portfolio Summary'
				)
			).rejects.toThrow('PDF export is not currently supported')
		})
	})
})
