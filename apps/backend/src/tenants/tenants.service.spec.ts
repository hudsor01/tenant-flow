/**
 * TenantsService Tests - Following ULTRA NATIVE Architecture Guidelines
 *
 * - NO ABSTRACTIONS: Test RPC calls directly
 * - KISS: Simple, direct test patterns
 * - DRY: Only abstract when reused 2+ places
 * - Production mirror: Test actual service interface
 */

import { BadRequestException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { generateUUID } from '../../test/setup'
import { SilentLogger } from '../__test__/silent-logger'
import { SupabaseService } from '../database/supabase.service'
import { TenantsService } from './tenants.service'

describe('TenantsService', () => {
	let service: TenantsService
	let supabaseService: SupabaseService
	let eventEmitter: EventEmitter2

	// Mock Supabase admin client
	const mockSupabaseClient = {
		rpc: jest.fn().mockReturnThis(),
		single: jest.fn()
	}

	beforeEach(async () => {
		jest.clearAllMocks()

		const mockSupabaseService = {
			getAdminClient: jest.fn(() => mockSupabaseClient)
		}

		const mockEventEmitter = {
			emit: jest.fn()
		}

		// We'll spy on the service's logger after instantiation

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TenantsService,
				{
					provide: SupabaseService,
					useValue: mockSupabaseService
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
		supabaseService = module.get<SupabaseService>(SupabaseService)
		eventEmitter = module.get<EventEmitter2>(EventEmitter2)

		// Spy on the actual logger instance created by the service
		jest.spyOn(service['logger'], 'error').mockImplementation(() => {})
	})

	describe('Service Initialization', () => {
		it('should be defined', () => {
			expect(service).toBeDefined()
		})

		it('should have access to required dependencies', () => {
			expect(supabaseService.getAdminClient).toBeDefined()
			expect(eventEmitter.emit).toBeDefined()
			expect(service['logger'].error).toBeDefined()
		})
	})

	describe('findAll - RPC Call Pattern', () => {
		it('should call get_user_tenants RPC with correct parameters', async () => {
			const userId = generateUUID()
			const query = {
				search: 'test',
				invitationStatus: 'PENDING',
				limit: 10,
				offset: 0,
				sortBy: 'name',
				sortOrder: 'asc'
			}

			const mockData = [{ id: generateUUID(), name: 'Test Tenant' }]
			mockSupabaseClient.rpc.mockReturnValue({
				data: mockData,
				error: null
			})

			const result = await service.findAll(userId, query)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_user_tenants', {
				p_user_id: userId,
				p_search: 'test',
				p_invitation_status: 'PENDING',
				p_limit: 10,
				p_offset: 0,
				p_sort_by: 'name',
				p_sort_order: 'asc'
			})
			expect(result).toEqual(mockData)
		})

		it('should handle RPC errors correctly', async () => {
			const userId = generateUUID()
			const query = {}

			mockSupabaseClient.rpc.mockReturnValue({
				data: null,
				error: { message: 'Database error' }
			})

			await expect(service.findAll(userId, query)).rejects.toThrow(
				BadRequestException
			)
			expect(service['logger'].error).toHaveBeenCalledWith(
				'Failed to get tenants',
				{
					userId,
					error: 'Database error'
				}
			)
		})

		it('should handle undefined query parameters', async () => {
			const userId = generateUUID()
			const query = { search: undefined, limit: undefined }

			mockSupabaseClient.rpc.mockReturnValue({
				data: [],
				error: null
			})

			await service.findAll(userId, query)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_user_tenants', {
				p_user_id: userId,
				p_search: undefined,
				p_invitation_status: undefined,
				p_limit: undefined,
				p_offset: undefined,
				p_sort_by: undefined,
				p_sort_order: undefined
			})
		})
	})

	describe('getStats - RPC Call Pattern', () => {
		it('should call get_tenant_stats RPC correctly', async () => {
			const userId = generateUUID()
			const mockStats = { total: 5, active: 3, pending: 2 }

			mockSupabaseClient.rpc.mockReturnThis()
			mockSupabaseClient.single.mockReturnValue({
				data: mockStats,
				error: null
			})

			const result = await service.getStats(userId)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_tenant_stats', {
				p_user_id: userId
			})
			expect(mockSupabaseClient.single).toHaveBeenCalled()
			expect(result).toEqual(mockStats)
		})

		it('should handle stats RPC errors', async () => {
			const userId = generateUUID()

			mockSupabaseClient.rpc.mockReturnThis()
			mockSupabaseClient.single.mockReturnValue({
				data: null,
				error: { message: 'Stats error' }
			})

			await expect(service.getStats(userId)).rejects.toThrow(
				BadRequestException
			)
			expect(service['logger'].error).toHaveBeenCalledWith(
				'Failed to get tenant stats',
				{
					userId,
					error: 'Stats error'
				}
			)
		})
	})

	describe('findOne - RPC Call Pattern', () => {
		it('should call get_tenant_by_id RPC correctly', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()
			const mockTenant = { id: tenantId, name: 'Test Tenant' }

			mockSupabaseClient.rpc.mockReturnThis()
			mockSupabaseClient.single.mockReturnValue({
				data: mockTenant,
				error: null
			})

			const result = await service.findOne(userId, tenantId)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_tenant_by_id', {
				p_user_id: userId,
				p_tenant_id: tenantId
			})
			expect(result).toEqual(mockTenant)
		})

		it('should return null on error without throwing', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()

			mockSupabaseClient.rpc.mockReturnThis()
			mockSupabaseClient.single.mockReturnValue({
				data: null,
				error: { message: 'Not found' }
			})

			const result = await service.findOne(userId, tenantId)

			expect(result).toBeNull()
			expect(service['logger'].error).toHaveBeenCalledWith(
				'Failed to get tenant',
				{
					userId,
					tenantId,
					error: 'Not found'
				}
			)
		})
	})

	describe('create - RPC Call with Event Emission', () => {
		it('should call create_tenant RPC and emit event', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()
			const createRequest = {
				firstName: 'New',
				lastName: 'Tenant',
				name: 'New Tenant',
				email: 'tenant@test.com',
				phone: '123-456-7890',
				emergencyContact: 'emergency@test.com'
			}

			const mockCreatedTenant = {
				id: tenantId,
				name: createRequest.name,
				email: createRequest.email
			}

			mockSupabaseClient.rpc.mockReturnThis()
			mockSupabaseClient.single.mockReturnValue({
				data: mockCreatedTenant,
				error: null
			})

			const result = await service.create(userId, createRequest)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('create_tenant', {
				p_user_id: userId,
				p_name: createRequest.name,
				p_email: createRequest.email,
				p_phone: createRequest.phone,
				p_emergency_contact: createRequest.emergencyContact
			})

			expect(eventEmitter.emit).toHaveBeenCalledWith(
				'tenant.created',
				expect.objectContaining({
					userId,
					tenantId: mockCreatedTenant.id,
					tenantName: mockCreatedTenant.name,
					tenantEmail: mockCreatedTenant.email
				})
			)

			expect(result).toEqual(mockCreatedTenant)
		})

		it('should handle undefined optional fields', async () => {
			const userId = generateUUID()
			const createRequest = {
				firstName: 'New',
				lastName: 'Tenant',
				name: 'New Tenant',
				email: 'tenant@test.com'
			}

			mockSupabaseClient.rpc.mockReturnThis()
			mockSupabaseClient.single.mockReturnValue({
				data: {
					id: generateUUID(),
					name: 'New Tenant',
					email: 'tenant@test.com'
				},
				error: null
			})

			await service.create(userId, createRequest)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('create_tenant', {
				p_user_id: userId,
				p_name: createRequest.name,
				p_email: createRequest.email,
				p_phone: undefined,
				p_emergency_contact: undefined
			})
		})

		it('should handle create errors', async () => {
			const userId = generateUUID()
			const createRequest = {
				firstName: 'Test',
				lastName: 'User',
				name: 'Test',
				email: 'test@test.com'
			}

			mockSupabaseClient.rpc.mockReturnThis()
			mockSupabaseClient.single.mockReturnValue({
				data: null,
				error: { message: 'Create failed' }
			})

			await expect(service.create(userId, createRequest)).rejects.toThrow(
				BadRequestException
			)
			expect(eventEmitter.emit).not.toHaveBeenCalled()
		})
	})

	describe('update - RPC Call Pattern', () => {
		it('should call update_tenant RPC correctly', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()
			const updateRequest = {
				name: 'Updated Tenant',
				email: 'updated@test.com',
				phone: '987-654-3210',
				emergencyContact: 'new-emergency@test.com'
			}

			const mockUpdatedTenant = { id: tenantId, ...updateRequest }

			mockSupabaseClient.rpc.mockReturnThis()
			mockSupabaseClient.single.mockReturnValue({
				data: mockUpdatedTenant,
				error: null
			})

			const result = await service.update(userId, tenantId, updateRequest)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('update_tenant', {
				p_user_id: userId,
				p_tenant_id: tenantId,
				p_name: updateRequest.name,
				p_email: updateRequest.email,
				p_phone: updateRequest.phone,
				p_emergency_contact: updateRequest.emergencyContact
			})
			expect(result).toEqual(mockUpdatedTenant)
		})

		it('should return null on update error', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()
			const updateRequest = { name: 'Test', email: 'test@test.com' }

			mockSupabaseClient.rpc.mockReturnThis()
			mockSupabaseClient.single.mockReturnValue({
				data: null,
				error: { message: 'Update failed' }
			})

			const result = await service.update(userId, tenantId, updateRequest)

			expect(result).toBeNull()
			expect(service['logger'].error).toHaveBeenCalledWith(
				'Failed to update tenant',
				{
					userId,
					tenantId,
					error: 'Update failed'
				}
			)
		})
	})

	describe('remove - RPC Call Pattern', () => {
		it('should call delete_tenant RPC correctly', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()

			mockSupabaseClient.rpc.mockReturnValue({
				error: null
			})

			await service.remove(userId, tenantId)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('delete_tenant', {
				p_user_id: userId,
				p_tenant_id: tenantId
			})
		})

		it('should handle delete errors', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()

			mockSupabaseClient.rpc.mockReturnValue({
				error: { message: 'Delete failed' }
			})

			await expect(service.remove(userId, tenantId)).rejects.toThrow(
				BadRequestException
			)
			expect(service['logger'].error).toHaveBeenCalledWith(
				'Failed to delete tenant',
				{
					userId,
					tenantId,
					error: 'Delete failed'
				}
			)
		})
	})

	describe('Invitation Methods - RPC Call Patterns', () => {
		it('should send invitation via RPC', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()
			const mockResult = { success: true }

			mockSupabaseClient.rpc.mockReturnThis()
			mockSupabaseClient.single.mockReturnValue({
				data: mockResult,
				error: null
			})

			const result = await service.sendInvitation(userId, tenantId)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
				'send_tenant_invitation',
				{
					p_user_id: userId,
					p_tenant_id: tenantId
				}
			)
			expect(result).toEqual(mockResult)
		})

		it('should resend invitation via RPC', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()
			const mockResult = { success: true }

			mockSupabaseClient.rpc.mockReturnThis()
			mockSupabaseClient.single.mockReturnValue({
				data: mockResult,
				error: null
			})

			const result = await service.resendInvitation(userId, tenantId)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
				'resend_tenant_invitation',
				{
					p_user_id: userId,
					p_tenant_id: tenantId
				}
			)
			expect(result).toEqual(mockResult)
		})

		it('should handle invitation errors', async () => {
			const userId = generateUUID()
			const tenantId = generateUUID()

			mockSupabaseClient.rpc.mockReturnThis()
			mockSupabaseClient.single.mockReturnValue({
				data: null,
				error: { message: 'Invitation failed' }
			})

			await expect(service.sendInvitation(userId, tenantId)).rejects.toThrow(
				BadRequestException
			)
			await expect(service.resendInvitation(userId, tenantId)).rejects.toThrow(
				BadRequestException
			)
		})
	})
})
