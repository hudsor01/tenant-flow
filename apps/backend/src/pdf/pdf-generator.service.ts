<<<<<<< HEAD
import {
	Injectable,
	Logger,
	InternalServerErrorException,
	OnModuleDestroy
} from '@nestjs/common'
import puppeteer, { type Browser, type PDFOptions } from 'puppeteer'

/**
 * PDF Generator Service using Puppeteer
 * Provides PDF generation from HTML content for invoices, leases, and reports
 */
@Injectable()
export class PDFGeneratorService implements OnModuleDestroy {
	private readonly logger = new Logger(PDFGeneratorService.name)
	private browser: Browser | null = null

	/**
	 * Initialize browser instance
	 */
	private async getBrowser(): Promise<Browser> {
		if (!this.browser?.connected) {
			this.logger.log('Launching Puppeteer browser')
			this.browser = await puppeteer.launch({
=======
import { Injectable, Logger } from '@nestjs/common'
import puppeteer, { Browser } from 'puppeteer'
import { ErrorHandlerService } from '../services/error-handler.service'

export interface PDFGenerationOptions {
	/** HTML content to convert to PDF */
	html: string
	/** PDF filename (without extension) */
	filename: string
	/** Page format */
	format?: 'A4' | 'Letter' | 'Legal'
	/** Print margins */
	margin?: {
		top?: string
		right?: string
		bottom?: string
		left?: string
	}
	/** Additional CSS for styling */
	css?: string
	/** Whether to include page numbers */
	includePageNumbers?: boolean
	/** Header HTML */
	headerTemplate?: string
	/** Footer HTML */
	footerTemplate?: string
	/** Scale factor */
	scale?: number
	/** Whether to print background graphics */
	printBackground?: boolean
}

export interface PDFGenerationResult {
	/** PDF buffer */
	buffer: Buffer
	/** Generated filename */
	filename: string
	/** File size in bytes */
	size: number
	/** MIME type */
	mimeType: string
}

/**
 * PDF Generator Service
 *
 * Production-grade PDF generation service using Puppeteer
 * Optimized for server-side rendering and performance
 *
 * Features:
 * - HTML to PDF conversion
 * - Custom CSS styling
 * - Headers and footers
 * - Page numbers
 * - Various page formats
 * - Memory management
 * - Error handling
 *
 * References:
 * - https://pptr.dev/guides/pdf-generation
 * - https://github.com/puppeteer/puppeteer/blob/main/docs/api/puppeteer.pdfoptions.md
 */
@Injectable()
export class PDFGeneratorService {
	private readonly logger = new Logger(PDFGeneratorService.name)
	private browser: Browser | null = null
	private readonly isProduction: boolean

	constructor(private readonly errorHandler: ErrorHandlerService) {
		this.isProduction = process.env.NODE_ENV === 'production'
	}

	/**
	 * Initialize browser instance (lazy loading)
	 */
	private async getBrowser(): Promise<Browser> {
		if (!this.browser) {
			const launchOptions = {
>>>>>>> origin/main
				headless: true,
				args: [
					'--no-sandbox',
					'--disable-setuid-sandbox',
					'--disable-dev-shm-usage',
					'--disable-accelerated-2d-canvas',
<<<<<<< HEAD
					'--no-zygote',
					'--single-process',
					'--disable-gpu'
				]
			})
		}
=======
					'--no-first-run',
					'--no-zygote',
					'--single-process', // Required for some hosting environments
					'--disable-gpu'
				],
				...(this.isProduction && {
					executablePath:
						process.env.PUPPETEER_EXECUTABLE_PATH ||
						'/usr/bin/chromium-browser'
				})
			}

			this.browser = await puppeteer.launch(launchOptions)

			this.logger.log('PDF generator browser initialized', {
				version: await this.browser.version(),
				isProduction: this.isProduction
			})

			// Handle browser disconnect
			this.browser.on('disconnected', () => {
				this.logger.warn('PDF generator browser disconnected')
				this.browser = null
			})
		}

>>>>>>> origin/main
		return this.browser
	}

	/**
	 * Generate PDF from HTML content
	 */
	async generatePDF(
<<<<<<< HEAD
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
		this.logger.log('Generating PDF from HTML content', {
			contentLength: htmlContent.length,
			format: options?.format || 'A4'
		})
=======
		options: PDFGenerationOptions
	): Promise<PDFGenerationResult> {
		const startTime = Date.now()
>>>>>>> origin/main

		try {
			const browser = await this.getBrowser()
			const page = await browser.newPage()

<<<<<<< HEAD
			// Set HTML content
			await page.setContent(htmlContent, { waitUntil: 'networkidle0' })

			// PDF options with defaults
			const pdfOptions: PDFOptions = {
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

			this.logger.log('PDF generated successfully', {
				sizeKB: Math.round(pdfBuffer.length / 1024)
			})
			return Buffer.from(pdfBuffer)
		} catch (error) {
			this.logger.error('Error generating PDF:', error)
			throw new InternalServerErrorException('Failed to generate PDF')
=======
			// Set viewport for consistent rendering
			await page.setViewport({
				width: 1200,
				height: 800,
				deviceScaleFactor: 1
			})

			// Construct complete HTML document
			const fullHtml = this.buildCompleteHTML(options.html, options.css)

			// Load content
			await page.setContent(fullHtml, {
				waitUntil: 'networkidle0',
				timeout: 30000
			})

			// Generate PDF
			const pdfBuffer = await page.pdf({
				format: options.format || 'Letter',
				printBackground: options.printBackground ?? true,
				margin: {
					top: '0.75in',
					right: '0.75in',
					bottom: '0.75in',
					left: '0.75in',
					...options.margin
				},
				scale: options.scale || 1,
				preferCSSPageSize: true,
				displayHeaderFooter: !!(
					options.headerTemplate ||
					options.footerTemplate ||
					options.includePageNumbers
				),
				headerTemplate: options.headerTemplate || '',
				footerTemplate:
					options.footerTemplate ||
					(options.includePageNumbers
						? `<div style="font-size: 10px; text-align: center; width: 100%;">
             <span class="pageNumber"></span> of <span class="totalPages"></span>
           </div>`
						: '')
			})

			await page.close()

			const generationTime = Date.now() - startTime
			const filename = `${options.filename}.pdf`

			this.logger.log('PDF generated successfully', {
				filename,
				size: pdfBuffer.length,
				generationTime: `${generationTime}ms`
			})

			return {
				buffer: Buffer.from(pdfBuffer),
				filename,
				size: pdfBuffer.length,
				mimeType: 'application/pdf'
			}
		} catch (error) {
			const generationTime = Date.now() - startTime

			this.logger.error('PDF generation failed', {
				error: error instanceof Error ? error.message : 'Unknown error',
				filename: options.filename,
				generationTime: `${generationTime}ms`
			})

			throw this.errorHandler.handleError(error as Error, {
				operation: 'generatePDF',
				resource: 'pdf',
				metadata: { filename: options.filename }
			})
>>>>>>> origin/main
		}
	}

	/**
<<<<<<< HEAD
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
			this.logger.log('PDF generator browser closed')
		}
	}
=======
	 * Generate PDF from URL
	 */
	async generatePDFFromURL(
		url: string,
		filename: string,
		pdfOptions: Omit<PDFGenerationOptions, 'html' | 'filename'> = {}
	): Promise<PDFGenerationResult> {
		const startTime = Date.now()

		try {
			const browser = await this.getBrowser()
			const page = await browser.newPage()

			// Set viewport
			await page.setViewport({
				width: 1200,
				height: 800,
				deviceScaleFactor: 1
			})

			// Navigate to URL
			await page.goto(url, {
				waitUntil: 'networkidle0',
				timeout: 30000
			})

			// Generate PDF
			const pdfBuffer = await page.pdf({
				format: pdfOptions.format || 'Letter',
				printBackground: pdfOptions.printBackground ?? true,
				margin: {
					top: '0.75in',
					right: '0.75in',
					bottom: '0.75in',
					left: '0.75in',
					...pdfOptions.margin
				},
				scale: pdfOptions.scale || 1,
				preferCSSPageSize: true,
				displayHeaderFooter: !!(
					pdfOptions.headerTemplate ||
					pdfOptions.footerTemplate ||
					pdfOptions.includePageNumbers
				),
				headerTemplate: pdfOptions.headerTemplate || '',
				footerTemplate:
					pdfOptions.footerTemplate ||
					(pdfOptions.includePageNumbers
						? `<div style="font-size: 10px; text-align: center; width: 100%;">
             <span class="pageNumber"></span> of <span class="totalPages"></span>
           </div>`
						: '')
			})

			await page.close()

			const generationTime = Date.now() - startTime
			const pdfFilename = `${filename}.pdf`

			this.logger.log('PDF generated from URL successfully', {
				url,
				filename: pdfFilename,
				size: pdfBuffer.length,
				generationTime: `${generationTime}ms`
			})

			return {
				buffer: Buffer.from(pdfBuffer),
				filename: pdfFilename,
				size: pdfBuffer.length,
				mimeType: 'application/pdf'
			}
		} catch (error) {
			const generationTime = Date.now() - startTime

			this.logger.error('PDF generation from URL failed', {
				error: error instanceof Error ? error.message : 'Unknown error',
				url,
				filename,
				generationTime: `${generationTime}ms`
			})

			throw this.errorHandler.handleError(error as Error, {
				operation: 'generatePDFFromURL',
				resource: 'pdf',
				metadata: { url, filename }
			})
		}
	}

	/**
	 * Build complete HTML document with proper structure
	 */
	private buildCompleteHTML(htmlContent: string, css?: string): string {
		const defaultCSS = `
      @page {
        margin: 0.75in;
      }
      body {
        font-family: 'Times New Roman', Times, serif;
        font-size: 11pt;
        line-height: 1.5;
        color: #333;
        margin: 0;
        padding: 0;
      }
      h1, h2, h3, h4, h5, h6 {
        font-weight: bold;
        margin: 1em 0 0.5em 0;
      }
      h1 { font-size: 16pt; text-align: center; }
      h2 { font-size: 14pt; }
      h3 { font-size: 12pt; }
      p { margin: 0.5em 0; }
      .page-break { page-break-before: always; }
      .no-break { page-break-inside: avoid; }
      .text-center { text-align: center; }
      .text-bold { font-weight: bold; }
      .signature-line {
        border-bottom: 1px solid #333;
        width: 200px;
        margin: 20px 0 5px 0;
      }
      .signature-block {
        margin: 30px 0;
        page-break-inside: avoid;
      }
    `

		return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <style>
        ${defaultCSS}
        ${css || ''}
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>
    `
	}

	/**
	 * Close browser instance (cleanup)
	 */
	async closeBrowser(): Promise<void> {
		if (this.browser) {
			await this.browser.close()
			this.browser = null
			this.logger.log('PDF generator browser closed')
		}
	}

	/**
	 * Health check for PDF service
	 */
	async healthCheck(): Promise<{
		status: string
		browserConnected: boolean
	}> {
		try {
			const browser = await this.getBrowser()
			const isConnected = browser.isConnected()

			return {
				status: isConnected ? 'healthy' : 'unhealthy',
				browserConnected: isConnected
			}
		} catch (error) {
			this.logger.error('PDF service health check failed', {
				error: error instanceof Error ? error.message : 'Unknown error'
			})

			return {
				status: 'unhealthy',
				browserConnected: false
			}
		}
	}

	/**
	 * Cleanup method for graceful shutdown
	 */
	async onModuleDestroy() {
		await this.closeBrowser()
	}
>>>>>>> origin/main
}
