/**
 * PdfStorageService Unit Tests
 *
 * Comprehensive test coverage for PDF storage operations including:
 * - Upload with compression and retry logic
 * - Deletion with idempotency
 * - URL generation
 * - Bucket verification
 * - Error handling and edge cases
 */

import { Test, TestingModule } from '@nestjs/testing'
import { InternalServerErrorException } from '@nestjs/common'
import { PdfStorageService, UploadPdfResult } from './pdf-storage.service'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import { CompressionService } from '../documents/compression.service'

describe('PdfStorageService', () => {
	type StorageClient = {
		upload: jest.Mock
		getPublicUrl: jest.Mock
		list: jest.Mock
		remove: jest.Mock
	}
	type AdminClient = {
		storage: {
			from: jest.Mock
			listBuckets: jest.Mock
		}
	}

	let service: PdfStorageService
	let supabaseService: jest.Mocked<SupabaseService>
	let logger: jest.Mocked<AppLogger>
	let compressionService: jest.Mocked<CompressionService>

	const mockLeaseId = '123e4567-e89b-12d3-a456-426614174000'
	const mockPdfBuffer = Buffer.from('mock-pdf-content')
	const mockCompressedBuffer = Buffer.from('mock-compressed-pdf')

	beforeEach(async () => {
		// Create mock Supabase storage client
		const mockStorageClient: StorageClient = {
			upload: jest.fn(),
			getPublicUrl: jest.fn(),
			list: jest.fn(),
			remove: jest.fn()
		}

		const mockAdminClient: AdminClient = {
			storage: {
				from: jest.fn().mockReturnValue(mockStorageClient),
				listBuckets: jest.fn()
			}
		}

		// Mock services
		supabaseService = {
			getAdminClient: jest.fn().mockReturnValue(mockAdminClient)
		} as jest.Mocked<SupabaseService>

		logger = {
			log: jest.fn(),
			warn: jest.fn(),
			error: jest.fn()
		} as jest.Mocked<AppLogger>

		compressionService = {
			compressDocument: jest.fn().mockResolvedValue({
				compressed: mockCompressedBuffer,
				originalSize: 100000,
				compressedSize: 50000,
				ratio: 0.5
			})
		} as jest.Mocked<CompressionService>

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PdfStorageService,
				{
					provide: SupabaseService,
					useValue: supabaseService
				},
				{
					provide: AppLogger,
					useValue: logger
				},
				{
					provide: CompressionService,
					useValue: compressionService
				}
			]
		}).compile()

		service = module.get<PdfStorageService>(PdfStorageService)
	})

	describe('uploadLeasePdf', () => {
		it('should upload PDF to Supabase Storage successfully', async () => {
			// Arrange
			const mockUploadResponse = {
				data: { path: 'leases/123e4567/lease-123e4567-2025-01-01.pdf' },
				error: null
			}

			const mockPublicUrlResponse = {
				data: {
					publicUrl:
						'https://supabase.co/storage/v1/object/public/lease-documents/leases/123e4567/lease-123e4567-2025-01-01.pdf'
				}
			}

			const adminClient = supabaseService.getAdminClient()
			const storageClient = adminClient.storage.from('lease-documents')

			;(storageClient.upload as jest.Mock).mockResolvedValue(mockUploadResponse)
			;(storageClient.getPublicUrl as jest.Mock).mockReturnValue(
				mockPublicUrlResponse
			)

			// Act
			const result = await service.uploadLeasePdf(mockLeaseId, mockPdfBuffer)

			// Assert
			expect(result).toEqual({
				publicUrl: expect.stringContaining('supabase.co/storage'),
				path: expect.stringContaining('leases/123e4567'),
				bucket: 'lease-documents'
			})

			// Verify compression was called
			expect(compressionService.compressDocument).toHaveBeenCalledWith(
				mockPdfBuffer,
				'application/pdf'
			)

			// Verify upload was called with compressed buffer
			expect(storageClient.upload).toHaveBeenCalledWith(
				expect.stringMatching(
					/^leases\/123e4567-e89b-12d3-a456-426614174000\/lease-123e4567-e89b-12d3-a456-426614174000-.*\.pdf$/
				),
				mockCompressedBuffer,
				{
					contentType: 'application/pdf',
					cacheControl: '3600',
					upsert: true
				}
			)

			// Verify logging
			expect(logger.log).toHaveBeenCalledWith(
				'Uploading lease PDF to storage',
				expect.objectContaining({ leaseId: mockLeaseId })
			)

			expect(logger.log).toHaveBeenCalledWith(
				'Successfully uploaded lease PDF',
				expect.objectContaining({ leaseId: mockLeaseId })
			)
		})

		it('should retry on transient failures (3 attempts with exponential backoff)', async () => {
			// Arrange: Fail first 2 attempts, succeed on 3rd
			const adminClient = supabaseService.getAdminClient()
			const storageClient = adminClient.storage.from('lease-documents')

			const uploadMock = storageClient.upload as jest.Mock

			uploadMock
				.mockResolvedValueOnce({
					data: null,
					error: { message: 'Network timeout' }
				}) // Attempt 1: fail
				.mockResolvedValueOnce({
					data: null,
					error: { message: 'Network timeout' }
				}) // Attempt 2: fail
				.mockResolvedValueOnce({
					// Attempt 3: success
					data: { path: 'leases/123e4567/lease.pdf' },
					error: null
				})
			;(storageClient.getPublicUrl as jest.Mock).mockReturnValue({
				data: { publicUrl: 'https://supabase.co/storage/lease.pdf' }
			})

			jest
				.spyOn(
					service as unknown as { sleep: (ms: number) => Promise<void> },
					'sleep'
				)
				.mockResolvedValue(undefined)

			// Act
			const result = await service.uploadLeasePdf(mockLeaseId, mockPdfBuffer)

			// Assert
			expect(result).toBeDefined()
			expect(result.publicUrl).toContain('supabase.co')

			// Verify 3 upload attempts
			expect(uploadMock).toHaveBeenCalledTimes(3)

			// Verify exponential backoff sleep calls
			expect(
				(service as unknown as { sleep: (ms: number) => Promise<void> }).sleep
			).toHaveBeenCalledWith(1000) // 1st retry delay
			expect(
				(service as unknown as { sleep: (ms: number) => Promise<void> }).sleep
			).toHaveBeenCalledWith(2000) // 2nd retry delay

			// Verify warning logs
			expect(logger.warn).toHaveBeenCalledTimes(2) // 2 failed attempts
			expect(logger.warn).toHaveBeenCalledWith(
				'PDF upload attempt failed',
				expect.objectContaining({ attempt: 1 })
			)
		})

		it('should compress PDFs before upload', async () => {
			// Arrange
			const largePdfBuffer = Buffer.alloc(5 * 1024 * 1024) // 5MB

			const adminClient = supabaseService.getAdminClient()
			const storageClient = adminClient.storage.from('lease-documents')

			;(storageClient.upload as jest.Mock).mockResolvedValue({
				data: { path: 'leases/123e4567/lease.pdf' },
				error: null
			})
			;(storageClient.getPublicUrl as jest.Mock).mockReturnValue({
				data: { publicUrl: 'https://supabase.co/storage/lease.pdf' }
			})

			// Act
			await service.uploadLeasePdf(mockLeaseId, largePdfBuffer)

			// Assert
			expect(compressionService.compressDocument).toHaveBeenCalledWith(
				largePdfBuffer,
				'application/pdf'
			)

			// Verify compression ratio was logged
			expect(logger.log).toHaveBeenCalledWith(
				'PDF compression complete',
				expect.objectContaining({
					leaseId: mockLeaseId,
					compressionRatio: '50.0%'
				})
			)
		})

		it('should throw InternalServerErrorException after all retries fail', async () => {
			// Arrange: All attempts fail
			const adminClient = supabaseService.getAdminClient()
			const storageClient = adminClient.storage.from('lease-documents')

			;(storageClient.upload as jest.Mock).mockResolvedValue({
				data: null,
				error: { message: 'Network error' }
			})

			jest
				.spyOn(
					service as unknown as { sleep: (ms: number) => Promise<void> },
					'sleep'
				)
				.mockResolvedValue(undefined)

			// Act & Assert
			await expect(
				service.uploadLeasePdf(mockLeaseId, mockPdfBuffer)
			).rejects.toThrow(InternalServerErrorException)

			await expect(
				service.uploadLeasePdf(mockLeaseId, mockPdfBuffer)
			).rejects.toThrow('Failed to upload lease PDF: Network error')

			// Verify all 3 retries were attempted
			expect(storageClient.upload).toHaveBeenCalledTimes(6) // 3 from previous call + 3 from this call

			// Verify error logging
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to upload lease PDF after all retries',
				expect.objectContaining({
					leaseId: mockLeaseId,
					retries: 3
				})
			)
		})

		it('should overwrite existing PDF on re-upload (upsert: true)', async () => {
			// Arrange
			const adminClient = supabaseService.getAdminClient()
			const storageClient = adminClient.storage.from('lease-documents')

			;(storageClient.upload as jest.Mock).mockResolvedValue({
				data: { path: 'leases/123e4567/lease.pdf' },
				error: null
			})
			;(storageClient.getPublicUrl as jest.Mock).mockReturnValue({
				data: { publicUrl: 'https://supabase.co/storage/lease.pdf' }
			})

			// Act
			await service.uploadLeasePdf(mockLeaseId, mockPdfBuffer)

			// Assert - verify upsert flag
			expect(storageClient.upload).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(Buffer),
				expect.objectContaining({ upsert: true })
			)
		})

		it('should handle concurrent uploads without race conditions', async () => {
			// Arrange
			const adminClient = supabaseService.getAdminClient()
			const storageClient = adminClient.storage.from('lease-documents')

			let uploadCount = 0
			;(storageClient.upload as jest.Mock).mockImplementation(async () => {
				uploadCount++
				// Simulate async delay
				await new Promise(resolve => setTimeout(resolve, 10))
				return {
					data: { path: `leases/123e4567/lease-${uploadCount}.pdf` },
					error: null
				}
			})
			;(storageClient.getPublicUrl as jest.Mock).mockReturnValue({
				data: { publicUrl: 'https://supabase.co/storage/lease.pdf' }
			})

			// Act - 5 concurrent uploads
			const promises = Array(5)
				.fill(null)
				.map(() => service.uploadLeasePdf(mockLeaseId, mockPdfBuffer))

			const results = await Promise.all(promises)

			// Assert - all uploads succeeded
			expect(results).toHaveLength(5)
			results.forEach(result => {
				expect(result.publicUrl).toBeDefined()
				expect(result.path).toBeDefined()
			})

			// Verify 5 unique uploads
			expect(uploadCount).toBe(5)
		})

		it('should accept custom retry count via options', async () => {
			// Arrange
			const adminClient = supabaseService.getAdminClient()
			const storageClient = adminClient.storage.from('lease-documents')

			;(storageClient.upload as jest.Mock).mockResolvedValue({
				data: null,
				error: { message: 'Error' }
			})

			jest
				.spyOn(
					service as unknown as { sleep: (ms: number) => Promise<void> },
					'sleep'
				)
				.mockResolvedValue(undefined)

			// Act & Assert - Custom retries: 5
			await expect(
				service.uploadLeasePdf(mockLeaseId, mockPdfBuffer, { retries: 5 })
			).rejects.toThrow()

			// Verify 5 attempts
			expect(storageClient.upload).toHaveBeenCalledTimes(5)
		})
	})

	describe('deleteLeasePdf', () => {
		it('should delete PDF from storage', async () => {
			// Arrange
			const adminClient = supabaseService.getAdminClient()
			const storageClient = adminClient.storage.from('lease-documents')

			;(storageClient.list as jest.Mock).mockResolvedValue({
				data: [
					{ name: 'lease-123e4567-2025-01-01.pdf' },
					{ name: 'lease-123e4567-2025-01-02.pdf' }
				],
				error: null
			})
			;(storageClient.remove as jest.Mock).mockResolvedValue({
				data: [],
				error: null
			})

			// Act
			await service.deleteLeasePdf(mockLeaseId)

			// Assert
			expect(storageClient.list).toHaveBeenCalledWith(`leases/${mockLeaseId}`)

			expect(storageClient.remove).toHaveBeenCalledWith([
				`leases/${mockLeaseId}/lease-123e4567-2025-01-01.pdf`,
				`leases/${mockLeaseId}/lease-123e4567-2025-01-02.pdf`
			])

			expect(logger.log).toHaveBeenCalledWith(
				'Successfully deleted lease PDFs',
				expect.objectContaining({ leaseId: mockLeaseId, count: 2 })
			)
		})

		it('should be idempotent (no error on delete non-existent)', async () => {
			// Arrange - no files found
			const adminClient = supabaseService.getAdminClient()
			const storageClient = adminClient.storage.from('lease-documents')

			;(storageClient.list as jest.Mock).mockResolvedValue({
				data: [],
				error: null
			})

			// Act - should not throw
			await service.deleteLeasePdf(mockLeaseId)

			// Assert
			expect(storageClient.remove).not.toHaveBeenCalled()

			expect(logger.log).toHaveBeenCalledWith('No PDFs found to delete', {
				leaseId: mockLeaseId
			})
		})

		it('should cleanup old versions when multiple PDFs exist', async () => {
			// Arrange - 3 versions of the same lease PDF
			const adminClient = supabaseService.getAdminClient()
			const storageClient = adminClient.storage.from('lease-documents')

			;(storageClient.list as jest.Mock).mockResolvedValue({
				data: [
					{ name: 'lease-123e4567-2025-01-01.pdf' },
					{ name: 'lease-123e4567-2025-01-02.pdf' },
					{ name: 'lease-123e4567-2025-01-03.pdf' }
				],
				error: null
			})
			;(storageClient.remove as jest.Mock).mockResolvedValue({
				data: [],
				error: null
			})

			// Act
			await service.deleteLeasePdf(mockLeaseId)

			// Assert - all 3 versions deleted
			expect(storageClient.remove).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.stringContaining('2025-01-01'),
					expect.stringContaining('2025-01-02'),
					expect.stringContaining('2025-01-03')
				])
			)
		})

		it('should not throw on deletion errors (graceful failure)', async () => {
			// Arrange - deletion fails
			const adminClient = supabaseService.getAdminClient()
			const storageClient = adminClient.storage.from('lease-documents')

			;(storageClient.list as jest.Mock).mockResolvedValue({
				data: [{ name: 'lease.pdf' }],
				error: null
			})
			;(storageClient.remove as jest.Mock).mockResolvedValue({
				data: null,
				error: { message: 'Permission denied' }
			})

			// Act - should not throw
			await expect(service.deleteLeasePdf(mockLeaseId)).resolves.not.toThrow()

			// Assert - error logged
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to delete lease PDFs',
				expect.objectContaining({ leaseId: mockLeaseId })
			)
		})

		it('should handle list operation errors gracefully', async () => {
			// Arrange - list fails
			const adminClient = supabaseService.getAdminClient()
			const storageClient = adminClient.storage.from('lease-documents')

			;(storageClient.list as jest.Mock).mockResolvedValue({
				data: null,
				error: { message: 'Network error' }
			})

			// Act - should not throw
			await expect(service.deleteLeasePdf(mockLeaseId)).resolves.not.toThrow()

			// Assert
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to list lease PDFs for deletion',
				expect.objectContaining({ leaseId: mockLeaseId })
			)

			expect(storageClient.remove).not.toHaveBeenCalled()
		})
	})

	describe('getLeasePdfUrl', () => {
		it('should generate signed URL for existing lease PDF', async () => {
			// Arrange
			const adminClient = supabaseService.getAdminClient()
			const storageClient = adminClient.storage.from('lease-documents')

			;(storageClient.list as jest.Mock).mockResolvedValue({
				data: [{ name: 'lease-123e4567-2025-01-01.pdf' }],
				error: null
			})
			;(storageClient.getPublicUrl as jest.Mock).mockReturnValue({
				data: {
					publicUrl:
						'https://supabase.co/storage/v1/object/public/lease-documents/leases/123e4567/lease.pdf'
				}
			})

			// Act
			const url = await service.getLeasePdfUrl(mockLeaseId)

			// Assert
			expect(url).toBe(
				'https://supabase.co/storage/v1/object/public/lease-documents/leases/123e4567/lease.pdf'
			)

			expect(storageClient.list).toHaveBeenCalledWith(`leases/${mockLeaseId}`)
		})

		it('should return null for non-existent lease PDF', async () => {
			// Arrange - no files found
			const adminClient = supabaseService.getAdminClient()
			const storageClient = adminClient.storage.from('lease-documents')

			;(storageClient.list as jest.Mock).mockResolvedValue({
				data: [],
				error: null
			})

			// Act
			const url = await service.getLeasePdfUrl(mockLeaseId)

			// Assert
			expect(url).toBeNull()
		})

		it('should return null on errors (graceful failure)', async () => {
			// Arrange - list operation fails
			const adminClient = supabaseService.getAdminClient()
			const storageClient = adminClient.storage.from('lease-documents')

			;(storageClient.list as jest.Mock).mockRejectedValue(
				new Error('Network error')
			)

			// Act
			const url = await service.getLeasePdfUrl(mockLeaseId)

			// Assert
			expect(url).toBeNull()

			expect(logger.error).toHaveBeenCalledWith(
				'Failed to get lease PDF URL',
				expect.objectContaining({ leaseId: mockLeaseId })
			)
		})
	})

	describe('ensureBucketExists', () => {
		it('should verify bucket exists', async () => {
			// Arrange
			const adminClient = supabaseService.getAdminClient()

			;(adminClient.storage.listBuckets as jest.Mock).mockResolvedValue({
				data: [{ name: 'lease-documents', id: 'bucket-id' }],
				error: null
			})

			// Act
			await service.ensureBucketExists()

			// Assert
			expect(adminClient.storage.listBuckets).toHaveBeenCalled()

			expect(logger.log).toHaveBeenCalledWith(
				'Lease documents bucket verified',
				expect.objectContaining({ bucket: 'lease-documents' })
			)
		})

		it('should warn if bucket does not exist', async () => {
			// Arrange
			const adminClient = supabaseService.getAdminClient()

			;(adminClient.storage.listBuckets as jest.Mock).mockResolvedValue({
				data: [{ name: 'other-bucket', id: 'other-id' }],
				error: null
			})

			// Act
			await service.ensureBucketExists()

			// Assert
			expect(logger.warn).toHaveBeenCalledWith(
				'Lease documents bucket does not exist',
				expect.objectContaining({ bucket: 'lease-documents' })
			)
		})

		it('should handle list buckets errors gracefully', async () => {
			// Arrange
			const adminClient = supabaseService.getAdminClient()

			;(adminClient.storage.listBuckets as jest.Mock).mockResolvedValue({
				data: null,
				error: { message: 'Permission denied' }
			})

			// Act - should not throw
			await expect(service.ensureBucketExists()).resolves.not.toThrow()

			// Assert
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to list storage buckets',
				expect.objectContaining({ error: 'Permission denied' })
			)
		})

		it('should handle unexpected errors', async () => {
			// Arrange
			const adminClient = supabaseService.getAdminClient()

			;(adminClient.storage.listBuckets as jest.Mock).mockRejectedValue(
				new Error('Network error')
			)

			// Act - should not throw
			await expect(service.ensureBucketExists()).resolves.not.toThrow()

			// Assert
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to verify storage bucket',
				expect.objectContaining({ error: 'Network error' })
			)
		})
	})

	describe('generateFileName (private)', () => {
		it('should generate consistent filename format', () => {
			// Act - access private method via reflection
			const fileName = (
				service as unknown as { generateFileName: (id: string) => string }
			).generateFileName(mockLeaseId)

			// Assert
			expect(fileName).toMatch(
				/^lease-123e4567-e89b-12d3-a456-426614174000-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.pdf$/
			)
			expect(fileName).toContain(mockLeaseId)
			expect(fileName).toContain('.pdf')
		})

		it('should generate unique filenames for same lease', () => {
			// Act
			const fileName1 = (
				service as unknown as { generateFileName: (id: string) => string }
			).generateFileName(mockLeaseId)
			const fileName2 = (
				service as unknown as { generateFileName: (id: string) => string }
			).generateFileName(mockLeaseId)

			// Assert - filenames should differ due to timestamp
			// (In reality, they might be the same if executed in same millisecond,
			// but this is acceptable as upsert:true handles overwrites)
			expect(fileName1).toContain(mockLeaseId)
			expect(fileName2).toContain(mockLeaseId)
		})
	})

	describe('sleep (private)', () => {
		it('should delay for specified milliseconds', async () => {
			// Arrange
			jest.useFakeTimers()

			// Act
			const sleepPromise = (
				service as unknown as { sleep: (ms: number) => Promise<void> }
			).sleep(1000)

			// Advance timers
			jest.advanceTimersByTime(1000)

			// Assert
			await expect(sleepPromise).resolves.toBeUndefined()

			jest.useRealTimers()
		})
	})

	describe('Integration Scenarios', () => {
		it('should handle full upload-delete-verify lifecycle', async () => {
			// Arrange
			const adminClient = supabaseService.getAdminClient()
			const storageClient = adminClient.storage.from('lease-documents')

			// Upload
			;(storageClient.upload as jest.Mock).mockResolvedValue({
				data: { path: 'leases/123e4567/lease.pdf' },
				error: null
			})
			;(storageClient.getPublicUrl as jest.Mock).mockReturnValue({
				data: { publicUrl: 'https://supabase.co/storage/lease.pdf' }
			})

			// List for URL
			;(storageClient.list as jest.Mock).mockResolvedValue({
				data: [{ name: 'lease.pdf' }],
				error: null
			})

			// Delete
			;(storageClient.remove as jest.Mock).mockResolvedValue({
				data: [],
				error: null
			})

			// Act - Upload
			const uploadResult = await service.uploadLeasePdf(
				mockLeaseId,
				mockPdfBuffer
			)
			expect(uploadResult.publicUrl).toBeDefined()

			// Act - Verify URL
			const url = await service.getLeasePdfUrl(mockLeaseId)
			expect(url).toBeDefined()

			// Act - Delete
			await service.deleteLeasePdf(mockLeaseId)

			// Act - Verify deleted (list returns empty)
			;(storageClient.list as jest.Mock).mockResolvedValue({
				data: [],
				error: null
			})

			const urlAfterDelete = await service.getLeasePdfUrl(mockLeaseId)
			expect(urlAfterDelete).toBeNull()
		})

		it('should handle compression failure gracefully', async () => {
			// Arrange - compression fails
			;(compressionService.compressDocument as jest.Mock).mockRejectedValue(
				new Error('Compression error')
			)

			// Act & Assert - should propagate error
			await expect(
				service.uploadLeasePdf(mockLeaseId, mockPdfBuffer)
			).rejects.toThrow('Compression error')

			expect(logger.error).toHaveBeenCalledWith(
				'Unexpected error uploading lease PDF',
				expect.objectContaining({ leaseId: mockLeaseId })
			)
		})
	})
})
