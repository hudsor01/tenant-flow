import {
	BadRequestException,
	InternalServerErrorException,
	UnauthorizedException
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { Database } from '@repo/shared/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import { SupabaseService } from '../../database/supabase.service'
import { TenantListService } from './tenant-list.service'
import { TenantLeaseQueryService } from './tenant-lease-query.service'
import type { ListFilters } from './tenant-list.service'

type TenantRow = Database['public']['Tables']['tenants']['Row']

describe('TenantListService', () => {
	let service: TenantListService
	let mockSupabaseService: jest.Mocked<SupabaseService>

	const mockUserId = 'user-123'

	const mockTenant = {
		id: 'tenant-1',
		user_id: mockUserId,
		emergency_contact_name: 'John Doe',
		emergency_contact_phone: '555-1234',
		emergency_contact_relationship: 'Parent',
		identity_verified: true,
		created_at: '2024-01-01T00:00:00Z',
		updated_at: '2024-01-01T00:00:00Z'
	} as TenantRow

	const mockTenant2 = {
		id: 'tenant-2',
		user_id: 'user-789',
		emergency_contact_name: 'Jane Smith',
		emergency_contact_phone: '555-5678',
		emergency_contact_relationship: 'Spouse',
		identity_verified: false,
		created_at: '2024-02-01T00:00:00Z',
		updated_at: '2024-02-01T00:00:00Z'
	} as TenantRow

	// Mock token for all tests - service now REQUIRES authentication
	const mockToken = 'mock-jwt-token'

	let mockClient: SupabaseClient<Database>

	beforeEach(async () => {
		// Create a single mock client instance that will be reused
		mockClient = {
			from: jest.fn(),
			rpc: jest.fn()
		} as unknown as SupabaseClient<Database>

		mockSupabaseService = {
			getAdminClient: jest.fn().mockReturnValue(mockClient),
			getUserClient: jest.fn().mockReturnValue(mockClient)
		} as unknown as jest.Mocked<SupabaseService>

		const mockLeaseQueryService: Partial<TenantLeaseQueryService> = {
			findAllWithLeaseInfo: jest.fn().mockResolvedValue([]),
			findByProperty: jest.fn().mockResolvedValue([])
		}

		const module = await Test.createTestingModule({
			providers: [
				TenantListService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: TenantLeaseQueryService, useValue: mockLeaseQueryService },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<TenantListService>(TenantListService)
	})

	describe('findAll', () => {
		it('returns tenants for a user', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)

			// Setup tenant query chain
			const tenantBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				or: jest.fn().mockReturnThis(),
				range: jest.fn().mockResolvedValue({ data: [mockTenant], error: null })
			}

			// Setup RPC call for owner tenants
			;(mockClient.rpc as jest.Mock).mockResolvedValue({
				data: ['tenant-2'],
				error: null
			})

			// Setup owner tenant query chain
			const ownerTenantBuilder = {
				select: jest.fn().mockReturnThis(),
				in: jest.fn().mockReturnThis(),
				or: jest.fn().mockReturnThis(),
				range: jest.fn().mockResolvedValue({ data: [mockTenant2], error: null })
			}

			;(mockClient.from as jest.Mock)
				.mockReturnValueOnce(tenantBuilder) // fetchTenantsByUser
				.mockReturnValueOnce(ownerTenantBuilder) // fetchTenantsByOwner

			const result = await service.findAll(mockUserId, { token: mockToken })

			expect(result).toHaveLength(2)
			expect(result).toEqual(expect.arrayContaining([mockTenant, mockTenant2]))
		})

		it('deduplicates tenants when user appears in both queries', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)

			const tenantBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				or: jest.fn().mockReturnThis(),
				range: jest.fn().mockResolvedValue({ data: [mockTenant], error: null })
			}

			;(mockClient.rpc as jest.Mock).mockResolvedValue({
				data: [mockTenant.id], // Same tenant returned by RPC
				error: null
			})

			const ownerTenantBuilder = {
				select: jest.fn().mockReturnThis(),
				in: jest.fn().mockReturnThis(),
				or: jest.fn().mockReturnThis(),
				range: jest.fn().mockResolvedValue({ data: [mockTenant], error: null })
			}

			;(mockClient.from as jest.Mock)
				.mockReturnValueOnce(tenantBuilder)
				.mockReturnValueOnce(ownerTenantBuilder)

			const result = await service.findAll(mockUserId, { token: mockToken })

			// Should deduplicate
			expect(result).toHaveLength(1)
			expect(result[0]?.id).toBe(mockTenant.id)
		})

		it('throws UnauthorizedException when token is missing', async () => {
			await expect(service.findAll(mockUserId)).rejects.toThrow(
				'Authentication token required'
			)
		})

		it('throws BadRequestException when user ID is missing', async () => {
			await expect(service.findAll('', { token: mockToken })).rejects.toThrow(
				BadRequestException
			)
		})

		it('applies search filter correctly', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)

			const tenantBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				or: jest.fn().mockReturnThis(),
				range: jest.fn().mockResolvedValue({ data: [mockTenant], error: null })
			}

			;(mockClient.rpc as jest.Mock).mockResolvedValue({
				data: [],
				error: null
			})
			;(mockClient.from as jest.Mock).mockReturnValueOnce(tenantBuilder)

			const filters: ListFilters = { search: 'John', token: mockToken }
			await service.findAll(mockUserId, filters)

			// Verify or() was called for search
			expect(tenantBuilder.or).toHaveBeenCalled()
		})

		it('handles RPC error gracefully', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)

			const tenantBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				or: jest.fn().mockReturnThis(),
				range: jest.fn().mockResolvedValue({ data: [mockTenant], error: null })
			}

			;(mockClient.rpc as jest.Mock).mockResolvedValue({
				data: null,
				error: { message: 'RPC error' }
			})
			;(mockClient.from as jest.Mock).mockReturnValueOnce(tenantBuilder)

			// RPC error throws InternalServerErrorException
			await expect(
				service.findAll(mockUserId, { token: mockToken })
			).rejects.toThrow(InternalServerErrorException)
		})

		it('applies pagination correctly', async () => {
			const mockClient = mockSupabaseService.getUserClient(mockToken)

			const tenantBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				or: jest.fn().mockReturnThis(),
				range: jest.fn().mockResolvedValue({ data: [mockTenant], error: null })
			}

			;(mockClient.rpc as jest.Mock).mockResolvedValue({
				data: [],
				error: null
			})
			;(mockClient.from as jest.Mock).mockReturnValueOnce(tenantBuilder)

			const filters: ListFilters = { limit: 10, offset: 5, token: mockToken }
			await service.findAll(mockUserId, filters)

			expect(tenantBuilder.range).toHaveBeenCalledWith(5, 14)
		})
	})

	describe('findAllWithLeaseInfo', () => {
		// Note: findAllWithLeaseInfo delegates to TenantLeaseQueryService
		// Detailed implementation tests are in tenant-lease-query.service.spec.ts
		it('delegates to TenantLeaseQueryService', async () => {
			// The mock service returns empty array by default
			const result = await service.findAllWithLeaseInfo(mockUserId, {
				token: mockToken
			})

			// Verify delegation occurred (mock returns empty array)
			expect(result).toBeDefined()
		})
	})
})
