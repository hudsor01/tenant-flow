import { BadRequestException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { randomUUID } from 'crypto'
import { SilentLogger } from '../../__test__/silent-logger'
import { REPOSITORY_TOKENS } from '../../repositories/repositories.module'
import { MaintenanceService } from './maintenance.service'

describe('MaintenanceService', () => {
	let service: MaintenanceService
	let mockMaintenanceRepository: any
	let mockUnitsRepository: any
	let mockPropertiesRepository: any
	let mockEventEmitter: jest.Mocked<EventEmitter2>

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
		estimatedCost: 150.0,
		actualCost: null,
		notes: null,
		completedDate: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides
	})

	const createMockCreateRequest = (
		overrides: Record<string, unknown> = {}
	) => ({
		unitId: generateUUID(),
		title: 'Fix broken AC',
		description: 'Air conditioning unit not working',
		priority: 'HIGH' as const,
		category: 'HVAC' as const,
		estimatedCost: 300.0,
		scheduledDate: undefined,
		...overrides
	})

	const createMockUpdateRequest = (
		overrides: Record<string, unknown> = {}
	) => ({
		title: 'Fix broken AC - Updated',
		description: 'Air conditioning unit not working - updated description',
		priority: 'HIGH' as const,
		category: 'HVAC' as const,
		status: 'IN_PROGRESS' as const,
		scheduledDate: '2024-02-02T10:00:00Z',
		completedDate: undefined,
		estimatedCost: 350.0,
		actualCost: undefined,
		notes: 'Technician scheduled for tomorrow',
		...overrides
	})

	beforeEach(async () => {
		mockMaintenanceRepository = {
			findByUserIdWithSearch: jest.fn(),
			findById: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			softDelete: jest.fn(),
			getStats: jest.fn(),
			getHighPriorityRequests: jest.fn(),
			getOverdueRequests: jest.fn(),
			updateStatus: jest.fn()
		}

		mockUnitsRepository = {
			findById: jest.fn(),
			findByPropertyId: jest.fn(),
			findByTenantId: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			softDelete: jest.fn(),
			findAvailable: jest.fn(),
			findOccupied: jest.fn()
		}

		mockPropertiesRepository = {
			findById: jest.fn(),
			findByUserId: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			softDelete: jest.fn(),
			findAll: jest.fn()
		}

		mockEventEmitter = {
			emit: jest.fn(),
			emitAsync: jest.fn(),
			addListener: jest.fn(),
			on: jest.fn(),
			prependListener: jest.fn(),
			once: jest.fn(),
			prependOnceListener: jest.fn(),
			off: jest.fn(),
			removeListener: jest.fn(),
			removeAllListeners: jest.fn(),
			setMaxListeners: jest.fn(),
			getMaxListeners: jest.fn(),
			listeners: jest.fn(),
			rawListeners: jest.fn(),
			listenerCount: jest.fn(),
			eventNames: jest.fn(),
			onAny: jest.fn(),
			offAny: jest.fn(),
			many: jest.fn(),
			onceAny: jest.fn(),
			hasListeners: jest.fn()
		} as unknown as jest.Mocked<EventEmitter2>

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				MaintenanceService,
				{
					provide: REPOSITORY_TOKENS.MAINTENANCE,
					useValue: mockMaintenanceRepository
				},
				{
					provide: REPOSITORY_TOKENS.UNITS,
					useValue: mockUnitsRepository
				},
				{
					provide: REPOSITORY_TOKENS.PROPERTIES,
					useValue: mockPropertiesRepository
				},
				{
					provide: EventEmitter2,
					useValue: mockEventEmitter
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<MaintenanceService>(MaintenanceService)

		// Spy on the actual logger instance created by the service
		jest.spyOn(service['logger'], 'error').mockImplementation(() => {})
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

			mockMaintenanceRepository.findByUserIdWithSearch.mockResolvedValue(
				mockMaintenance
			)

			const result = await service.findAll(userId, query)

			expect(result).toEqual(mockMaintenance)
			expect(
				mockMaintenanceRepository.findByUserIdWithSearch
			).toHaveBeenCalledWith(
				userId,
				expect.objectContaining({
					unitId: query.unitId,
					propertyId: query.propertyId,
					priority: query.priority,
					category: query.category,
					status: query.status,
					limit: query.limit,
					offset: query.offset,
					sort: query.sortBy,
					order: query.sortOrder
				})
			)
		})

		it('should handle undefined query parameters', async () => {
			const userId = generateUUID()
			const mockMaintenance = [createMockMaintenance()]

			mockMaintenanceRepository.findByUserIdWithSearch.mockResolvedValue(
				mockMaintenance
			)

			const result = await service.findAll(userId, {})

			expect(result).toEqual(mockMaintenance)
			expect(
				mockMaintenanceRepository.findByUserIdWithSearch
			).toHaveBeenCalledWith(userId, expect.objectContaining({}))
		})

		it('should throw BadRequestException when RPC fails', async () => {
			const userId = generateUUID()

			mockMaintenanceRepository.findByUserIdWithSearch.mockRejectedValue(
				new Error('Database error')
			)

			await expect(service.findAll(userId, {})).rejects.toThrow(
				BadRequestException
			)
		})
	})

	describe('findOne', () => {
		it('should return single maintenance request', async () => {
			const userId = generateUUID()
			const maintenanceId = generateUUID()
			const mockMaintenance = createMockMaintenance({ id: maintenanceId })

			mockMaintenanceRepository.findById.mockResolvedValue(mockMaintenance)

			const result = await service.findOne(userId, maintenanceId)

			expect(result).toEqual(mockMaintenance)
			expect(mockMaintenanceRepository.findById).toHaveBeenCalledWith(
				maintenanceId
			)
		})

		it('should return null when request not found', async () => {
			const userId = generateUUID()
			const maintenanceId = generateUUID()

			mockMaintenanceRepository.findById.mockResolvedValue(null)

			const result = await service.findOne(userId, maintenanceId)

			expect(result).toBeNull()
		})
	})

	describe('create', () => {
		it('should create new maintenance request and emit event', async () => {
			const userId = generateUUID()
			const createRequest = createMockCreateRequest()
			const mockCreated = createMockMaintenance({
				unitId: createRequest.unitId,
				title: createRequest.title
			})

			mockMaintenanceRepository.create.mockResolvedValue(mockCreated)

			const result = await service.create(userId, createRequest)

			expect(result).toEqual(mockCreated)
			expect(mockMaintenanceRepository.create).toHaveBeenCalledWith(
				userId,
				expect.objectContaining({
					title: createRequest.title,
					description: createRequest.description,
					priority: createRequest.priority || 'MEDIUM',
					unitId: createRequest.unitId,
					allowEntry: true,
					photos: [],
					preferredDate: undefined,
					category: createRequest.category,
					estimatedCost: createRequest.estimatedCost
				})
			)
			expect(mockEventEmitter.emit).toHaveBeenCalledWith(
				'maintenance.created',
				expect.objectContaining({
					userId,
					maintenanceId: mockCreated.id,
					maintenanceTitle: mockCreated.title
				})
			)
		})
	})

	describe('update', () => {
		it('should update maintenance request and emit event', async () => {
			const userId = generateUUID()
			const maintenanceId = generateUUID()
			const updateRequest = createMockUpdateRequest()
			const existing = createMockMaintenance({ id: maintenanceId })
			const updated = { ...existing, ...updateRequest }

			mockMaintenanceRepository.findById.mockResolvedValue(existing)
			mockMaintenanceRepository.update.mockResolvedValue(updated)

			const result = await service.update(userId, maintenanceId, updateRequest)

			expect(result).toEqual(updated)
			expect(mockMaintenanceRepository.update).toHaveBeenCalledWith(
				maintenanceId,
				expect.objectContaining({
					...updateRequest,
					completedAt: undefined
				})
			)
			expect(mockEventEmitter.emit).toHaveBeenCalledWith(
				'maintenance.updated',
				expect.anything()
			)
		})

		it('should return null when request not found', async () => {
			const userId = generateUUID()
			const maintenanceId = generateUUID()

			mockMaintenanceRepository.findById.mockResolvedValue(null)

			const result = await service.update(userId, maintenanceId, {})

			expect(result).toBeNull()
			expect(mockMaintenanceRepository.update).not.toHaveBeenCalled()
		})
	})

	describe('remove', () => {
		it('should soft delete maintenance request', async () => {
			const userId = generateUUID()
			const maintenanceId = generateUUID()

			mockMaintenanceRepository.softDelete.mockResolvedValue({ success: true })

			await service.remove(userId, maintenanceId)

			expect(mockMaintenanceRepository.softDelete).toHaveBeenCalledWith(
				userId,
				maintenanceId
			)
		})

		it('should throw BadRequestException when delete fails', async () => {
			const userId = generateUUID()
			const maintenanceId = generateUUID()

			mockMaintenanceRepository.softDelete.mockResolvedValue({
				success: false,
				message: 'Not found'
			})

			await expect(service.remove(userId, maintenanceId)).rejects.toThrow(
				BadRequestException
			)
		})
	})

	describe('complete', () => {
		it('should complete maintenance request', async () => {
			const userId = generateUUID()
			const maintenanceId = generateUUID()
			const actualCost = 200
			const notes = 'Completed successfully'
			const completed = createMockMaintenance({ status: 'COMPLETED' })

			mockMaintenanceRepository.updateStatus.mockResolvedValue(completed)

			const result = await service.complete(
				userId,
				maintenanceId,
				actualCost,
				notes
			)

			expect(result).toEqual(completed)
			expect(mockMaintenanceRepository.updateStatus).toHaveBeenCalledWith(
				maintenanceId,
				'COMPLETED',
				userId,
				notes
			)
		})
	})

	describe('cancel', () => {
		it('should cancel maintenance request', async () => {
			const userId = generateUUID()
			const maintenanceId = generateUUID()
			const reason = 'No longer needed'
			const cancelled = createMockMaintenance({ status: 'CANCELED' })

			mockMaintenanceRepository.updateStatus.mockResolvedValue(cancelled)

			const result = await service.cancel(userId, maintenanceId, reason)

			expect(result).toEqual(cancelled)
			expect(mockMaintenanceRepository.updateStatus).toHaveBeenCalledWith(
				maintenanceId,
				'CANCELED',
				userId,
				reason
			)
		})
	})

	describe('getStats', () => {
		it('should return maintenance statistics', async () => {
			const userId = generateUUID()
			const mockStats = {
				total: 10,
				open: 3,
				inProgress: 2,
				completed: 5,
				completedToday: 0,
				avgResolutionTime: 3,
				byPriority: {
					low: 0,
					medium: 0,
					high: 0,
					emergency: 0
				}
			}

			mockMaintenanceRepository.getStats.mockResolvedValue(mockStats)

			const result = await service.getStats(userId)

			expect(result).toEqual(mockStats)
			expect(mockMaintenanceRepository.getStats).toHaveBeenCalledWith(userId)
		})
	})

	describe('getUrgent', () => {
		it('should return urgent maintenance requests', async () => {
			const userId = generateUUID()
			const mockUrgent = [
				createMockMaintenance({ priority: 'EMERGENCY' }),
				createMockMaintenance({ priority: 'HIGH' })
			]

			mockMaintenanceRepository.getHighPriorityRequests.mockResolvedValue(
				mockUrgent
			)

			const result = await service.getUrgent(userId)

			expect(result).toEqual(mockUrgent)
			expect(
				mockMaintenanceRepository.getHighPriorityRequests
			).toHaveBeenCalledWith(userId)
		})
	})

	describe('getOverdue', () => {
		it('should return overdue maintenance requests', async () => {
			const userId = generateUUID()
			const mockOverdue = [createMockMaintenance({ status: 'ON_HOLD' })]

			mockMaintenanceRepository.getOverdueRequests.mockResolvedValue(
				mockOverdue
			)

			const result = await service.getOverdue(userId)

			expect(result).toEqual(mockOverdue)
			expect(mockMaintenanceRepository.getOverdueRequests).toHaveBeenCalledWith(
				userId
			)
		})
	})
})
