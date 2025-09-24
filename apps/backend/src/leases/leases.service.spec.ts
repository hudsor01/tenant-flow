import { BadRequestException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { randomUUID } from 'crypto'
import { SilentLogger } from '../__test__/silent-logger'
import { SupabaseService } from '../database/supabase.service'
import { LeasesService } from './leases.service'

describe('LeasesService', () => {
	let service: LeasesService
	let mockSupabaseService: jest.Mocked<SupabaseService>
	let mockSupabaseClient: jest.Mocked<
		ReturnType<SupabaseService['getAdminClient']>
	>

	const generateUUID = () => randomUUID()

	const createMockLease = (overrides: Record<string, unknown> = {}) => ({
		id: generateUUID(),
		tenantId: generateUUID(),
		unitId: generateUUID(),
		startDate: '2024-01-01',
		endDate: '2024-12-31',
		monthlyRent: 1500.0,
		securityDeposit: 3000.0,
		paymentFrequency: 'MONTHLY',
		status: 'ACTIVE',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides
	})

	const createMockCreateRequest = (
		overrides: Record<string, unknown> = {}
	) => ({
		tenantId: generateUUID(),
		unitId: generateUUID(),
		startDate: '2024-01-01',
		endDate: '2024-12-31',
		monthlyRent: 1500.0,
		securityDeposit: 3000.0,
		paymentFrequency: 'MONTHLY' as const,
		status: 'DRAFT' as const,
		...overrides
	})

	const createMockUpdateRequest = (
		overrides: Record<string, unknown> = {}
	) => ({
		startDate: '2024-01-01',
		endDate: '2024-12-31',
		monthlyRent: 1600.0,
		securityDeposit: 3200.0,
		paymentFrequency: 'MONTHLY' as const,
		status: 'ACTIVE' as const,
		...overrides
	})

	beforeEach(async () => {
		mockSupabaseClient = {
			rpc: jest.fn(() => ({
				single: jest.fn()
			}))
		} as unknown as jest.Mocked<ReturnType<SupabaseService['getAdminClient']>>

		mockSupabaseService = {
			getAdminClient: jest.fn().mockReturnValue(mockSupabaseClient),
			onModuleInit: jest.fn(),
			getUserClient: jest.fn(),
			checkConnection: jest.fn()
		} as unknown as jest.Mocked<SupabaseService>

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				LeasesService,
				{
					provide: SupabaseService,
					useValue: mockSupabaseService
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<LeasesService>(LeasesService)

		// Spy on the actual logger instance created by the service
		jest.spyOn(service['logger'], 'error').mockImplementation(() => {})
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('findAll', () => {
		it('should return all leases for user', async () => {
			const userId = generateUUID()
			const query = {
				tenantId: generateUUID(),
				unitId: generateUUID(),
				propertyId: generateUUID(),
				status: 'ACTIVE',
				limit: 20,
				offset: 10,
				sortBy: 'startDate',
				sortOrder: 'asc'
			}
			const mockLeases = [createMockLease(), createMockLease()]

			mockSupabaseClient.rpc.mockResolvedValue({
				data: mockLeases,
				error: null
			})

			const result = await service.findAll(userId, query)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_user_leases', {
				p_user_id: userId,
				p_tenant_id: query.tenantId,
				p_unit_id: query.unitId,
				p_property_id: query.propertyId,
				p_status: query.status,
				p_limit: query.limit,
				p_offset: query.offset,
				p_sort_by: query.sortBy,
				p_sort_order: query.sortOrder
			})
			expect(result).toEqual(mockLeases)
		})

		it('should handle undefined query parameters', async () => {
			const userId = generateUUID()
			const query = {}
			const mockLeases = [createMockLease()]

			mockSupabaseClient.rpc.mockResolvedValue({
				data: mockLeases,
				error: null
			})

			const result = await service.findAll(userId, query)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_user_leases', {
				p_user_id: userId,
				p_tenant_id: undefined,
				p_unit_id: undefined,
				p_property_id: undefined,
				p_status: undefined,
				p_limit: undefined,
				p_offset: undefined,
				p_sort_by: undefined,
				p_sort_order: undefined
			})
			expect(result).toEqual(mockLeases)
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

			await expect(service.findAll(userId, query)).rejects.toThrow(
				BadRequestException
			)
			expect(service['logger'].error).toHaveBeenCalledWith(
				{
					error: {
						name: 'DatabaseError',
						message: 'Database error',
						code: 'DB001'
					},
					leases: { userId, query }
				},
				'Failed to get leases'
			)
		})
	})

	describe('getStats', () => {
		it('should return lease statistics', async () => {
			const userId = generateUUID()
			const mockStats = {
				total: 25,
				active: 20,
				expired: 3,
				expiringSoon: 2
			}

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: mockStats,
					error: null
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			const result = await service.getStats(userId)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_lease_stats', {
				p_user_id: userId
			})
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

			await expect(service.getStats(userId)).rejects.toThrow(
				BadRequestException
			)
			expect(service['logger'].error).toHaveBeenCalledWith(
				'Failed to get lease stats',
				{
					userId,
					error: mockError.message
				}
			)
		})
	})

	describe('getExpiring', () => {
		it('should return expiring leases', async () => {
			const userId = generateUUID()
			const days = 30
			const mockExpiring = [createMockLease({ endDate: '2024-02-01' })]

			mockSupabaseClient.rpc.mockResolvedValue({
				data: mockExpiring,
				error: null
			})

			const result = await service.getExpiring(userId, days)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
				'get_expiring_leases',
				{
					p_user_id: userId,
					p_days: days
				}
			)
			expect(result).toEqual(mockExpiring)
		})

		it('should throw BadRequestException when RPC fails', async () => {
			const userId = generateUUID()
			const days = 30
			const mockError = { message: 'Failed to get expiring leases' }

			mockSupabaseClient.rpc.mockResolvedValue({
				data: null,
				error: mockError
			})

			await expect(service.getExpiring(userId, days)).rejects.toThrow(
				BadRequestException
			)
			expect(service['logger'].error).toHaveBeenCalledWith(
				'Failed to get expiring leases',
				{
					userId,
					days,
					error: mockError.message
				}
			)
		})
	})

	describe('findOne', () => {
		it('should return lease by ID', async () => {
			const userId = generateUUID()
			const leaseId = generateUUID()
			const mockLease = createMockLease({ id: leaseId })

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: mockLease,
					error: null
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			const result = await service.findOne(userId, leaseId)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_lease_by_id', {
				p_user_id: userId,
				p_lease_id: leaseId
			})
			expect(result).toEqual(mockLease)
		})

		it('should return null when lease not found', async () => {
			const userId = generateUUID()
			const leaseId = generateUUID()
			const mockError = { message: 'Lease not found' }

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: null,
					error: mockError
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			const result = await service.findOne(userId, leaseId)

			expect(result).toBeNull()
			expect(service['logger'].error).toHaveBeenCalledWith(
				'Failed to get lease',
				{
					userId,
					leaseId,
					error: mockError.message
				}
			)
		})
	})

	describe('create', () => {
		it('should create new lease', async () => {
			const userId = generateUUID()
			const createRequest = createMockCreateRequest()
			const mockLease = createMockLease(createRequest)

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: mockLease,
					error: null
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			const result = await service.create(userId, createRequest)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('create_lease', {
				p_user_id: userId,
				p_tenant_id: createRequest.tenantId,
				p_unit_id: createRequest.unitId,
				p_start_date: createRequest.startDate,
				p_end_date: createRequest.endDate,
				p_rentamount: createRequest.monthlyRent,
				p_security_deposit: createRequest.securityDeposit,
				p_payment_frequency: createRequest.paymentFrequency,
				p_status: createRequest.status
			})
			expect(result).toEqual(mockLease)
		})

		it('should use default values for optional fields', async () => {
			const userId = generateUUID()
			const createRequest = {
				tenantId: generateUUID(),
				unitId: generateUUID(),
				startDate: '2024-01-01',
				endDate: '2024-12-31',
				monthlyRent: 1500.0,
				securityDeposit: 3000.0
			}
			const mockLease = createMockLease()

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: mockLease,
					error: null
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			await service.create(userId, createRequest)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('create_lease', {
				p_user_id: userId,
				p_tenant_id: createRequest.tenantId,
				p_unit_id: createRequest.unitId,
				p_start_date: createRequest.startDate,
				p_end_date: createRequest.endDate,
				p_rentamount: createRequest.monthlyRent,
				p_security_deposit: createRequest.securityDeposit,
				p_payment_frequency: 'MONTHLY',
				p_status: 'DRAFT'
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

			await expect(service.create(userId, createRequest)).rejects.toThrow(
				BadRequestException
			)
			expect(service['logger'].error).toHaveBeenCalledWith(
				'Failed to create lease',
				{
					userId,
					error: mockError.message
				}
			)
		})
	})

	describe('update', () => {
		it('should update existing lease', async () => {
			const userId = generateUUID()
			const leaseId = generateUUID()
			const updateRequest = createMockUpdateRequest()
			const mockLease = createMockLease({ ...updateRequest })

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: mockLease,
					error: null
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			const result = await service.update(userId, leaseId, updateRequest)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('update_lease', {
				p_user_id: userId,
				p_lease_id: leaseId,
				p_start_date: updateRequest.startDate,
				p_end_date: updateRequest.endDate,
				p_rentamount: updateRequest.monthlyRent,
				p_security_deposit: updateRequest.securityDeposit,
				p_payment_frequency: updateRequest.paymentFrequency,
				p_status: updateRequest.status
			})
			expect(result).toEqual(mockLease)
		})

		it('should return null when lease not found', async () => {
			const userId = generateUUID()
			const leaseId = generateUUID()
			const updateRequest = createMockUpdateRequest()
			const mockError = { message: 'Lease not found' }

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: null,
					error: mockError
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			const result = await service.update(userId, leaseId, updateRequest)

			expect(result).toBeNull()
			expect(service['logger'].error).toHaveBeenCalledWith(
				'Failed to update lease',
				{
					userId,
					leaseId,
					error: mockError.message
				}
			)
		})
	})

	describe('remove', () => {
		it('should delete lease successfully', async () => {
			const userId = generateUUID()
			const leaseId = generateUUID()

			mockSupabaseClient.rpc.mockResolvedValue({
				error: null
			})

			await service.remove(userId, leaseId)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('delete_lease', {
				p_user_id: userId,
				p_lease_id: leaseId
			})
		})

		it('should throw BadRequestException when deletion fails', async () => {
			const userId = generateUUID()
			const leaseId = generateUUID()
			const mockError = { message: 'Foreign key constraint' }

			mockSupabaseClient.rpc.mockResolvedValue({
				error: mockError
			})

			await expect(service.remove(userId, leaseId)).rejects.toThrow(
				BadRequestException
			)
			expect(service['logger'].error).toHaveBeenCalledWith(
				'Failed to delete lease',
				{
					userId,
					leaseId,
					error: mockError.message
				}
			)
		})
	})

	describe('renew', () => {
		it('should renew lease successfully', async () => {
			const userId = generateUUID()
			const leaseId = generateUUID()
			const endDate = '2025-12-31'
			const mockLease = createMockLease({ endDate })

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: mockLease,
					error: null
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			const result = await service.renew(userId, leaseId, endDate)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('renew_lease', {
				p_user_id: userId,
				p_lease_id: leaseId,
				p_new_end_date: endDate
			})
			expect(result).toEqual(mockLease)
		})

		it('should throw BadRequestException when renewal fails', async () => {
			const userId = generateUUID()
			const leaseId = generateUUID()
			const endDate = '2025-12-31'
			const mockError = { message: 'Cannot renew expired lease' }

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: null,
					error: mockError
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			await expect(service.renew(userId, leaseId, endDate)).rejects.toThrow(
				BadRequestException
			)
			expect(service['logger'].error).toHaveBeenCalledWith(
				'Failed to renew lease',
				{
					userId,
					leaseId,
					error: mockError.message
				}
			)
		})
	})

	describe('terminate', () => {
		it('should terminate lease with reason', async () => {
			const userId = generateUUID()
			const leaseId = generateUUID()
			const reason = 'Tenant violation'
			const mockLease = createMockLease({ status: 'TERMINATED' })

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: mockLease,
					error: null
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			const result = await service.terminate(userId, leaseId, reason)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('terminate_lease', {
				p_user_id: userId,
				p_lease_id: leaseId,
				p_reason: reason
			})
			expect(result).toEqual(mockLease)
		})

		it('should terminate lease with default reason', async () => {
			const userId = generateUUID()
			const leaseId = generateUUID()
			const mockLease = createMockLease({ status: 'TERMINATED' })

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: mockLease,
					error: null
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			const result = await service.terminate(userId, leaseId)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('terminate_lease', {
				p_user_id: userId,
				p_lease_id: leaseId,
				p_reason: 'Terminated by landlord'
			})
			expect(result).toEqual(mockLease)
		})

		it('should throw BadRequestException when termination fails', async () => {
			const userId = generateUUID()
			const leaseId = generateUUID()
			const mockError = { message: 'Cannot terminate draft lease' }

			const mockRpcChain = {
				single: jest.fn().mockResolvedValue({
					data: null,
					error: mockError
				})
			}
			mockSupabaseClient.rpc.mockReturnValue(mockRpcChain)

			await expect(service.terminate(userId, leaseId)).rejects.toThrow(
				BadRequestException
			)
			expect(service['logger'].error).toHaveBeenCalledWith(
				'Failed to terminate lease',
				{
					userId,
					leaseId,
					error: mockError.message
				}
			)
		})
	})
})
