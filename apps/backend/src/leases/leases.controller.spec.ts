import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { ValidatedUser } from '@repo/shared'
import { randomUUID } from 'crypto'
import { SilentLogger } from '../__test__/silent-logger'
import { LeasesController } from './leases.controller'
import { LeasesService } from './leases.service'

describe('LeasesController', () => {
	let controller: LeasesController
	let mockLeasesService: jest.Mocked<LeasesService>

	const generateUUID = () => randomUUID()

	const createMockUser = (overrides: Partial<ValidatedUser> = {}): ValidatedUser => ({
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

	const createMockLease = (overrides: Record<string, unknown> = {}) => ({
		id: generateUUID(),
		tenantId: generateUUID(),
		unitId: generateUUID(),
		startDate: '2024-01-01',
		endDate: '2024-12-31',
		monthlyRent: 1500.00,
		securityDeposit: 3000.00,
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
			getLeaseRevenueAnalytics: jest.fn(),
		} as unknown as jest.Mocked<LeasesService>

		const module: TestingModule = await Test.createTestingModule({
			controllers: [LeasesController],
			providers: [
				{
					provide: LeasesService,
					useValue: mockLeasesService,
				},
			],
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
			const mockLeases = [createMockLease(), createMockLease()]
			mockLeasesService.findAll.mockResolvedValue(mockLeases)

			// DefaultValuePipe applies defaults in NestJS, but not in unit tests
			const result = await controller.findAll(
				user,
				undefined,
				undefined,
				undefined,
				undefined,
				10, // Default from pipe
				0,  // Default from pipe
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
			const tenantId = generateUUID()
			const unitId = generateUUID()
			const propertyId = generateUUID()
			const mockLeases = [createMockLease()]
			mockLeasesService.findAll.mockResolvedValue(mockLeases)

			const result = await controller.findAll(
				user,
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

			await expect(
				controller.findAll(user, 'invalid-uuid')
			).rejects.toThrow(BadRequestException)
		})

		it('should validate unit ID format', async () => {
			const user = createMockUser()
			const validTenantId = generateUUID()

			await expect(
				controller.findAll(user, validTenantId, 'invalid-uuid')
			).rejects.toThrow(BadRequestException)
		})

		it('should validate property ID format', async () => {
			const user = createMockUser()
			const validTenantId = generateUUID()
			const validUnitId = generateUUID()

			await expect(
				controller.findAll(user, validTenantId, validUnitId, 'invalid-uuid')
			).rejects.toThrow(BadRequestException)
		})

		it('should validate lease status enum', async () => {
			const user = createMockUser()

			await expect(
				controller.findAll(user, undefined, undefined, undefined, 'INVALID_STATUS')
			).rejects.toThrow(BadRequestException)
		})

		it('should validate limit range', async () => {
			const user = createMockUser()
			const mockLeases = [createMockLease()]
			mockLeasesService.findAll.mockResolvedValue(mockLeases)

			// 0 is falsy, so validation doesn't trigger (this is correct behavior)
			await controller.findAll(user, undefined, undefined, undefined, undefined, 0, 0, 'createdAt', 'desc')

			// 51 should fail validation
			await expect(
				controller.findAll(user, undefined, undefined, undefined, undefined, 51, 0, 'createdAt', 'desc')
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('getStats', () => {
		it('should return lease statistics', async () => {
			const user = createMockUser()
			const mockStats = {
				total: 25,
				active: 20,
				expired: 3,
				expiringSoon: 2
			}
			mockLeasesService.getStats.mockResolvedValue(mockStats)

			const result = await controller.getStats(user)

			expect(mockLeasesService.getStats).toHaveBeenCalledWith(user.id)
			expect(result).toEqual(mockStats)
		})
	})

	describe('getExpiring', () => {
		it('should return expiring leases with default days', async () => {
			const user = createMockUser()
			const mockExpiring = [createMockLease()]
			mockLeasesService.getExpiring.mockResolvedValue(mockExpiring)

			// DefaultValuePipe applies defaults in NestJS, but not in unit tests
			const result = await controller.getExpiring(user, 30)

			expect(mockLeasesService.getExpiring).toHaveBeenCalledWith(user.id, 30)
			expect(result).toEqual(mockExpiring)
		})

		it('should return expiring leases with custom days', async () => {
			const user = createMockUser()
			const mockExpiring = [createMockLease()]
			mockLeasesService.getExpiring.mockResolvedValue(mockExpiring)

			const result = await controller.getExpiring(user, 60)

			expect(mockLeasesService.getExpiring).toHaveBeenCalledWith(user.id, 60)
			expect(result).toEqual(mockExpiring)
		})

		it('should validate days range', async () => {
			const user = createMockUser()
			const mockExpiring = [createMockLease()]
			mockLeasesService.getExpiring.mockResolvedValue(mockExpiring)

			// 0 is falsy, so validation doesn't trigger (this is correct behavior)
			await controller.getExpiring(user, 0)

			// 366 should fail validation
			await expect(
				controller.getExpiring(user, 366)
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('findOne', () => {
		it('should return lease by ID', async () => {
			const user = createMockUser()
			const leaseId = generateUUID()
			const mockLease = createMockLease({ id: leaseId })
			mockLeasesService.findOne.mockResolvedValue(mockLease)

			const result = await controller.findOne(leaseId, user)

			expect(mockLeasesService.findOne).toHaveBeenCalledWith(user.id, leaseId)
			expect(result).toEqual(mockLease)
		})

		it('should throw NotFoundException when lease not found', async () => {
			const user = createMockUser()
			const leaseId = generateUUID()
			mockLeasesService.findOne.mockResolvedValue(null)

			await expect(
				controller.findOne(leaseId, user)
			).rejects.toThrow(NotFoundException)
		})
	})

	describe('create', () => {
		it('should create new lease', async () => {
			const user = createMockUser()
			const createRequest = {
				tenantId: generateUUID(),
				unitId: generateUUID(),
				startDate: '2024-01-01',
				endDate: '2024-12-31',
				monthlyRent: 1500.00,
				securityDeposit: 3000.00,
				paymentFrequency: 'MONTHLY' as const,
				status: 'DRAFT' as const
			}
			const mockLease = createMockLease()
			mockLeasesService.create.mockResolvedValue(mockLease)

			const result = await controller.create(createRequest, user)

			expect(mockLeasesService.create).toHaveBeenCalledWith(user.id, createRequest)
			expect(result).toEqual(mockLease)
		})
	})

	describe('update', () => {
		it('should update existing lease', async () => {
			const user = createMockUser()
			const leaseId = generateUUID()
			const updateRequest = {
				monthlyRent: 1600.00,
				securityDeposit: 3200.00,
				status: 'ACTIVE' as const
			}
			const mockLease = createMockLease({ ...updateRequest })
			mockLeasesService.update.mockResolvedValue(mockLease)

			const result = await controller.update(leaseId, updateRequest, user)

			expect(mockLeasesService.update).toHaveBeenCalledWith(user.id, leaseId, updateRequest)
			expect(result).toEqual(mockLease)
		})

		it('should throw NotFoundException when lease not found', async () => {
			const user = createMockUser()
			const leaseId = generateUUID()
			const updateRequest = { monthlyRent: 1600.00 }
			mockLeasesService.update.mockResolvedValue(null)

			await expect(
				controller.update(leaseId, updateRequest, user)
			).rejects.toThrow(NotFoundException)
		})
	})

	describe('remove', () => {
		it('should delete lease', async () => {
			const user = createMockUser()
			const leaseId = generateUUID()
			mockLeasesService.remove.mockResolvedValue(undefined)

			await controller.remove(leaseId, user)

			expect(mockLeasesService.remove).toHaveBeenCalledWith(user.id, leaseId)
		})
	})

	describe('renew', () => {
		it('should renew lease with valid end date', async () => {
			const user = createMockUser()
			const leaseId = generateUUID()
			const endDate = '2025-12-31'
			const mockLease = createMockLease({ endDate })
			mockLeasesService.renew.mockResolvedValue(mockLease)

			const result = await controller.renew(leaseId, endDate, user)

			expect(mockLeasesService.renew).toHaveBeenCalledWith(user.id, leaseId, endDate)
			expect(result).toEqual(mockLease)
		})

		it('should validate date format', async () => {
			const user = createMockUser()
			const leaseId = generateUUID()

			await expect(
				controller.renew(leaseId, 'invalid-date', user)
			).rejects.toThrow(BadRequestException)

			await expect(
				controller.renew(leaseId, '01/01/2025', user)
			).rejects.toThrow(BadRequestException)

			await expect(
				controller.renew(leaseId, '', user)
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('terminate', () => {
		it('should terminate lease with reason', async () => {
			const user = createMockUser()
			const leaseId = generateUUID()
			const reason = 'Tenant violation'
			const mockLease = createMockLease({ status: 'TERMINATED' })
			mockLeasesService.terminate.mockResolvedValue(mockLease)

			const result = await controller.terminate(leaseId, reason, user)

			expect(mockLeasesService.terminate).toHaveBeenCalledWith(user.id, leaseId, reason)
			expect(result).toEqual(mockLease)
		})

		it('should terminate lease without reason', async () => {
			const user = createMockUser()
			const leaseId = generateUUID()
			const mockLease = createMockLease({ status: 'TERMINATED' })
			mockLeasesService.terminate.mockResolvedValue(mockLease)

			const result = await controller.terminate(leaseId, undefined, user)

			expect(mockLeasesService.terminate).toHaveBeenCalledWith(user.id, leaseId, undefined)
			expect(result).toEqual(mockLease)
		})
	})
})
