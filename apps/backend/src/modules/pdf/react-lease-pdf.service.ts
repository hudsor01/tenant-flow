import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common'
import { renderToBuffer } from '@react-pdf/renderer'
import { TexasLeaseTemplate } from './templates/texas-lease-template'
import type { LeaseGenerationFormData } from '@repo/shared/validation/lease-generation.schemas'

/**
 * React Lease PDF Service
 * Generates Texas Residential Lease Agreement PDFs using React components
 * 
 * Advantages over form-filling:
 * - Full control over layout and styling
 * - No dependency on external PDF templates
 * - Easy to modify and maintain
 * - Professional, clean output
 */
@Injectable()
export class ReactLeasePDFService {
	private readonly logger = new Logger(ReactLeasePDFService.name)

	/**
	 * Generate filled Texas lease PDF from form data
	 * Uses React PDF components to generate from scratch
	 */
	async generateLeasePDF(formData: LeaseGenerationFormData): Promise<Buffer> {
		try {
			this.logger.log('Generating Texas lease PDF with React')

			if (!formData || Object.keys(formData).length === 0) {
				throw new Error('Lease form data is empty')
			}

			// Render React component to PDF buffer
			const pdfBuffer = await renderToBuffer(
				TexasLeaseTemplate({ data: formData })
			)

			this.logger.log('Texas lease PDF generated successfully')
			return pdfBuffer

		} catch (error) {
			this.logger.error('Error generating Texas lease PDF', error)
			throw new InternalServerErrorException(
				'Failed to generate lease PDF',
				error instanceof Error ? error.message : String(error)
			)
		}
	}
}
