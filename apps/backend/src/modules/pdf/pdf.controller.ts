import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common'
import type { LeaseTemplateContext, LeaseTemplateSelections } from '@repo/shared/templates/lease-template'
import { LeasePDFService } from './lease-pdf.service'

@Controller('pdf')
export class PDFController {
	private readonly logger = new Logger(PDFController.name)

	constructor(private readonly leasePdfService: LeasePDFService) {
		// Logger initialized with Pattern 1
	}

	@Get('health')
	async health() {
		this.logger.log(
			{
				pdf: {
					healthCheck: true,
					status: 'ok'
				}
			},
			'PDF health check requested'
		)
		return { status: 'ok', message: 'PDF service is running' }
	}

	/**
	 * Generate lease template PDF preview
	 * Public endpoint for template builder - requires auth
	 */
	@Post('lease/template/preview')
	@HttpCode(HttpStatus.OK)
	async generateLeaseTemplatePreview(
		@Body() body: { selections: LeaseTemplateSelections; context: LeaseTemplateContext }
	) {
		try {
			const pdfBuffer = await this.leasePdfService.generateLeasePdfFromTemplate(
				body.selections,
				body.context
			)

			// Convert to base64 for frontend consumption
			const base64Pdf = pdfBuffer.toString('base64')

			this.logger.log('Lease template PDF generated successfully')
			return { pdf: base64Pdf }
		} catch (error) {
			this.logger.error('Failed to generate lease template PDF', error)
			throw error
		}
	}
}
