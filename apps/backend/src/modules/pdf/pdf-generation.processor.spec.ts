import { Test, TestingModule } from '@nestjs/testing'
import { Job } from 'bullmq'
import { PdfGenerationProcessor } from './pdf-generation.processor'
import { LeasePdfGeneratorService } from './lease-pdf-generator.service'
import { LeasePdfMapperService } from './lease-pdf-mapper.service'
import { PdfStorageService } from './pdf-storage.service'
import { LeasesService } from '../leases/leases.service'
import { AppLogger } from '../../logger/app-logger.service'

/**
 * TDD Test Suite for PDF Generation Queue Processor
 *
 * Testing Strategy:
 * 1. Test job processing success path
 * 2. Test error handling and retries
 * 3. Test PDF upload and database update
 */
describe('PdfGenerationProcessor (TDD)', () => {
	let processor: PdfGenerationProcessor
	let mockPdfGenerator: jest.Mocked<LeasePdfGeneratorService>
	let mockPdfMapper: jest.Mocked<LeasePdfMapperService>
	let mockPdfStorage: jest.Mocked<PdfStorageService>
	let mockLeasesService: jest.Mocked<LeasesService>
	let mockLogger: jest.Mocked<AppLogger>

	beforeEach(async () => {
		// Create mocks
		mockPdfGenerator = {
			generateFilledPdf: jest.fn()
		} as any

		mockPdfMapper = {
			mapLeaseToPdfFields: jest.fn()
		} as any

		mockPdfStorage = {
			uploadLeasePdf: jest.fn(),
			getLeasePdfUrl: jest.fn()
		} as any

		mockLeasesService = {
			getLeaseDataForPdf: jest.fn()
		} as any

		mockLogger = {
			log: jest.fn(),
			error: jest.fn()
		} as any

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PdfGenerationProcessor,
				{ provide: LeasePdfGeneratorService, useValue: mockPdfGenerator },
				{ provide: LeasePdfMapperService, useValue: mockPdfMapper },
				{ provide: PdfStorageService, useValue: mockPdfStorage },
				{ provide: LeasesService, useValue: mockLeasesService },
				{ provide: AppLogger, useValue: mockLogger }
			]
		}).compile()

		processor = module.get<PdfGenerationProcessor>(PdfGenerationProcessor)
	})

	describe('process()', () => {
		it('should generate PDF and upload to storage', async () => {
			// Arrange
			const leaseId = '123e4567-e89b-12d3-a456-426614174000'
			const token = 'test-jwt-token'
			const pdfBuffer = Buffer.from('fake-pdf-content')
			const pdfUrl = 'https://storage.supabase.co/leases/123/lease.pdf'

			const mockJob = {
				id: 'job-1',
				data: { leaseId, token },
				attemptsMade: 0
			} as Job<{ leaseId: string; token: string }>

			const leaseData = {
				lease: { id: leaseId, governing_state: 'TX' } as any,
				property: { name: 'Test Property' } as any,
				unit: { unit_number: '101' } as any,
				landlord: { first_name: 'John', last_name: 'Doe' } as any,
				tenant: { first_name: 'Jane', last_name: 'Smith' } as any,
				tenantRecord: { id: 'tenant-123' } as any
			}

			const mappedFields = {
				tenant_name: 'Jane Smith',
				property_address: '123 Test St'
			}

			mockLeasesService.getLeaseDataForPdf.mockResolvedValue(leaseData)
			mockPdfMapper.mapLeaseToPdfFields.mockReturnValue({
				fields: mappedFields as any,
				missing: []
			})
			mockPdfGenerator.generateFilledPdf.mockResolvedValue(pdfBuffer)
			mockPdfStorage.uploadLeasePdf.mockResolvedValue({ path: 'leases/123/lease.pdf' })
			mockPdfStorage.getLeasePdfUrl.mockResolvedValue(pdfUrl)

			// Act
			const result = await processor.process(mockJob)

			// Assert
			expect(result).toEqual({ pdfUrl })
			expect(mockLeasesService.getLeaseDataForPdf).toHaveBeenCalledWith(token, leaseId)
			expect(mockPdfMapper.mapLeaseToPdfFields).toHaveBeenCalledWith(leaseData)
			expect(mockPdfGenerator.generateFilledPdf).toHaveBeenCalledWith(
				mappedFields,
				leaseId,
				expect.objectContaining({ state: 'TX', validateTemplate: true })
			)
			expect(mockPdfStorage.uploadLeasePdf).toHaveBeenCalledWith(leaseId, pdfBuffer)
			expect(mockPdfStorage.getLeasePdfUrl).toHaveBeenCalledWith(leaseId)
		})

		it('should throw error if lease not found', async () => {
		// Arrange
		const leaseId = '123e4567-e89b-12d3-a456-426614174000'
		const token = 'test-jwt-token'

		const mockJob = {
			id: 'job-1',
			data: { leaseId, token },
			attemptsMade: 0
		} as Job<{ leaseId: string; token: string }>

		mockLeasesService.getLeaseDataForPdf.mockRejectedValue(new Error('Lease not found'))

		// Act & Assert
		await expect(processor.process(mockJob)).rejects.toThrow('Lease not found')
	})

		it('should log error and rethrow for BullMQ retry', async () => {
			// Arrange
			const leaseId = '123e4567-e89b-12d3-a456-426614174000'
			const token = 'test-jwt-token'
			const error = new Error('PDF generation failed')

			const mockJob = {
				id: 'job-1',
				data: { leaseId, token },
				attemptsMade: 1
			} as Job<{ leaseId: string; token: string }>

			const leaseData = {
			lease: { id: leaseId, governing_state: 'TX' } as any,
			property: {} as any,
			unit: {} as any,
			landlord: {} as any,
			tenant: {} as any,
			tenantRecord: {} as any
		}

		mockLeasesService.getLeaseDataForPdf.mockResolvedValue(leaseData)
		mockPdfMapper.mapLeaseToPdfFields.mockReturnValue({
			fields: { tenant_name: 'Test Tenant' } as any,
			missing: []
		})
		mockPdfGenerator.generateFilledPdf.mockRejectedValue(error)

		// Act & Assert
		await expect(processor.process(mockJob)).rejects.toThrow('PDF generation failed')
			expect(mockLogger.error).toHaveBeenCalled()
		})
	})
})
