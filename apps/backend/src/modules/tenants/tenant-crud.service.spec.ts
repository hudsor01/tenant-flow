import { Test, TestingModule } from '@nestjs/testing'
import {
	BadRequestException,
	Logger,
	NotFoundException,
	UnauthorizedException
} from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { Database } from '@repo/shared/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { TenantCrudService } from './tenant-crud.service'
import { SupabaseService } from '../../database/supabase.service'
import { TenantQueryService } from './tenant-query.service'
import { TenantDetailService } from './tenant-detail.service'
import { SseService } from '../notifications/sse/sse.service'
import type {
	CreateTenantRequest,
	UpdateTenantRequest
} from '@repo/shared/types/api-contracts'
import type { Tenant } from '@repo/shared/types/core'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

describe('TenantCrudService', () => {
	let service: TenantCrudService
	let mockSupabaseService: jest.Mocked<SupabaseService>
	let mockEventEmitter: jest.Mocked<EventEmitter2>
	let mockTenantQueryService: jest.Mocked<TenantQueryService>
	let mockTenantDetailService: jest.Mocked<TenantDetailService>
	let mockUserClient: SupabaseClient<Database>

	const mockUserId = 'user-123'
	const mockTenantId = 'tenant-456'
	const mockToken = 'valid-jwt-token'

	const createMockTenant = (overrides: Partial<Tenant> = {}): Tenant => ({
		id: mockTenantId,
		user_id: mockUserId,
		stripe_customer_id: 'cus_test123',
		date_of_birth: '1990-01-01',
		ssn_last_four: '1234',
		identity_verified: false,
		emergency_contact_name: 'John Doe',
		emergency_contact_phone: '555-1234',
		emergency_contact_relationship: 'Parent',
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		...overrides
	})

	beforeEach(async () => {
		mockUserClient = {
			from: jest.fn().mockReturnThis(),
			insert: jest.fn().mockReturnThis(),
			update: jest.fn().mockReturnThis(),
			delete: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			single: jest.fn()
		} as unknown as SupabaseClient<Database>

		mockSupabaseService = {
			getUserClient: jest.fn().mockReturnValue(mockUserClient),
			getAdminClient: jest.fn() // Should NOT be called - we'll verify this
		} as unknown as jest.Mocked<SupabaseService>

		mockEventEmitter = {
			emit: jest.fn()
		} as unknown as jest.Mocked<EventEmitter2>

		mockTenantQueryService = {
			findOne: jest.fn()
		} as unknown as jest.Mocked<TenantQueryService>

		mockTenantDetailService = {
			findByIds: jest.fn().mockResolvedValue(new Map())
		} as unknown as jest.Mocked<TenantDetailService>

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TenantCrudService,
				{
					provide: Logger,
					useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn() }
				},
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: EventEmitter2, useValue: mockEventEmitter },
				{ provide: TenantQueryService, useValue: mockTenantQueryService },
				{ provide: TenantDetailService, useValue: mockTenantDetailService },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				},
				{
					provide: SseService,
					useValue: { broadcast: jest.fn().mockResolvedValue(undefined) }
				}
			]
		}).compile()

		service = module.get<TenantCrudService>(TenantCrudService)
	})

	describe('RLS enforcement', () => {
		it('should use getUserClient with token, not getAdminClient', async () => {
			const mockCreatedTenant = createMockTenant()
			mockUserClient.single.mockResolvedValue({
				data: mockCreatedTenant,
				error: null
			})

			await service.create(
				mockUserId,
				{ stripe_customer_id: 'cus_test' },
				mockToken
			)

			expect(mockSupabaseService.getUserClient).toHaveBeenCalledWith(mockToken)
			expect(mockSupabaseService.getAdminClient).not.toHaveBeenCalled()
		})

		it('should throw UnauthorizedException when token is missing', async () => {
			await expect(
				service.create(mockUserId, { stripe_customer_id: 'cus_test' }, '')
			).rejects.toThrow(UnauthorizedException)

			await expect(
				service.create(mockUserId, { stripe_customer_id: 'cus_test' }, '')
			).rejects.toThrow('Authentication token required')
		})
	})

	describe('create', () => {
		const validCreateRequest: CreateTenantRequest = {
			stripe_customer_id: 'cus_new123',
			date_of_birth: '1990-05-15',
			ssn_last_four: '5678',
			emergency_contact_name: 'Jane Doe',
			emergency_contact_phone: '555-5678',
			emergency_contact_relationship: 'Spouse'
		}

		it('should create a tenant successfully', async () => {
			const mockCreatedTenant = createMockTenant({
				stripe_customer_id: 'cus_new123'
			})

			mockUserClient.single.mockResolvedValue({
				data: mockCreatedTenant,
				error: null
			})

			const result = await service.create(
				mockUserId,
				validCreateRequest,
				mockToken
			)

			expect(result).toEqual(mockCreatedTenant)
			expect(mockUserClient.from).toHaveBeenCalledWith('tenants')
			expect(mockUserClient.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					user_id: mockUserId,
					stripe_customer_id: 'cus_new123',
					date_of_birth: '1990-05-15',
					ssn_last_four: '5678'
				})
			)
			expect(mockEventEmitter.emit).toHaveBeenCalledWith(
				'tenant.created',
				expect.any(Object)
			)
		})

		it('should throw BadRequestException when user_id is missing', async () => {
			await expect(
				service.create('', validCreateRequest, mockToken)
			).rejects.toThrow(BadRequestException)
			await expect(
				service.create('', validCreateRequest, mockToken)
			).rejects.toThrow(
				'Authentication required - user ID missing from session'
			)
		})

		it('should throw BadRequestException when stripe_customer_id is missing', async () => {
			const invalidRequest = { ...validCreateRequest, stripe_customer_id: '' }

			await expect(
				service.create(mockUserId, invalidRequest, mockToken)
			).rejects.toThrow(BadRequestException)
			await expect(
				service.create(mockUserId, invalidRequest, mockToken)
			).rejects.toThrow('Stripe customer ID is required')
		})

		it('should throw BadRequestException when stripe_customer_id is whitespace only', async () => {
			const invalidRequest = {
				...validCreateRequest,
				stripe_customer_id: '   '
			}

			await expect(
				service.create(mockUserId, invalidRequest, mockToken)
			).rejects.toThrow(BadRequestException)
		})

		it('should throw BadRequestException on database error', async () => {
			mockUserClient.single.mockResolvedValue({
				data: null,
				error: { message: 'Database error' }
			})

			await expect(
				service.create(mockUserId, validCreateRequest, mockToken)
			).rejects.toThrow(BadRequestException)
		})

		it('should handle optional fields being undefined', async () => {
			const minimalRequest: CreateTenantRequest = {
				stripe_customer_id: 'cus_minimal'
			}

			const mockCreatedTenant = createMockTenant({
				stripe_customer_id: 'cus_minimal',
				date_of_birth: null,
				ssn_last_four: null
			})

			mockUserClient.single.mockResolvedValue({
				data: mockCreatedTenant,
				error: null
			})

			const result = await service.create(mockUserId, minimalRequest, mockToken)

			expect(result).toEqual(mockCreatedTenant)
			expect(mockUserClient.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					date_of_birth: null,
					ssn_last_four: null,
					emergency_contact_name: null
				})
			)
		})

		it('should trim stripe_customer_id whitespace', async () => {
			const requestWithWhitespace: CreateTenantRequest = {
				stripe_customer_id: '  cus_trimmed  '
			}

			mockUserClient.single.mockResolvedValue({
				data: createMockTenant(),
				error: null
			})

			await service.create(mockUserId, requestWithWhitespace, mockToken)

			expect(mockUserClient.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					stripe_customer_id: 'cus_trimmed'
				})
			)
		})
	})

	describe('update', () => {
		const validUpdateRequest: UpdateTenantRequest = {
			emergency_contact_name: 'Updated Contact',
			emergency_contact_phone: '555-9999'
		}

		it('should update a tenant successfully', async () => {
			const existingTenant = createMockTenant()
			const updatedTenant = createMockTenant({
				emergency_contact_name: 'Updated Contact',
				emergency_contact_phone: '555-9999'
			})

			mockTenantQueryService.findOne.mockResolvedValue(existingTenant)
			mockUserClient.single.mockResolvedValue({
				data: updatedTenant,
				error: null
			})

			const result = await service.update(
				mockUserId,
				mockTenantId,
				validUpdateRequest,
				mockToken
			)

			expect(result).toEqual(updatedTenant)
			expect(mockTenantQueryService.findOne).toHaveBeenCalledWith(
				mockTenantId,
				mockToken
			)
			expect(mockUserClient.update).toHaveBeenCalledWith(
				expect.objectContaining({
					emergency_contact_name: 'Updated Contact',
					emergency_contact_phone: '555-9999'
				})
			)
		})

		it('should throw BadRequestException when user_id is missing', async () => {
			await expect(
				service.update('', mockTenantId, validUpdateRequest, mockToken)
			).rejects.toThrow(BadRequestException)
		})

		it('should throw BadRequestException when tenant_id is missing', async () => {
			await expect(
				service.update(mockUserId, '', validUpdateRequest, mockToken)
			).rejects.toThrow(BadRequestException)
		})

		it('should throw NotFoundException when tenant does not exist', async () => {
			mockTenantQueryService.findOne.mockResolvedValue(null)

			await expect(
				service.update(mockUserId, mockTenantId, validUpdateRequest, mockToken)
			).rejects.toThrow(NotFoundException)
		})

		it('should throw BadRequestException when tenant does not belong to user', async () => {
			const tenantOwnedByAnotherUser = createMockTenant({
				user_id: 'other-user'
			})
			mockTenantQueryService.findOne.mockResolvedValue(tenantOwnedByAnotherUser)

			await expect(
				service.update(mockUserId, mockTenantId, validUpdateRequest, mockToken)
			).rejects.toThrow(BadRequestException)
			await expect(
				service.update(mockUserId, mockTenantId, validUpdateRequest, mockToken)
			).rejects.toThrow('Tenant does not belong to user')
		})

		it('should throw BadRequestException on database error', async () => {
			mockTenantQueryService.findOne.mockResolvedValue(createMockTenant())
			mockUserClient.single.mockResolvedValue({
				data: null,
				error: { message: 'Update failed' }
			})

			await expect(
				service.update(mockUserId, mockTenantId, validUpdateRequest, mockToken)
			).rejects.toThrow(BadRequestException)
		})

		it('should only update provided fields', async () => {
			const existingTenant = createMockTenant()
			mockTenantQueryService.findOne.mockResolvedValue(existingTenant)
			mockUserClient.single.mockResolvedValue({
				data: existingTenant,
				error: null
			})

			const partialUpdate: UpdateTenantRequest = {
				date_of_birth: '1995-01-01'
			}

			await service.update(mockUserId, mockTenantId, partialUpdate, mockToken)

			// Should only have date_of_birth in the update call
			expect(mockUserClient.update).toHaveBeenCalledWith({
				date_of_birth: '1995-01-01'
			})
		})

		it('should allow setting fields to null via empty string', async () => {
			const existingTenant = createMockTenant()
			mockTenantQueryService.findOne.mockResolvedValue(existingTenant)
			mockUserClient.single.mockResolvedValue({
				data: existingTenant,
				error: null
			})

			const clearFieldsUpdate: UpdateTenantRequest = {
				emergency_contact_name: '',
				emergency_contact_phone: ''
			}

			await service.update(
				mockUserId,
				mockTenantId,
				clearFieldsUpdate,
				mockToken
			)

			expect(mockUserClient.update).toHaveBeenCalledWith({
				emergency_contact_name: null,
				emergency_contact_phone: null
			})
		})
	})

	describe('softDelete', () => {
		it('should soft delete (archive) a tenant successfully', async () => {
			const existingTenant = createMockTenant()
			mockTenantQueryService.findOne.mockResolvedValue(existingTenant)

			const result = await service.softDelete(
				mockUserId,
				mockTenantId,
				mockToken
			)

			expect(result).toEqual(existingTenant)
			expect(mockTenantQueryService.findOne).toHaveBeenCalledWith(
				mockTenantId,
				mockToken
			)
		})

		it('should throw NotFoundException when tenant does not exist', async () => {
			mockTenantQueryService.findOne.mockResolvedValue(null)

			await expect(
				service.softDelete(mockUserId, mockTenantId, mockToken)
			).rejects.toThrow(NotFoundException)
		})

		it('should throw BadRequestException when tenant does not belong to user', async () => {
			const tenantOwnedByAnotherUser = createMockTenant({
				user_id: 'other-user'
			})
			mockTenantQueryService.findOne.mockResolvedValue(tenantOwnedByAnotherUser)

			await expect(
				service.softDelete(mockUserId, mockTenantId, mockToken)
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('hardDelete', () => {
		it('should hard delete a tenant older than 7 years', async () => {
			// Create tenant that's 8 years old
			const eightYearsAgo = new Date()
			eightYearsAgo.setFullYear(eightYearsAgo.getFullYear() - 8)

			const oldTenant = createMockTenant({
				created_at: eightYearsAgo.toISOString()
			})

			mockTenantQueryService.findOne.mockResolvedValue(oldTenant)
			mockUserClient.eq.mockResolvedValue({ error: null })

			const result = await service.hardDelete(
				mockUserId,
				mockTenantId,
				mockToken
			)

			expect(result).toEqual({
				success: true,
				message: `Tenant ${mockTenantId} permanently deleted`
			})
			expect(mockUserClient.delete).toHaveBeenCalled()
		})

		it('should throw BadRequestException for tenant younger than 7 years', async () => {
			// Create tenant that's 2 years old
			const twoYearsAgo = new Date()
			twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

			const youngTenant = createMockTenant({
				created_at: twoYearsAgo.toISOString()
			})

			mockTenantQueryService.findOne.mockResolvedValue(youngTenant)

			await expect(
				service.hardDelete(mockUserId, mockTenantId, mockToken)
			).rejects.toThrow(BadRequestException)
			await expect(
				service.hardDelete(mockUserId, mockTenantId, mockToken)
			).rejects.toThrow(/Tenant must be at least 7 years old/)
		})

		it('should throw NotFoundException when tenant does not exist', async () => {
			mockTenantQueryService.findOne.mockResolvedValue(null)

			await expect(
				service.hardDelete(mockUserId, mockTenantId, mockToken)
			).rejects.toThrow(NotFoundException)
		})

		it('should throw BadRequestException when tenant does not belong to user', async () => {
			const eightYearsAgo = new Date()
			eightYearsAgo.setFullYear(eightYearsAgo.getFullYear() - 8)

			const tenantOwnedByAnotherUser = createMockTenant({
				user_id: 'other-user',
				created_at: eightYearsAgo.toISOString()
			})
			mockTenantQueryService.findOne.mockResolvedValue(tenantOwnedByAnotherUser)

			await expect(
				service.hardDelete(mockUserId, mockTenantId, mockToken)
			).rejects.toThrow(BadRequestException)
		})

		it('should throw BadRequestException on database delete error', async () => {
			const eightYearsAgo = new Date()
			eightYearsAgo.setFullYear(eightYearsAgo.getFullYear() - 8)

			const oldTenant = createMockTenant({
				created_at: eightYearsAgo.toISOString()
			})

			mockTenantQueryService.findOne.mockResolvedValue(oldTenant)
			mockUserClient.eq.mockResolvedValue({
				error: { message: 'Delete failed' }
			})

			await expect(
				service.hardDelete(mockUserId, mockTenantId, mockToken)
			).rejects.toThrow(BadRequestException)
		})

		it('should handle tenant with null created_at (uses current date)', async () => {
			const tenantWithNullCreatedAt = createMockTenant({
				created_at: null as unknown as string
			})

			mockTenantQueryService.findOne.mockResolvedValue(tenantWithNullCreatedAt)

			// Should fail because null created_at defaults to current date (0 years old)
			await expect(
				service.hardDelete(mockUserId, mockTenantId, mockToken)
			).rejects.toThrow(/Tenant must be at least 7 years old/)
		})
	})
})
