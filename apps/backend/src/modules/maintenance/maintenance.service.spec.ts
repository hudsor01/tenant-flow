import { BadRequestException, ConflictException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { MaintenanceRequest } from '@repo/shared/types/core'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import { SupabaseService } from '../../database/supabase.service'
import { MaintenanceService } from './maintenance.service'
import { MaintenanceAssignmentService } from './maintenance-assignment.service'
import { MaintenanceStatusService } from './maintenance-status.service'
import { MaintenanceExpenseService } from './maintenance-expense.service'

describe('MaintenanceService', () => {
	let service: MaintenanceService
	let mockUserClient: {
		from: jest.Mock
	}
	let mockEventEmitter: jest.Mocked<EventEmitter2>
	let mockStatusService: {
		applyStatusUpdates: jest.Mock
		emitUpdatedEvents: jest.Mock
	}
	let mockAssignmentService: { applyAssignmentUpdates: jest.Mock }
	let mockExpenseService: {
		createExpense: jest.Mock
		getExpenses: jest.Mock
		deleteExpense: jest.Mock
	}

	const mockToken = 'mock-jwt-token'
	const mockUserId = 'user-123'
	const mockMaintenanceId = 'maint-abc'

	const mockMaintenanceRequest: MaintenanceRequest = {
		id: mockMaintenanceId,
		unit_id: 'unit-1',
		owner_user_id: 'owner-456',
		tenant_id: 'tenant-789',
		title: 'Leaky faucet',
		description: 'Kitchen faucet is dripping',
		status: 'open',
		priority: 'normal',
		assigned_to: null,
		scheduled_date: null,
		completed_at: null,
		estimated_cost: null,
		actual_cost: null,
		requested_by: mockUserId,
		inspection_date: null,
		inspection_findings: null,
		inspector_id: null,
		created_at: '2024-01-15T10:00:00Z',
		updated_at: '2024-01-15T10:00:00Z'
	}

	// Reusable chainable query builder factory
	const createChainBuilder = (
		resolvedValue: { data: unknown; error: unknown; count?: number | null }
	) => {
		const builder: Record<string, jest.Mock> = {}
		const chainMethods = [
			'select',
			'eq',
			'neq',
			'gte',
			'lte',
			'or',
			'order',
			'range',
			'limit',
			'insert',
			'update',
			'delete'
		]
		for (const method of chainMethods) {
			builder[method] = jest.fn().mockReturnValue(builder)
		}
		// Terminal methods
		builder.single = jest.fn().mockResolvedValue(resolvedValue)
		builder.maybeSingle = jest.fn().mockResolvedValue(resolvedValue)
		// Make builder itself thenable for query execution (findAll returns await queryBuilder)
		const thenFn = (resolve: (v: unknown) => void) =>
			Promise.resolve(resolvedValue).then(resolve)
		Object.defineProperty(builder, 'then', {
			value: thenFn,
			writable: true,
			enumerable: false
		})
		return builder
	}

	beforeEach(async () => {
		mockUserClient = {
			from: jest.fn()
		}

		mockEventEmitter = {
			emit: jest.fn()
		} as unknown as jest.Mocked<EventEmitter2>

		mockStatusService = {
			applyStatusUpdates: jest.fn(),
			emitUpdatedEvents: jest.fn().mockResolvedValue(undefined)
		}

		mockAssignmentService = {
			applyAssignmentUpdates: jest.fn()
		}

		mockExpenseService = {
			createExpense: jest.fn(),
			getExpenses: jest.fn(),
			deleteExpense: jest.fn()
		}

		const module = await Test.createTestingModule({
			providers: [
				MaintenanceService,
				{
					provide: SupabaseService,
					useValue: {
						getUserClient: jest.fn(() => mockUserClient)
					}
				},
				{ provide: EventEmitter2, useValue: mockEventEmitter },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				},
				{
					provide: MaintenanceAssignmentService,
					useValue: mockAssignmentService
				},
				{
					provide: MaintenanceStatusService,
					useValue: mockStatusService
				},
				{
					provide: MaintenanceExpenseService,
					useValue: mockExpenseService
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<MaintenanceService>(MaintenanceService)
	})

	afterEach(() => {
		jest.resetAllMocks()
	})

	// ================================================================
	// findAll
	// ================================================================
	describe('findAll', () => {
		it('returns maintenance requests with count', async () => {
			const qb = createChainBuilder({
				data: [mockMaintenanceRequest],
				error: null,
				count: 1
			})
			mockUserClient.from.mockReturnValue(qb)

			const result = await service.findAll(mockToken, {})

			expect(result.data).toHaveLength(1)
			expect(result.count).toBe(1)
			expect(mockUserClient.from).toHaveBeenCalledWith(
				'maintenance_requests'
			)
		})

		it('throws BadRequestException when token is missing', async () => {
			await expect(service.findAll('', {})).rejects.toThrow(
				BadRequestException
			)
		})

		it('applies status filter correctly', async () => {
			const qb = createChainBuilder({
				data: [],
				error: null,
				count: 0
			})
			mockUserClient.from.mockReturnValue(qb)

			await service.findAll(mockToken, { status: 'open' })

			expect(qb.eq).toHaveBeenCalledWith('status', 'open')
		})

		it('applies priority filter correctly', async () => {
			const qb = createChainBuilder({
				data: [],
				error: null,
				count: 0
			})
			mockUserClient.from.mockReturnValue(qb)

			await service.findAll(mockToken, { priority: 'urgent' })

			expect(qb.eq).toHaveBeenCalledWith('priority', 'urgent')
		})

		it('applies property_id filter correctly', async () => {
			const qb = createChainBuilder({
				data: [],
				error: null,
				count: 0
			})
			mockUserClient.from.mockReturnValue(qb)

			await service.findAll(mockToken, { property_id: 'prop-1' })

			expect(qb.eq).toHaveBeenCalledWith('property_id', 'prop-1')
		})

		it('applies unit_id filter correctly', async () => {
			const qb = createChainBuilder({
				data: [],
				error: null,
				count: 0
			})
			mockUserClient.from.mockReturnValue(qb)

			await service.findAll(mockToken, { unit_id: 'unit-1' })

			expect(qb.eq).toHaveBeenCalledWith('unit_id', 'unit-1')
		})

		it('applies search filter with sanitization', async () => {
			const qb = createChainBuilder({
				data: [],
				error: null,
				count: 0
			})
			mockUserClient.from.mockReturnValue(qb)

			await service.findAll(mockToken, { search: 'leaky faucet' })

			expect(qb.or).toHaveBeenCalled()
		})

		it('applies pagination correctly', async () => {
			const qb = createChainBuilder({
				data: [],
				error: null,
				count: 0
			})
			mockUserClient.from.mockReturnValue(qb)

			await service.findAll(mockToken, { limit: 10, offset: 20 })

			expect(qb.range).toHaveBeenCalledWith(20, 29)
		})

		it('uses default pagination when not specified', async () => {
			const qb = createChainBuilder({
				data: [],
				error: null,
				count: 0
			})
			mockUserClient.from.mockReturnValue(qb)

			await service.findAll(mockToken, {})

			// Default: limit=50, offset=0 -> range(0, 49)
			expect(qb.range).toHaveBeenCalledWith(0, 49)
		})

		it('throws BadRequestException on database error', async () => {
			const qb = createChainBuilder({
				data: null,
				error: { message: 'DB error' },
				count: null
			})
			mockUserClient.from.mockReturnValue(qb)

			await expect(service.findAll(mockToken, {})).rejects.toThrow(
				BadRequestException
			)
		})

		it('ignores invalid status values', async () => {
			const qb = createChainBuilder({
				data: [],
				error: null,
				count: 0
			})
			mockUserClient.from.mockReturnValue(qb)

			await service.findAll(mockToken, { status: 'INVALID_STATUS' })

			// The eq for status should NOT have been called with the invalid value
			// (it will be called for other filters like select chain though)
			const eqCalls = qb.eq.mock.calls
			const statusCall = eqCalls.find(
				(call: unknown[]) => call[0] === 'status'
			)
			expect(statusCall).toBeUndefined()
		})

		it('applies date range filters', async () => {
			const qb = createChainBuilder({
				data: [],
				error: null,
				count: 0
			})
			mockUserClient.from.mockReturnValue(qb)

			await service.findAll(mockToken, {
				dateFrom: '2024-01-01',
				dateTo: '2024-12-31'
			})

			expect(qb.gte).toHaveBeenCalled()
			expect(qb.lte).toHaveBeenCalled()
		})

		it('applies tenant_id filter correctly', async () => {
			const qb = createChainBuilder({
				data: [],
				error: null,
				count: 0
			})
			mockUserClient.from.mockReturnValue(qb)

			await service.findAll(mockToken, { tenant_id: 'tenant-789' })

			expect(qb.eq).toHaveBeenCalledWith('tenant_id', 'tenant-789')
		})

		it('applies assigned_to filter correctly', async () => {
			const qb = createChainBuilder({
				data: [],
				error: null,
				count: 0
			})
			mockUserClient.from.mockReturnValue(qb)

			await service.findAll(mockToken, { assigned_to: 'worker-1' })

			expect(qb.eq).toHaveBeenCalledWith('assigned_to', 'worker-1')
		})

		it('applies sort order ascending', async () => {
			const qb = createChainBuilder({
				data: [],
				error: null,
				count: 0
			})
			mockUserClient.from.mockReturnValue(qb)

			await service.findAll(mockToken, {
				sortBy: 'priority',
				sortOrder: 'asc'
			})

			expect(qb.order).toHaveBeenCalledWith('priority', {
				ascending: true
			})
		})
	})

	// ================================================================
	// findOne
	// ================================================================
	describe('findOne', () => {
		it('returns maintenance request when found', async () => {
			const qb = createChainBuilder({
				data: mockMaintenanceRequest,
				error: null
			})
			mockUserClient.from.mockReturnValue(qb)

			const result = await service.findOne(mockToken, mockMaintenanceId)

			expect(result).toEqual(mockMaintenanceRequest)
			expect(qb.eq).toHaveBeenCalledWith('id', mockMaintenanceId)
		})

		it('returns null when token is missing', async () => {
			const result = await service.findOne('', mockMaintenanceId)
			expect(result).toBeNull()
		})

		it('returns null when maintenanceId is missing', async () => {
			const result = await service.findOne(mockToken, '')
			expect(result).toBeNull()
		})

		it('returns null on database error', async () => {
			const qb = createChainBuilder({
				data: null,
				error: { message: 'DB error' }
			})
			mockUserClient.from.mockReturnValue(qb)

			const result = await service.findOne(mockToken, mockMaintenanceId)
			expect(result).toBeNull()
		})

		it('returns null when getUserClient throws an unexpected error', async () => {
			// Force an exception in the try block by making from() throw
			mockUserClient.from.mockImplementation(() => {
				throw new Error('Unexpected client error')
			})

			const result = await service.findOne(mockToken, mockMaintenanceId)
			expect(result).toBeNull()
		})
	})

	// ================================================================
	// create
	// ================================================================
	describe('create', () => {
		const createRequest = {
			unit_id: 'unit-1',
			description: 'Kitchen faucet is dripping',
			title: 'Leaky faucet',
			priority: 'HIGH' as const
		}

		it('creates maintenance request and emits event', async () => {
			// Mock unit lookup to get property owner
			const unitQb = createChainBuilder({
				data: { property: { owner_user_id: 'owner-456' } },
				error: null
			})

			// Mock insert
			const insertQb = createChainBuilder({
				data: mockMaintenanceRequest,
				error: null
			})

			mockUserClient.from
				.mockReturnValueOnce(unitQb) // units query
				.mockReturnValueOnce(insertQb) // maintenance_requests insert

			const result = await service.create(
				mockToken,
				mockUserId,
				createRequest
			)

			expect(result).toEqual(mockMaintenanceRequest)
			expect(mockEventEmitter.emit).toHaveBeenCalledWith(
				'maintenance.created',
				expect.objectContaining({
					user_id: mockUserId,
					maintenanceId: mockMaintenanceId
				})
			)
		})

		it('throws BadRequestException when token is missing', async () => {
			await expect(
				service.create('', mockUserId, createRequest)
			).rejects.toThrow(BadRequestException)
		})

		it('throws BadRequestException when user_id is missing', async () => {
			await expect(
				service.create(mockToken, '', createRequest)
			).rejects.toThrow(BadRequestException)
		})

		it('throws BadRequestException when description is missing', async () => {
			await expect(
				service.create(mockToken, mockUserId, {
					...createRequest,
					description: ''
				})
			).rejects.toThrow(BadRequestException)
		})

		it('throws BadRequestException when unit_id is missing', async () => {
			await expect(
				service.create(mockToken, mockUserId, {
					...createRequest,
					unit_id: undefined as unknown as string
				})
			).rejects.toThrow('unit_id is required')
		})

		it('throws BadRequestException when unit property owner not found', async () => {
			const unitQb = createChainBuilder({
				data: null,
				error: { message: 'not found' }
			})
			mockUserClient.from.mockReturnValue(unitQb)

			await expect(
				service.create(mockToken, mockUserId, createRequest)
			).rejects.toThrow('Unable to find property owner for unit')
		})

		it('throws BadRequestException on insert failure', async () => {
			const unitQb = createChainBuilder({
				data: { property: { owner_user_id: 'owner-456' } },
				error: null
			})
			const insertQb = createChainBuilder({
				data: null,
				error: { message: 'Insert failed' }
			})

			mockUserClient.from
				.mockReturnValueOnce(unitQb)
				.mockReturnValueOnce(insertQb)

			await expect(
				service.create(mockToken, mockUserId, createRequest)
			).rejects.toThrow('Failed to create maintenance request')
		})

		it('maps priority correctly', async () => {
			const unitQb = createChainBuilder({
				data: { property: { owner_user_id: 'owner-456' } },
				error: null
			})
			const insertQb = createChainBuilder({
				data: mockMaintenanceRequest,
				error: null
			})

			mockUserClient.from
				.mockReturnValueOnce(unitQb)
				.mockReturnValueOnce(insertQb)

			await service.create(mockToken, mockUserId, {
				...createRequest,
				priority: 'URGENT' as const
			})

			expect(insertQb.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					priority: 'urgent'
				})
			)
		})

		it('includes scheduled_date and estimated_cost when provided', async () => {
			const unitQb = createChainBuilder({
				data: { property: { owner_user_id: 'owner-456' } },
				error: null
			})
			const insertQb = createChainBuilder({
				data: mockMaintenanceRequest,
				error: null
			})

			mockUserClient.from
				.mockReturnValueOnce(unitQb)
				.mockReturnValueOnce(insertQb)

			await service.create(mockToken, mockUserId, {
				...createRequest,
				scheduled_date: '2024-06-15',
				estimated_cost: 250
			})

			expect(insertQb.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					scheduled_date: expect.any(String),
					estimated_cost: 250
				})
			)
		})

		it('sets tenant_id from createRequest when provided', async () => {
			const unitQb = createChainBuilder({
				data: { property: { owner_user_id: 'owner-456' } },
				error: null
			})
			const insertQb = createChainBuilder({
				data: mockMaintenanceRequest,
				error: null
			})

			mockUserClient.from
				.mockReturnValueOnce(unitQb)
				.mockReturnValueOnce(insertQb)

			await service.create(mockToken, mockUserId, {
				...createRequest,
				tenant_id: 'custom-tenant-id'
			})

			expect(insertQb.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					tenant_id: 'custom-tenant-id'
				})
			)
		})

		it('uses default priority when not provided', async () => {
			const unitQb = createChainBuilder({
				data: { property: { owner_user_id: 'owner-456' } },
				error: null
			})
			const insertQb = createChainBuilder({
				data: mockMaintenanceRequest,
				error: null
			})

			mockUserClient.from
				.mockReturnValueOnce(unitQb)
				.mockReturnValueOnce(insertQb)

			await service.create(mockToken, mockUserId, {
				unit_id: 'unit-1',
				description: 'Something broke'
			})

			expect(insertQb.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					priority: 'normal'
				})
			)
		})
	})

	// ================================================================
	// update
	// ================================================================
	describe('update', () => {
		const updateRequest = {
			title: 'Updated title',
			description: 'Updated description'
		}

		it('updates maintenance request and emits events', async () => {
			const updatedRequest = {
				...mockMaintenanceRequest,
				title: 'Updated title',
				description: 'Updated description'
			}

			// Mock findOne (verify ownership)
			const findQb = createChainBuilder({
				data: mockMaintenanceRequest,
				error: null
			})
			// Mock update
			const updateQb = createChainBuilder({
				data: updatedRequest,
				error: null
			})

			mockUserClient.from
				.mockReturnValueOnce(findQb) // findOne
				.mockReturnValueOnce(updateQb) // update

			const result = await service.update(
				mockToken,
				mockMaintenanceId,
				updateRequest
			)

			expect(result).toEqual(updatedRequest)
			expect(mockStatusService.applyStatusUpdates).toHaveBeenCalled()
			expect(
				mockAssignmentService.applyAssignmentUpdates
			).toHaveBeenCalled()
			expect(mockStatusService.emitUpdatedEvents).toHaveBeenCalled()
		})

		it('returns null when token is missing', async () => {
			const result = await service.update('', mockMaintenanceId, updateRequest)
			expect(result).toBeNull()
		})

		it('returns null when maintenanceId is missing', async () => {
			const result = await service.update(mockToken, '', updateRequest)
			expect(result).toBeNull()
		})

		it('returns null when maintenance request not found', async () => {
			const findQb = createChainBuilder({
				data: null,
				error: { message: 'not found' }
			})
			mockUserClient.from.mockReturnValue(findQb)

			const result = await service.update(
				mockToken,
				'nonexistent',
				updateRequest
			)

			expect(result).toBeNull()
		})

		it('throws ConflictException on optimistic locking conflict', async () => {
			// findOne succeeds
			const findQb = createChainBuilder({
				data: mockMaintenanceRequest,
				error: null
			})
			// update fails with PGRST116 (0 rows affected)
			const updateQb = createChainBuilder({
				data: null,
				error: { code: 'PGRST116', message: '0 rows' }
			})

			mockUserClient.from
				.mockReturnValueOnce(findQb)
				.mockReturnValueOnce(updateQb)

			await expect(
				service.update(mockToken, mockMaintenanceId, updateRequest, 1)
			).rejects.toThrow(ConflictException)
		})

		it('throws BadRequestException on other database errors', async () => {
			const findQb = createChainBuilder({
				data: mockMaintenanceRequest,
				error: null
			})
			const updateQb = createChainBuilder({
				data: null,
				error: { code: '42000', message: 'Syntax error' }
			})

			mockUserClient.from
				.mockReturnValueOnce(findQb)
				.mockReturnValueOnce(updateQb)

			await expect(
				service.update(mockToken, mockMaintenanceId, updateRequest)
			).rejects.toThrow(BadRequestException)
		})
	})

	// ================================================================
	// remove
	// ================================================================
	describe('remove', () => {
		it('deletes maintenance request via RLS-protected client', async () => {
			const deleteQb = createChainBuilder({ data: null, error: null })
			// Override eq to resolve directly (delete().eq() pattern)
			deleteQb.eq = jest.fn().mockResolvedValue({ error: null })
			mockUserClient.from.mockReturnValue(deleteQb)

			await expect(
				service.remove(mockToken, mockMaintenanceId)
			).resolves.toBeUndefined()

			expect(mockUserClient.from).toHaveBeenCalledWith(
				'maintenance_requests'
			)
			expect(deleteQb.delete).toHaveBeenCalled()
		})

		it('throws BadRequestException when token is missing', async () => {
			await expect(service.remove('', mockMaintenanceId)).rejects.toThrow(
				BadRequestException
			)
			await expect(service.remove('', mockMaintenanceId)).rejects.toThrow(
				'Authentication token and maintenance ID are required'
			)
		})

		it('throws BadRequestException when maintenanceId is missing', async () => {
			await expect(service.remove(mockToken, '')).rejects.toThrow(
				BadRequestException
			)
		})

		it('throws BadRequestException on delete failure', async () => {
			const deleteQb = createChainBuilder({ data: null, error: null })
			deleteQb.eq = jest
				.fn()
				.mockResolvedValue({ error: { message: 'Delete failed' } })
			mockUserClient.from.mockReturnValue(deleteQb)

			await expect(
				service.remove(mockToken, mockMaintenanceId)
			).rejects.toThrow('Failed to delete maintenance request')
		})
	})

	// ================================================================
	// Expense delegation
	// ================================================================
	describe('expense delegation', () => {
		it('delegates createExpense after verifying access', async () => {
			// Mock findOne
			const findQb = createChainBuilder({
				data: mockMaintenanceRequest,
				error: null
			})
			mockUserClient.from.mockReturnValue(findQb)

			const expenseData = {
				maintenance_request_id: mockMaintenanceId,
				vendor_name: 'Plumber Co',
				amount: 150,
				expense_date: '2024-03-15'
			}
			const mockExpense = { id: 'exp-1', ...expenseData }
			mockExpenseService.createExpense.mockResolvedValue(mockExpense)

			const result = await service.createExpense(mockToken, expenseData)

			expect(result).toEqual(mockExpense)
			expect(mockExpenseService.createExpense).toHaveBeenCalledWith(
				mockToken,
				expenseData,
				mockMaintenanceRequest
			)
		})

		it('throws BadRequestException when maintenance request not found for expense', async () => {
			const findQb = createChainBuilder({
				data: null,
				error: { message: 'not found' }
			})
			mockUserClient.from.mockReturnValue(findQb)

			await expect(
				service.createExpense(mockToken, {
					maintenance_request_id: 'nonexistent',
					vendor_name: null,
					amount: 100,
					expense_date: '2024-03-15'
				})
			).rejects.toThrow('Maintenance request not found')
		})

		it('delegates getExpenses', async () => {
			mockExpenseService.getExpenses.mockResolvedValue([])

			const result = await service.getExpenses(
				mockToken,
				mockMaintenanceId
			)

			expect(result).toEqual([])
			expect(mockExpenseService.getExpenses).toHaveBeenCalledWith(
				mockToken,
				mockMaintenanceId
			)
		})

		it('delegates deleteExpense', async () => {
			mockExpenseService.deleteExpense.mockResolvedValue(undefined)

			await service.deleteExpense(mockToken, 'exp-1')

			expect(mockExpenseService.deleteExpense).toHaveBeenCalledWith(
				mockToken,
				'exp-1'
			)
		})
	})
})
