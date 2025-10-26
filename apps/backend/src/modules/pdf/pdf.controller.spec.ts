import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { PDFController } from './pdf.controller'
import { LeasePDFService } from './lease-pdf.service'

describe('PDFController', () => {
	let controller: PDFController
	let leasePdfService: jest.Mocked<LeasePDFService>

	beforeEach(async () => {
		// Mock LeasePDFService
		const mockLeasePdfService = {
			generateLeasePdfFromTemplate: jest.fn()
		}

		const module: TestingModule = await Test.createTestingModule({
			controllers: [PDFController],
			providers: [
				{
					provide: LeasePDFService,
					useValue: mockLeasePdfService
				}
			]
		}).compile()

		controller = module.get<PDFController>(PDFController)
		leasePdfService = module.get(LeasePDFService)
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})

	describe('health', () => {
		it('should return health status', async () => {
			const result = await controller.health()

			expect(result).toEqual({
				status: 'ok',
				message: 'PDF service is running'
			})
		})

		it('should return consistent health response', async () => {
			const result1 = await controller.health()
			const result2 = await controller.health()

			expect(result1).toEqual(result2)
			expect(result1.status).toBe('ok')
			expect(result1.message).toBe('PDF service is running')
		})
	})

	describe('generateLeaseTemplatePreview', () => {
		it('should generate PDF preview and return base64', async () => {
			const mockPdfBuffer = Buffer.from('mock-pdf-content')
			leasePdfService.generateLeasePdfFromTemplate.mockResolvedValue(mockPdfBuffer)

			const selections = {
				state: 'CA',
				selectedClauses: ['rent-amount', 'security-deposit'],
				includeFederalDisclosures: true,
				includeStateDisclosures: true,
				customClauses: []
			}

			const context = {
				landlordName: 'Test Landlord',
				landlordAddress: '123 Test St',
				tenantNames: 'Test Tenant',
				propertyAddress: '456 Rental Ave',
				propertyState: 'CA',
				rentAmountCents: 200000,
				securityDepositCents: 200000,
				rentDueDay: 1,
				leaseStartDateISO: '2025-01-01',
				leaseEndDateISO: '2025-12-31',
				lateFeeAmountCents: 5000,
				gracePeriodDays: 3
			}

			const result = await controller.generateLeaseTemplatePreview({ selections, context })

			expect(leasePdfService.generateLeasePdfFromTemplate).toHaveBeenCalledWith(
				selections,
				context
			)
			expect(result).toEqual({
				pdf: mockPdfBuffer.toString('base64')
			})
		})

		it('should handle PDF generation errors', async () => {
			leasePdfService.generateLeasePdfFromTemplate.mockRejectedValue(
				new Error('PDF generation failed')
			)

			const selections = {
				state: 'CA',
				selectedClauses: [],
				includeFederalDisclosures: true,
				includeStateDisclosures: true,
				customClauses: []
			}

			const context = {
				landlordName: 'Test',
				landlordAddress: 'Test',
				tenantNames: 'Test',
				propertyAddress: 'Test',
				propertyState: 'CA',
				rentAmountCents: 100000,
				securityDepositCents: 100000,
				rentDueDay: 1,
				leaseStartDateISO: '2025-01-01',
				leaseEndDateISO: '2025-12-31',
				lateFeeAmountCents: 0,
				gracePeriodDays: 0
			}

			await expect(
				controller.generateLeaseTemplatePreview({ selections, context })
			).rejects.toThrow('PDF generation failed')
		})
	})
})
