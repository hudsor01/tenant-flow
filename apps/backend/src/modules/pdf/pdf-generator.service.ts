/**
 * PDF Generator Service
 *
 * Generates PDFs using:
 * - @react-pdf/renderer for React-based PDFs (invoices, lease agreements)
 * - Puppeteer for HTML-based PDFs (complex templates)
 * - pdf-lib for PDF template filling (handled by LeasePdfGeneratorService)
 *
 * Styles extracted to ./pdf-styles.ts for maintainability.
 */

import type { OnModuleDestroy } from '@nestjs/common'
import { Injectable, InternalServerErrorException } from '@nestjs/common'
import React from 'react'
import {
	Document,
	Page,
	Text,
	View,
	renderToBuffer,
	type DocumentProps
} from '@react-pdf/renderer'
import puppeteer from 'puppeteer'
import { AppLogger } from '../../logger/app-logger.service'
import { PdfTemplateRendererService } from './pdf-template-renderer.service'
import { invoiceStyles, leaseStyles } from './pdf-styles'

@Injectable()
export class PDFGeneratorService implements OnModuleDestroy {
	private browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null
	private readonly maxPageBytes =
		Number.parseInt(process.env.PDF_PUPPETEER_MAX_PAGE_MB ?? '256', 10) *
		1024 *
		1024
	private readonly maxBrowserBytes =
		Number.parseInt(process.env.PDF_PUPPETEER_MAX_BROWSER_MB ?? '512', 10) *
		1024 *
		1024
	private readonly memoryCheckIntervalMs = Number.parseInt(
		process.env.PDF_PUPPETEER_MEMORY_CHECK_MS ?? '15000',
		10
	)
	private lastMemoryCheckAt = 0
	private activePages = 0

	constructor(
		private readonly logger: AppLogger,
		private readonly templateRenderer: PdfTemplateRendererService
	) {}

