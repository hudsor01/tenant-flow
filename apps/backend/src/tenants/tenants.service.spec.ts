/**
 * TenantsService Tests - Repository Pattern Implementation
 *
 * - NO ABSTRACTIONS: Test repository interface directly
 * - KISS: Simple, direct test patterns
 * - DRY: Only abstract when reused 2+ places
 * - Production mirror: Test actual service interface
 */

import { BadRequestException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { CreateTenantRequest, UpdateTenantRequest } from '@repo/shared/types/backend-domain'
import type { Tenant, TenantStats } from '@repo/shared/types/core'
import { generateUUID } from '../../test/setup'
import { SilentLogger } from '../__test__/silent-logger'
import type { ITenantsRepository } from '../repositories/interfaces/tenants-repository.interface'
import { REPOSITORY_TOKENS } from '../repositories/repositories.module'
import { TenantsService } from './tenants.service'

describe('TenantsService', () => {
	let service: TenantsService
	let mockTenantsRepository: jest.Mocked<ITenantsRepository>
	let eventEmitter: EventEmitter2

	beforeEach(async () => {
		jest.clearAllMocks()

		// Mock repository implementation
		const mockRepository: jest.Mocked<ITenantsRepository> = {
			findByUserIdWithSearch: jest.fn(),
			findById: jest.fn(),
			findByPropertyId: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			softDelete: jest.fn(),
			getStats: jest.fn(),
			getAnalytics: jest.fn(),
			getActivity: jest.fn()
		}

		const mockEventEmitter = {
			emit: jest.fn()
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TenantsService,
				{
					provide: REPOSITORY_TOKENS.TENANTS,
					useValue: mockRepository
				},
				{
					provide: EventEmitter2,
					useValue: mockEventEmitter
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<TenantsService>(TenantsService)
		mockTenantsRepository = module.get<ITenantsRepository>(REPOSITORY_TOKENS.TENANTS) as jest.Mocked<ITenantsRepository>
		eventEmitter = module.get<EventEmitter2>(EventEmitter2)

		// Spy on the actual logger instance created by the service
		jest.spyOn(service['logger'], 'error').mockImplementation(() => {})
		jest.spyOn(service['logger'], 'warn').mockImplementation(() => {})
		jest.spyOn(service['logger'], 'log').mockImplementation(() => {})
	})

	describe('Service Initialization', () => {
		it('should be defined', () => {
			expect(service).toBeDefined()
		})

		it('should have access to required dependencies', () => {
			expect(mockTenantsRepository).toBeDefined()
			expect(eventEmitter.emit).toBeDefined()
			expect(service['logger'].error).toBeDefined()
		})
	})

	describe('findAll - Repository Pattern', () => {
		it('should call repository findByUserIdWithSearch with correct parameters', async () => {
			const userId = generateUUID()
			const query = {
				search: 'test',
				invitationStatus: 'PENDING',
				limit: 10,
				offset: undefined,
				sortBy: 'name',
				sortOrder: 'asc'
			}

			const mockData: Tenant[] = [{
				id: generateUUID(),
				firstName: 'Test',
				lastName: 'Tenant',
				email: 'test@example.com',
				phone: null,
				avatarUrl: null,
				name: null,
				emergencyContact: null,
				userId: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}]

			mockTenantsRepository.findByUserIdWithSearch.mockResolvedValue(mockData)

			const result = await service.findAll(userId, query)

			expect(mockTenantsRepository.findByUserIdWithSearch).toHaveBeenCalledWith(userId, {
				search: 'test',
				limit: 10,
				offset: undefined,
				status: 'PENDING'
			})
			expect(result).toEqual(mockData)
		})

		it('should handle repository errors correctly', async () => {
			const userId = generateUUID()
			const query = {}

			mockTenantsRepository.findByUserIdWithSearch.mockRejectedValue(
				new Error('Database error')
			)

			await expect(service.findAll(userId, query)).rejects.toThrow(
				BadRequestException
			)
			expect(service['logger'].error).toHaveBeenCalledWith(
				'Tenants service failed to find all tenants',
				expect.objectContaining({
					error: 'Database error',
					userId
				})
			)
		})

		it('should handle missing userId', async () => {
			const query = {}

			await expect(service.findAll('', query)).rejects.toThrow(
				BadRequestException
			)
			expect(service['logger'].warn).toHaveBeenCalledWith(
				'Find all tenants requested without userId'
			)
		})
	})

	describe('getStats - Repository Pattern', () => {
		it('should call repository getStats correctly', async () => {
			const userId = generateUUID()
			const mockStats: TenantStats = {
				total: 5,
				active: 3,
				inactive: 2,
				newThisMonth: 1
			}

			mockTenantsRepository.getStats.mockResolvedValue(mockStats)

			const result = await service.getStats(userId)

			expect(mockTenantsRepository.getStats).toHaveBeenCalledWith(userId)
			expect(result).toEqual(mockStats)
		})

		it('should handle repository errors', async () => {
			const userId = generateUUID()

			mockTenantsRepository.getStats.mockRejectedValue(
				new Error('Stats error')
			)

			await expect(service.getStats(userId)).rejects.toThrow(
				BadRequestException
			)
			expect(service['logger'].error).toHaveBeenCalledWith(
				'Tenants service failed to get stats',
				expect.objectContaining({
					error: 'Stats error',
					userId
				})
			)
		})

		it('should handle missing userId', async () => {
			await expect(service.getStats('')).rejects.toThrow(
				BadRequestException
			)
			expect(service['logger'].warn).toHaveBeenCalledWith(
				'Tenant stats requested without userId'
			)
		})
	})

	describe('findOne - Repository Pattern', () => {
		it('should call repository findById and verify ownership', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()
			const mockTenant: Tenant = {
				id: tenantId,
				firstName: 'Test',
				lastName: 'Tenant',
				email: 'test@example.com',
				phone: null,
				avatarUrl: null,
				name: null,
				emergencyContact: null,
				userId: userId,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}

			mockTenantsRepository.findById.mockResolvedValue(mockTenant)

			const result = await service.findOne(userId, tenantId)

			expect(mockTenantsRepository.findById).toHaveBeenCalledWith(tenantId)
			expect(result).toEqual(mockTenant)
		})

		it('should return null for unauthorized access', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()
			const otherUserId = generateUUID()
			const mockTenant: Tenant = {
				id: tenantId,
				firstName: 'Test',
				lastName: 'Tenant',
				email: 'test@example.com',
				phone: null,
				avatarUrl: null,
				name: null,
				emergencyContact: null,
				userId: otherUserId, // Different user ID
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}

			mockTenantsRepository.findById.mockResolvedValue(mockTenant)

			const result = await service.findOne(userId, tenantId)

			expect(result).toBeNull()
			expect(service['logger'].warn).toHaveBeenCalledWith(
				'Unauthorized access attempt to tenant',
				{ userId, tenantId }
			)
		})

		it('should return null when tenant not found', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()

			mockTenantsRepository.findById.mockResolvedValue(null)

			const result = await service.findOne(userId, tenantId)

			expect(result).toBeNull()
		})

		it('should handle repository errors gracefully', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()

			mockTenantsRepository.findById.mockRejectedValue(
				new Error('Database error')
			)

			const result = await service.findOne(userId, tenantId)

			expect(result).toBeNull()
			expect(service['logger'].error).toHaveBeenCalledWith(
				'Tenants service failed to find one tenant',
				expect.objectContaining({
					error: 'Database error',
					userId,
					tenantId
				})
			)
		})
	})

	describe('create - Repository Pattern with Event Emission', () => {
		it('should call repository create and emit event', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()
			const createRequest: CreateTenantRequest = {
				firstName: 'New',
				lastName: 'Tenant',
				email: 'tenant@test.com',
				phone: '123-456-7890'
			}

			const mockCreatedTenant: Tenant = {
				id: tenantId,
				firstName: createRequest.firstName,
				lastName: createRequest.lastName,
				email: createRequest.email,
				phone: createRequest.phone ?? null,
				avatarUrl: null,
				name: null,
				emergencyContact: null,
				userId: userId,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}

			mockTenantsRepository.create.mockResolvedValue(mockCreatedTenant)

			const result = await service.create(userId, createRequest)

			expect(mockTenantsRepository.create).toHaveBeenCalledWith(userId, createRequest)

			expect(eventEmitter.emit).toHaveBeenCalledWith(
				'tenant.created',
				expect.objectContaining({
					userId,
					tenantId: mockCreatedTenant.id,
					tenantName: `${mockCreatedTenant.firstName} ${mockCreatedTenant.lastName}`,
					tenantEmail: mockCreatedTenant.email
				})
			)

			expect(result).toEqual(mockCreatedTenant)
		})

		it('should handle create errors', async () => {
			const userId = generateUUID()
			const createRequest: CreateTenantRequest = {
				firstName: 'Test',
				lastName: 'User',
				email: 'test@test.com'
			}

			mockTenantsRepository.create.mockRejectedValue(
				new Error('Create failed')
			)

			await expect(service.create(userId, createRequest)).rejects.toThrow(
				BadRequestException
			)
			expect(eventEmitter.emit).not.toHaveBeenCalled()
		})

		it('should handle missing userId or email', async () => {
			const createRequest: CreateTenantRequest = {
				firstName: 'Test',
				lastName: 'User',
				email: 'test@test.com'
			}

			await expect(service.create('', createRequest)).rejects.toThrow(
				BadRequestException
			)

			const invalidRequest = { ...createRequest, email: '' }
			await expect(service.create('user-id', invalidRequest as CreateTenantRequest)).rejects.toThrow(
				BadRequestException
			)
		})
	})

	describe('update - Repository Pattern', () => {
		it('should verify ownership and call repository update', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()
			const updateRequest: UpdateTenantRequest = {
				firstName: 'Updated',
				lastName: 'Tenant',
				email: 'updated@test.com',
				phone: '987-654-3210'
			}

			const existingTenant: Tenant = {
				id: tenantId,
				firstName: 'Old',
				lastName: 'Tenant',
				email: 'old@test.com',
				phone: null,
				avatarUrl: null,
				name: null,
				emergencyContact: null,
				userId: userId,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}

			const mockUpdatedTenant: Tenant = {
				...existingTenant,
				...updateRequest,
				updatedAt: new Date().toISOString()
			}

			mockTenantsRepository.findById.mockResolvedValue(existingTenant)
			mockTenantsRepository.update.mockResolvedValue(mockUpdatedTenant)

			const result = await service.update(userId, tenantId, updateRequest)

			expect(mockTenantsRepository.findById).toHaveBeenCalledWith(tenantId)
			expect(mockTenantsRepository.update).toHaveBeenCalledWith(tenantId, updateRequest)
			expect(result).toEqual(mockUpdatedTenant)
		})

		it('should return null for unauthorized access', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()
			const otherUserId = generateUUID()
			const updateRequest: UpdateTenantRequest = {
				firstName: 'Updated',
				lastName: 'Tenant'
			}

			const existingTenant: Tenant = {
				id: tenantId,
				firstName: 'Old',
				lastName: 'Tenant',
				email: 'old@test.com',
				phone: null,
				avatarUrl: null,
				name: null,
				emergencyContact: null,
				userId: otherUserId, // Different user ID
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}

			mockTenantsRepository.findById.mockResolvedValue(existingTenant)

			const result = await service.update(userId, tenantId, updateRequest)

			expect(result).toBeNull()
			expect(service['logger'].warn).toHaveBeenCalledWith(
				'Unauthorized update attempt on tenant',
				{ userId, tenantId }
			)
			expect(mockTenantsRepository.update).not.toHaveBeenCalled()
		})

		it('should return null when tenant not found', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()
			const updateRequest: UpdateTenantRequest = {
				firstName: 'Updated'
			}

			mockTenantsRepository.findById.mockResolvedValue(null)

			const result = await service.update(userId, tenantId, updateRequest)

			expect(result).toBeNull()
			expect(mockTenantsRepository.update).not.toHaveBeenCalled()
		})
	})

	describe('remove - Repository Pattern', () => {
		it('should call repository softDelete correctly', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()

			mockTenantsRepository.softDelete.mockResolvedValue({
				success: true,
				message: 'Tenant deleted successfully'
			})

			await service.remove(userId, tenantId)

			expect(mockTenantsRepository.softDelete).toHaveBeenCalledWith(userId, tenantId)
		})

		it('should handle delete errors', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()

			mockTenantsRepository.softDelete.mockResolvedValue({
				success: false,
				message: 'Delete failed'
			})

			await expect(service.remove(userId, tenantId)).rejects.toThrow(
				BadRequestException
			)
		})

		it('should handle repository errors', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()

			mockTenantsRepository.softDelete.mockRejectedValue(
				new Error('Database error')
			)

			await expect(service.remove(userId, tenantId)).rejects.toThrow(
				BadRequestException
			)
			expect(service['logger'].error).toHaveBeenCalledWith(
				'Tenants service failed to remove tenant',
				expect.objectContaining({
					error: 'Database error',
					userId,
					tenantId
				})
			)
		})
	})

	describe('sendTenantInvitation - Repository Pattern', () => {
		it('should send invitation successfully', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()
			const mockTenant = {
				id: tenantId,
				firstName: 'Test',
				lastName: 'Tenant',
				name: 'Test Tenant',
				email: 'test@example.com',
				phone: '+1234567890',
				avatarUrl: null,
				emergencyContact: 'Emergency Contact',
				userId: userId,
				invitationStatus: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}

			mockTenantsRepository.findById.mockResolvedValue(mockTenant)

			const result = await service.sendTenantInvitation(userId, tenantId)

			expect(mockTenantsRepository.findById).toHaveBeenCalledWith(tenantId)
			expect(mockTenantsRepository.update).not.toHaveBeenCalled()
			expect(eventEmitter.emit).toHaveBeenCalledWith(
				'tenant.invitation.sent',
				expect.objectContaining({
					userId,
					tenantId,
					invitationToken: expect.any(String),
					email: expect.objectContaining({
						to: mockTenant.email,
						subject: expect.stringContaining('Tenant Portal Invitation')
					})
				})
			)
			expect(result).toMatchObject({
				success: true,
				message: 'Invitation sent successfully',
				invitationToken: expect.any(String),
				invitationLink: expect.stringContaining('/tenant/invitation/'),
				sentAt: expect.any(String)
			})
		})

		it('should return error when tenant not found', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()

			mockTenantsRepository.findById.mockResolvedValue(null)

			await expect(service.sendTenantInvitation(userId, tenantId)).rejects.toThrow(
				BadRequestException
			)
		})

		it('should still send invitation when status already exists', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()
			const mockTenant = {
				id: tenantId,
				firstName: 'Test',
				lastName: 'Tenant',
				name: 'Test Tenant',
				email: 'test@example.com',
				phone: '+1234567890',
				avatarUrl: null,
				emergencyContact: 'Emergency Contact',
				userId: userId,
				invitationStatus: 'SENT',
				invitationToken: 'existing-token',
				invitationSentAt: new Date().toISOString(),
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}

			mockTenantsRepository.findById.mockResolvedValue(mockTenant)

			const result = await service.sendTenantInvitation(userId, tenantId)

			expect(result).toMatchObject({
				success: true,
				message: 'Invitation sent successfully',
				invitationToken: expect.any(String),
				invitationLink: expect.stringContaining('/tenant/invitation/')
			})
			expect(eventEmitter.emit).toHaveBeenCalledWith(
				'tenant.invitation.sent',
				expect.objectContaining({
					userId,
					tenantId,
					invitationToken: expect.any(String)
				})
			)
		})
	})

	describe('resendInvitation - Repository Pattern', () => {
		it('should resend invitation successfully', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()
			const mockTenant = {
				id: tenantId,
				firstName: 'Test',
				lastName: 'Tenant',
				name: 'Test Tenant',
				email: 'test@example.com',
				phone: '+1234567890',
				avatarUrl: null,
				emergencyContact: 'Emergency Contact',
				userId: userId,
				invitationStatus: 'PENDING',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}

			mockTenantsRepository.findById.mockResolvedValue(mockTenant)
			const sendInvitationSpy = jest.spyOn(service, 'sendTenantInvitation')

			const result = await service.resendInvitation(userId, tenantId)

			expect(sendInvitationSpy).toHaveBeenCalledWith(userId, tenantId)
			expect(result).toMatchObject({
				success: true,
				message: 'Invitation sent successfully',
				invitationToken: expect.any(String),
				invitationLink: expect.stringContaining('/tenant/invitation/'),
				sentAt: expect.any(String)
			})
			sendInvitationSpy.mockRestore()
		})

		it('should return error when tenant not found', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()

			mockTenantsRepository.findById.mockResolvedValue(null)

			await expect(service.resendInvitation(userId, tenantId)).rejects.toThrow(
				BadRequestException
			)
		})

		it('should allow resending even when previous invitation was accepted', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()
			const mockTenant = {
				id: tenantId,
				firstName: 'Test',
				lastName: 'Tenant',
				name: 'Test Tenant',
				email: 'test@example.com',
				phone: '+1234567890',
				avatarUrl: null,
				emergencyContact: 'Emergency Contact',
				userId: userId,
				invitationStatus: 'ACCEPTED',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}

			mockTenantsRepository.findById.mockResolvedValue(mockTenant)

			const result = await service.resendInvitation(userId, tenantId)

			expect(result).toMatchObject({
				success: true,
				message: 'Invitation sent successfully',
				invitationToken: expect.any(String)
			})
		})
	})
})
