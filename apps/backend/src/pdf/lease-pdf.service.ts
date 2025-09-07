import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'
import { PDFGeneratorService } from './pdf-generator.service'

/**
 * Lease PDF Generation Service
 * Specialized service for generating lease agreement PDFs
 */
@Injectable()
export class LeasePDFService {
	constructor(
		private readonly pdfGenerator: PDFGeneratorService,
		private readonly logger: PinoLogger
	) {
		// PinoLogger context handled automatically via app-level configuration
	}

	/**
	 * Generate lease agreement PDF
	 */
	async generateLeasePDF(leaseData: Record<string, unknown>): Promise<Buffer> {
		const result = await this.generateLeasePdf(
			String(leaseData.id || ''),
			String(leaseData.userId || ''),
			leaseData
		)
		return result.buffer
	}

	/**
	 * Generate lease agreement (alias for test compatibility)
	 */
	async generateLeaseAgreement(
		leaseData: Record<string, unknown>
	): Promise<Buffer> {
		return this.generateLeasePDF(leaseData)
	}

	/**
	 * Generate lease PDF with ID and user context (for controller compatibility)
	 */
	async generateLeasePdf(
		leaseId: string,
		userId: string,
		options: Record<string, unknown>
	): Promise<{
		buffer: Buffer
		filename: string
		mimeType: string
		size: number
	}> {
		this.logger.info(
			'Generating lease PDF for lease:',
			leaseId,
			'user:',
			userId
		)

		try {
			// Generate HTML content for the lease
			const htmlContent = this.generateLeaseHTML({
				id: leaseId,
				userId,
				...options
			})

			// Convert to PDF
			const pdfBuffer = await this.pdfGenerator.generatePDF(htmlContent, {
				format: 'A4',
				margin: {
					top: '50px',
					bottom: '50px',
					left: '50px',
					right: '50px'
				}
			})

			const filename = `lease-${leaseId}.pdf`

			this.logger.info('Lease PDF generated successfully')
			return {
				buffer: pdfBuffer,
				filename,
				mimeType: 'application/pdf',
				size: pdfBuffer.length
			}
		} catch (error) {
			this.logger.error('Error generating lease PDF:', error)
			throw new InternalServerErrorException('Failed to generate lease PDF')
		}
	}

	/**
	 * Generate HTML content for lease agreement
	 */
	private generateLeaseHTML(leaseData: Record<string, unknown>): string {
		// This is a placeholder implementation
		// TODO: use a template engine
		return `
			<html>
				<head>
					<title>Lease Agreement</title>
					<style>
						body { font-family: Arial, sans-serif; margin: 20px; }
						.header { text-align: center; margin-bottom: 30px; }
						.content { line-height: 1.6; }
					</style>
				</head>
				<body>
					<div class="header">
						<h1>Residential Lease Agreement</h1>
					</div>
					<div class="content">
						<p>This is a placeholder lease agreement.</p>
						<p>Lease ID: ${leaseData.id || 'N/A'}</p>
						<p>Property: ${leaseData.property || 'N/A'}</p>
						<p>Tenant: ${leaseData.tenant || 'N/A'}</p>
					</div>
				</body>
			</html>
		`
	}
}