	/**
	 * Generate invoice PDF using React components
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
		this.logger.log('Generating invoice PDF', {
			invoiceNumber: invoiceData.invoiceNumber
		})

		try {
			const InvoiceDocument = React.createElement(
				Document,
				null,
				React.createElement(
					Page,
					{ size: 'A4', style: invoiceStyles.page },
					// Header
					React.createElement(
						View,
						{ style: invoiceStyles.header },
						React.createElement(
							Text,
							{ style: invoiceStyles.companyName },
							invoiceData.companyName || 'TenantFlow'
						),
						invoiceData.companyAddress
							? React.createElement(
									Text,
									{ style: invoiceStyles.companyAddress },
									invoiceData.companyAddress
								)
							: null
					),
					// Invoice Title and Meta
					React.createElement(
						View,
						{ style: invoiceStyles.invoiceMeta },
						React.createElement(
							Text,
							{ style: invoiceStyles.invoiceTitle },
							'INVOICE'
						),
						React.createElement(
							Text,
							{ style: invoiceStyles.metaText },
							`Invoice #: ${invoiceData.invoiceNumber}`
						),
						React.createElement(
							Text,
							{ style: invoiceStyles.metaText },
							`Date: ${new Date(invoiceData.date).toLocaleDateString()}`
						)
					),
					// Customer Info
					React.createElement(
						View,
						{ style: invoiceStyles.customerInfo },
						React.createElement(
							Text,
							{ style: invoiceStyles.sectionTitle },
							'Bill To:'
						),
						React.createElement(
							Text,
							{ style: invoiceStyles.customerName },
							invoiceData.customerName
						),
						React.createElement(
							Text,
							{ style: invoiceStyles.customerEmail },
							invoiceData.customerEmail
						)
					),
					// Items Table
					React.createElement(
						View,
						{ style: invoiceStyles.table },
						// Table Header
						React.createElement(
							View,
							{ style: invoiceStyles.tableHeader },
							React.createElement(
								Text,
								{ style: invoiceStyles.tableColHeader },
								'Description'
							),
							React.createElement(
								Text,
								{
									style: [invoiceStyles.tableColHeader, invoiceStyles.amountCol]
								},
								'Amount'
							)
						),
						// Table Rows
						...invoiceData.items.map(item =>
							React.createElement(
								View,
								{ key: item.description, style: invoiceStyles.tableRow },
								React.createElement(
									Text,
									{ style: invoiceStyles.tableCol },
									item.description
								),
								React.createElement(
									Text,
									{ style: [invoiceStyles.tableCol, invoiceStyles.amountCol] },
									`${item.currency.toUpperCase()} ${(item.amount / 100).toFixed(2)}`
								)
							)
						),
						// Total Row
						React.createElement(
							View,
							{ style: invoiceStyles.totalRow },
							React.createElement(
								Text,
								{ style: invoiceStyles.totalLabel },
								'Total'
							),
							React.createElement(
								Text,
								{ style: [invoiceStyles.totalAmount, invoiceStyles.amountCol] },
								`${invoiceData.total.currency.toUpperCase()} ${(invoiceData.total.amount / 100).toFixed(2)}`
							)
						)
					),
					// Footer
					React.createElement(
						View,
						{ style: invoiceStyles.footer },
						React.createElement(Text, null, 'Thank you for your business!')
					)
				)
			)

			const pdfBuffer = await renderToBuffer(InvoiceDocument)

			this.logger.log('Invoice PDF generated successfully', {
				sizeKB: Math.round(pdfBuffer.length / 1024)
			})
			return pdfBuffer
		} catch (error) {
			this.logger.error('Error generating invoice PDF:', { error })
			throw new InternalServerErrorException('Failed to generate invoice PDF')
		}
	}

	/**
	 * Generate lease agreement PDF using React components
	 */
	async generateLeaseAgreementPDF(leaseData: {
		propertyAddress: string
		tenantName: string
		ownerName: string
		start_date: string
		end_date: string
		rent_amount: number
		currency: string
		terms?: string[]
	}): Promise<Buffer> {
		this.logger.log('Generating lease agreement PDF', {
			property: leaseData.propertyAddress
		})

		try {
			const LeaseDocument = React.createElement(
				Document,
				null,
				React.createElement(
					Page,
					{ size: 'A4', style: leaseStyles.page },
					// Title
					React.createElement(
						Text,
						{ style: leaseStyles.title },
						'RESIDENTIAL LEASE AGREEMENT'
					),
					// Property Info
					React.createElement(
						View,
						{ style: leaseStyles.propertyInfo },
						React.createElement(
							Text,
							{ style: leaseStyles.propertyLabel },
							`Property Address: ${leaseData.propertyAddress}`
						)
					),
					// Parties
					React.createElement(
						View,
						{ style: leaseStyles.section },
						React.createElement(
							Text,
							{ style: leaseStyles.sectionTitle },
							'PARTIES'
						),
						React.createElement(
							Text,
							{ style: leaseStyles.text },
							`Owner: ${leaseData.ownerName}`
						),
						React.createElement(
							Text,
							{ style: leaseStyles.text },
							`Tenant: ${leaseData.tenantName}`
						)
					),
					// Lease Term
					React.createElement(
						View,
						{ style: leaseStyles.section },
						React.createElement(
							Text,
							{ style: leaseStyles.sectionTitle },
							'LEASE TERM'
						),
						React.createElement(
							Text,
							{ style: leaseStyles.text },
							`Start Date: ${new Date(leaseData.start_date).toLocaleDateString()}`
						),
						React.createElement(
							Text,
							{ style: leaseStyles.text },
							`End Date: ${new Date(leaseData.end_date).toLocaleDateString()}`
						)
					),
					// Rent
					React.createElement(
						View,
						{ style: leaseStyles.section },
						React.createElement(
							Text,
							{ style: leaseStyles.sectionTitle },
							'RENT'
						),
						React.createElement(
							Text,
							{ style: leaseStyles.text },
							`The monthly rent amount is ${leaseData.currency.toUpperCase()} ${leaseData.rent_amount.toFixed(2)}, due on the 1st day of each month.`
						)
					),
					// Terms
					leaseData.terms && leaseData.terms.length > 0
						? React.createElement(
								View,
								{ style: leaseStyles.section },
								React.createElement(
									Text,
									{ style: leaseStyles.sectionTitle },
									'TERMS AND CONDITIONS'
								),
								...leaseData.terms.map((term, index) =>
									React.createElement(
										Text,
										{ key: index, style: leaseStyles.termItem },
										`${index + 1}. ${term}`
									)
								)
							)
						: null,
					// Signatures
					React.createElement(
						View,
						{ style: leaseStyles.signatures },
						React.createElement(
							Text,
							{ style: leaseStyles.sectionTitle },
							'SIGNATURES'
						),
						React.createElement(
							View,
							{ style: leaseStyles.signatureRow },
							React.createElement(
								View,
								{ style: leaseStyles.signatureBlock },
								React.createElement(View, { style: leaseStyles.signatureLine }),
								React.createElement(
									Text,
									{ style: leaseStyles.signatureLabel },
									`Owner: ${leaseData.ownerName}`
								),
								React.createElement(
									Text,
									{ style: leaseStyles.signatureDate },
									'Date: _________________'
								)
							),
							React.createElement(
								View,
								{ style: leaseStyles.signatureBlock },
								React.createElement(View, { style: leaseStyles.signatureLine }),
								React.createElement(
									Text,
									{ style: leaseStyles.signatureLabel },
									`Tenant: ${leaseData.tenantName}`
								),
								React.createElement(
									Text,
									{ style: leaseStyles.signatureDate },
									'Date: _________________'
								)
							)
						)
					)
				)
			)

			const pdfBuffer = await renderToBuffer(LeaseDocument)

			this.logger.log('Lease agreement PDF generated successfully', {
				sizeKB: Math.round(pdfBuffer.length / 1024)
			})
			return pdfBuffer
		} catch (error) {
			this.logger.error('Error generating lease agreement PDF:', { error })
			throw new InternalServerErrorException(
				'Failed to generate lease agreement PDF'
			)
		}
	}

