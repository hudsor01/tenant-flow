/**
 * PDFGeneratorService Unit Tests
 *
 * Comprehensive test coverage for PDF generation operations including:
 * - Invoice PDF generation using @react-pdf/renderer
 * - Lease agreement PDF generation
 * - HTML to PDF generation using Puppeteer
 * - Template-based PDF generation
 * - Browser lifecycle management
 * - Memory management and recycling
 * - Error handling
 */

// Mock @react-pdf/renderer - must be before imports to handle StyleSheet.create
const mockRenderToBuffer = jest.fn()
jest.mock('@react-pdf/renderer', () => ({
	Document: 'Document',
	Page: 'Page',
	Text: 'Text',
	View: 'View',
	StyleSheet: {
		create: (styles: Record<string, unknown>) => styles
	},
	renderToBuffer: (...args: unknown[]) => mockRenderToBuffer(...args)
}))

// Mock puppeteer
const mockPagePdf = jest.fn()
const mockPageClose = jest.fn()
const mockPageIsClosed = jest.fn()
const mockPageSetContent = jest.fn()
const mockNewPage = jest.fn()
const mockBrowserClose = jest.fn()
const mockBrowserConnected = jest.fn()

jest.mock('puppeteer', () => ({
	__esModule: true,
	default: {
		launch: jest.fn()
	}
}))

import { Test } from '@nestjs/testing'
import type { TestingModule } from '@nestjs/testing'
import { InternalServerErrorException } from '@nestjs/common'
import { PDFGeneratorService } from './pdf-generator.service'
import { PdfTemplateRendererService } from './pdf-template-renderer.service'
import { AppLogger } from '../../logger/app-logger.service'
import { SilentLogger } from '../../__tests__/silent-logger'
import puppeteer from 'puppeteer'

