import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing'
import { SilentLogger } from '../__test__/silent-logger'
import { BadRequestException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { MaintenanceService } from './maintenance.service'
import { SupabaseService } from '../database/supabase.service'
import { Logger } from '@nestjs/common'
import { randomUUID } from 'crypto'

describe('MaintenanceService', () => {
	let service: MaintenanceService
	let mockSupabaseService: jest.Mocked<SupabaseService>
	let mockLogger: jest.Mocked<Logger>
	let mockEventEmitter: jest.Mocked<EventEmitter2>
	let mockSupabaseClient: jest.Mocked<any>

	const generateUUID = () => randomUUID()

	const createMockMaintenance = (overrides: Record<string, unknown> = {}) => ({
		id: generateUUID(),
		unitId: generateUUID(),
		title: 'Fix leaky faucet',
		description: 'Kitchen faucet is dripping constantly',
		priority: 'MEDIUM',
		category: 'PLUMBING',
		status: 'PENDING',
		scheduledDate: '2024-02-01T10:00:00Z',
		estimatedCost: 150.00,
		actualCost: null,
		notes: null,
		completedDate: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides
	})

	const createMockCreateRequest = (overrides: Record<string, unknown> = {}) => ({
		unitId: generateUUID(),
		title: 'Fix broken AC',
		description: 'Air conditioning unit not working',
		priority: 'HIGH' as const,
		category: 'HVAC' as const,
		estimatedCost: 300.00,
		...overrides
	})

	const createMockUpdateRequest = (overrides: Record<string, unknown> = {}) => ({
		title: 'Fix broken AC - Updated',
		status: 'IN_PROGRESS' as const,
		notes: 'Technician scheduled for tomorrow',
		...overrides
	})

	beforeEach(async () => {
		mockSupabaseClient = {
			rpc: jest.fn(() => ({
				single: jest.fn()
			}))
		}

		mockSupabaseService = {
			getAdminClient: jest.fn().mockReturnValue(mockSupabaseClient),
		} as jest.Mocked<SupabaseService>

		mockLogger = {
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn(),
			verbose: jest.fn(),
		} as jest.Mocked<Logger>

		mockEventEmitter = {
			emit: jest.fn(),
		} as jest.Mocked<SupabaseService>

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				MaintenanceService,
				{
					provide: SupabaseService,
					useValue: mockSupabaseService,
				},
				{
					provide: Logger,
					useValue: mockLogger,
				},
				{
					provide: EventEmitter2,
					useValue: mockEventEmitter,
				},
			],
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<MaintenanceService>(MaintenanceService)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('findAll', () => {
		it('should return all maintenance requests for user', async () => {
			const userId = generateUUID()
			const query = {
				unitId: generateUUID(),
				propertyId: generateUUID(),
				priority: 'HIGH',
				category: 'PLUMBING',
				status: 'PENDING',
				limit: 20,
				offset: 10,
				sortBy: 'priority',
				sortOrder: 'asc'
			}
			const mockMaintenance = [createMockMaintenance(), createMockMaintenance()]

			mockSupabaseClient.rpc.mockResolvedValue({
				data: mockMaintenance,
				error: null
			})

			const result = await service.findAll(userId, query)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_user_maintenance', {
				p_user_id: userId,
				p_unit_id: query.unitId,
				p_property_id: query.propertyId,
				p_priority: query.priority,
				p_category: query.category,
				p_status: query.status,
				p_limit: query.limit,
				p_offset: query.offset,
				p_sort_by: query.sortBy,
				p_sort_order: query.sortOrder
			})
			expect(result).toEqual(mockMaintenance)
		})

		it('should handle undefined query parameters', async () => {
			const userId = generateUUID()
			const query = {}
			const mockMaintenance = [createMockMaintenance()]

			mockSupabaseClient.rpc.mockResolvedValue({
				data: mockMaintenance,
				error: null
			})

			const result = await service.findAll(userId, query)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_user_maintenance', {
				p_user_id: userId,
				p_unit_id: undefined,
				p_property_id: undefined,
				p_priority: undefined,
				p_category: undefined,
				p_status: undefined,
				p_limit: undefined,
				p_offset: undefined,
				p_sort_by: undefined,
				p_sort_order: undefined
			})
			expect(result).toEqual(mockMaintenance)
		})

		it('should throw BadRequestException when RPC fails', async () => {
			const userId = generateUUID()
			const query = {}
			const mockError = {
				message: 'Database error',
				code: 'DB001',
				constructor: { name: 'DatabaseError' }
			}

			mockSupabaseClient.rpc.mockResolvedValue({
				data: null,
				error: mockError
			})

			await expect(service.findAll(userId, query)).rejects.toThrow(BadRequestException)
			expect(mockLogger.error).toHaveBeenCalledWith(
				{
					error: {
						name: 'DatabaseError',
						message: 'Database error',
						code: 'DB001'
					},
					maintenance: { userId, query }
				},
				'Failed to get maintenance requests'
			)
		})
	})

	describe('getStats', () => {
		it('should return maintenance statistics', async () => {
			const userId = generateUUID()
			const mockStats = {
				total: 15,
				pending: 5,
				inProgress: 3,
				completed: 7,
				avgResolutionTime: 4.2
			}

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: mockStats,
					error: null
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			const result = await service.getStats(userId)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_maintenance_stats', { p_user_id: userId })
			expect(mockRpcChain.single).toHaveBeenCalled()
			expect(result).toEqual(mockStats)
		})

		it('should throw BadRequestException when RPC fails', async () => {
			const userId = generateUUID()
			const mockError = { message: 'Stats calculation failed' }

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: null,
					error: mockError
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			await expect(service.getStats(userId)).rejects.toThrow(BadRequestException)
			expect(mockLogger.error).toHaveBeenCalledWith('Failed to get maintenance stats', {
				userId,
				error: mockError.message
			})
		})
	})

	describe('getUrgent', () => {
		it('should return urgent maintenance requests', async () => {
			const userId = generateUUID()
			const mockUrgent = [createMockMaintenance({ priority: 'URGENT' })]

			mockSupabaseClient.rpc.mockResolvedValue({
				data: mockUrgent,
				error: null
			})

			const result = await service.getUrgent(userId)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_urgent_maintenance', {
				p_user_id: userId
			})
			expect(result).toEqual(mockUrgent)
		})

		it('should throw BadRequestException when RPC fails', async () => {
			const userId = generateUUID()
			const mockError = { message: 'Failed to get urgent maintenance' }

			mockSupabaseClient.rpc.mockResolvedValue({
				data: null,
				error: mockError
			})

			await expect(service.getUrgent(userId)).rejects.toThrow(BadRequestException)
			expect(mockLogger.error).toHaveBeenCalledWith('Failed to get urgent maintenance', {
				userId,
				error: mockError.message
			})
		})
	})

	describe('getOverdue', () => {
		it('should return overdue maintenance requests', async () => {
			const userId = generateUUID()
			const mockOverdue = [createMockMaintenance({ scheduledDate: '2023-12-01T10:00:00Z' })]

			mockSupabaseClient.rpc.mockResolvedValue({
				data: mockOverdue,
				error: null
			})

			const result = await service.getOverdue(userId)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_overdue_maintenance', {
				p_user_id: userId
			})
			expect(result).toEqual(mockOverdue)
		})

		it('should throw BadRequestException when RPC fails', async () => {
			const userId = generateUUID()
			const mockError = { message: 'Failed to get overdue maintenance' }

			mockSupabaseClient.rpc.mockResolvedValue({
				data: null,
				error: mockError
			})

			await expect(service.getOverdue(userId)).rejects.toThrow(BadRequestException)
			expect(mockLogger.error).toHaveBeenCalledWith('Failed to get overdue maintenance', {
				userId,
				error: mockError.message
			})
		})
	})

	describe('findOne', () => {
		it('should return maintenance request by ID', async () => {
			const userId = generateUUID()
			const maintenanceId = generateUUID()
			const mockMaintenance = createMockMaintenance({ id: maintenanceId })

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: mockMaintenance,
					error: null
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			const result = await service.findOne(userId, maintenanceId)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_maintenance_by_id', {
				p_user_id: userId,
				p_maintenance_id: maintenanceId
			})
			expect(result).toEqual(mockMaintenance)
		})

		it('should return null when maintenance request not found', async () => {
			const userId = generateUUID()
			const maintenanceId = generateUUID()
			const mockError = { message: 'Maintenance request not found' }

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: null,
					error: mockError
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			const result = await service.findOne(userId, maintenanceId)

			expect(result).toBeNull()
			expect(mockLogger.error).toHaveBeenCalledWith('Failed to get maintenance request', {
				userId,
				maintenanceId,
				error: mockError.message
			})
		})
	})

	describe('create', () => {
		it('should create new maintenance request', async () => {
			const userId = generateUUID()
			const createRequest = createMockCreateRequest()
			const mockMaintenance = createMockMaintenance(createRequest)

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: mockMaintenance,
					error: null
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			const result = await service.create(userId, createRequest)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('create_maintenance', {
				p_user_id: userId,
				p_unit_id: createRequest.unitId,
				p_title: createRequest.title,
				p_description: createRequest.description,
				p_priority: createRequest.priority,
				p_category: createRequest.category,
				p_scheduled_date: createRequest.scheduledDate || undefined,
				p_estimated_cost: createRequest.estimatedCost
			})
			expect(result).toEqual(mockMaintenance)
		})

		it('should use default values for optional fields', async () => {
			const userId = generateUUID()
			const createRequest = {
				unitId: generateUUID(),
				title: 'Fix issue',
				description: 'Something is broken'
			}
			const mockMaintenance = createMockMaintenance()

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: mockMaintenance,
					error: null
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			await service.create(userId, createRequest)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('create_maintenance', {
				p_user_id: userId,
				p_unit_id: createRequest.unitId,
				p_title: createRequest.title,
				p_description: createRequest.description,
				p_priority: 'MEDIUM',
				p_category: 'GENERAL',
				p_scheduled_date: undefined,
				p_estimated_cost: undefined
			})
		})

		it('should throw BadRequestException when creation fails', async () => {
			const userId = generateUUID()
			const createRequest = createMockCreateRequest()
			const mockError = { message: 'Constraint violation' }

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: null,
					error: mockError
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			await expect(service.create(userId, createRequest)).rejects.toThrow(BadRequestException)
			expect(mockLogger.error).toHaveBeenCalledWith('Failed to create maintenance request', {
				userId,
				error: mockError.message
			})
		})
	})

	describe('update', () => {
		it('should update existing maintenance request', async () => {
			const userId = generateUUID()
			const maintenanceId = generateUUID()
			const updateRequest = createMockUpdateRequest()
			const mockMaintenance = createMockMaintenance({ ...updateRequest })

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: mockMaintenance,
					error: null
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			const result = await service.update(userId, maintenanceId, updateRequest)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('update_maintenance', {
				p_user_id: userId,
				p_maintenance_id: maintenanceId,
				p_title: updateRequest.title,
				p_description: updateRequest.description,
				p_priority: updateRequest.priority,
				p_category: updateRequest.category,
				p_status: updateRequest.status,
				p_scheduled_date: updateRequest.scheduledDate,
				p_completed_date: updateRequest.completedDate,
				p_estimated_cost: updateRequest.estimatedCost,
				p_actual_cost: updateRequest.actualCost,
				p_notes: updateRequest.notes
			})
			expect(result).toEqual(mockMaintenance)
		})

		it('should emit maintenance.updated event when update succeeds', async () => {
			const userId = generateUUID()
			const maintenanceId = generateUUID()
			const updateRequest = createMockUpdateRequest()
			const mockMaintenance = {
				...createMockMaintenance(),
				title: 'Updated Title',
				status: 'IN_PROGRESS',
				priority: 'HIGH',
				property_name: 'Test Property',
				unit_number: '101',
				description: 'Updated description'
			}

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: mockMaintenance,
					error: null
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			await service.update(userId, maintenanceId, updateRequest)

			expect(mockEventEmitter.emit).toHaveBeenCalledWith(
				'maintenance.updated',
				expect.objectContaining({
					userId,
					maintenanceId,
					title: 'Updated Title',
					status: 'IN_PROGRESS',
					priority: 'HIGH',
					propertyName: 'Test Property',
					unitNumber: '101',
					description: 'Updated description'
				})
			)
		})

		it('should handle URGENT priority mapping to EMERGENCY in event', async () => {
			const userId = generateUUID()
			const maintenanceId = generateUUID()
			const updateRequest = { ...createMockUpdateRequest(), priority: 'URGENT' as const }
			// Mock maintenance record without priority field so updateRequest.priority is used
			const mockMaintenance = {
				id: generateUUID(),
				unitId: generateUUID(),
				title: 'Fix issue',
				description: 'Something needs fixing',
				category: 'GENERAL',
				status: 'PENDING',
				// Deliberately omit priority field so updateRequest.priority is used
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			}

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: mockMaintenance,
					error: null
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			await service.update(userId, maintenanceId, updateRequest)

			expect(mockEventEmitter.emit).toHaveBeenCalledWith(
				'maintenance.updated',
				expect.objectContaining({
					priority: 'EMERGENCY' // URGENT maps to EMERGENCY in event
				})
			)
		})

		it('should return null when maintenance request not found', async () => {
			const userId = generateUUID()
			const maintenanceId = generateUUID()
			const updateRequest = createMockUpdateRequest()
			const mockError = { message: 'Maintenance request not found' }

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: null,
					error: mockError
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			const result = await service.update(userId, maintenanceId, updateRequest)

			expect(result).toBeNull()
			expect(mockLogger.error).toHaveBeenCalledWith('Failed to update maintenance request', {
				userId,
				maintenanceId,
				error: mockError.message
			})
		})
	})

	describe('remove', () => {
		it('should delete maintenance request successfully', async () => {
			const userId = generateUUID()
			const maintenanceId = generateUUID()

			mockSupabaseClient.rpc.mockResolvedValue({
				error: null
			})

			await service.remove(userId, maintenanceId)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('delete_maintenance', {
				p_user_id: userId,
				p_maintenance_id: maintenanceId
			})
		})

		it('should throw BadRequestException when deletion fails', async () => {
			const userId = generateUUID()
			const maintenanceId = generateUUID()
			const mockError = { message: 'Foreign key constraint' }

			mockSupabaseClient.rpc.mockResolvedValue({
				error: mockError
			})

			await expect(service.remove(userId, maintenanceId)).rejects.toThrow(BadRequestException)
			expect(mockLogger.error).toHaveBeenCalledWith('Failed to delete maintenance request', {
				userId,
				maintenanceId,
				error: mockError.message
			})
		})
	})

	describe('complete', () => {
		it('should complete maintenance request successfully', async () => {
			const userId = generateUUID()
			const maintenanceId = generateUUID()
			const actualCost = 250.00
			const notes = 'Replaced faucet cartridge'
			const mockMaintenance = createMockMaintenance({ 
				status: 'COMPLETED',
				actualCost,
				notes
			})

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: mockMaintenance,
					error: null
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			const result = await service.complete(userId, maintenanceId, actualCost, notes)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('complete_maintenance', {
				p_user_id: userId,
				p_maintenance_id: maintenanceId,
				p_actual_cost: actualCost,
				p_notes: notes
			})
			expect(result).toEqual(mockMaintenance)
		})

		it('should handle undefined cost and notes', async () => {
			const userId = generateUUID()
			const maintenanceId = generateUUID()
			const mockMaintenance = createMockMaintenance({ status: 'COMPLETED' })

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: mockMaintenance,
					error: null
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			await service.complete(userId, maintenanceId)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('complete_maintenance', {
				p_user_id: userId,
				p_maintenance_id: maintenanceId,
				p_actual_cost: undefined,
				p_notes: undefined
			})
		})

		it('should throw BadRequestException when completion fails', async () => {
			const userId = generateUUID()
			const maintenanceId = generateUUID()
			const mockError = { message: 'Cannot complete cancelled request' }

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: null,
					error: mockError
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			await expect(service.complete(userId, maintenanceId)).rejects.toThrow(BadRequestException)
			expect(mockLogger.error).toHaveBeenCalledWith('Failed to complete maintenance request', {
				userId,
				maintenanceId,
				error: mockError.message
			})
		})
	})

	describe('cancel', () => {
		it('should cancel maintenance request with reason', async () => {
			const userId = generateUUID()
			const maintenanceId = generateUUID()
			const reason = 'Duplicate request'
			const mockMaintenance = createMockMaintenance({ 
				status: 'CANCELLED',
				notes: reason
			})

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: mockMaintenance,
					error: null
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			const result = await service.cancel(userId, maintenanceId, reason)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('cancel_maintenance', {
				p_user_id: userId,
				p_maintenance_id: maintenanceId,
				p_reason: reason
			})
			expect(result).toEqual(mockMaintenance)
		})

		it('should cancel maintenance request with default reason', async () => {
			const userId = generateUUID()
			const maintenanceId = generateUUID()
			const mockMaintenance = createMockMaintenance({ status: 'CANCELLED' })

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: mockMaintenance,
					error: null
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			const result = await service.cancel(userId, maintenanceId)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('cancel_maintenance', {
				p_user_id: userId,
				p_maintenance_id: maintenanceId,
				p_reason: 'Cancelled by user'
			})
			expect(result).toEqual(mockMaintenance)
		})

		it('should throw BadRequestException when cancellation fails', async () => {
			const userId = generateUUID()
			const maintenanceId = generateUUID()
			const mockError = { message: 'Cannot cancel completed request' }

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: null,
					error: mockError
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			await expect(service.cancel(userId, maintenanceId)).rejects.toThrow(BadRequestException)
			expect(mockLogger.error).toHaveBeenCalledWith('Failed to cancel maintenance request', {
				userId,
				maintenanceId,
				error: mockError.message
			})
		})
	})
})