	/**
	 * Generic PDF generation from React components (for future use)
	 */
	async generatePDFFromReact(
		document: React.ReactElement<DocumentProps>
	): Promise<Buffer> {
		try {
			const pdfBuffer = await renderToBuffer(document)
			this.logger.log('PDF generated successfully', {
				sizeKB: Math.round(pdfBuffer.length / 1024)
			})
			return pdfBuffer
		} catch (error) {
			this.logger.error('Error generating PDF:', { error })
			throw new InternalServerErrorException('Failed to generate PDF')
		}
	}

	/**
	 * Generate PDF from HTML content using Puppeteer
	 * Used for complex lease agreements with HTML templates
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
		this.logger.log('Generating PDF from HTML content', {
			contentLength: htmlContent.length,
			format: options?.format || 'A4'
		})

		let page: Awaited<
			ReturnType<Awaited<ReturnType<typeof puppeteer.launch>>['newPage']>
		> | null = null

		try {
			const browser = await this.getBrowser()
			page = await browser.newPage()
			this.activePages += 1

			// Set HTML content
			await page.setContent(htmlContent, { waitUntil: 'networkidle0' })

			// PDF options with defaults
			const pdfOptions: {
				format: 'A4' | 'Letter' | 'Legal'
				printBackground: boolean
				margin: { top?: string; right?: string; bottom?: string; left?: string }
				landscape: boolean
				headerTemplate?: string
				footerTemplate?: string
			} = {
				format: options?.format || 'A4',
				printBackground: true,
				margin: options?.margin || {
					top: '20mm',
					right: '15mm',
					bottom: '20mm',
					left: '15mm'
				},
				landscape: options?.landscape || false
			}
			if (options?.headerTemplate) {
				pdfOptions.headerTemplate = options.headerTemplate
			}
			if (options?.footerTemplate) {
				pdfOptions.footerTemplate = options.footerTemplate
			}

			// Generate PDF buffer
			const pdfBuffer = await page.pdf(pdfOptions)

			// Cleanup
			await page.close()
			page = null
			this.activePages = Math.max(this.activePages - 1, 0)

			this.logger.log('PDF generated successfully', {
				sizeKB: Math.round(pdfBuffer.length / 1024)
			})
			return Buffer.from(pdfBuffer)
		} catch (error) {
			try {
				if (page && !page.isClosed()) {
					await page.close()
				}
			} catch {
				// ignore cleanup errors
			}
			page = null
			this.activePages = Math.max(this.activePages - 1, 0)
			this.logger.error('Error generating PDF:', { error })
			throw new InternalServerErrorException('Failed to generate PDF')
		}
	}

	/**
	 * Render HTML template then generate PDF.
	 */
	async generatePDFWithTemplate(
		templateName: string,
		data: Record<string, unknown>,
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
			cacheKey?: string
			cacheTtlMs?: number
		}
	): Promise<Buffer> {
		const renderOptions =
			options?.cacheKey || options?.cacheTtlMs
				? {
						...(options?.cacheKey ? { cacheKey: options.cacheKey } : {}),
						...(options?.cacheTtlMs ? { ttlMs: options.cacheTtlMs } : {})
					}
				: undefined

		const html = await this.templateRenderer.renderTemplate(
			templateName,
			data,
			renderOptions
		)

		return this.generatePDF(html, options)
	}

	/**
	 * Initialize browser instance
	 */
	private async getBrowser(): Promise<
		Awaited<ReturnType<typeof puppeteer.launch>>
	> {
		await this.maybeRecycleBrowser()
		if (!this.browser?.connected) {
			this.logger.log('Launching Puppeteer browser')

			this.browser = await puppeteer.launch({
				headless: true,
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
					'--disable-renderer-backgrounding',
					'--js-flags=--max-old-space-size=256'
				]
			})
		}
		return this.browser
	}

	private async maybeRecycleBrowser(): Promise<void> {
		const now = Date.now()
		if (now - this.lastMemoryCheckAt < this.memoryCheckIntervalMs) {
			return
		}
		this.lastMemoryCheckAt = now

		const usage = process.memoryUsage()
		const heapUsage = usage.heapUsed
		const rssUsage = usage.rss
		const overLimit =
			heapUsage > this.maxPageBytes || rssUsage > this.maxBrowserBytes
		if (!overLimit || !this.browser) {
			return
		}

		if (this.activePages > 0) {
			this.logger.warn('Skipping Puppeteer recycle while pages are active', {
				activePages: this.activePages,
				heapMB: Math.round(heapUsage / 1024 / 1024),
				rssMB: Math.round(rssUsage / 1024 / 1024)
			})
			return
		}

		this.logger.warn('Recycling Puppeteer browser due to memory usage', {
			heapMB: Math.round(heapUsage / 1024 / 1024),
			rssMB: Math.round(rssUsage / 1024 / 1024)
		})
		try {
			await this.browser.close()
		} catch {
			// ignore cleanup errors
		}
		this.browser = null
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
}