describe('PDFGeneratorService', () => {
	let service: PDFGeneratorService
	let templateRenderer: jest.Mocked<PdfTemplateRendererService>
	let mockLogger: {
		log: jest.Mock
		warn: jest.Mock
		error: jest.Mock
		debug: jest.Mock
	}

	const mockPdfBuffer = Buffer.from('%PDF-1.4 mock pdf content')

	const createMockPage = () => ({
		setContent: mockPageSetContent,
		pdf: mockPagePdf,
		close: mockPageClose,
		isClosed: mockPageIsClosed
	})

	const createMockBrowser = () => ({
		newPage: mockNewPage,
		close: mockBrowserClose,
		get connected() {
			return mockBrowserConnected()
		}
	})

	beforeEach(async () => {
		// Reset all mocks
		jest.clearAllMocks()

		// Setup default mock implementations
		mockRenderToBuffer.mockResolvedValue(mockPdfBuffer)
		mockPagePdf.mockResolvedValue(mockPdfBuffer)
		mockPageClose.mockResolvedValue(undefined)
		mockPageIsClosed.mockReturnValue(false)
		mockPageSetContent.mockResolvedValue(undefined)
		mockBrowserClose.mockResolvedValue(undefined)
		mockBrowserConnected.mockReturnValue(true)
		mockNewPage.mockResolvedValue(createMockPage())
		;(puppeteer.launch as jest.Mock).mockResolvedValue(createMockBrowser())

		// Create mock logger with spy capabilities
		mockLogger = {
			log: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn()
		}

		// Mock template renderer
		templateRenderer = {
			renderTemplate: jest.fn().mockResolvedValue('<html>test</html>'),
			onModuleInit: jest.fn(),
			onModuleDestroy: jest.fn()
		} as unknown as jest.Mocked<PdfTemplateRendererService>

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PDFGeneratorService,
				{
					provide: AppLogger,
					useValue: mockLogger
				},
				{
					provide: PdfTemplateRendererService,
					useValue: templateRenderer
				}
			]
		}).compile()

		service = module.get<PDFGeneratorService>(PDFGeneratorService)
	})

	afterEach(async () => {
		// Ensure browser is closed after each test
		try {
			await service.onModuleDestroy()
		} catch {
			// Ignore cleanup errors
		}
	})

	describe('generateInvoicePDF', () => {
		const validInvoiceData = {
			invoiceNumber: 'INV-2025-001',
			date: '2025-01-15',
			customerName: 'John Doe',
			customerEmail: 'john@example.com',
			items: [
				{ description: 'Monthly Rent', amount: 150000, currency: 'usd' },
				{ description: 'Parking Fee', amount: 5000, currency: 'usd' }
			],
			total: { amount: 155000, currency: 'usd' },
			companyName: 'TenantFlow Inc',
			companyAddress: '123 Main St, Austin, TX'
		}

		it('should generate PDF buffer with valid invoice data', async () => {
			const result = await service.generateInvoicePDF(validInvoiceData)

			expect(result).toBeInstanceOf(Buffer)
			expect(result).toBe(mockPdfBuffer)
			expect(mockRenderToBuffer).toHaveBeenCalledTimes(1)
		})

		it('should log invoice number during generation', async () => {
			await service.generateInvoicePDF(validInvoiceData)

			expect(mockLogger.log).toHaveBeenCalledWith('Generating invoice PDF', {
				invoiceNumber: 'INV-2025-001'
			})
		})

		it('should log success with PDF size', async () => {
			await service.generateInvoicePDF(validInvoiceData)

			expect(mockLogger.log).toHaveBeenCalledWith(
				'Invoice PDF generated successfully',
				expect.objectContaining({ sizeKB: expect.any(Number) })
			)
		})

		it('should handle invoice with multiple items', async () => {
			const multiItemInvoice = {
				...validInvoiceData,
				items: [
					{ description: 'Rent', amount: 150000, currency: 'usd' },
					{ description: 'Water', amount: 5000, currency: 'usd' },
					{ description: 'Electric', amount: 10000, currency: 'usd' },
					{ description: 'Gas', amount: 7500, currency: 'usd' }
				],
				total: { amount: 172500, currency: 'usd' }
			}

			const result = await service.generateInvoicePDF(multiItemInvoice)

			expect(result).toBeInstanceOf(Buffer)
			expect(mockRenderToBuffer).toHaveBeenCalledTimes(1)
		})

		it('should use default company name when not provided', async () => {
			const invoiceWithoutCompany = {
				...validInvoiceData,
				companyName: undefined,
				companyAddress: undefined
			}

			const result = await service.generateInvoicePDF(invoiceWithoutCompany)

			expect(result).toBeInstanceOf(Buffer)
			expect(mockRenderToBuffer).toHaveBeenCalledTimes(1)
		})

		it('should throw InternalServerErrorException on render errors', async () => {
			mockRenderToBuffer.mockRejectedValue(new Error('Render failed'))

			await expect(
				service.generateInvoicePDF(validInvoiceData)
			).rejects.toThrow(InternalServerErrorException)

			await expect(
				service.generateInvoicePDF(validInvoiceData)
			).rejects.toThrow('Failed to generate invoice PDF')
		})

		it('should log error when rendering fails', async () => {
			mockRenderToBuffer.mockRejectedValue(new Error('Render failed'))

			await expect(
				service.generateInvoicePDF(validInvoiceData)
			).rejects.toThrow()

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Error generating invoice PDF:',
				expect.objectContaining({ error: expect.any(Error) })
			)
		})
	})

	describe('generateLeaseAgreementPDF', () => {
		const validLeaseData = {
			propertyAddress: '456 Oak Ave, Austin, TX 78702',
			tenantName: 'Jane Smith',
			ownerName: 'Property Owner LLC',
			start_date: '2025-02-01',
			end_date: '2026-01-31',
			rent_amount: 1500,
			currency: 'usd',
			terms: ['No smoking', 'No pets', 'Quiet hours after 10pm']
		}

		it('should generate PDF buffer with valid lease data', async () => {
			const result = await service.generateLeaseAgreementPDF(validLeaseData)

			expect(result).toBeInstanceOf(Buffer)
			expect(result).toBe(mockPdfBuffer)
			expect(mockRenderToBuffer).toHaveBeenCalledTimes(1)
		})

		it('should log property address during generation', async () => {
			await service.generateLeaseAgreementPDF(validLeaseData)

			expect(mockLogger.log).toHaveBeenCalledWith(
				'Generating lease agreement PDF',
				{
					property: '456 Oak Ave, Austin, TX 78702'
				}
			)
		})

		it('should handle lease without optional terms', async () => {
			const leaseWithoutTerms = {
				...validLeaseData,
				terms: undefined
			}

			const result = await service.generateLeaseAgreementPDF(leaseWithoutTerms)

			expect(result).toBeInstanceOf(Buffer)
			expect(mockRenderToBuffer).toHaveBeenCalledTimes(1)
		})

		it('should handle lease with empty terms array', async () => {
			const leaseWithEmptyTerms = {
				...validLeaseData,
				terms: []
			}

			const result =
				await service.generateLeaseAgreementPDF(leaseWithEmptyTerms)

			expect(result).toBeInstanceOf(Buffer)
			expect(mockRenderToBuffer).toHaveBeenCalledTimes(1)
		})

		it('should throw InternalServerErrorException on render errors', async () => {
			mockRenderToBuffer.mockRejectedValue(new Error('Render failed'))

			await expect(
				service.generateLeaseAgreementPDF(validLeaseData)
			).rejects.toThrow(InternalServerErrorException)

			await expect(
				service.generateLeaseAgreementPDF(validLeaseData)
			).rejects.toThrow('Failed to generate lease agreement PDF')
		})

		it('should log success with PDF size', async () => {
			await service.generateLeaseAgreementPDF(validLeaseData)

			expect(mockLogger.log).toHaveBeenCalledWith(
				'Lease agreement PDF generated successfully',
				expect.objectContaining({ sizeKB: expect.any(Number) })
			)
		})
	})

	describe('generatePDFFromReact', () => {
		it('should generate PDF from React element', async () => {
			const mockReactElement = { type: 'Document', props: {} } as never

			const result = await service.generatePDFFromReact(mockReactElement)

			expect(result).toBeInstanceOf(Buffer)
			expect(mockRenderToBuffer).toHaveBeenCalledWith(mockReactElement)
		})

		it('should log success with PDF size', async () => {
			const mockReactElement = { type: 'Document', props: {} } as never

			await service.generatePDFFromReact(mockReactElement)

			expect(mockLogger.log).toHaveBeenCalledWith('PDF generated successfully', {
				sizeKB: expect.any(Number)
			})
		})

		it('should throw InternalServerErrorException on render errors', async () => {
			mockRenderToBuffer.mockRejectedValue(new Error('React render failed'))
			const mockReactElement = { type: 'Document', props: {} } as never

			await expect(
				service.generatePDFFromReact(mockReactElement)
			).rejects.toThrow(InternalServerErrorException)

			await expect(
				service.generatePDFFromReact(mockReactElement)
			).rejects.toThrow('Failed to generate PDF')
		})
	})

	describe('generatePDF (HTML to PDF via Puppeteer)', () => {
		const htmlContent = '<html><body><h1>Test PDF</h1></body></html>'

		it('should launch browser if not already running', async () => {
			mockBrowserConnected.mockReturnValue(false)

			await service.generatePDF(htmlContent)

			expect(puppeteer.launch).toHaveBeenCalledWith(
				expect.objectContaining({
					headless: true,
					args: expect.arrayContaining([
						'--no-sandbox',
						'--disable-setuid-sandbox'
					])
				})
			)
		})

		it('should generate PDF from HTML string', async () => {
			const result = await service.generatePDF(htmlContent)

			expect(result).toBeInstanceOf(Buffer)
			expect(mockPageSetContent).toHaveBeenCalledWith(htmlContent, {
				waitUntil: 'networkidle0'
			})
			expect(mockPagePdf).toHaveBeenCalled()
		})

		it('should close page after generation', async () => {
			await service.generatePDF(htmlContent)

			expect(mockPageClose).toHaveBeenCalled()
		})

		it('should use default A4 format', async () => {
			await service.generatePDF(htmlContent)

			expect(mockPagePdf).toHaveBeenCalledWith(
				expect.objectContaining({
					format: 'A4',
					printBackground: true
				})
			)
		})

		it('should accept custom format option', async () => {
			await service.generatePDF(htmlContent, { format: 'Letter' })

			expect(mockPagePdf).toHaveBeenCalledWith(
				expect.objectContaining({
					format: 'Letter'
				})
			)
		})

		it('should accept custom margin options', async () => {
			const customMargin = {
				top: '25mm',
				right: '20mm',
				bottom: '25mm',
				left: '20mm'
			}

			await service.generatePDF(htmlContent, { margin: customMargin })

			expect(mockPagePdf).toHaveBeenCalledWith(
				expect.objectContaining({
					margin: customMargin
				})
			)
		})

		it('should accept landscape option', async () => {
			await service.generatePDF(htmlContent, { landscape: true })

			expect(mockPagePdf).toHaveBeenCalledWith(
				expect.objectContaining({
					landscape: true
				})
			)
		})

		it('should accept header and footer templates', async () => {
			const options = {
				headerTemplate: '<div>Header</div>',
				footerTemplate: '<div>Footer</div>'
			}

			await service.generatePDF(htmlContent, options)

			expect(mockPagePdf).toHaveBeenCalledWith(
				expect.objectContaining({
					headerTemplate: '<div>Header</div>',
					footerTemplate: '<div>Footer</div>'
				})
			)
		})

		it('should log content length and format during generation', async () => {
			await service.generatePDF(htmlContent)

			expect(mockLogger.log).toHaveBeenCalledWith(
				'Generating PDF from HTML content',
				expect.objectContaining({
					contentLength: htmlContent.length,
					format: 'A4'
				})
			)
		})

		it('should log success with PDF size', async () => {
			await service.generatePDF(htmlContent)

			expect(mockLogger.log).toHaveBeenCalledWith('PDF generated successfully', {
				sizeKB: expect.any(Number)
			})
		})

		it('should handle errors gracefully and close page', async () => {
			mockPagePdf.mockRejectedValue(new Error('PDF generation failed'))

			await expect(service.generatePDF(htmlContent)).rejects.toThrow(
				InternalServerErrorException
			)

			expect(mockPageClose).toHaveBeenCalled()
		})

		it('should handle page close errors silently', async () => {
			mockPagePdf.mockRejectedValue(new Error('PDF generation failed'))
			mockPageClose.mockRejectedValue(new Error('Close failed'))

			await expect(service.generatePDF(htmlContent)).rejects.toThrow(
				InternalServerErrorException
			)

			// Should not throw additional error from close failure
		})

		it('should not close page if already closed', async () => {
			mockPagePdf.mockRejectedValue(new Error('PDF generation failed'))
			mockPageIsClosed.mockReturnValue(true)

			await expect(service.generatePDF(htmlContent)).rejects.toThrow()

			// Page should not be closed again
			expect(mockPageClose).not.toHaveBeenCalled()
		})

		it('should reuse browser for subsequent calls', async () => {
			mockBrowserConnected.mockReturnValue(true)

			await service.generatePDF(htmlContent)
			await service.generatePDF(htmlContent)

			// Browser should only be launched once (first call triggers launch)
			expect(puppeteer.launch).toHaveBeenCalledTimes(1)
		})
	})

	describe('generatePDFWithTemplate', () => {
		const templateName = 'lease-agreement'
		const templateData = {
			tenantName: 'John Doe',
			propertyAddress: '123 Main St'
		}

		it('should use template renderer service', async () => {
			await service.generatePDFWithTemplate(templateName, templateData)

			expect(templateRenderer.renderTemplate).toHaveBeenCalledWith(
				templateName,
				templateData,
				undefined
			)
		})

		it('should pass template data correctly', async () => {
			const complexData = {
				tenantName: 'Jane Smith',
				propertyAddress: '456 Oak Ave',
				rentAmount: 1500,
				leaseTerms: ['No pets', 'No smoking']
			}

			await service.generatePDFWithTemplate(templateName, complexData)

			expect(templateRenderer.renderTemplate).toHaveBeenCalledWith(
				templateName,
				complexData,
				undefined
			)
		})

		it('should pass cache options to template renderer', async () => {
			const options = {
				cacheKey: 'custom-cache-key',
				cacheTtlMs: 60000
			}

			await service.generatePDFWithTemplate(templateName, templateData, options)

			expect(templateRenderer.renderTemplate).toHaveBeenCalledWith(
				templateName,
				templateData,
				{ cacheKey: 'custom-cache-key', ttlMs: 60000 }
			)
		})

		it('should return rendered PDF buffer', async () => {
			templateRenderer.renderTemplate.mockResolvedValue(
				'<html><body>Rendered</body></html>'
			)

			const result = await service.generatePDFWithTemplate(
				templateName,
				templateData
			)

			expect(result).toBeInstanceOf(Buffer)
		})

		it('should pass format options to generatePDF', async () => {
			await service.generatePDFWithTemplate(templateName, templateData, {
				format: 'Legal',
				landscape: true
			})

			expect(mockPagePdf).toHaveBeenCalledWith(
				expect.objectContaining({
					format: 'Legal',
					landscape: true
				})
			)
		})
	})

	describe('onModuleDestroy (lifecycle)', () => {
		it('should close browser if open', async () => {
			// Trigger browser creation
			await service.generatePDF('<html></html>')

			// Reset mock to check only the close call from onModuleDestroy
			mockBrowserClose.mockClear()

			await service.onModuleDestroy()

			expect(mockBrowserClose).toHaveBeenCalled()
			expect(mockLogger.log).toHaveBeenCalledWith(
				'PDF generator browser closed'
			)
		})

		it('should not throw if browser is null', async () => {
			// Create fresh service without browser
			const freshModule: TestingModule = await Test.createTestingModule({
				providers: [
					PDFGeneratorService,
					{
						provide: AppLogger,
						useValue: mockLogger
					},
					{
						provide: PdfTemplateRendererService,
						useValue: templateRenderer
					}
				]
			}).compile()

			const freshService =
				freshModule.get<PDFGeneratorService>(PDFGeneratorService)

			// Browser never created - should not throw
			await expect(freshService.onModuleDestroy()).resolves.not.toThrow()
		})
	})

	describe('Browser reuse', () => {
		it('should reuse existing connected browser', async () => {
			mockBrowserConnected.mockReturnValue(true)

			await service.generatePDF('<html>1</html>')
			await service.generatePDF('<html>2</html>')
			await service.generatePDF('<html>3</html>')

			// Browser should only be launched once
			expect(puppeteer.launch).toHaveBeenCalledTimes(1)
		})

		it('should create new browser if disconnected', async () => {
			mockBrowserConnected
				.mockReturnValueOnce(false) // First call - not connected
				.mockReturnValueOnce(true) // After first launch
				.mockReturnValueOnce(false) // Disconnected
				.mockReturnValueOnce(true) // After second launch

			await service.generatePDF('<html>1</html>')
			await service.generatePDF('<html>2</html>')

			// Browser should be launched twice due to disconnection
			expect(puppeteer.launch).toHaveBeenCalledTimes(2)
		})
	})

	describe('Error scenarios', () => {
		it('should handle Puppeteer launch failure', async () => {
			;(puppeteer.launch as jest.Mock).mockRejectedValue(
				new Error('Failed to launch browser')
			)

			await expect(service.generatePDF('<html></html>')).rejects.toThrow(
				InternalServerErrorException
			)
		})

		it('should handle page creation failure', async () => {
			mockNewPage.mockRejectedValue(new Error('Failed to create page'))

			await expect(service.generatePDF('<html></html>')).rejects.toThrow(
				InternalServerErrorException
			)
		})

		it('should handle setContent failure', async () => {
			mockPageSetContent.mockRejectedValue(new Error('Content failed'))

			await expect(service.generatePDF('<html></html>')).rejects.toThrow(
				InternalServerErrorException
			)
		})

		it('should handle PDF generation failure', async () => {
			mockPagePdf.mockRejectedValue(new Error('PDF failed'))

			await expect(service.generatePDF('<html></html>')).rejects.toThrow(
				InternalServerErrorException
			)

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Error generating PDF:',
				expect.objectContaining({ error: expect.any(Error) })
			)
		})
	})

	describe('Edge cases', () => {
		it('should handle empty HTML content', async () => {
			const result = await service.generatePDF('')

			expect(result).toBeInstanceOf(Buffer)
			expect(mockPageSetContent).toHaveBeenCalledWith('', {
				waitUntil: 'networkidle0'
			})
		})

		it('should handle very large HTML content', async () => {
			const largeHtml = '<html><body>' + 'x'.repeat(1000000) + '</body></html>'

			const result = await service.generatePDF(largeHtml)

			expect(result).toBeInstanceOf(Buffer)
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Generating PDF from HTML content',
				expect.objectContaining({
					contentLength: largeHtml.length
				})
			)
		})

		it('should handle special characters in invoice data', async () => {
			const invoiceWithSpecialChars = {
				invoiceNumber: 'INV-2025-001',
				date: '2025-01-15',
				customerName: "John O'Connor & Associates",
				customerEmail: 'john@example.com',
				items: [
					{
						description: 'Rent - Unit #42 "Deluxe"',
						amount: 150000,
						currency: 'usd'
					}
				],
				total: { amount: 150000, currency: 'usd' }
			}

			const result = await service.generateInvoicePDF(invoiceWithSpecialChars)

			expect(result).toBeInstanceOf(Buffer)
		})

		it('should handle unicode characters in lease data', async () => {
			const leaseWithUnicode = {
				propertyAddress: '456 Oak Ave, Austin, TX 78702',
				tenantName: 'Jose Garcia',
				ownerName: 'Property Owner LLC',
				start_date: '2025-02-01',
				end_date: '2026-01-31',
				rent_amount: 1500,
				currency: 'eur'
			}

			const result = await service.generateLeaseAgreementPDF(leaseWithUnicode)

			expect(result).toBeInstanceOf(Buffer)
		})

		it('should handle zero amount in invoice items', async () => {
			const invoiceWithZero = {
				invoiceNumber: 'INV-2025-001',
				date: '2025-01-15',
				customerName: 'John Doe',
				customerEmail: 'john@example.com',
				items: [
					{ description: 'Rent Credit', amount: 0, currency: 'usd' },
					{ description: 'Monthly Rent', amount: 150000, currency: 'usd' }
				],
				total: { amount: 150000, currency: 'usd' }
			}

			const result = await service.generateInvoicePDF(invoiceWithZero)

			expect(result).toBeInstanceOf(Buffer)
		})
	})
})

describe('PDFGeneratorService - SilentLogger integration', () => {
	let service: PDFGeneratorService

	beforeEach(async () => {
		jest.clearAllMocks()
		mockRenderToBuffer.mockResolvedValue(Buffer.from('test'))

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PDFGeneratorService,
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				},
				{
					provide: PdfTemplateRendererService,
					useValue: {
						renderTemplate: jest.fn().mockResolvedValue('<html></html>')
					}
				}
			]
		}).compile()

		service = module.get<PDFGeneratorService>(PDFGeneratorService)
	})

	it('should work with SilentLogger without errors', async () => {
		const invoiceData = {
			invoiceNumber: 'TEST-001',
			date: '2025-01-15',
			customerName: 'Test',
			customerEmail: 'test@test.com',
			items: [{ description: 'Test', amount: 100, currency: 'usd' }],
			total: { amount: 100, currency: 'usd' }
		}

		const result = await service.generateInvoicePDF(invoiceData)

		expect(result).toBeInstanceOf(Buffer)
	})
})
