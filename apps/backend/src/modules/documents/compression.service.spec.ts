import { CompressionService } from './compression.service'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { performanceConfig } from '../../config/performance.config'

describe('CompressionService - PDF compression', () => {
	let service: CompressionService

	beforeEach(() => {
		service = new CompressionService()
	})

	it('compresses large PDFs above the configured threshold', async () => {
		const largePdf = await createSamplePdf({
			useObjectStreams: false,
			pages: 3,
			linesPerPage: 60
		})

		expect(largePdf.length).toBeGreaterThan(
			performanceConfig.optimization.compression.threshold
		)

		const result = await service.compressDocument(
			largePdf,
			'application/pdf'
		)

		expect(result.compressed.length).toBeLessThan(largePdf.length)
		expect(result.ratio).toBeLessThan(1)
	})

	it('skips compression for PDFs below the threshold', async () => {
		const tinyPdf = await createSamplePdf({
			useObjectStreams: true,
			pages: 1,
			linesPerPage: 1,
			text: 'hi'
		})

		expect(tinyPdf.length).toBeLessThan(
			performanceConfig.optimization.compression.threshold
		)

		const result = await service.compressDocument(
			tinyPdf,
			'application/pdf'
		)

		expect(result.compressed).toBe(tinyPdf)
		expect(result.ratio).toBe(1)
	})

	it('returns the original PDF if compression fails', async () => {
		const invalidPdf = Buffer.alloc(
			performanceConfig.optimization.compression.threshold + 100,
			1
		)

		const result = await service.compressDocument(
			invalidPdf,
			'application/pdf'
		)

		expect(result.compressed).toBe(invalidPdf)
		expect(result.ratio).toBe(1)
	})
})

interface SamplePdfOptions {
	useObjectStreams: boolean
	pages: number
	linesPerPage: number
	text?: string
}

async function createSamplePdf({
	useObjectStreams,
	pages,
	linesPerPage,
	text
}: SamplePdfOptions): Promise<Buffer> {
	const pdfDoc = await PDFDocument.create()
	const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
	const line =
		text ?? 'TenantFlow automates property ops with secure document workflows.'

	for (let pageIndex = 0; pageIndex < pages; pageIndex++) {
		const page = pdfDoc.addPage([612, 792])
		for (let i = 0; i < linesPerPage; i++) {
			const y = 750 - i * 12
			if (y < 50) {
				break
			}
			page.drawText(`${line} [page:${pageIndex} line:${i}]`, {
				x: 40,
				y,
				size: 10,
				font
			})
		}
	}

	const pdfBytes = await pdfDoc.save({ useObjectStreams })
	return Buffer.from(pdfBytes)
}
