import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import type { Response } from 'express'

import { DocumentTemplateController } from './document-template.controller'
import { PDFGeneratorService } from './pdf-generator.service'
import { DocumentTemplateStorageService } from '../documents/document-template-storage.service'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'

describe('DocumentTemplateController', () => {
	let controller: DocumentTemplateController
	let pdfGeneratorMock: jest.Mocked<PDFGeneratorService>
	let storageMock: jest.Mocked<DocumentTemplateStorageService>

	const mockUser = { id: 'user-123', email: 'test@example.com' }
	const mockReq = { user: mockUser } as AuthenticatedRequest
	const mockPdfBuffer = Buffer.from('mock-pdf-content')

	beforeEach(async () => {
		pdfGeneratorMock = {
			generatePDFWithTemplate: jest.fn().mockResolvedValue(mockPdfBuffer)
		} as unknown as jest.Mocked<PDFGeneratorService>

		storageMock = {
			uploadTemplatePdf: jest.fn().mockResolvedValue({
				publicUrl: 'https://storage.example.com/file.pdf',
				path: 'owners/user-123/templates/test/file.pdf',
				bucket: 'document-templates'
			}),
			uploadTemplateDefinition: jest.fn().mockResolvedValue({
				publicUrl: 'https://storage.example.com/definition.json',
				path: 'owners/user-123/templates/test/definition.json',
				bucket: 'document-templates'
			}),
			getTemplateDefinition: jest.fn().mockResolvedValue(null)
		} as unknown as jest.Mocked<DocumentTemplateStorageService>

		const module: TestingModule = await Test.createTestingModule({
			controllers: [DocumentTemplateController],
			providers: [
				{ provide: PDFGeneratorService, useValue: pdfGeneratorMock },
				{ provide: DocumentTemplateStorageService, useValue: storageMock }
			]
		})
			.overrideGuard(JwtAuthGuard)
			.useValue({ canActivate: () => true })
			.compile()

		controller = module.get<DocumentTemplateController>(DocumentTemplateController)
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})

	describe('previewTemplate', () => {
		const createMockResponse = () => {
			const res = {
				setHeader: jest.fn(),
				send: jest.fn()
			} as unknown as Response
			return res
		}

		it('should generate PDF preview for valid template', async () => {
			const res = createMockResponse()
			await controller.previewTemplate(
				'property-inspection',
				{ templateTitle: 'Test Inspection' },
				res
			)

			expect(pdfGeneratorMock.generatePDFWithTemplate).toHaveBeenCalledWith(
				'property-inspection',
				expect.objectContaining({
					templateTitle: 'Test Inspection',
					branding: expect.any(Object)
				})
			)
			expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf')
			expect(res.send).toHaveBeenCalledWith(mockPdfBuffer)
		})

		it('should throw BadRequestException for invalid template', async () => {
			const res = createMockResponse()
			await expect(
				controller.previewTemplate('invalid-template', {}, res)
			).rejects.toThrow(BadRequestException)
		})

		it('should use default title when not provided', async () => {
			const res = createMockResponse()
			await controller.previewTemplate('maintenance-request', {}, res)

			expect(pdfGeneratorMock.generatePDFWithTemplate).toHaveBeenCalledWith(
				'maintenance-request',
				expect.objectContaining({
					templateTitle: 'Maintenance Request Form'
				})
			)
		})
	})

	describe('exportTemplate', () => {
		it('should generate and upload PDF for valid template', async () => {
			const result = await controller.exportTemplate(
				mockReq,
				'rental-application',
				{ templateTitle: 'My Application' }
			)

			expect(storageMock.uploadTemplatePdf).toHaveBeenCalledWith(
				'user-123',
				'rental-application',
				mockPdfBuffer
			)
			expect(result).toEqual({
				downloadUrl: 'https://storage.example.com/file.pdf',
				path: 'owners/user-123/templates/test/file.pdf',
				bucket: 'document-templates'
			})
		})

		it('should throw BadRequestException for invalid template', async () => {
			await expect(
				controller.exportTemplate(mockReq, 'not-a-template', {})
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('getTemplateDefinition', () => {
		it('should return empty fields when no definition exists', async () => {
			const result = await controller.getTemplateDefinition(
				mockReq,
				'tenant-notice'
			)

			expect(result).toEqual({ fields: [] })
			expect(storageMock.getTemplateDefinition).toHaveBeenCalledWith(
				'user-123',
				'tenant-notice'
			)
		})

		it('should return stored fields when definition exists', async () => {
			const mockFields = [
				{ name: 'customField1', label: 'Custom Field', type: 'text' }
			]
			storageMock.getTemplateDefinition.mockResolvedValueOnce({ fields: mockFields })

			const result = await controller.getTemplateDefinition(
				mockReq,
				'tenant-notice'
			)

			expect(result).toEqual({ fields: mockFields })
		})

		it('should throw BadRequestException for invalid template', async () => {
			await expect(
				controller.getTemplateDefinition(mockReq, 'fake-template')
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('saveTemplateDefinition', () => {
		it('should save template definition', async () => {
			const fields = [{ name: 'test', label: 'Test', type: 'text' as const }]
			const result = await controller.saveTemplateDefinition(
				mockReq,
				'property-inspection',
				{ fields }
			)

			expect(storageMock.uploadTemplateDefinition).toHaveBeenCalledWith(
				'user-123',
				'property-inspection',
				{ fields }
			)
			expect(result).toEqual({
				path: 'owners/user-123/templates/test/definition.json',
				bucket: 'document-templates'
			})
		})

		it('should handle empty fields array', async () => {
			await controller.saveTemplateDefinition(
				mockReq,
				'property-inspection',
				{ fields: [] }
			)

			expect(storageMock.uploadTemplateDefinition).toHaveBeenCalledWith(
				'user-123',
				'property-inspection',
				{ fields: [] }
			)
		})

		it('should throw BadRequestException for invalid template', async () => {
			await expect(
				controller.saveTemplateDefinition(mockReq, 'bad-template', {})
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('sanitizeBranding', () => {
		it('should sanitize CSS injection attempts in color', async () => {
			const res = {
				setHeader: jest.fn(),
				send: jest.fn()
			} as unknown as Response

			// Test with malicious CSS injection
			await controller.previewTemplate(
				'property-inspection',
				{
					branding: {
						primaryColor: 'red; background: url(evil.com)'
					}
				},
				res
			)

			// Verify sanitized branding was passed to PDF generator
			expect(pdfGeneratorMock.generatePDFWithTemplate).toHaveBeenCalledWith(
				'property-inspection',
				expect.objectContaining({
					branding: expect.objectContaining({
						primaryColor: '#1f3b66' // Default color used instead
					})
				})
			)
		})

		it('should allow valid hex colors', async () => {
			const res = {
				setHeader: jest.fn(),
				send: jest.fn()
			} as unknown as Response

			await controller.previewTemplate(
				'property-inspection',
				{
					branding: {
						primaryColor: '#ff5500'
					}
				},
				res
			)

			expect(pdfGeneratorMock.generatePDFWithTemplate).toHaveBeenCalledWith(
				'property-inspection',
				expect.objectContaining({
					branding: expect.objectContaining({
						primaryColor: '#ff5500'
					})
				})
			)
		})

		it('should allow valid OKLCH colors', async () => {
			const res = {
				setHeader: jest.fn(),
				send: jest.fn()
			} as unknown as Response

			await controller.previewTemplate(
				'property-inspection',
				{
					branding: {
						primaryColor: 'oklch(0.35 0.08 250)'
					}
				},
				res
			)

			expect(pdfGeneratorMock.generatePDFWithTemplate).toHaveBeenCalledWith(
				'property-inspection',
				expect.objectContaining({
					branding: expect.objectContaining({
						primaryColor: 'oklch(0.35 0.08 250)'
					})
				})
			)
		})

		it('should allow valid named colors', async () => {
			const res = {
				setHeader: jest.fn(),
				send: jest.fn()
			} as unknown as Response

			await controller.previewTemplate(
				'property-inspection',
				{
					branding: {
						primaryColor: 'steelblue'
					}
				},
				res
			)

			expect(pdfGeneratorMock.generatePDFWithTemplate).toHaveBeenCalledWith(
				'property-inspection',
				expect.objectContaining({
					branding: expect.objectContaining({
						primaryColor: 'steelblue'
					})
				})
			)
		})

		it('should truncate long company names', async () => {
			const res = {
				setHeader: jest.fn(),
				send: jest.fn()
			} as unknown as Response

			const longName = 'A'.repeat(300)
			await controller.previewTemplate(
				'property-inspection',
				{
					branding: {
						companyName: longName
					}
				},
				res
			)

			expect(pdfGeneratorMock.generatePDFWithTemplate).toHaveBeenCalledWith(
				'property-inspection',
				expect.objectContaining({
					branding: expect.objectContaining({
						companyName: 'A'.repeat(200) // Truncated to 200 chars
					})
				})
			)
		})
	})

	describe('template types', () => {
		it.each([
			['property-inspection', 'Property Inspection Report'],
			['rental-application', 'Rental Application'],
			['tenant-notice', 'Tenant Notice'],
			['maintenance-request', 'Maintenance Request Form']
		])('should support %s template with title "%s"', async (template, title) => {
			const res = {
				setHeader: jest.fn(),
				send: jest.fn()
			} as unknown as Response

			await controller.previewTemplate(template, {}, res)

			expect(pdfGeneratorMock.generatePDFWithTemplate).toHaveBeenCalledWith(
				template,
				expect.objectContaining({
					templateTitle: title
				})
			)
		})
	})
})
