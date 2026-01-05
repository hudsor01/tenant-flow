import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { LeasesService } from './leases.service'
import { LeaseQueryService } from './lease-query.service'
import { SupabaseService } from '../../database/supabase.service'
import { EmailService } from '../email/email.service'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { RedisCacheService } from '../../cache/cache.service'
import type { Lease } from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CreateLeaseDto, UpdateLeaseDto } from './dto'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

describe('LeasesService', () => {
	let service: LeasesService
	let mockUserClient: SupabaseClient<Database>
	let mockSupabaseService: jest.Mocked<SupabaseService>
	let mockLeaseQueryService: jest.Mocked<LeaseQueryService>

	const mockToken = 'mock-jwt-token'

	const createMockLease = (overrides: Partial<Lease> = {}): Lease => ({
		id: 'lease-123',
		unit_id: 'unit-456',
		primary_tenant_id: 'tenant-789',
		start_date: '2025-01-01',
		end_date: '2026-01-01',
		rent_amount: 150000, // $1500 in cents
		security_deposit: 150000,
		lease_status: 'active',
		payment_day: 1,
		rent_currency: 'USD',
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		...overrides
	})

	beforeEach(async () => {
		// Create a flexible mock client
		mockUserClient = {
			from: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			insert: jest.fn().mockReturnThis(),
			update: jest.fn().mockReturnThis(),
			delete: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			neq: jest.fn().mockReturnThis(),
			not: jest.fn().mockReturnThis(),
			gte: jest.fn().mockReturnThis(),
			lte: jest.fn().mockReturnThis(),
			or: jest.fn().mockReturnThis(),
			order: jest.fn().mockReturnThis(),
			range: jest.fn().mockReturnThis(),
			single: jest.fn(),
			maybeSingle: jest.fn(),
			rpc: jest.fn().mockResolvedValue({ data: true, error: null })
		} as unknown as SupabaseClient<Database>

		mockSupabaseService = {
			getUserClient: jest.fn().mockReturnValue(mockUserClient),
			getAdminClient: jest.fn().mockReturnValue(mockUserClient)
		} as jest.Mocked<SupabaseService>

		const mockEmailService = {
			sendPaymentSuccessEmail: jest.fn(),
			sendPaymentFailedEmail: jest.fn(),
			sendSubscriptionCanceledEmail: jest.fn()
		}

		const mockCacheService = {
			get: jest.fn(),
			set: jest.fn(),
			invalidate: jest.fn().mockReturnValue(0),
			invalidateByEntity: jest.fn().mockReturnValue(0),
			invalidateByUser: jest.fn().mockReturnValue(0)
		}

		mockLeaseQueryService = {
			findOne: jest.fn(),
			findAll: jest.fn(),
			getLeaseDataForPdf: jest.fn()
		} as jest.Mocked<LeaseQueryService>

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				LeasesService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: LeaseQueryService, useValue: mockLeaseQueryService },
				{ provide: RedisCacheService, useValue: mockCacheService },
				{ provide: EmailService, useValue: mockEmailService },
				EventEmitter2,
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		service = module.get<LeasesService>(LeasesService)
	})

	it('should be defined', () => {
		expect(service).toBeDefined()
	})

	describe('create', () => {
		const validCreateDto: CreateLeaseDto = {
			unit_id: 'unit-456',
			primary_tenant_id: 'tenant-789',
			start_date: '2025-01-01',
			end_date: '2026-01-01',
			rent_amount: 150000,
			security_deposit: 150000,
			lease_status: 'draft' as const
		}

		it('should create a lease successfully', async () => {
			const mockLease = createMockLease()

			// Mock unit lookup
			mockUserClient.from.mockImplementation((table: string) => {
				if (table === 'units') {
					return {
						select: jest.fn().mockReturnThis(),
						eq: jest.fn().mockReturnValue({
							single: jest.fn().mockResolvedValue({
								data: {
									id: 'unit-456',
									property_id: 'prop-123',
									property: {
										name: 'Test Property',
										owner_user_id: 'owner-123'
									}
								},
								error: null
							})
						})
					}
				}
				if (table === 'tenants') {
					return {
						select: jest.fn().mockReturnThis(),
						eq: jest.fn().mockReturnValue({
							single: jest.fn().mockResolvedValue({
								data: {
									id: 'tenant-789',
									user_id: 'user-123',
									user: {
										first_name: 'John',
										last_name: 'Doe',
										email: 'john@example.com'
									}
								},
								error: null
							})
						})
					}
				}
				if (table === 'tenant_invitations') {
					const invitationChain = {
						select: jest.fn().mockReturnThis(),
						eq: jest.fn().mockReturnThis(),
						not: jest.fn().mockReturnValue({
							maybeSingle: jest.fn().mockResolvedValue({
								data: { id: 'invitation-123' },
								error: null
							})
						})
					}
					// Make eq() return the chain object so .not() is available
					invitationChain.eq = jest.fn().mockReturnValue(invitationChain)
					invitationChain.select = jest.fn().mockReturnValue(invitationChain)
					return invitationChain
				}
				if (table === 'leases') {
					// Mock for checking existing lease (duplicate check)
					const existingLeaseChain = {
						eq: jest.fn().mockReturnThis(),
						not: jest.fn().mockReturnThis(),
						maybeSingle: jest.fn().mockResolvedValue({
							data: null, // No existing lease by default
							error: null
						})
					}

					return {
						select: jest.fn().mockReturnValue(existingLeaseChain),
						insert: jest.fn().mockReturnValue({
							select: jest.fn().mockReturnValue({
								single: jest.fn().mockResolvedValue({
									data: mockLease,
									error: null
								})
							})
						})
					}
				}
				return mockUserClient
			})

			const result = await service.create(mockToken, validCreateDto)

			expect(result).toEqual(mockLease)
		})

		it('should throw BadRequestException when token is missing', async () => {
			await expect(service.create('', validCreateDto)).rejects.toThrow(
				BadRequestException
			)
		})

		it('should throw BadRequestException when unit_id is missing', async () => {
			const invalidDto = { ...validCreateDto, unit_id: '' }

			await expect(service.create(mockToken, invalidDto)).rejects.toThrow(
				BadRequestException
			)
		})

		it('should throw BadRequestException when primary_tenant_id is missing', async () => {
			const invalidDto = { ...validCreateDto, primary_tenant_id: '' }

			await expect(service.create(mockToken, invalidDto)).rejects.toThrow(
				BadRequestException
			)
		})

		it('should throw BadRequestException when unit not found', async () => {
			mockUserClient.from.mockImplementation((table: string) => {
				if (table === 'units') {
					return {
						select: jest.fn().mockReturnThis(),
						eq: jest.fn().mockReturnValue({
							single: jest.fn().mockResolvedValue({
								data: null,
								error: null
							})
						})
					}
				}
				return mockUserClient
			})

			await expect(service.create(mockToken, validCreateDto)).rejects.toThrow(
				BadRequestException
			)
		})

		it('should throw BadRequestException when tenant not found (via RPC)', async () => {
			// Tenant validation is handled by the assert_can_create_lease RPC
			mockUserClient.rpc.mockResolvedValue({
				data: null,
				error: { message: 'Tenant not found' }
			})

			await expect(service.create(mockToken, validCreateDto)).rejects.toThrow(
				BadRequestException
			)
		})

		it('should throw BadRequestException when tenant is not invited to property', async () => {
			mockUserClient.rpc.mockResolvedValue({
				data: null,
				error: {
					message:
						'Cannot create lease: John Doe has not been invited to Test Property. Please send an invitation first.'
				}
			})

			// Mock unit lookup - succeeds
			// Mock tenant lookup - succeeds
			mockUserClient.from.mockImplementation((table: string) => {
				if (table === 'units') {
					return {
						select: jest.fn().mockReturnThis(),
						eq: jest.fn().mockReturnValue({
							single: jest.fn().mockResolvedValue({
								data: {
									id: 'unit-456',
									property_id: 'prop-123',
									property: { name: 'Test Property' }
								},
								error: null
							})
						})
					}
				}
				if (table === 'tenants') {
					return {
						select: jest.fn().mockReturnThis(),
						eq: jest.fn().mockReturnValue({
							single: jest.fn().mockResolvedValue({
								data: {
									id: 'tenant-789',
									user_id: 'user-123',
									user: {
										first_name: 'John',
										last_name: 'Doe',
										email: 'john@example.com'
									}
								},
								error: null
							})
						})
					}
				}
				return mockUserClient
			})

			await expect(service.create(mockToken, validCreateDto)).rejects.toThrow(
				new BadRequestException(
					'Cannot create lease: John Doe has not been invited to Test Property. Please send an invitation first.'
				)
			)
		})

		it('should throw BadRequestException on database insert error', async () => {
			mockUserClient.from.mockImplementation((table: string) => {
				if (table === 'units') {
					return {
						select: jest.fn().mockReturnThis(),
						eq: jest.fn().mockReturnValue({
							single: jest.fn().mockResolvedValue({
								data: { id: 'unit-456', property_id: 'prop-123', property: { owner_user_id: 'owner-123' } },
								error: null
							})
						})
					}
				}
				if (table === 'leases') {
					// First call is race condition check (maybeSingle), second is insert
					const insertMock = jest.fn().mockReturnValue({
						select: jest.fn().mockReturnValue({
							single: jest.fn().mockResolvedValue({
								data: null,
								error: { message: 'Insert failed' }
							})
						})
					})
					return {
						select: jest.fn().mockReturnThis(),
						eq: jest.fn().mockReturnThis(),
						not: jest.fn().mockReturnValue({
							maybeSingle: jest.fn().mockResolvedValue({
								data: null,
								error: null
							})
						}),
						insert: insertMock
					}
				}
				return mockUserClient
			})

			await expect(service.create(mockToken, validCreateDto)).rejects.toThrow(
				BadRequestException
			)
		})
	})

	describe('update', () => {
		const validUpdateDto = {
			rent_amount: 175000,
			lease_status: 'active' as const
		}

		it('should update a lease successfully', async () => {
			const updatedLease = createMockLease({ rent_amount: 175000 })

			// RLS automatically verifies ownership - no findOne needed
			mockUserClient.from.mockImplementation(() => ({
				update: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnValue({
					select: jest.fn().mockReturnValue({
						single: jest.fn().mockResolvedValue({
							data: updatedLease,
							error: null
						})
					})
				})
			}))

			const result = await service.update(
				mockToken,
				'lease-123',
				validUpdateDto
			)

			expect(result.rent_amount).toBe(175000)
		})

		// FAIL FAST: Missing token should throw immediately, not return null
		it('should throw BadRequestException when token is missing', async () => {
			await expect(
				service.update('', 'lease-123', validUpdateDto)
			).rejects.toThrow(BadRequestException)
		})

		// FAIL FAST: Missing lease_id should throw immediately, not return null
		it('should throw BadRequestException when lease_id is missing', async () => {
			await expect(
				service.update(mockToken, '', validUpdateDto)
			).rejects.toThrow(BadRequestException)
		})

		// Lease not found should throw NotFoundException (via RLS returning no rows)
		it('should throw NotFoundException when lease not found', async () => {
			mockUserClient.from.mockImplementation(() => ({
				update: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnValue({
					select: jest.fn().mockReturnValue({
						single: jest.fn().mockResolvedValue({
							data: null,
							error: { code: 'PGRST116' }
						})
					})
				})
			}))

			await expect(
				service.update(mockToken, 'nonexistent', validUpdateDto)
			).rejects.toThrow(NotFoundException)
		})

		it('should throw BadRequestException on database update error', async () => {
			// Return data but with a different error (not PGRST116)
			mockUserClient.from.mockImplementation(() => ({
				update: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnValue({
					select: jest.fn().mockReturnValue({
						single: jest.fn().mockResolvedValue({
							data: createMockLease(),
							error: { message: 'Update failed', code: 'PGRST999' }
						})
					})
				})
			}))

			await expect(
				service.update(mockToken, 'lease-123', validUpdateDto)
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('remove', () => {
		it('should delete a lease successfully', async () => {
			const existingLease = createMockLease()

			// Mock the select query to check if lease exists
			const selectChain = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: existingLease,
					error: null
				})
			}

			// Mock the delete query
			const deleteChain = {
				delete: jest.fn().mockReturnThis(),
				eq: jest.fn().mockResolvedValue({
					error: null
				})
			}

			let callCount = 0
			mockUserClient.from = jest.fn().mockImplementation(() => {
				callCount++
				// First call is for select (existence check), second is for delete
				return callCount === 1 ? selectChain : deleteChain
			})

			// remove() returns void on success
			await expect(
				service.remove(mockToken, 'lease-123')
			).resolves.toBeUndefined()
		})

		it('should throw BadRequestException when token is missing', async () => {
			await expect(service.remove('', 'lease-123')).rejects.toThrow(
				BadRequestException
			)
		})

		it('should throw BadRequestException when lease_id is missing', async () => {
			await expect(service.remove(mockToken, '')).rejects.toThrow(
				BadRequestException
			)
		})

		// Lease not found should throw NotFoundException (via select check)
		it('should throw NotFoundException when lease not found', async () => {
			// Mock select query returning no data (lease doesn't exist)
			const selectChain = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: null,
					error: { code: 'PGRST116' }
				})
			}

			mockUserClient.from = jest.fn().mockReturnValue(selectChain)

			await expect(service.remove(mockToken, 'nonexistent')).rejects.toThrow(
				NotFoundException
			)
		})

		it('should throw BadRequestException on database delete error', async () => {
			const existingLease = createMockLease()

			// Mock the select query to check if lease exists (success)
			const selectChain = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: existingLease,
					error: null
				})
			}

			// Mock the delete query to fail
			const deleteChain = {
				delete: jest.fn().mockReturnThis(),
				eq: jest.fn().mockResolvedValue({
					error: { message: 'Database error' }
				})
			}

			let callCount = 0
			mockUserClient.from = jest.fn().mockImplementation(() => {
				callCount++
				return callCount === 1 ? selectChain : deleteChain
			})

			await expect(service.remove(mockToken, 'lease-123')).rejects.toThrow(
				BadRequestException
			)
		})
	})
})
