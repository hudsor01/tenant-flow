import { Injectable, InternalServerErrorException, Logger, OnModuleDestroy } from '@nestjs/common'
import React from 'react'
import {
	Document,
	Page,
	Text,
	View,
	StyleSheet,
	renderToBuffer,
	type DocumentProps
} from '@react-pdf/renderer'
import puppeteer from 'puppeteer'

/**
 * PDF Generator Service
 * - @react-pdf/renderer for React-based PDFs (invoices)
 * - Puppeteer for HTML-based PDFs (legacy lease-pdf.service.ts)
 * - pdf-lib for PDF template filling (new texas-lease-pdf.service.ts)
 */
@Injectable()
export class PDFGeneratorService implements OnModuleDestroy {
	private readonly logger = new Logger(PDFGeneratorService.name)
	private browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null

	constructor() {}

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
					{ size: 'A4', style: styles.page },
					// Header
					React.createElement(
						View,
						{ style: styles.header },
						React.createElement(
							Text,
							{ style: styles.companyName },
							invoiceData.companyName || 'TenantFlow'
						),
						invoiceData.companyAddress
							? React.createElement(
									Text,
									{ style: styles.companyAddress },
									invoiceData.companyAddress
								)
							: null
					),
					// Invoice Title and Meta
					React.createElement(
						View,
						{ style: styles.invoiceMeta },
						React.createElement(Text, { style: styles.invoiceTitle }, 'INVOICE'),
						React.createElement(
							Text,
							{ style: styles.metaText },
							`Invoice #: ${invoiceData.invoiceNumber}`
						),
						React.createElement(
							Text,
							{ style: styles.metaText },
							`Date: ${new Date(invoiceData.date).toLocaleDateString()}`
						)
					),
					// Customer Info
					React.createElement(
						View,
						{ style: styles.customerInfo },
						React.createElement(Text, { style: styles.sectionTitle }, 'Bill To:'),
						React.createElement(Text, { style: styles.customerName }, invoiceData.customerName),
						React.createElement(Text, { style: styles.customerEmail }, invoiceData.customerEmail)
					),
					// Items Table
					React.createElement(
						View,
						{ style: styles.table },
						// Table Header
						React.createElement(
							View,
							{ style: styles.tableHeader },
							React.createElement(Text, { style: styles.tableColHeader }, 'Description'),
							React.createElement(
								Text,
								{ style: [styles.tableColHeader, styles.amountCol] },
								'Amount'
							)
						),
						// Table Rows
						...invoiceData.items.map(item =>
							React.createElement(
								View,
								{ key: item.description, style: styles.tableRow },
								React.createElement(Text, { style: styles.tableCol }, item.description),
								React.createElement(
									Text,
									{ style: [styles.tableCol, styles.amountCol] },
									`${item.currency.toUpperCase()} ${(item.amount / 100).toFixed(2)}`
								)
							)
						),
						// Total Row
						React.createElement(
							View,
							{ style: styles.totalRow },
							React.createElement(Text, { style: styles.totalLabel }, 'Total'),
							React.createElement(
								Text,
								{ style: [styles.totalAmount, styles.amountCol] },
								`${invoiceData.total.currency.toUpperCase()} ${(invoiceData.total.amount / 100).toFixed(2)}`
							)
						)
					),
					// Footer
					React.createElement(
						View,
						{ style: styles.footer },
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
			this.logger.error('Error generating invoice PDF:', error)
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
					{ size: 'A4', style: styles.leasePage },
					// Title
					React.createElement(
						Text,
						{ style: styles.leaseTitle },
						'RESIDENTIAL LEASE AGREEMENT'
					),
					// Property Info
					React.createElement(
						View,
						{ style: styles.propertyInfo },
						React.createElement(
							Text,
							{ style: styles.propertyLabel },
							`Property Address: ${leaseData.propertyAddress}`
						)
					),
					// Parties
					React.createElement(
						View,
						{ style: styles.leaseSection },
						React.createElement(Text, { style: styles.leaseSectionTitle }, 'PARTIES'),
						React.createElement(
							Text,
							{ style: styles.leaseText },
							`Owner: ${leaseData.ownerName}`
						),
						React.createElement(
							Text,
							{ style: styles.leaseText },
							`Tenant: ${leaseData.tenantName}`
						)
					),
					// Lease Term
					React.createElement(
						View,
						{ style: styles.leaseSection },
						React.createElement(Text, { style: styles.leaseSectionTitle }, 'LEASE TERM'),
						React.createElement(
							Text,
							{ style: styles.leaseText },
							`Start Date: ${new Date(leaseData.start_date).toLocaleDateString()}`
						),
						React.createElement(
							Text,
							{ style: styles.leaseText },
							`End Date: ${new Date(leaseData.end_date).toLocaleDateString()}`
						)
					),
					// Rent
					React.createElement(
						View,
						{ style: styles.leaseSection },
						React.createElement(Text, { style: styles.leaseSectionTitle }, 'RENT'),
						React.createElement(
							Text,
							{ style: styles.leaseText },
							`The monthly rent amount is ${leaseData.currency.toUpperCase()} ${leaseData.rent_amount.toFixed(2)}, due on the 1st day of each month.`
						)
					),
					// Terms
					leaseData.terms && leaseData.terms.length > 0
						? React.createElement(
								View,
								{ style: styles.leaseSection },
								React.createElement(
									Text,
									{ style: styles.leaseSectionTitle },
									'TERMS AND CONDITIONS'
								),
								...leaseData.terms.map((term, index) =>
									React.createElement(
										Text,
										{ key: index, style: styles.termItem },
										`${index + 1}. ${term}`
									)
								)
							)
						: null,
					// Signatures
					React.createElement(
						View,
						{ style: styles.signatures },
						React.createElement(Text, { style: styles.leaseSectionTitle }, 'SIGNATURES'),
						React.createElement(
							View,
							{ style: styles.signatureRow },
							React.createElement(
								View,
								{ style: styles.signatureBlock },
								React.createElement(View, { style: styles.signatureLine }),
								React.createElement(
									Text,
									{ style: styles.signatureLabel },
									`Owner: ${leaseData.ownerName}`
								),
								React.createElement(Text, { style: styles.signatureDate }, 'Date: _________________')
							),
							React.createElement(
								View,
								{ style: styles.signatureBlock },
								React.createElement(View, { style: styles.signatureLine }),
								React.createElement(
									Text,
									{ style: styles.signatureLabel },
									`Tenant: ${leaseData.tenantName}`
								),
								React.createElement(Text, { style: styles.signatureDate }, 'Date: _________________')
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
			this.logger.error('Error generating lease agreement PDF:', error)
			throw new InternalServerErrorException('Failed to generate lease agreement PDF')
		}
	}

	/**
	 * Generic PDF generation from React components (for future use)
	 */
	async generatePDFFromReact(document: React.ReactElement<DocumentProps>): Promise<Buffer> {
		try {
			const pdfBuffer = await renderToBuffer(document)
			this.logger.log('PDF generated successfully', {
				sizeKB: Math.round(pdfBuffer.length / 1024)
			})
			return pdfBuffer
		} catch (error) {
			this.logger.error('Error generating PDF:', error)
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

		try {
			const browser = await this.getBrowser()
			const page = await browser.newPage()

			// Set HTML content
			await page.setContent(htmlContent, { waitUntil: 'networkidle0' })

			// PDF options with defaults
			const pdfOptions: { format: "A4" | "Letter" | "Legal"; printBackground: boolean; margin: { top?: string; right?: string; bottom?: string; left?: string }; landscape: boolean; headerTemplate?: string; footerTemplate?: string } = {
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

			this.logger.log('PDF generated successfully', {
				sizeKB: Math.round(pdfBuffer.length / 1024)
			})
			return Buffer.from(pdfBuffer)
		} catch (error) {
			this.logger.error('Error generating PDF:', error)
			throw new InternalServerErrorException('Failed to generate PDF')
		}
	}

	/**
	 * Initialize browser instance
	 */
	private async getBrowser(): Promise<
		Awaited<ReturnType<typeof puppeteer.launch>>
	> {
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
					'--disable-renderer-backgrounding'
				]
			})
		}
		return this.browser
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

// Styles for Invoice PDF
const styles = StyleSheet.create({
	page: {
		padding: 30,
		fontFamily: 'Helvetica',
		fontSize: 11,
		color: '#333333'
	},
	header: {
		borderBottomWidth: 2,
		borderBottomColor: '#007bff',
		paddingBottom: 15,
		marginBottom: 25
	},
	companyName: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#007bff',
		marginBottom: 5
	},
	companyAddress: {
		fontSize: 10,
		color: '#666666'
	},
	invoiceMeta: {
		marginBottom: 25,
		alignItems: 'flex-end'
	},
	invoiceTitle: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 10
	},
	metaText: {
		fontSize: 10,
		marginBottom: 3
	},
	customerInfo: {
		marginBottom: 25
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: 'bold',
		marginBottom: 8
	},
	customerName: {
		fontSize: 11,
		marginBottom: 3
	},
	customerEmail: {
		fontSize: 10,
		color: '#666666'
	},
	table: {
		marginBottom: 25
	},
	tableHeader: {
		flexDirection: 'row',
		backgroundColor: '#f8f9fa',
		borderBottomWidth: 1,
		borderBottomColor: '#dddddd',
		paddingVertical: 8,
		paddingHorizontal: 10
	},
	tableColHeader: {
		flex: 1,
		fontSize: 10,
		fontWeight: 'bold'
	},
	tableRow: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#eeeeee',
		paddingVertical: 10,
		paddingHorizontal: 10
	},
	tableCol: {
		flex: 1,
		fontSize: 10
	},
	amountCol: {
		textAlign: 'right',
		width: 100,
		flex: 0
	},
	totalRow: {
		flexDirection: 'row',
		backgroundColor: '#f8f9fa',
		paddingVertical: 12,
		paddingHorizontal: 10,
		marginTop: 5
	},
	totalLabel: {
		flex: 1,
		fontSize: 11,
		fontWeight: 'bold'
	},
	totalAmount: {
		fontSize: 11,
		fontWeight: 'bold'
	},
	footer: {
		marginTop: 40,
		fontSize: 10,
		color: '#666666',
		textAlign: 'center'
	},
	// Lease Agreement Styles
	leasePage: {
		padding: 40,
		fontFamily: 'Times-Roman',
		fontSize: 11,
		lineHeight: 1.6,
		color: '#333333'
	},
	leaseTitle: {
		textAlign: 'center',
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 25,
		textDecoration: 'underline'
	},
	propertyInfo: {
		backgroundColor: '#f8f9fa',
		padding: 15,
		borderLeftWidth: 4,
		borderLeftColor: '#007bff',
		marginVertical: 20
	},
	propertyLabel: {
		fontSize: 11,
		fontWeight: 'bold'
	},
	leaseSection: {
		marginBottom: 20
	},
	leaseSectionTitle: {
		fontSize: 12,
		fontWeight: 'bold',
		marginBottom: 8
	},
	leaseText: {
		fontSize: 11,
		marginBottom: 5
	},
	termItem: {
		fontSize: 11,
		marginBottom: 8,
		paddingLeft: 15
	},
	signatures: {
		marginTop: 40
	},
	signatureRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 20
	},
	signatureBlock: {
		width: '45%'
	},
	signatureLine: {
		borderBottomWidth: 1,
		borderBottomColor: '#333333',
		marginBottom: 8,
		marginTop: 25
	},
	signatureLabel: {
		fontSize: 10,
		fontWeight: 'bold',
		marginBottom: 3
	},
	signatureDate: {
		fontSize: 10
	}
})
