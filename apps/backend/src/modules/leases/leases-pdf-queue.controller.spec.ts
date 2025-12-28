import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { Queue, type Job } from 'bullmq'
import { LeasesPdfQueueController } from './leases-pdf-queue.controller'
import { getQueueToken } from '@nestjs/bullmq'

/**
 * TDD Test Suite for Lease PDF Queue Controller
 *
 * Tests async PDF generation endpoint that queues jobs
 * instead of blocking the HTTP request
 */
describe('LeasesPdfQueueController (TDD)', () => {
	let controller: LeasesPdfQueueController
	let mockPdfQueue: jest.Mocked<Queue>

	beforeEach(async () => {
		mockPdfQueue = {
			add: jest.fn(),
			getJob: jest.fn(),
			getJobs: jest.fn()
		} as jest.Mocked<Queue>

		const module: TestingModule = await Test.createTestingModule({
			controllers: [LeasesPdfQueueController],
			providers: [
				{
					provide: getQueueToken('pdf-generation'),
					useValue: mockPdfQueue
				}
			]
		}).compile()

		controller = module.get<LeasesPdfQueueController>(LeasesPdfQueueController)
	})

	describe('queuePdfGeneration()', () => {
		it('should queue PDF generation job and return immediately', async () => {
			// Arrange
			const leaseId = '123e4567-e89b-12d3-a456-426614174000'
			const token = 'test-jwt-token'
			const jobId = 'job-123'

			mockPdfQueue.add.mockResolvedValue({ id: jobId } as unknown as Job)

			// Act
			const result = await controller.queuePdfGeneration(leaseId, token)

			// Assert
			expect(result).toEqual({
				message: 'PDF generation queued',
				jobId,
				statusUrl: `/api/v1/leases/${leaseId}/pdf-status`
			})

			expect(mockPdfQueue.add).toHaveBeenCalledWith('generate-lease-pdf', {
				leaseId,
				token
			})
		})

		it('should throw error if queue fails', async () => {
			// Arrange
			const leaseId = '123e4567-e89b-12d3-a456-426614174000'
			const token = 'test-jwt-token'
			const error = new Error('Queue connection failed')

			mockPdfQueue.add.mockRejectedValue(error)

			// Act & Assert
			await expect(
				controller.queuePdfGeneration(leaseId, token)
			).rejects.toThrow('Queue connection failed')
		})
	})

	describe('getPdfStatus()', () => {
		it('should return completed status with download URL when job is complete', async () => {
			// Arrange
			const leaseId = '123e4567-e89b-12d3-a456-426614174000'
			const jobId = 'job-123'
			const pdfUrl = 'https://storage.supabase.co/leases/123/lease.pdf'

			const mockJob = {
				id: jobId,
				data: { leaseId },
				returnvalue: { pdfUrl },
				getState: jest.fn().mockResolvedValue('completed')
			}

			mockPdfQueue.getJob.mockResolvedValue(mockJob as unknown as Job)

			// Act
			const result = await controller.getPdfStatus(leaseId, jobId)

			// Assert
			expect(result).toEqual({
				leaseId,
				jobId,
				status: 'completed',
				downloadUrl: pdfUrl
			})
		})

		it('should return active status when job is in progress', async () => {
			// Arrange
			const leaseId = '123e4567-e89b-12d3-a456-426614174000'
			const jobId = 'job-123'

			const mockJob = {
				id: jobId,
				data: { leaseId },
				returnvalue: null,
				getState: jest.fn().mockResolvedValue('active')
			}

			mockPdfQueue.getJob.mockResolvedValue(mockJob as unknown as Job)

			// Act
			const result = await controller.getPdfStatus(leaseId, jobId)

			// Assert
			expect(result).toEqual({
				leaseId,
				jobId,
				status: 'active'
			})
		})

		it('should return failed status with error when job failed', async () => {
			// Arrange
			const leaseId = '123e4567-e89b-12d3-a456-426614174000'
			const jobId = 'job-123'

			const mockJob = {
				id: jobId,
				data: { leaseId },
				returnvalue: null,
				failedReason: 'PDF generation failed',
				getState: jest.fn().mockResolvedValue('failed')
			}

			mockPdfQueue.getJob.mockResolvedValue(mockJob as unknown as Job)

			// Act
			const result = await controller.getPdfStatus(leaseId, jobId)

			// Assert
			expect(result).toEqual({
				leaseId,
				jobId,
				status: 'failed',
				error: 'PDF generation failed'
			})
		})

		it('should throw NotFoundException when job not found', async () => {
			// Arrange
			const leaseId = '123e4567-e89b-12d3-a456-426614174000'
			const jobId = 'non-existent-job'

			mockPdfQueue.getJob.mockResolvedValue(null)

			// Act & Assert
			await expect(controller.getPdfStatus(leaseId, jobId)).rejects.toThrow(
				NotFoundException
			)
		})

		it('should find latest job for lease when no jobId provided', async () => {
			// Arrange
			const leaseId = '123e4567-e89b-12d3-a456-426614174000'
			const pdfUrl = 'https://storage.supabase.co/leases/123/lease.pdf'

			const mockJobs = [
				{
					id: 'job-1',
					data: { leaseId },
					timestamp: 1000,
					returnvalue: null,
					getState: jest.fn().mockResolvedValue('failed')
				},
				{
					id: 'job-2',
					data: { leaseId },
					timestamp: 2000,
					returnvalue: { pdfUrl },
					getState: jest.fn().mockResolvedValue('completed')
				},
				{
					id: 'job-3',
					data: { leaseId: 'other-lease' },
					timestamp: 3000,
					returnvalue: null,
					getState: jest.fn().mockResolvedValue('active')
				}
			]

			mockPdfQueue.getJobs.mockResolvedValue(mockJobs as unknown as Job[])

			// Act
			const result = await controller.getPdfStatus(leaseId, undefined)

			// Assert - should return job-2 (latest for this leaseId)
			expect(result).toEqual({
				leaseId,
				jobId: 'job-2',
				status: 'completed',
				downloadUrl: pdfUrl
			})
		})

		it('should return not_found status when no jobs exist for lease', async () => {
			// Arrange
			const leaseId = '123e4567-e89b-12d3-a456-426614174000'

			mockPdfQueue.getJobs.mockResolvedValue([])

			// Act
			const result = await controller.getPdfStatus(leaseId, undefined)

			// Assert
			expect(result).toEqual({
				leaseId,
				status: 'not_found',
				message: 'No PDF generation jobs found for this lease'
			})
		})
	})
})
