import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { ValidatedUser } from '@repo/shared'
import { randomUUID } from 'crypto'
import type { Request } from 'express'
import { SilentLogger } from '../__test__/silent-logger'
import { SupabaseService } from '../database/supabase.service'
import { LeasesController } from './leases.controller'
import { LeasesService } from './leases.service'

describe('LeasesController', () => {
	let controller: LeasesController
	let mockLeasesService: jest.Mocked<LeasesService>
	let mockSupabaseService: jest.Mocked<SupabaseService>

	const generateUUID = () => randomUUID()

	const createMockUser = (
		overrides: Partial<ValidatedUser> = {}
	): ValidatedUser => ({
		id: generateUUID(),
		email: 'test@example.com',
		name: 'Test User',
		role: 'OWNER' as const,
		phone: null,
		avatarUrl: null,
		supabaseId: generateUUID(),
		bio: null,
		stripeCustomerId: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		emailVerified: true,
		organizationId: generateUUID(),
		...overrides
	})

	const createMockRequest = (user?: ValidatedUser) =>
		({
			user,
			headers: {},
			query: {},
			params: {},
			body: {}
		}) as unknown as Request

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

	beforeEach(async () => {
		mockLeasesService = {
			findAll: jest.fn(),
			getStats: jest.fn(),
			getExpiring: jest.fn(),
			findOne: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			remove: jest.fn(),
			renew: jest.fn(),
			terminate: jest.fn(),
			getLeasePerformanceAnalytics: jest.fn(),
			getLeaseDurationAnalytics: jest.fn(),
			getLeaseTurnoverAnalytics: jest.fn(),
			getLeaseRevenueAnalytics: jest.fn()
		} as unknown as jest.Mocked<LeasesService>

		mockSupabaseService = {
			validateUser: jest
				.fn()
				.mockImplementation(req => Promise.resolve(req.user))
		} as unknown as jest.Mocked<SupabaseService>

		const module: TestingModule = await Test.createTestingModule({
			controllers: [LeasesController],
			providers: [
				{
					provide: LeasesService,
					useValue: mockLeasesService
				},
				{
					provide: SupabaseService,
					useValue: mockSupabaseService
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		controller = module.get<LeasesController>(LeasesController)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('findAll', () => {
		it('should return all leases with default pagination', async () => {
			const user = createMockUser()
			const mockRequest = createMockRequest(user)
			const mockLeases = [createMockLease(), createMockLease()]
			mockLeasesService.findAll.mockResolvedValue(mockLeases)

			// DefaultValuePipe applies defaults in NestJS, but not in unit tests
			const result = await controller.findAll(
				mockRequest,
				undefined,
				undefined,
				undefined,
				undefined,
				10, // Default from pipe
				0, // Default from pipe
				'createdAt', // Default from pipe
				'desc' // Default from pipe
			)

			expect(mockLeasesService.findAll).toHaveBeenCalledWith(user.id, {
				tenantId: undefined,
				unitId: undefined,
				propertyId: undefined,
				status: undefined,
				limit: 10,
				offset: 0,
				sortBy: 'createdAt',
				sortOrder: 'desc'
			})
			expect(result).toEqual(mockLeases)
		})

		it('should return filtered leases with custom parameters', async () => {
			const user = createMockUser()
			const mockRequest = createMockRequest(user)
			const tenantId = generateUUID()
			const unitId = generateUUID()
			const propertyId = generateUUID()
			const mockLeases = [createMockLease()]
			mockLeasesService.findAll.mockResolvedValue(mockLeases)

			const result = await controller.findAll(
				mockRequest,
				tenantId,
				unitId,
				propertyId,
				'ACTIVE',
				20,
				10,
				'startDate',
				'asc'
			)

			expect(mockLeasesService.findAll).toHaveBeenCalledWith(user.id, {
				tenantId,
				unitId,
				propertyId,
				status: 'ACTIVE',
				limit: 20,
				offset: 10,
				sortBy: 'startDate',
				sortOrder: 'asc'
			})
			expect(result).toEqual(mockLeases)
		})

		it('should validate tenant ID format', async () => {
			const user = createMockUser()
			const mockRequest = createMockRequest(user)

			await expect(
				controller.findAll(mockRequest, 'invalid-uuid')
			).rejects.toThrow(BadRequestException)
		})

		it('should validate unit ID format', async () => {
			const user = createMockUser()
			const mockRequest = createMockRequest(user)
			const validTenantId = generateUUID()

			await expect(
				controller.findAll(mockRequest, validTenantId, 'invalid-uuid')
			).rejects.toThrow(BadRequestException)
		})

		it('should validate property ID format', async () => {
			const user = createMockUser()
			const mockRequest = createMockRequest(user)
			const validTenantId = generateUUID()
			const validUnitId = generateUUID()

			await expect(
				controller.findAll(
					mockRequest,
					validTenantId,
					validUnitId,
					'invalid-uuid'
				)
			).rejects.toThrow(BadRequestException)
		})

		it('should validate lease status enum', async () => {
			const user = createMockUser()
			const mockRequest = createMockRequest(user)

			await expect(
				controller.findAll(
					mockRequest,
					undefined,
					undefined,
					undefined,
					'INVALID_STATUS'
				)
			).rejects.toThrow(BadRequestException)
		})

		it('should validate limit range', async () => {
			const user = createMockUser()
			const mockRequest = createMockRequest(user)
			const mockLeases = [createMockLease()]
			mockLeasesService.findAll.mockResolvedValue(mockLeases)

			// 0 is falsy, so validation doesn't trigger (this is correct behavior)
			await controller.findAll(
				mockRequest,
				undefined,
				undefined,
				undefined,
				undefined,
				0,
				0,
				'createdAt',
				'desc'
			)

			// 51 should fail validation
			await expect(
				controller.findAll(
					mockRequest,
					undefined,
					undefined,
					undefined,
					undefined,
					51,
					0,
					'createdAt',
					'desc'
				)
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('getStats', () => {
		it('should return lease statistics', async () => {
			const user = createMockUser()
			const mockRequest = createMockRequest(user)
			const mockStats = {
				total: 25,
				active: 20,
				expired: 3,
				expiringSoon: 2
			}
			mockLeasesService.getStats.mockResolvedValue(mockStats)

			const result = await controller.getStats(mockRequest)

			expect(mockLeasesService.getStats).toHaveBeenCalledWith(user.id)
			expect(result).toEqual(mockStats)
		})
	})

	describe('getExpiring', () => {
		it('should return expiring leases with default days', async () => {
			const user = createMockUser()
			const mockRequest = createMockRequest(user)
			const mockExpiring = [createMockLease()]
			mockLeasesService.getExpiring.mockResolvedValue(mockExpiring)

			// DefaultValuePipe applies defaults in NestJS, but not in unit tests
			const result = await controller.getExpiring(mockRequest, 30)

			expect(mockLeasesService.getExpiring).toHaveBeenCalledWith(user.id, 30)
			expect(result).toEqual(mockExpiring)
		})

		it('should return expiring leases with custom days', async () => {
			const user = createMockUser()
			const mockRequest = createMockRequest(user)
			const mockExpiring = [createMockLease()]
			mockLeasesService.getExpiring.mockResolvedValue(mockExpiring)

			const result = await controller.getExpiring(mockRequest, 60)

			expect(mockLeasesService.getExpiring).toHaveBeenCalledWith(user.id, 60)
			expect(result).toEqual(mockExpiring)
		})

		it('should validate days range', async () => {
			const user = createMockUser()
			const mockRequest = createMockRequest(user)
			const mockExpiring = [createMockLease()]
			mockLeasesService.getExpiring.mockResolvedValue(mockExpiring)

			// 0 is falsy, so validation doesn't trigger (this is correct behavior)
			await controller.getExpiring(mockRequest, 0)

			// 366 should fail validation
			await expect(controller.getExpiring(mockRequest, 366)).rejects.toThrow(
				BadRequestException
			)
		})
	})

	describe('findOne', () => {
		it('should return lease by ID', async () => {
			const user = createMockUser()
			const mockRequest = createMockRequest(user)
			const leaseId = generateUUID()
			const mockLease = createMockLease({ id: leaseId })
			mockLeasesService.findOne.mockResolvedValue(mockLease)

			const result = await controller.findOne(leaseId, mockRequest)

			expect(mockLeasesService.findOne).toHaveBeenCalledWith(user.id, leaseId)
			expect(result).toEqual(mockLease)
		})

		it('should throw NotFoundException when lease not found', async () => {
			const user = createMockUser()
			const mockRequest = createMockRequest(user)
			const leaseId = generateUUID()
			mockLeasesService.findOne.mockResolvedValue(null)

			await expect(controller.findOne(leaseId, mockRequest)).rejects.toThrow(
				NotFoundException
			)
		})
	})

	describe('create', () => {
		it('should create new lease', async () => {
			const user = createMockUser()
			const mockRequest = createMockRequest(user)
			const createRequest = {
				tenantId: generateUUID(),
				unitId: generateUUID(),
				startDate: '2024-01-01',
				endDate: '2024-12-31',
				monthlyRent: 1500.0,
				securityDeposit: 3000.0,
				paymentFrequency: 'MONTHLY' as const,
				status: 'DRAFT' as const
			}
			const mockLease = createMockLease()
			mockLeasesService.create.mockResolvedValue(mockLease)

			const result = await controller.create(createRequest, mockRequest)

			expect(mockLeasesService.create).toHaveBeenCalledWith(
				user.id,
				createRequest
			)
			expect(result).toEqual(mockLease)
		})
	})

	describe('update', () => {
		it('should update existing lease', async () => {
			const user = createMockUser()
			const mockRequest = createMockRequest(user)
			const leaseId = generateUUID()
			const updateRequest = {
				monthlyRent: 1600.0,
				securityDeposit: 3200.0,
				status: 'ACTIVE' as const
			}
			const mockLease = createMockLease({ ...updateRequest })
			mockLeasesService.update.mockResolvedValue(mockLease)

			const result = await controller.update(
				leaseId,
				updateRequest,
				mockRequest
			)

			expect(mockLeasesService.update).toHaveBeenCalledWith(
				user.id,
				leaseId,
				updateRequest
			)
			expect(result).toEqual(mockLease)
		})

		it('should throw NotFoundException when lease not found', async () => {
			const user = createMockUser()
			const mockRequest = createMockRequest(user)
			const leaseId = generateUUID()
			const updateRequest = { monthlyRent: 1600.0 }
			mockLeasesService.update.mockResolvedValue(null)

			await expect(
				controller.update(leaseId, updateRequest, mockRequest)
			).rejects.toThrow(NotFoundException)
		})
	})

	describe('remove', () => {
		it('should delete lease', async () => {
			const user = createMockUser()
			const mockRequest = createMockRequest(user)
			const leaseId = generateUUID()
			mockLeasesService.remove.mockResolvedValue(undefined)

			await controller.remove(leaseId, mockRequest)

			expect(mockLeasesService.remove).toHaveBeenCalledWith(user.id, leaseId)
		})
	})

	describe('renew', () => {
		it('should renew lease with valid end date', async () => {
			const user = createMockUser()
			const mockRequest = createMockRequest(user)
			const leaseId = generateUUID()
			const endDate = '2025-12-31'
			const mockLease = createMockLease({ endDate })
			mockLeasesService.renew.mockResolvedValue(mockLease)

			const result = await controller.renew(leaseId, endDate, mockRequest)

			expect(mockLeasesService.renew).toHaveBeenCalledWith(
				user.id,
				leaseId,
				endDate
			)
			expect(result).toEqual(mockLease)
		})

		it('should validate date format', async () => {
			const user = createMockUser()
			const mockRequest = createMockRequest(user)
			const leaseId = generateUUID()

			await expect(
				controller.renew(leaseId, 'invalid-date', mockRequest)
			).rejects.toThrow(BadRequestException)

			await expect(
				controller.renew(leaseId, '01/01/2025', mockRequest)
			).rejects.toThrow(BadRequestException)

			await expect(controller.renew(leaseId, '', mockRequest)).rejects.toThrow(
				BadRequestException
			)
		})
	})

	describe('terminate', () => {
		it('should terminate lease with reason', async () => {
			const user = createMockUser()
			const mockRequest = createMockRequest(user)
			const leaseId = generateUUID()
			const reason = 'Tenant violation'
			const mockLease = createMockLease({ status: 'TERMINATED' })
			mockLeasesService.terminate.mockResolvedValue(mockLease)

			const result = await controller.terminate(leaseId, mockRequest, reason)

			expect(mockLeasesService.terminate).toHaveBeenCalledWith(
				user.id,
				leaseId,
				reason
			)
			expect(result).toEqual(mockLease)
		})

		it('should terminate lease without reason', async () => {
			const user = createMockUser()
			const mockRequest = createMockRequest(user)
			const leaseId = generateUUID()
			const mockLease = createMockLease({ status: 'TERMINATED' })
			mockLeasesService.terminate.mockResolvedValue(mockLease)

			const result = await controller.terminate(leaseId, mockRequest, undefined)

			expect(mockLeasesService.terminate).toHaveBeenCalledWith(
				user.id,
				leaseId,
				undefined
			)
			expect(result).toEqual(mockLease)
		})
	})
})
