import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { CreateTenantRequest, UpdateTenantRequest } from '@repo/shared'
import type { Request } from 'express'
import { SupabaseService } from '../database/supabase.service'
import { TenantsController } from './tenants.controller'
import { TenantsService } from './tenants.service'
import { createMockUser } from '../test-utils/mocks'

// Mock the services
jest.mock('./tenants.service', () => {
	return {
		TenantsService: jest.fn().mockImplementation(() => ({
			findAll: jest.fn(),
			getStats: jest.fn(),
			findOne: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			remove: jest.fn(),
			sendInvitation: jest.fn(),
			resendInvitation: jest.fn()
		}))
	}
})

jest.mock('../database/supabase.service', () => {
	return {
		SupabaseService: jest.fn().mockImplementation(() => ({
			getUser: jest.fn()
		}))
	}
})

describe('TenantsController', () => {
	let controller: TenantsController
	let mockTenantsServiceInstance: jest.Mocked<TenantsService>
	let mockSupabaseServiceInstance: jest.Mocked<SupabaseService>

	const mockUser = createMockUser({ id: 'user-123' })

	const mockRequest = {} as Request

	const validCreateTenantRequest: CreateTenantRequest = {
		firstName: 'John',
		lastName: 'Doe',
		email: 'john@example.com',
		phone: '+1234567890'
	}

	const validUpdateTenantRequest: UpdateTenantRequest = {
		firstName: 'Jane'
	}

	beforeEach(async () => {
		jest.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			controllers: [TenantsController],
			providers: [TenantsService, SupabaseService]
		}).compile()

		controller = module.get<TenantsController>(TenantsController)
		mockTenantsServiceInstance = module.get(
			TenantsService
		) as jest.Mocked<TenantsService>
		mockSupabaseServiceInstance = module.get(
			SupabaseService
		) as jest.Mocked<SupabaseService>
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})

	describe('findAll', () => {
		it('should return tenants with default parameters', async () => {
			const mockTenants = {
				data: [{ id: 'tenant-1', firstName: 'John', lastName: 'Doe' }],
				total: 1,
				limit: 10,
				offset: 0
			}

			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockTenantsServiceInstance.findAll.mockResolvedValue(mockTenants)

			const result = await controller.findAll(mockRequest)

			expect(mockSupabaseServiceInstance.getUser).toHaveBeenCalledWith(
				mockRequest
			)
			expect(mockTenantsServiceInstance.findAll).toHaveBeenCalledWith(
				mockUser.id,
				{
					search: undefined,
					invitationStatus: undefined,
					limit: undefined,
					offset: undefined,
					sortBy: undefined,
					sortOrder: undefined
				}
			)
			expect(result).toEqual(mockTenants)
		})

		it('should handle all query parameters', async () => {
			const mockTenants = {
				data: [],
				total: 0,
				limit: 20,
				offset: 10
			}

			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockTenantsServiceInstance.findAll.mockResolvedValue(mockTenants)

			await controller.findAll(
				mockRequest,
				'search term',
				'PENDING',
				20,
				10,
				'name',
				'asc'
			)

			expect(mockTenantsServiceInstance.findAll).toHaveBeenCalledWith(
				mockUser.id,
				{
					search: 'search term',
					invitationStatus: 'PENDING',
					limit: 20,
					offset: 10,
					sortBy: 'name',
					sortOrder: 'asc'
				}
			)
		})

		it('should validate limit parameter', async () => {
			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)

			// Test with limit too high (100)
			await expect(
				controller.findAll(mockRequest, undefined, undefined, 100)
			).rejects.toThrow(BadRequestException)

			// Test with limit too low (0)
			await expect(
				controller.findAll(mockRequest, undefined, undefined, 0)
			).rejects.toThrow(BadRequestException)
		})

		it('should validate invitation status parameter', async () => {
			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)

			await expect(
				controller.findAll(mockRequest, undefined, 'INVALID_STATUS')
			).rejects.toThrow(BadRequestException)
		})

		it('should accept valid invitation statuses', async () => {
			const validStatuses = ['PENDING', 'SENT', 'ACCEPTED', 'EXPIRED']

			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockTenantsServiceInstance.findAll.mockResolvedValue({
				data: [],
				total: 0,
				limit: 10,
				offset: 0
			})

			for (const status of validStatuses) {
				await expect(
					controller.findAll(mockRequest, undefined, status)
				).resolves.toBeDefined()
			}
		})

		it('should handle service unavailable', async () => {
			const controllerWithoutService = new TenantsController()

			const result = await controllerWithoutService.findAll(mockRequest)

			expect(result).toEqual({
				message: 'Tenants service not available',
				data: [],
				total: 0,
				limit: 10,
				offset: 0
			})
		})

		it('should use fallback user ID when user validation fails', async () => {
			mockSupabaseServiceInstance.getUser.mockResolvedValue(null)
			mockTenantsServiceInstance.findAll.mockResolvedValue({
				data: [],
				total: 0,
				limit: 10,
				offset: 0
			})

			await controller.findAll(mockRequest)

			expect(mockTenantsServiceInstance.findAll).toHaveBeenCalledWith(
				'test-user-id',
				expect.any(Object)
			)
		})
	})

	describe('getStats', () => {
		it('should return tenant statistics', async () => {
			const mockStats = {
				totalTenants: 25,
				activeTenants: 20,
				pendingTenants: 3,
				expiredTenants: 2
			}

			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockTenantsServiceInstance.getStats.mockResolvedValue(mockStats)

			const result = await controller.getStats(mockRequest)

			expect(mockSupabaseServiceInstance.getUser).toHaveBeenCalledWith(
				mockRequest
			)
			expect(mockTenantsServiceInstance.getStats).toHaveBeenCalledWith(
				mockUser.id
			)
			expect(result).toEqual(mockStats)
		})

		it('should handle service unavailable', async () => {
			const controllerWithoutService = new TenantsController()

			const result = await controllerWithoutService.getStats(mockRequest)

			expect(result).toEqual({
				message: 'Tenants service not available',
				totalTenants: 0,
				activeTenants: 0,
				pendingTenants: 0,
				expiredTenants: 0
			})
		})
	})

	describe('findOne', () => {
		const tenantId = 'tenant-123'

		it('should return single tenant', async () => {
			const mockTenant = { id: tenantId, firstName: 'John', lastName: 'Doe' }

			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockTenantsServiceInstance.findOne.mockResolvedValue(mockTenant)

			const result = await controller.findOne(tenantId, mockRequest)

			expect(mockSupabaseServiceInstance.getUser).toHaveBeenCalledWith(
				mockRequest
			)
			expect(mockTenantsServiceInstance.findOne).toHaveBeenCalledWith(
				mockUser.id,
				tenantId
			)
			expect(result).toEqual(mockTenant)
		})

		it('should throw NotFoundException when tenant not found', async () => {
			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockTenantsServiceInstance.findOne.mockResolvedValue(null)

			await expect(controller.findOne(tenantId, mockRequest)).rejects.toThrow(
				NotFoundException
			)
		})

		it('should handle service unavailable', async () => {
			const controllerWithoutService = new TenantsController()

			const result = await controllerWithoutService.findOne(
				tenantId,
				mockRequest
			)

			expect(result).toEqual({
				message: 'Tenants service not available',
				id: tenantId,
				data: null
			})
		})
	})

	describe('create', () => {
		it('should create new tenant', async () => {
			const mockCreatedTenant = {
				id: 'tenant-new',
				...validCreateTenantRequest
			}

			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockTenantsServiceInstance.create.mockResolvedValue(mockCreatedTenant)

			const result = await controller.create(
				validCreateTenantRequest,
				mockRequest
			)

			expect(mockSupabaseServiceInstance.getUser).toHaveBeenCalledWith(
				mockRequest
			)
			expect(mockTenantsServiceInstance.create).toHaveBeenCalledWith(
				mockUser.id,
				validCreateTenantRequest
			)
			expect(result).toEqual(mockCreatedTenant)
		})

		it('should handle service unavailable', async () => {
			const controllerWithoutService = new TenantsController()

			const result = await controllerWithoutService.create(
				validCreateTenantRequest,
				mockRequest
			)

			expect(result).toEqual({
				message: 'Tenants service not available',
				data: validCreateTenantRequest,
				success: false
			})
		})
	})

	describe('update', () => {
		const tenantId = 'tenant-123'

		it('should update existing tenant', async () => {
			const mockUpdatedTenant = {
				id: tenantId,
				...validUpdateTenantRequest
			}

			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockTenantsServiceInstance.update.mockResolvedValue(mockUpdatedTenant)

			const result = await controller.update(
				tenantId,
				validUpdateTenantRequest,
				mockRequest
			)

			expect(mockSupabaseServiceInstance.getUser).toHaveBeenCalledWith(
				mockRequest
			)
			expect(mockTenantsServiceInstance.update).toHaveBeenCalledWith(
				mockUser.id,
				tenantId,
				validUpdateTenantRequest
			)
			expect(result).toEqual(mockUpdatedTenant)
		})

		it('should throw NotFoundException when tenant not found', async () => {
			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockTenantsServiceInstance.update.mockResolvedValue(null)

			await expect(
				controller.update(tenantId, validUpdateTenantRequest, mockRequest)
			).rejects.toThrow(NotFoundException)
		})

		it('should handle service unavailable', async () => {
			const controllerWithoutService = new TenantsController()

			const result = await controllerWithoutService.update(
				tenantId,
				validUpdateTenantRequest,
				mockRequest
			)

			expect(result).toEqual({
				message: 'Tenants service not available',
				id: tenantId,
				data: validUpdateTenantRequest,
				success: false
			})
		})
	})

	describe('remove', () => {
		const tenantId = 'tenant-123'

		it('should delete tenant successfully', async () => {
			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockTenantsServiceInstance.remove.mockResolvedValue(undefined)

			const result = await controller.remove(tenantId, mockRequest)

			expect(mockSupabaseServiceInstance.getUser).toHaveBeenCalledWith(
				mockRequest
			)
			expect(mockTenantsServiceInstance.remove).toHaveBeenCalledWith(
				mockUser.id,
				tenantId
			)
			expect(result).toEqual({ message: 'Tenant deleted successfully' })
		})

		it('should handle service unavailable', async () => {
			const controllerWithoutService = new TenantsController()

			const result = await controllerWithoutService.remove(
				tenantId,
				mockRequest
			)

			expect(result).toEqual({
				message: 'Tenants service not available',
				id: tenantId,
				success: false
			})
		})
	})

	describe('sendInvitation', () => {
		const tenantId = 'tenant-123'

		it('should send invitation successfully', async () => {
			const mockInvitationResult = {
				success: true,
				message: 'Invitation sent successfully'
			}

			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockTenantsServiceInstance.sendInvitation.mockResolvedValue(
				mockInvitationResult
			)

			const result = await controller.sendInvitation(tenantId, mockRequest)

			expect(mockSupabaseServiceInstance.getUser).toHaveBeenCalledWith(
				mockRequest
			)
			expect(mockTenantsServiceInstance.sendInvitation).toHaveBeenCalledWith(
				mockUser.id,
				tenantId
			)
			expect(result).toEqual(mockInvitationResult)
		})

		it('should handle service unavailable', async () => {
			const controllerWithoutService = new TenantsController()

			const result = await controllerWithoutService.sendInvitation(
				tenantId,
				mockRequest
			)

			expect(result).toEqual({
				message: 'Tenants service not available',
				id: tenantId,
				action: 'invite',
				success: false
			})
		})
	})

	describe('resendInvitation', () => {
		const tenantId = 'tenant-123'

		it('should resend invitation successfully', async () => {
			const mockResendResult = {
				success: true,
				message: 'Invitation resent successfully'
			}

			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockTenantsServiceInstance.resendInvitation.mockResolvedValue(
				mockResendResult
			)

			const result = await controller.resendInvitation(tenantId, mockRequest)

			expect(mockSupabaseServiceInstance.getUser).toHaveBeenCalledWith(
				mockRequest
			)
			expect(mockTenantsServiceInstance.resendInvitation).toHaveBeenCalledWith(
				mockUser.id,
				tenantId
			)
			expect(result).toEqual(mockResendResult)
		})

		it('should handle service unavailable', async () => {
			const controllerWithoutService = new TenantsController()

			const result = await controllerWithoutService.resendInvitation(
				tenantId,
				mockRequest
			)

			expect(result).toEqual({
				message: 'Tenants service not available',
				id: tenantId,
				action: 'resend-invitation',
				success: false
			})
		})
	})

	describe('user validation fallback behavior', () => {
		it('should handle supabase service unavailable', async () => {
			const controllerWithoutSupabase = new TenantsController(
				mockTenantsServiceInstance
			)

			mockTenantsServiceInstance.findAll.mockResolvedValue({
				data: [],
				total: 0,
				limit: 10,
				offset: 0
			})

			await controllerWithoutSupabase.findAll(mockRequest)

			expect(mockTenantsServiceInstance.findAll).toHaveBeenCalledWith(
				'test-user-id',
				expect.any(Object)
			)
		})
	})
})
