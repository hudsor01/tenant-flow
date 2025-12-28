import { Test, TestingModule } from '@nestjs/testing'
import { Job } from 'bullmq'
import { PdfGenerationProcessor } from './pdf-generation.processor'
import { LeasePdfGeneratorService } from './lease-pdf-generator.service'
import { LeasePdfMapperService } from './lease-pdf-mapper.service'
import type { LeasePdfFields } from './lease-pdf-mapper.service'
import { PdfStorageService } from './pdf-storage.service'
import { LeasesService } from '../leases/leases.service'
import { AppLogger } from '../../logger/app-logger.service'
import { SseService } from '../notifications/sse/sse.service'

/**
 * TDD Test Suite for PDF Generation Queue Processor
 *
 * Testing Strategy:
 * 1. Test job processing success path
 * 2. Test error handling and retries
 * 3. Test PDF upload and database update
 */
describe('PdfGenerationProcessor (TDD)', () => {
	type LeaseData = Awaited<ReturnType<LeasesService['getLeaseDataForPdf']>>

	let processor: PdfGenerationProcessor
	let mockPdfGenerator: jest.Mocked<LeasePdfGeneratorService>
	let mockPdfMapper: jest.Mocked<LeasePdfMapperService>
	let mockPdfStorage: jest.Mocked<PdfStorageService>
	let mockLeasesService: jest.Mocked<LeasesService>
	let mockLogger: jest.Mocked<AppLogger>
	let mockSseService: jest.Mocked<SseService>

	beforeEach(async () => {
		// Create mocks
		mockPdfGenerator = {
			generateFilledPdf: jest.fn()
		} as jest.Mocked<LeasePdfGeneratorService>

		mockPdfMapper = {
			mapLeaseToPdfFields: jest.fn()
		} as jest.Mocked<LeasePdfMapperService>

		mockPdfStorage = {
			uploadLeasePdf: jest.fn(),
			getLeasePdfUrl: jest.fn()
		} as jest.Mocked<PdfStorageService>

		mockLeasesService = {
			getLeaseDataForPdf: jest.fn()
		} as jest.Mocked<LeasesService>

		mockLogger = {
			log: jest.fn(),
			error: jest.fn()
		} as jest.Mocked<AppLogger>

		mockSseService = {
			broadcast: jest.fn().mockResolvedValue(undefined)
		} as jest.Mocked<SseService>

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PdfGenerationProcessor,
				{ provide: LeasePdfGeneratorService, useValue: mockPdfGenerator },
				{ provide: LeasePdfMapperService, useValue: mockPdfMapper },
				{ provide: PdfStorageService, useValue: mockPdfStorage },
				{ provide: LeasesService, useValue: mockLeasesService },
				{ provide: AppLogger, useValue: mockLogger },
				{ provide: SseService, useValue: mockSseService }
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

			const ownerId = 'owner-user-123'
			const leaseData: LeaseData = {
				lease: {
					id: leaseId,
					governing_state: 'TX',
					owner_user_id: ownerId
				} as LeaseData['lease'],
				property: { name: 'Test Property' } as LeaseData['property'],
				unit: { unit_number: '101' } as LeaseData['unit'],
				landlord: {
					id: ownerId,
					first_name: 'John',
					last_name: 'Doe'
				} as LeaseData['landlord'],
				tenant: {
					first_name: 'Jane',
					last_name: 'Smith'
				} as LeaseData['tenant'],
				tenantRecord: { id: 'tenant-123' } as LeaseData['tenantRecord']
			}

			const mappedFields: LeasePdfFields = {
				tenant_name: 'Jane Smith',
				property_address: '123 Test St'
			}

			mockLeasesService.getLeaseDataForPdf.mockResolvedValue(leaseData)
			mockPdfMapper.mapLeaseToPdfFields.mockReturnValue({
				fields: mappedFields,
				missing: []
			})
			mockPdfGenerator.generateFilledPdf.mockResolvedValue(pdfBuffer)
			mockPdfStorage.uploadLeasePdf.mockResolvedValue({
				path: 'leases/123/lease.pdf'
			})
			mockPdfStorage.getLeasePdfUrl.mockResolvedValue(pdfUrl)

			// Act
			const result = await processor.process(mockJob)

			// Assert
			expect(result).toEqual({ pdfUrl })
			expect(mockLeasesService.getLeaseDataForPdf).toHaveBeenCalledWith(
				token,
				leaseId
			)
			expect(mockPdfMapper.mapLeaseToPdfFields).toHaveBeenCalledWith(leaseData)
			expect(mockPdfGenerator.generateFilledPdf).toHaveBeenCalledWith(
				mappedFields,
				leaseId,
				expect.objectContaining({ state: 'TX', validateTemplate: true })
			)
			expect(mockPdfStorage.uploadLeasePdf).toHaveBeenCalledWith(
				leaseId,
				pdfBuffer
			)
			expect(mockPdfStorage.getLeasePdfUrl).toHaveBeenCalledWith(leaseId)
			expect(mockSseService.broadcast).toHaveBeenCalledWith(
				ownerId,
				expect.objectContaining({
					type: 'pdf.generation_completed',
					payload: expect.objectContaining({
						leaseId,
						downloadUrl: pdfUrl
					})
				})
			)
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

			mockLeasesService.getLeaseDataForPdf.mockRejectedValue(
				new Error('Lease not found')
			)

			// Act & Assert
			await expect(processor.process(mockJob)).rejects.toThrow(
				'Lease not found'
			)
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

			const leaseData: LeaseData = {
				lease: {
					id: leaseId,
					governing_state: 'TX',
					owner_user_id: 'owner-123'
				} as LeaseData['lease'],
				property: {} as LeaseData['property'],
				unit: {} as LeaseData['unit'],
				landlord: { id: 'owner-123' } as LeaseData['landlord'],
				tenant: {} as LeaseData['tenant'],
				tenantRecord: {} as LeaseData['tenantRecord']
			}

			mockLeasesService.getLeaseDataForPdf.mockResolvedValue(leaseData)
			mockPdfMapper.mapLeaseToPdfFields.mockReturnValue({
				fields: { tenant_name: 'Test Tenant' } as LeasePdfFields,
				missing: []
			})
			mockPdfGenerator.generateFilledPdf.mockRejectedValue(error)

			// Act & Assert
			await expect(processor.process(mockJob)).rejects.toThrow(
				'PDF generation failed'
			)
			expect(mockLogger.error).toHaveBeenCalled()
		})
	})
})
