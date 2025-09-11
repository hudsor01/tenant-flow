import {
	Injectable,
	InternalServerErrorException,
	OnModuleDestroy
} from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'
import puppeteer from 'puppeteer'

/**
 * PDF Generator Service using Puppeteer
 * Provides PDF generation from HTML content for invoices, leases, and reports
 */
@Injectable()
export class PDFGeneratorService implements OnModuleDestroy {
	private browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null

	constructor(private readonly logger: PinoLogger) {
		// PinoLogger context handled automatically via app-level configuration
	}

	/**
	 * Initialize browser instance
	 */
	private async getBrowser(): Promise<Awaited<ReturnType<typeof puppeteer.launch>>> {
		if (!this.browser?.connected) {
			this.logger.info('Launching Puppeteer browser')
			
			// Use system Chromium in Docker, downloaded Chromium locally
			const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined
			
			this.browser = await puppeteer.launch({
				headless: true,
				executablePath,
				args: [
					'--no-sandbox',
					'--disable-setuid-sandbox',
					'--disable-dev-shm-usage',
					'--disable-accelerated-2d-canvas',
					'--no-zygote',
					'--single-process',
					'--disable-gpu',
					'--disable-extensions',
					'--disable-background-timer-throttling',
					'--disable-backgrounding-occluded-windows',
					'--disable-renderer-backgrounding'
				]
			})
		}
		return this.browser
	}

	/**
	 * Generate PDF from HTML content
	 */
	async generatePDF(
		htmlContent: string,
		options?: {
			format?: 'A4' | 'Letter' | 'Legal'
			margin?: {
				top?: string
				right?: string
				bottom?: string
				left?: string
			}
			headerTemplate?: string
			footerTemplate?: string
			landscape?: boolean
		}
	): Promise<Buffer> {
		this.logger.info('Generating PDF from HTML content', {
			contentLength: htmlContent.length,
			format: options?.format || 'A4'
		})

		try {
			const browser = await this.getBrowser()
			const page = await browser.newPage()

			// Set HTML content
			await page.setContent(htmlContent, { waitUntil: 'networkidle0' })

			// PDF options with defaults
			const pdfOptions = {
				format: options?.format || 'A4',
				printBackground: true,
				margin: options?.margin || {
					top: '20mm',
					right: '15mm',
					bottom: '20mm',
					left: '15mm'
				},
				headerTemplate: options?.headerTemplate,
				footerTemplate: options?.footerTemplate,
				landscape: options?.landscape || false
			}

			// Generate PDF buffer
			const pdfBuffer = await page.pdf(pdfOptions)

			// Cleanup
			await page.close()

			this.logger.info('PDF generated successfully', {
				sizeKB: Math.round(pdfBuffer.length / 1024)
			})
			return Buffer.from(pdfBuffer)
		} catch (error) {
			this.logger.error('Error generating PDF:', error)
			throw new InternalServerErrorException('Failed to generate PDF')
		}
	}

