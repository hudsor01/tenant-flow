import {
	Body,
	Controller,
	Get,
	Header,
	HttpCode,
	HttpStatus,
	Logger,
	Post
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type {
	LeaseTemplateContext,
	LeaseTemplateSelections
} from '@repo/shared/templates/lease-template'
import { LeaseTemplatePreviewDto } from './dto/lease-template-preview.dto'
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
	 * Validation via nestjs-zod DTO + ZodValidationPipe + rate limiting
	 *
	 * Rate Limit: 5 requests per minute (CPU-intensive operation)
	 * Cache Control: Public, 1 hour (PDFs are deterministic for same input)
	 */
	@Post('lease/template/preview')
	@HttpCode(HttpStatus.OK)
	@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
	@Header('Cache-Control', 'public, max-age=3600') // 1 hour cache
	async generateLeaseTemplatePreview(@Body() body: LeaseTemplatePreviewDto) {
		try {
			const pdfBuffer = await this.leasePdfService.generateLeasePdfFromTemplate(
				body.selections as LeaseTemplateSelections,
				body.context as LeaseTemplateContext
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
