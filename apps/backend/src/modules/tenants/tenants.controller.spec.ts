import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { Tenant } from '@repo/shared/types/core'
import type {
	CreateTenantRequest,
	UpdateTenantRequest
} from '@repo/shared/types/api-contracts'
import { PropertyOwnershipGuard } from '../../shared/guards/property-ownership.guard'
import { StripeConnectedGuard } from '../../shared/guards/stripe-connected.guard'
import { CurrentUserProvider } from '../../shared/providers/current-user.provider'
import { createMockRequest } from '../../shared/test-utils/types'
import { createMockUser } from '../../test-utils/mocks'
import { TenantsController } from './tenants.controller'
import { TenantInvitationService } from './tenant-invitation.service'
import { TenantsService } from './tenants.service'

jest.mock('../../database/supabase.service', () => {
	return {
		SupabaseService: jest.fn().mockImplementation(() => ({
			getUser: jest.fn()
		}))
	}
})

describe('TenantsController', () => {
	let controller: any
	let mockTenantsServiceInstance: any
	let mockCurrentUserProvider: any

	const mockUser = createMockUser({ id: 'user-123' })

	const createMockTenant = (overrides: Partial<Tenant> = {}) => ({
		id: 'tenant-default',
		first_name: 'John',
		last_name: 'Doe',
		email: 'john@example.com',
		phone: null,
		avatarUrl: null,
		name: null,
		emergency_contact: null,
		user_id: null,
		status: 'ACTIVE' as const,
		move_out_date: null,
		move_out_reason: null,
		archived_at: null,
		invitation_status: 'PENDING' as const,
		invitation_token: null,
		invitation_sent_at: null,
		invitation_accepted_at: null,
		invitation_expires_at: null,

		autopay_configured_at: null,
		autopay_day: null,
		autopay_enabled: null,
		autopay_frequency: null,
		payment_method_added_at: null,
		version: 1,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		...overrides
	})

	const validCreateTenantRequest: CreateTenantRequest = {
		emergency_contact_name: 'Jane Doe',
		emergency_contact_phone: '+1234567890',
		emergency_contact_relationship: 'Sister',
		date_of_birth: '1990-01-15',
		ssn_last_four: '1234',
		stripe_customer_id: 'cus_test123'
	}

	const validUpdateTenantRequest: UpdateTenantRequest = {
		emergency_contact_name: 'Jane Doe'
	}

	beforeEach(async () => {
		jest.clearAllMocks()

		// Mock CurrentUserProvider
		mockCurrentUserProvider = {
			getuser_id: jest.fn().mockResolvedValue(mockUser.id),
			getUser: jest.fn().mockResolvedValue(mockUser),
			getUserEmail: jest.fn().mockResolvedValue(mockUser.email),
			isAuthenticated: jest.fn().mockResolvedValue(true),
			getUserOrNull: jest.fn().mockResolvedValue(mockUser)
		} as any

		const module: TestingModule = await Test.createTestingModule({
			controllers: [TenantsController],
			providers: [
				{
					provide: TenantsService,
					useValue: {
						findAll: jest.fn(),
						findAllWithLeaseInfo: jest.fn(),
						getStats: jest.fn(),
						getSummary: jest.fn(),
						findOne: jest.fn(),
						create: jest.fn(),
						update: jest.fn(),
						remove: jest.fn(),
						markAsMovedOut: jest.fn(),
					hardDelete: jest.fn(),
					sendTenantInvitationV2: jest.fn().mockResolvedValue(undefined),
						resendInvitation: jest.fn()
					}
				},
				{
					provide: TenantInvitationService,
					useValue: {
						inviteTenantWithLease: jest.fn()
					}
				},
				{
					provide: 'PropertyOwnershipGuard',
					useValue: {
						canActivate: jest.fn().mockResolvedValue(true)
					}
				},
				{
					provide: 'StripeConnectedGuard',
					useValue: {
						canActivate: jest.fn().mockResolvedValue(true)
					}
				},
				{ provide: CurrentUserProvider, useValue: mockCurrentUserProvider }
			]
		})
			.overrideGuard(PropertyOwnershipGuard)
			.useValue({ canActivate: jest.fn().mockResolvedValue(true) })
			.overrideGuard(StripeConnectedGuard)
			.useValue({ canActivate: jest.fn().mockResolvedValue(true) })
			.compile()

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

			mockTenantsServiceInstance.findAllWithLeaseInfo.mockResolvedValue(
				mockTenants
			)

			const result = await controller.findAll(
				createMockRequest({ user: mockUser }) as any
			)
			expect(
				mockTenantsServiceInstance.findAllWithLeaseInfo
			).toHaveBeenCalledWith(mockUser.id, {
				search: undefined,
				invitationStatus: undefined,
				limit: undefined,
				offset: undefined,
				sortBy: undefined,
				sortOrder: undefined
			})
			expect(result).toEqual(mockTenants)
		})

		it('should handle all query parameters', async () => {
			const mockTenants: Tenant[] = []

			mockTenantsServiceInstance.findAllWithLeaseInfo.mockResolvedValue(
				mockTenants
			)

			await controller.findAll(
				createMockRequest({ user: mockUser }) as any,
				'search term',
				'PENDING',
				20,
				10,
				'name',
				'asc'
			)

			expect(
				mockTenantsServiceInstance.findAllWithLeaseInfo
			).toHaveBeenCalledWith(mockUser.id, {
				search: 'search term',
				invitationStatus: 'PENDING',
				limit: 20,
				offset: 10,

			})
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
			mockTenantsServiceInstance.sendTenantInvitationV2.mockResolvedValue({
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
			).toHaveBeenCalledWith(mockUser.id, { email: mockTenant.id })
		})
	})

	describe('update', () => {
		it('should update a tenant', async () => {
			const mockTenant = createMockTenant({
			id: 'tenant-1'
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
				move_out_date: '2025-01-15',
				move_out_reason: 'lease_expired: Lease term ended',
				status: 'MOVED_OUT'
			} as any)
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
			const tenant_id = 'tenant-123'

			// The remove method should always throw since direct deletion is deprecated
			mockTenantsServiceInstance.remove.mockRejectedValue(
				new BadRequestException('Direct deletion is not allowed')
			)

			await expect(controller.remove(tenant_id, mockRequest)).rejects.toThrow(
				BadRequestException
			)

			await expect(controller.remove(tenant_id, mockRequest)).rejects.toThrow(
				/Direct deletion is not allowed/
			)
		})
	})
})
