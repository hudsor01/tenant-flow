import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type {
	CreateTenantRequest,
	UpdateTenantRequest
} from '@repo/shared/types/backend-domain'
import type { Tenant } from '@repo/shared/types/core'
import { CurrentUserProvider } from '../../shared/providers/current-user.provider'
import { createMockRequest } from '../../shared/test-utils/types'
import { createMockUser } from '../../test-utils/mocks'
import { TenantsController } from './tenants.controller'
import { TenantsService } from './tenants.service'

// Mock the services
jest.mock('./tenants.service', () => {
	return {
		TenantsService: jest.fn().mockImplementation(() => ({
			findAll: jest.fn(),
			getStats: jest.fn(),
			getSummary: jest.fn(),
			findOne: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			remove: jest.fn(),
			markAsMovedOut: jest.fn(),
			hardDelete: jest.fn(),
			sendTenantInvitation: jest.fn(),
			sendTenantInvitationV2: jest.fn().mockResolvedValue(undefined),
			resendInvitation: jest.fn()
		}))
	}
})

jest.mock('../../database/supabase.service', () => {
	return {
		SupabaseService: jest.fn().mockImplementation(() => ({
			getUser: jest.fn()
		}))
	}
})

describe('TenantsController', () => {
	let controller: TenantsController
	let mockTenantsServiceInstance: jest.Mocked<TenantsService>
	let mockCurrentUserProvider: jest.Mocked<CurrentUserProvider>

	const mockUser = createMockUser({ id: 'user-123' })

	const createMockTenant = (overrides: Partial<Tenant> = {}): Tenant => ({
		id: 'tenant-default',
		firstName: 'John',
		lastName: 'Doe',
		email: 'john@example.com',
		phone: null,
		avatarUrl: null,
		name: null,
		emergencyContact: null,
		userId: null,
		status: 'ACTIVE',
		move_out_date: null,
		move_out_reason: null,
		archived_at: null,
		invitation_status: 'PENDING',
		invitation_token: null,
		invitation_sent_at: null,
		invitation_accepted_at: null,
		invitation_expires_at: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides
	})

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

		// Mock CurrentUserProvider
		mockCurrentUserProvider = {
			getUserId: jest.fn().mockResolvedValue(mockUser.id),
			getUser: jest.fn().mockResolvedValue(mockUser),
			getUserEmail: jest.fn().mockResolvedValue(mockUser.email),
			isAuthenticated: jest.fn().mockResolvedValue(true),
			getUserOrNull: jest.fn().mockResolvedValue(mockUser)
		} as any

		const module: TestingModule = await Test.createTestingModule({
			controllers: [TenantsController],
			providers: [
				TenantsService,
				{ provide: CurrentUserProvider, useValue: mockCurrentUserProvider }
			]
		}).compile()

		controller = module.get<TenantsController>(TenantsController)
		mockTenantsServiceInstance = module.get(
			TenantsService
		) as jest.Mocked<TenantsService>
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})

	describe('findAll', () => {
		it('should return tenants with default parameters', async () => {
			const mockTenants = [createMockTenant({ id: 'tenant-1' })]

			mockTenantsServiceInstance.findAll.mockResolvedValue(mockTenants)

			const result = await controller.findAll(
				createMockRequest({ user: mockUser }) as any
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
			const mockTenants: Tenant[] = []

			mockTenantsServiceInstance.findAll.mockResolvedValue(mockTenants)

			await controller.findAll(
				createMockRequest({ user: mockUser }) as any,
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
			// Test with limit too high (100)
			await expect(
				controller.findAll(
					createMockRequest({ user: mockUser }) as any,
					undefined,
					undefined,
					100
				)
			).rejects.toThrow(BadRequestException)

			// Test with limit too low (0)
			await expect(
				controller.findAll(
					createMockRequest({ user: mockUser }) as any,
					undefined,
					undefined,
					0
				)
			).rejects.toThrow(BadRequestException)
		})

		it('should validate invitationStatus parameter', async () => {
			await expect(
				controller.findAll(
					createMockRequest({ user: mockUser }) as any,
					undefined,
					'INVALID_STATUS' as any
				)
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('getStats', () => {
		it('should return tenant statistics', async () => {
			const mockStats = {
				totalTenants: 10,
				activeTenants: 8,
				pendingTenants: 2,
				expiredTenants: 0
			}

			mockTenantsServiceInstance.getStats.mockResolvedValue(mockStats as any)

			const result = await controller.getStats(
				createMockRequest({ user: mockUser }) as any
			)
			expect(mockTenantsServiceInstance.getStats).toHaveBeenCalledWith(
				mockUser.id
			)
			expect(result).toEqual(mockStats)
		})

		describe('getSummary', () => {
			it('should return tenant summary from service', async () => {
				const mockSummary = {
					total: 3,
					invited: 1,
					active: 2,
					overdueBalanceCents: 4500,
					upcomingDueCents: 12000,
					timestamp: new Date().toISOString()
				}

				mockTenantsServiceInstance.getSummary.mockResolvedValue(
					mockSummary as any
				)

				const result = await controller.getSummary(
					createMockRequest({ user: mockUser }) as any
				)

				expect(mockTenantsServiceInstance.getSummary).toHaveBeenCalledWith(
					mockUser.id
				)
				expect(result).toEqual(mockSummary)
			})
		})
	})

	describe('findOne', () => {
		it('should return a tenant by ID', async () => {
			const mockTenant = createMockTenant({ id: 'tenant-1' })

			mockTenantsServiceInstance.findOne.mockResolvedValue(mockTenant)

			const result = await controller.findOne(
				'tenant-1',
				createMockRequest({ user: mockUser }) as any
			)
			expect(mockTenantsServiceInstance.findOne).toHaveBeenCalledWith(
				mockUser.id,
				'tenant-1'
			)
			expect(result).toEqual(mockTenant)
		})

		it('should throw NotFoundException when tenant not found', async () => {
			mockTenantsServiceInstance.findOne.mockResolvedValue(null)

			await expect(
				controller.findOne(
					'non-existent',
					createMockRequest({ user: mockUser }) as any
				)
			).rejects.toThrow(NotFoundException)
		})
	})

	describe('create', () => {
		it('should create a new tenant', async () => {
			const mockTenant = createMockTenant(validCreateTenantRequest)

			mockTenantsServiceInstance.create.mockResolvedValue(mockTenant)
			mockTenantsServiceInstance.sendTenantInvitation.mockResolvedValue({
				success: true,
				message: 'Invitation sent'
			})

			const result = await controller.create(
				validCreateTenantRequest,
				createMockRequest({ user: mockUser }) as any
			)
			expect(mockTenantsServiceInstance.create).toHaveBeenCalledWith(
				mockUser.id,
				validCreateTenantRequest
			)
			expect(result).toEqual(mockTenant)

			// Wait for fire-and-forget email to process
			await new Promise(resolve => setTimeout(resolve, 10))
			expect(
				mockTenantsServiceInstance.sendTenantInvitationV2
			).toHaveBeenCalledWith(mockUser.id, mockTenant.id)
		})
	})

	describe('update', () => {
		it('should update a tenant', async () => {
			const mockTenant = createMockTenant({
				id: 'tenant-1',
				firstName: 'Jane'
			})

			mockTenantsServiceInstance.update.mockResolvedValue(mockTenant)

			const result = await controller.update(
				'tenant-1',
				validUpdateTenantRequest,
				createMockRequest({ user: mockUser }) as any
			)
			expect(mockTenantsServiceInstance.update).toHaveBeenCalledWith(
				mockUser.id,
				'tenant-1',
				validUpdateTenantRequest,
				undefined // expectedVersion for optimistic locking
			)
			expect(result).toEqual(mockTenant)
		})
	})

	describe('markAsMovedOut', () => {
		it('should mark tenant as moved out with date and reason', async () => {
			const mockTenant = createMockTenant({
				status: 'MOVED_OUT',
				move_out_date: '2025-01-15',
				move_out_reason: 'lease_expired: Lease term ended'
			})
			mockTenantsServiceInstance.markAsMovedOut.mockResolvedValue(mockTenant)

			const result = await controller.markAsMovedOut(
				'tenant-1',
				{
					moveOutDate: '2025-01-15',
					moveOutReason: 'lease_expired: Lease term ended'
				},
				createMockRequest({ user: mockUser }) as any
			)

			expect(mockTenantsServiceInstance.markAsMovedOut).toHaveBeenCalledWith(
				mockUser.id,
				'tenant-1',
				'2025-01-15',
				'lease_expired: Lease term ended'
			)
			expect(result).toEqual(mockTenant)
			expect(result.status).toBe('MOVED_OUT')
		})

		it('should throw BadRequestException when moveOutDate is missing', async () => {
			await expect(
				controller.markAsMovedOut(
					'tenant-1',
					{ moveOutDate: '', moveOutReason: 'lease_expired' },
					createMockRequest({ user: mockUser }) as any
				)
			).rejects.toThrow(BadRequestException)
		})

		it('should throw BadRequestException when moveOutReason is missing', async () => {
			await expect(
				controller.markAsMovedOut(
					'tenant-1',
					{ moveOutDate: '2025-01-15', moveOutReason: '' },
					createMockRequest({ user: mockUser }) as any
				)
			).rejects.toThrow(BadRequestException)
		})

		it('should throw NotFoundException when tenant not found', async () => {
			mockTenantsServiceInstance.markAsMovedOut.mockResolvedValue(null)

			await expect(
				controller.markAsMovedOut(
					'tenant-1',
					{ moveOutDate: '2025-01-15', moveOutReason: 'lease_expired' },
					createMockRequest({ user: mockUser }) as any
				)
			).rejects.toThrow(NotFoundException)
		})
	})

	describe('hardDelete', () => {
		it('should permanently delete tenant after 7-year retention', async () => {
			mockTenantsServiceInstance.hardDelete.mockResolvedValue(undefined)

			const result = await controller.hardDelete(
				'tenant-1',
				createMockRequest({ user: mockUser }) as any
			)

			expect(mockTenantsServiceInstance.hardDelete).toHaveBeenCalledWith(
				mockUser.id,
				'tenant-1'
			)
			expect(result.message).toBe('Tenant permanently deleted')
		})

		it('should reject deletion of active tenant', async () => {
			mockTenantsServiceInstance.hardDelete.mockRejectedValue(
				new BadRequestException(
					'Tenant must be marked as moved out before permanent deletion. Use PUT /tenants/:id/mark-moved-out first.'
				)
			)

			await expect(
				controller.hardDelete(
					'tenant-1',
					createMockRequest({ user: mockUser }) as any
				)
			).rejects.toThrow(BadRequestException)
		})

		it('should reject deletion of tenant without move-out date', async () => {
			mockTenantsServiceInstance.hardDelete.mockRejectedValue(
				new BadRequestException(
					'Tenant must have a move-out date before permanent deletion. Use PUT /tenants/:id/mark-moved-out first.'
				)
			)

			await expect(
				controller.hardDelete(
					'tenant-1',
					createMockRequest({ user: mockUser }) as any
				)
			).rejects.toThrow(BadRequestException)
		})

		it('should reject deletion within 7-year retention period', async () => {
			mockTenantsServiceInstance.hardDelete.mockRejectedValue(
				new BadRequestException(
					'Tenant can only be permanently deleted 7 years after move-out date (legal retention requirement)'
				)
			)

			await expect(
				controller.hardDelete(
					'tenant-1',
					createMockRequest({ user: mockUser }) as any
				)
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('remove (deprecated)', () => {
		it('should throw BadRequestException directing to soft delete', async () => {
			const mockRequest = createMockRequest({ user: mockUser }) as any
			const tenantId = 'tenant-123'
			
			// The remove method should always throw since direct deletion is deprecated
			mockTenantsServiceInstance.remove.mockRejectedValue(
				new BadRequestException('Direct deletion is not allowed')
			)
			
			await expect(controller.remove(tenantId, mockRequest)).rejects.toThrow(BadRequestException)

			await expect(controller.remove(tenantId, mockRequest)).rejects.toThrow(
				/Direct deletion is not allowed/
			)
		})
	})
})
