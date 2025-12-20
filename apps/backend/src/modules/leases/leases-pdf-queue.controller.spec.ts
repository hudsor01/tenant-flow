import { Test, TestingModule } from '@nestjs/testing'
import { Queue } from 'bullmq'
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
			add: jest.fn()
		} as any

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

			mockPdfQueue.add.mockResolvedValue({ id: jobId } as any)

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
})