	/**
	 * Generate invoice PDF
	 */
	async generateInvoicePDF(invoiceData: {
		invoiceNumber: string
		date: string
		customerName: string
		customerEmail: string
		items: { description: string; amount: number; currency: string }[]
		total: { amount: number; currency: string }
		companyName?: string
		companyAddress?: string
	}): Promise<Buffer> {
		const htmlTemplate = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<title>Invoice ${invoiceData.invoiceNumber}</title>
				<style>
					body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
					.header { border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
					.company-name { font-size: 24px; font-weight: bold; color: #007bff; }
					.invoice-title { font-size: 28px; font-weight: bold; text-align: right; }
					.invoice-meta { text-align: right; margin-bottom: 30px; }
					.customer-info { margin-bottom: 30px; }
					.items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
					.items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
					.items-table th { background-color: #f8f9fa; font-weight: bold; }
					.amount { text-align: right; }
					.total-row { font-weight: bold; background-color: #f8f9fa; }
					.footer { margin-top: 40px; font-size: 12px; color: #666; text-align: center; }
				</style>
			</head>
			<body>
				<div class="header">
					<div class="company-name">${invoiceData.companyName || 'TenantFlow'}</div>
					${invoiceData.companyAddress ? `<div>${invoiceData.companyAddress}</div>` : ''}
				</div>
				
				<div class="invoice-title">INVOICE</div>
				<div class="invoice-meta">
					<div><strong>Invoice #:</strong> ${invoiceData.invoiceNumber}</div>
					<div><strong>Date:</strong> ${new Date(invoiceData.date).toLocaleDateString()}</div>
				</div>
				
				<div class="customer-info">
					<h3>Bill To:</h3>
					<div>${invoiceData.customerName}</div>
					<div>${invoiceData.customerEmail}</div>
				</div>
				
				<table class="items-table">
					<thead>
						<tr>
							<th>Description</th>
							<th class="amount">Amount</th>
						</tr>
					</thead>
					<tbody>
						${invoiceData.items
							.map(
								item => `
							<tr>
								<td>${item.description}</td>
								<td class="amount">${item.currency.toUpperCase()} ${(item.amount / 100).toFixed(2)}</td>
							</tr>
						`
							)
							.join('')}
						<tr class="total-row">
							<td><strong>Total</strong></td>
							<td class="amount"><strong>${invoiceData.total.currency.toUpperCase()} ${(invoiceData.total.amount / 100).toFixed(2)}</strong></td>
						</tr>
					</tbody>
				</table>
				
				<div class="footer">
					Thank you for your business!
				</div>
			</body>
			</html>
		`

		return this.generatePDF(htmlTemplate, { format: 'A4' })
	}

	/**
	 * Generate lease agreement PDF
	 */
	async generateLeaseAgreementPDF(leaseData: {
		propertyAddress: string
		tenantName: string
		landlordName: string
		startDate: string
		endDate: string
		rentAmount: number
		currency: string
		terms?: string[]
	}): Promise<Buffer> {
		const htmlTemplate = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<title>Lease Agreement</title>
				<style>
					body { font-family: 'Times New Roman', serif; margin: 0; padding: 30px; line-height: 1.6; color: #333; }
					.title { text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 30px; text-decoration: underline; }
					.section { margin-bottom: 25px; }
					.section-title { font-weight: bold; margin-bottom: 10px; }
					.property-info { background: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0; }
					.terms-list { list-style-type: decimal; padding-left: 20px; }
					.terms-list li { margin-bottom: 10px; }
					.signatures { margin-top: 50px; }
					.signature-line { border-bottom: 1px solid #333; width: 300px; margin: 30px 0 10px 0; display: inline-block; }
					.signature-block { float: left; width: 45%; margin-right: 10%; }
					.clear { clear: both; }
				</style>
			</head>
			<body>
				<div class="title">RESIDENTIAL LEASE AGREEMENT</div>
				
				<div class="property-info">
					<strong>Property Address:</strong> ${leaseData.propertyAddress}
				</div>
				
				<div class="section">
					<div class="section-title">PARTIES</div>
					<p><strong>Landlord:</strong> ${leaseData.landlordName}</p>
					<p><strong>Tenant:</strong> ${leaseData.tenantName}</p>
				</div>
				
				<div class="section">
					<div class="section-title">LEASE TERM</div>
					<p><strong>Start Date:</strong> ${new Date(leaseData.startDate).toLocaleDateString()}</p>
					<p><strong>End Date:</strong> ${new Date(leaseData.endDate).toLocaleDateString()}</p>
				</div>
				
				<div class="section">
					<div class="section-title">RENT</div>
					<p>The monthly rent amount is <strong>${leaseData.currency.toUpperCase()} ${leaseData.rentAmount.toFixed(2)}</strong>, due on the 1st day of each month.</p>
				</div>
				
				${
					leaseData.terms && leaseData.terms.length > 0
						? `
					<div class="section">
						<div class="section-title">TERMS AND CONDITIONS</div>
						<ol class="terms-list">
							${leaseData.terms.map(term => `<li>${term}</li>`).join('')}
						</ol>
					</div>
				`
						: ''
				}
				
				<div class="signatures">
					<div class="section-title">SIGNATURES</div>
					
					<div class="signature-block">
						<div class="signature-line"></div>
						<div><strong>Landlord:</strong> ${leaseData.landlordName}</div>
						<div>Date: _________________</div>
					</div>
					
					<div class="signature-block">
						<div class="signature-line"></div>
						<div><strong>Tenant:</strong> ${leaseData.tenantName}</div>
						<div>Date: _________________</div>
					</div>
					
					<div class="clear"></div>
				</div>
			</body>
			</html>
		`

		return this.generatePDF(htmlTemplate, { format: 'A4' })
	}

	/**
	 * Cleanup browser resources
	 */
	async onModuleDestroy(): Promise<void> {
		if (this.browser) {
			await this.browser.close()
			this.logger.info('PDF generator browser closed')
		}
	}
}
