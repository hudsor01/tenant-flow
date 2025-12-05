import { BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import { SupabaseService } from '../../database/supabase.service'
import { TenantListService } from './tenant-list.service'
import type { ListFilters } from './tenant-list.service'

describe('TenantListService', () => {
	let service: TenantListService
	let mockSupabaseService: jest.Mocked<SupabaseService>

	const mockUserId = 'user-123'
	const mockOwnerId = 'owner-456'

	const mockTenant = {
		id: 'tenant-1',
		user_id: mockUserId,
		emergency_contact_name: 'John Doe',
		emergency_contact_phone: '555-1234',
		emergency_contact_relationship: 'Parent',
		identity_verified: true,
		created_at: '2024-01-01T00:00:00Z',
		updated_at: '2024-01-01T00:00:00Z'
	}

	const mockTenant2 = {
		id: 'tenant-2',
		user_id: 'user-789',
		emergency_contact_name: 'Jane Smith',
		emergency_contact_phone: '555-5678',
		emergency_contact_relationship: 'Spouse',
		identity_verified: false,
		created_at: '2024-02-01T00:00:00Z',
		updated_at: '2024-02-01T00:00:00Z'
	}

	beforeEach(async () => {
		const mockAdminClient = {
			from: jest.fn(),
			rpc: jest.fn()
		}

		mockSupabaseService = {
			getAdminClient: jest.fn().mockReturnValue(mockAdminClient)
		} as unknown as jest.Mocked<SupabaseService>

		const module = await Test.createTestingModule({
			providers: [
				TenantListService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
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
			const mockClient = mockSupabaseService.getAdminClient()

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

			const result = await service.findAll(mockUserId)

			expect(result).toHaveLength(2)
			expect(result).toEqual(expect.arrayContaining([mockTenant, mockTenant2]))
		})

		it('deduplicates tenants when user appears in both queries', async () => {
			const mockClient = mockSupabaseService.getAdminClient()

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

			const result = await service.findAll(mockUserId)

			// Should deduplicate
			expect(result).toHaveLength(1)
			expect(result[0]?.id).toBe(mockTenant.id)
		})

		it('throws BadRequestException when user ID is missing', async () => {
			await expect(service.findAll('')).rejects.toThrow(BadRequestException)
		})

		it('applies search filter correctly', async () => {
			const mockClient = mockSupabaseService.getAdminClient()

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

			const filters: ListFilters = { search: 'John' }
			await service.findAll(mockUserId, filters)

			// Verify or() was called for search
			expect(tenantBuilder.or).toHaveBeenCalled()
		})

		it('handles RPC error gracefully', async () => {
			const mockClient = mockSupabaseService.getAdminClient()

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
			await expect(service.findAll(mockUserId)).rejects.toThrow(
				InternalServerErrorException
			)
		})

		it('applies pagination correctly', async () => {
			const mockClient = mockSupabaseService.getAdminClient()

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

			const filters: ListFilters = { limit: 10, offset: 5 }
			await service.findAll(mockUserId, filters)

			expect(tenantBuilder.range).toHaveBeenCalledWith(5, 14)
		})
	})

	describe('findAllWithLeaseInfo', () => {
		it('returns tenants with lease information (user is not owner)', async () => {
			const mockClient = mockSupabaseService.getAdminClient()

			// Mock property_owners query - user is NOT an owner
			const ownerBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({
					data: null, // User is not a property owner
					error: null
				})
			}

			// Mock tenants by user query (with lease_tenants)
			const mockTenantWithLease = {
				...mockTenant,
				lease_tenants: [
					{
						tenant_id: mockTenant.id,
						lease_id: 'lease-1',
						lease: {
							id: 'lease-1',
							start_date: '2024-01-01',
							end_date: '2024-12-31',
							lease_status: 'active',
							rent_amount: 1500,
							security_deposit: 3000,
							unit: {
								id: 'unit-1',
								unit_number: '101',
								bedrooms: 2,
								bathrooms: 1,
								square_feet: 900,
								property: {
									id: 'prop-1',
									name: 'Test Property',
									address_line1: '123 Main St',
									address_line2: null,
									city: 'Testville',
									state: 'TX',
									postal_code: '12345'
								}
							}
						}
					}
				]
			}

			const tenantByUserBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				or: jest.fn().mockReturnThis(),
				range: jest.fn().mockResolvedValue({
					data: [mockTenantWithLease],
					error: null
				})
			}

			;(mockClient.from as jest.Mock)
				.mockReturnValueOnce(ownerBuilder) // property_owners check
				.mockReturnValueOnce(tenantByUserBuilder) // tenants by user

			const result = await service.findAllWithLeaseInfo(mockUserId)

			expect(result).toHaveLength(1)
			expect(result[0]?.id).toBe(mockTenant.id)
			expect((result[0] as any)?.lease).toBeDefined()
			expect((result[0] as any)?.lease?.id).toBe('lease-1')
		})

		it('throws BadRequestException when user ID is missing', async () => {
			await expect(service.findAllWithLeaseInfo('')).rejects.toThrow(
				BadRequestException
			)
		})

		it('returns empty array when no tenants found', async () => {
			const mockClient = mockSupabaseService.getAdminClient()

			const ownerBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
			}

			const tenantByUserBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				or: jest.fn().mockReturnThis(),
				range: jest.fn().mockResolvedValue({ data: [], error: null })
			}

			;(mockClient.from as jest.Mock)
				.mockReturnValueOnce(ownerBuilder)
				.mockReturnValueOnce(tenantByUserBuilder)

			const result = await service.findAllWithLeaseInfo(mockUserId)

			expect(result).toEqual([])
		})

		it('deduplicates tenants from both user and owner queries', async () => {
			const mockClient = mockSupabaseService.getAdminClient()

			const ownerBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({
					data: { id: mockOwnerId },
					error: null
				})
			}

			const mockTenantWithLease = {
				...mockTenant,
				lease_tenants: [
					{
						tenant_id: mockTenant.id,
						lease_id: 'lease-1',
						lease: {
							id: 'lease-1',
							start_date: '2024-01-01',
							end_date: '2024-12-31',
							lease_status: 'active',
							rent_amount: 1500,
							security_deposit: 3000,
							unit: null
						}
					}
				]
			}

			const tenantByUserBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				or: jest.fn().mockReturnThis(),
				range: jest.fn().mockResolvedValue({
					data: [mockTenantWithLease],
					error: null
				})
			}

			// RPC returns the same tenant ID
			;(mockClient.rpc as jest.Mock).mockResolvedValue({
				data: [mockTenant.id],
				error: null
			})

			// Owner query for tenant details
			const ownerUserIdBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: { user_id: mockUserId },
					error: null
				})
			}

			const leaseTenantsBuilder = {
				select: jest.fn().mockReturnThis(),
				in: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				not: jest.fn().mockReturnThis(),
				or: jest.fn().mockReturnThis(),
				range: jest.fn().mockResolvedValue({
					data: [{ tenant: mockTenant, lease: (mockTenantWithLease as any).lease_tenants[0].lease }],
					error: null
				})
			}

			;(mockClient.from as jest.Mock)
				.mockReturnValueOnce(ownerBuilder) // property_owners check
				.mockReturnValueOnce(tenantByUserBuilder) // tenants by user
				.mockReturnValueOnce(ownerUserIdBuilder) // property_owners.user_id
				.mockReturnValueOnce(leaseTenantsBuilder) // lease_tenants

			const result = await service.findAllWithLeaseInfo(mockUserId)

			// Should deduplicate
			expect(result).toHaveLength(1)
		})
	})
})
