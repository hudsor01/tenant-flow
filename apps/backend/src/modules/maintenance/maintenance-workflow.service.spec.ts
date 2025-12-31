import { Test } from '@nestjs/testing'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import { SupabaseService } from '../../database/supabase.service'
import { createMockMaintenanceRequest } from '../../test-utils/mocks'
import { MaintenanceWorkflowService } from './maintenance-workflow.service'

describe('MaintenanceWorkflowService', () => {
	let service: MaintenanceWorkflowService
	let mockSupabaseService: jest.Mocked<SupabaseService>
	let mockEventEmitter: jest.Mocked<EventEmitter2>

	const mockToken = 'mock-jwt-token'

	// Mock Supabase query builder
	const createMockQueryBuilder = (
		data: unknown | null,
		error: Error | null = null
	) => {
		const builder = {
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			update: jest.fn().mockReturnThis(),
			single: jest.fn().mockResolvedValue({ data, error })
		}
		return builder
	}

	beforeEach(async () => {
		const mockUserClient = {
			from: jest.fn()
		}

		mockSupabaseService = {
			getUserClient: jest.fn().mockReturnValue(mockUserClient)
		} as unknown as jest.Mocked<SupabaseService>

		mockEventEmitter = {
			emit: jest.fn()
		} as unknown as jest.Mocked<EventEmitter2>

		const module = await Test.createTestingModule({
			providers: [
				MaintenanceWorkflowService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: EventEmitter2, useValue: mockEventEmitter },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<MaintenanceWorkflowService>(MaintenanceWorkflowService)
	})

	describe('updateStatus', () => {
		it('returns null when token is missing', async () => {
			const result = await service.updateStatus(
				'',
				'maintenance-id',
				'completed'
			)
			expect(result).toBeNull()
		})

		it('returns null when maintenanceId is missing', async () => {
			const result = await service.updateStatus(mockToken, '', 'completed')
			expect(result).toBeNull()
		})

		it('returns null when status is missing', async () => {
			const result = await service.updateStatus(mockToken, 'maintenance-id', '')
			expect(result).toBeNull()
		})

		it('updates status successfully', async () => {
			const mockRequest = createMockMaintenanceRequest()
			const updatedRequest = { ...mockRequest, status: 'in_progress' }

			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(
				createMockQueryBuilder(updatedRequest)
			)

			const result = await service.updateStatus(
				mockToken,
				mockRequest.id,
				'in_progress'
			)

			expect(result).toEqual(updatedRequest)
			expect(mockClient.from).toHaveBeenCalledWith('maintenance_requests')
		})

		it('sets completed_at when status is completed', async () => {
			const mockRequest = createMockMaintenanceRequest()
			const updatedRequest = {
				...mockRequest,
				status: 'completed',
				completed_at: expect.any(String)
			}

			const mockClient = mockSupabaseService.getUserClient(mockToken)
			const queryBuilder = createMockQueryBuilder(updatedRequest)
			;(mockClient.from as jest.Mock).mockReturnValue(queryBuilder)

			await service.updateStatus(mockToken, mockRequest.id, 'completed')

			expect(queryBuilder.update).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'completed',
					completed_at: expect.any(String)
				})
			)
		})
	})

	describe('complete', () => {
		it('completes maintenance request with actual cost', async () => {
			const mockRequest = createMockMaintenanceRequest()
			const completedRequest = {
				...mockRequest,
				status: 'completed',
				actual_cost: 500
			}

			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(
				createMockQueryBuilder(completedRequest)
			)

			const result = await service.complete(
				mockToken,
				mockRequest.id,
				500,
				'Fixed the issue'
			)

			expect(result).toEqual(completedRequest)
			expect(mockEventEmitter.emit).toHaveBeenCalledWith(
				'maintenance.updated',
				expect.any(Object)
			)
		})

		it('returns null when update fails', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(
				createMockQueryBuilder(null, new Error('DB error'))
			)

			const result = await service.complete(mockToken, 'maintenance-id', 500)

			expect(result).toBeNull()
		})
	})

	describe('cancel', () => {
		it('cancels maintenance request', async () => {
			const mockRequest = createMockMaintenanceRequest()
			const cancelledRequest = { ...mockRequest, status: 'cancelled' }

			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(
				createMockQueryBuilder(cancelledRequest)
			)

			const result = await service.cancel(
				mockToken,
				mockRequest.id,
				'No longer needed'
			)

			expect(result).toEqual(cancelledRequest)
		})

		it('returns null when cancellation fails', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)
			;(mockClient.from as jest.Mock).mockReturnValue(
				createMockQueryBuilder(null, new Error('DB error'))
			)

			const result = await service.cancel(mockToken, 'maintenance-id', 'reason')

			expect(result).toBeNull()
		})
	})
})
