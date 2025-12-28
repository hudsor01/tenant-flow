import { NotFoundException, UnauthorizedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { Database } from '@repo/shared/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import { SupabaseService } from '../../database/supabase.service'
import { TenantDetailService } from './tenant-detail.service'

type TenantRow = Database['public']['Tables']['tenants']['Row']
type TenantWithLease = Awaited<
	ReturnType<TenantDetailService['findOneWithLease']>
>

describe('TenantDetailService', () => {
	let service: TenantDetailService
	let mockSupabaseService: jest.Mocked<SupabaseService>
	let mockClient: SupabaseClient<Database>

	const mockTenantId = 'tenant-123'
	const mockAuthUserId = 'user-456'
	const mockToken = 'valid-jwt-token'

	const mockTenant = {
		id: mockTenantId,
		user_id: mockAuthUserId,
		emergency_contact_name: 'John Doe',
		emergency_contact_phone: '555-1234',
		emergency_contact_relationship: 'Parent',
		identity_verified: true,
		created_at: '2024-01-01T00:00:00Z',
		updated_at: '2024-01-01T00:00:00Z'
	} as TenantRow

	beforeEach(async () => {
		mockClient = {
			from: jest.fn()
		} as unknown as SupabaseClient<Database>

		mockSupabaseService = {
			getUserClient: jest.fn().mockReturnValue(mockClient),
			getAdminClient: jest.fn() // Should NOT be called
		} as unknown as jest.Mocked<SupabaseService>

		const module = await Test.createTestingModule({
			providers: [
				TenantDetailService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<TenantDetailService>(TenantDetailService)
	})

	describe('RLS Enforcement', () => {
		it('should use getUserClient with token, NOT getAdminClient', async () => {
			const mockBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({ data: mockTenant, error: null })
			}
			mockClient.from.mockReturnValue(mockBuilder)

			await service.findOne(mockTenantId, mockToken)

			expect(mockSupabaseService.getUserClient).toHaveBeenCalledWith(mockToken)
			expect(mockSupabaseService.getAdminClient).not.toHaveBeenCalled()
		})

		it('should throw UnauthorizedException when token is missing', async () => {
			await expect(service.findOne(mockTenantId, '')).rejects.toThrow(
				UnauthorizedException
			)
			await expect(
				service.findOne(mockTenantId, undefined as unknown as string)
			).rejects.toThrow(UnauthorizedException)
		})
	})

	describe('findOne', () => {
		it('returns tenant by ID', async () => {
			const mockBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({ data: mockTenant, error: null })
			}
			mockClient.from.mockReturnValue(mockBuilder)

			const result = await service.findOne(mockTenantId, mockToken)

			expect(result).toEqual(mockTenant)
			expect(mockClient.from).toHaveBeenCalledWith('tenants')
		})

		it('throws NotFoundException when tenant not found', async () => {
			const mockBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest
					.fn()
					.mockResolvedValue({ data: null, error: { message: 'not found' } })
			}
			mockClient.from.mockReturnValue(mockBuilder)

			await expect(service.findOne(mockTenantId, mockToken)).rejects.toThrow(
				NotFoundException
			)
		})

		it('throws error when tenant ID is missing', async () => {
			await expect(service.findOne('', mockToken)).rejects.toThrow(
				'Tenant ID required'
			)
		})
	})

	describe('findOneWithLease', () => {
		it('returns tenant with lease info', async () => {
			const mockLease = {
				id: 'lease-123',
				start_date: '2024-01-01',
				end_date: '2024-12-31',
				lease_status: 'active',
				rent_amount: 1500,
				security_deposit: 3000
			}

			// First call for findOne
			const tenantBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({ data: mockTenant, error: null })
			}

			// Second call for lease_tenants
			const leaseBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				limit: jest
					.fn()
					.mockResolvedValue({ data: [{ lease: mockLease }], error: null })
			}

			mockClient.from
				.mockReturnValueOnce(tenantBuilder)
				.mockReturnValueOnce(leaseBuilder)

			const result = await service.findOneWithLease(mockTenantId, mockToken)

			expect(result).toMatchObject({
				...mockTenant,
				lease: mockLease
			})
		})

		it('returns tenant with null lease when no lease found', async () => {
			const tenantBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({ data: mockTenant, error: null })
			}

			const leaseBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				limit: jest.fn().mockResolvedValue({ data: [], error: null })
			}

			mockClient.from
				.mockReturnValueOnce(tenantBuilder)
				.mockReturnValueOnce(leaseBuilder)

			const result = await service.findOneWithLease(mockTenantId, mockToken)

			const tenantWithLease = result as TenantWithLease
			expect(tenantWithLease.lease).toBeNull()
		})

		it('throws UnauthorizedException when token is missing', async () => {
			await expect(service.findOneWithLease(mockTenantId, '')).rejects.toThrow(
				UnauthorizedException
			)
		})
	})

	describe('getTenantByAuthUserId', () => {
		it('returns tenant by auth user ID', async () => {
			const mockBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({ data: mockTenant, error: null })
			}
			mockClient.from.mockReturnValue(mockBuilder)

			const result = await service.getTenantByAuthUserId(
				mockAuthUserId,
				mockToken
			)

			expect(result).toEqual(mockTenant)
			expect(mockBuilder.eq).toHaveBeenCalledWith('user_id', mockAuthUserId)
		})

		it('throws NotFoundException when tenant not found for auth user', async () => {
			const mockBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest
					.fn()
					.mockResolvedValue({ data: null, error: { message: 'not found' } })
			}
			mockClient.from.mockReturnValue(mockBuilder)

			await expect(
				service.getTenantByAuthUserId(mockAuthUserId, mockToken)
			).rejects.toThrow(NotFoundException)
		})

		it('throws error when auth user ID is missing', async () => {
			await expect(
				service.getTenantByAuthUserId('', mockToken)
			).rejects.toThrow('Auth user ID required')
		})

		it('throws UnauthorizedException when token is missing', async () => {
			await expect(
				service.getTenantByAuthUserId(mockAuthUserId, '')
			).rejects.toThrow(UnauthorizedException)
		})
	})

	describe('findByIds', () => {
		const mockTenant2 = {
			id: 'tenant-789',
			user_id: mockAuthUserId,
			emergency_contact_name: 'Jane Doe',
			emergency_contact_phone: '555-5678',
			emergency_contact_relationship: 'Spouse',
			identity_verified: false,
			created_at: '2024-02-01T00:00:00Z',
			updated_at: '2024-02-01T00:00:00Z'
		} as TenantRow

		it('returns Map of tenants by IDs', async () => {
			const mockBuilder = {
				select: jest.fn().mockReturnThis(),
				in: jest
					.fn()
					.mockResolvedValue({ data: [mockTenant, mockTenant2], error: null })
			}
			mockClient.from.mockReturnValue(mockBuilder)

			const result = await service.findByIds(
				[mockTenantId, 'tenant-789'],
				mockToken
			)

			expect(result).toBeInstanceOf(Map)
			expect(result.size).toBe(2)
			expect(result.get(mockTenantId)).toEqual(mockTenant)
			expect(result.get('tenant-789')).toEqual(mockTenant2)
		})

		it('returns empty Map for empty input array', async () => {
			const result = await service.findByIds([], mockToken)

			expect(result).toBeInstanceOf(Map)
			expect(result.size).toBe(0)
			expect(mockClient.from).not.toHaveBeenCalled()
		})

		it('handles partial results (some IDs not found due to RLS)', async () => {
			const mockBuilder = {
				select: jest.fn().mockReturnThis(),
				in: jest.fn().mockResolvedValue({ data: [mockTenant], error: null })
			}
			mockClient.from.mockReturnValue(mockBuilder)

			const result = await service.findByIds(
				[mockTenantId, 'non-existent-id'],
				mockToken
			)

			expect(result.size).toBe(1)
			expect(result.has(mockTenantId)).toBe(true)
			expect(result.has('non-existent-id')).toBe(false)
		})

		it('throws NotFoundException on database error', async () => {
			const mockBuilder = {
				select: jest.fn().mockReturnThis(),
				in: jest
					.fn()
					.mockResolvedValue({
						data: null,
						error: { message: 'Database error' }
					})
			}
			mockClient.from.mockReturnValue(mockBuilder)

			await expect(
				service.findByIds([mockTenantId], mockToken)
			).rejects.toThrow(NotFoundException)
		})

		it('uses user client with token for RLS enforcement', async () => {
			const mockBuilder = {
				select: jest.fn().mockReturnThis(),
				in: jest.fn().mockResolvedValue({ data: [], error: null })
			}
			mockClient.from.mockReturnValue(mockBuilder)

			await service.findByIds([mockTenantId], mockToken)

			expect(mockSupabaseService.getUserClient).toHaveBeenCalledWith(mockToken)
			expect(mockSupabaseService.getAdminClient).not.toHaveBeenCalled()
		})

		it('throws UnauthorizedException when token is missing', async () => {
			await expect(service.findByIds([mockTenantId], '')).rejects.toThrow(
				UnauthorizedException
			)
		})
	})
})
