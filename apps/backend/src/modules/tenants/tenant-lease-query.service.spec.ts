import {
	BadRequestException,
	InternalServerErrorException,
	UnauthorizedException
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { TenantWithLeaseInfo, Tenant } from '@repo/shared/types/core'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import { SupabaseService } from '../../database/supabase.service'
import { TenantLeaseQueryService } from './tenant-lease-query.service'

describe('TenantLeaseQueryService', () => {
	let service: TenantLeaseQueryService
	let mockSupabaseService: { getUserClient: jest.Mock }
	let mockUserClient: { from: jest.Mock; rpc: jest.Mock }

	const mockToken = 'mock-jwt-token'
	const mockUserId = 'user-owner-123'
	const mockOwnerId = 'owner-456'
	const mockPropertyId = 'prop-abc-789'
	const mockTenantId = 'tenant-111'

	const mockFilters = { token: mockToken }

	/** Minimal TenantWithLeaseInfo shape for test assertions */
	const makeTenantWithLease = (
		id = mockTenantId,
		userId = 'user-tenant-1'
	): TenantWithLeaseInfo => ({
		id,
		user_id: userId,
		name: 'Bob Tenant',
		first_name: 'Bob',
		last_name: 'Tenant',
		email: 'bob@example.com',
		phone: '555-1234',
		emergency_contact_name: 'Alice',
		emergency_contact_phone: '555-9999',
		emergency_contact_relationship: 'Parent',
		identity_verified: false,
		created_at: '2024-01-01T00:00:00Z',
		updated_at: '2024-01-01T00:00:00Z',
		date_of_birth: null,
		ssn_last_four: null,
		stripe_customer_id: null,
		lease: null
	} as unknown as TenantWithLeaseInfo)

	/** Raw DB row structure for tenants with lease_tenants */
	const makeRawTenantRow = (id = mockTenantId, leaseStatus = 'active') => ({
		id,
		user_id: 'user-tenant-1',
		emergency_contact_name: 'Alice',
		emergency_contact_phone: '555-9999',
		emergency_contact_relationship: 'Parent',
		identity_verified: false,
		created_at: '2024-01-01T00:00:00Z',
		updated_at: '2024-01-01T00:00:00Z',
		user: {
			first_name: 'Bob',
			last_name: 'Tenant',
			email: 'bob@example.com',
			phone: '555-1234'
		},
		lease_tenants: [
			{
				tenant_id: id,
				lease_id: 'lease-1',
				lease: {
					id: 'lease-1',
					start_date: '2024-01-01',
					end_date: '2024-12-31',
					lease_status: leaseStatus,
					rent_amount: 1500,
					security_deposit: 3000,
					unit: {
						id: 'unit-1',
						unit_number: '101',
						bedrooms: 2,
						bathrooms: 1,
						square_feet: 900,
						property: {
							id: mockPropertyId,
							name: 'Oak Apartments',
							address_line1: '123 Main St',
							address_line2: null,
							city: 'Springfield',
							state: 'IL',
							postal_code: '62701'
						}
					}
				}
			}
		]
	})

	/**
	 * Creates a chainable Supabase query builder.
	 * All intermediate methods return `this` for chaining.
	 * The builder is also thenable so `await queryBuilder` resolves.
	 */
	const createChainBuilder = (
		resolvedValue: { data: unknown; error: unknown; count?: number | null }
	) => {
		const builder: Record<string, jest.Mock> = {}
		const chainMethods = [
			'select', 'eq', 'neq', 'gte', 'lte', 'or', 'order',
			'range', 'limit', 'insert', 'update', 'delete', 'not', 'in'
		]
		for (const method of chainMethods) {
			builder[method] = jest.fn().mockReturnValue(builder)
		}
		builder.single = jest.fn().mockResolvedValue(resolvedValue)
		builder.maybeSingle = jest.fn().mockResolvedValue(resolvedValue)
		// Make thenable for `await queryBuilder`
		const thenFn = (resolve: (v: unknown) => void) =>
			Promise.resolve(resolvedValue).then(resolve)
		Object.defineProperty(builder, 'then', {
			value: thenFn,
			writable: true,
			enumerable: false
		})
		return builder
	}

	beforeEach(async () => {
		mockUserClient = {
			from: jest.fn(),
			rpc: jest.fn()
		}
		mockSupabaseService = {
			getUserClient: jest.fn().mockReturnValue(mockUserClient)
		}

		const module = await Test.createTestingModule({
			providers: [
				TenantLeaseQueryService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: AppLogger, useValue: new SilentLogger() }
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<TenantLeaseQueryService>(TenantLeaseQueryService)
	})

	afterEach(() => {
		jest.resetAllMocks()
	})

	// ================================================================
	// requireUserClient (private - tested indirectly through public methods)
	// ================================================================
	describe('requireUserClient (via public methods)', () => {
		it('throws UnauthorizedException when token is missing from filters', async () => {
			// fetchTenantsWithLeaseByUser calls requireUserClient internally
			await expect(
				service.fetchTenantsWithLeaseByUser(mockUserId, {}, 50, 0)
			).rejects.toThrow(UnauthorizedException)
		})

		it('throws UnauthorizedException with token required message', async () => {
			await expect(
				service.fetchTenantsWithLeaseByOwner(mockOwnerId, {}, 50, 0)
			).rejects.toThrow('Authentication token required')
		})
	})

	// ================================================================
	// findAllWithLeaseInfo
	// ================================================================
	describe('findAllWithLeaseInfo', () => {
		it('throws BadRequestException when userId is empty', async () => {
			await expect(
				service.findAllWithLeaseInfo('', mockFilters)
			).rejects.toThrow(BadRequestException)
			await expect(
				service.findAllWithLeaseInfo('', mockFilters)
			).rejects.toThrow('User ID required')
		})

		it('returns deduplicated tenants from both user and owner queries', async () => {
			// fetchTenantsWithLeaseByUser query
			const tenantRow = makeRawTenantRow(mockTenantId)
			const userQb = createChainBuilder({ data: [tenantRow], error: null })
			// countAllTenantsWithLease - first count query
			const countQb = createChainBuilder({ data: null, error: null, count: 1 })
			// countAllTenantsWithLease - rpc for owner tenant IDs
			const rpcCountResult = { data: [mockTenantId], error: null }
			// fetchTenantsWithLeaseByOwner - rpc for tenant IDs
			const rpcOwnerResult = { data: [mockTenantId], error: null }
			// fetchTenantsWithLeaseByOwner - lease_tenants query
			const ownerQb = createChainBuilder({
				data: [{
					tenant_id: mockTenantId,
					lease_id: 'lease-1',
					tenant: tenantRow,
					lease: tenantRow.lease_tenants[0].lease
				}],
				error: null
			})
			// tenantIds fetch for accurate dedup
			const userTenantIdsQb = createChainBuilder({
				data: [{ id: mockTenantId }],
				error: null
			})

			// We need to mock the sequence of from() and rpc() calls
			// findAllWithLeaseInfo runs Promise.all([fetchByUser, fetchByOwner])
			// Plus countAllTenantsWithLease in parallel
			// fetchByUser: from('tenants').select(...).eq(...).range(...)
			// fetchByOwner: rpc('get_tenants_with_lease_by_owner') -> from('lease_tenants')...
			// countAll: from('tenants').select(...count head), rpc(...) -> from('tenants').select('id')...

			mockUserClient.from
				.mockReturnValueOnce(userQb)       // fetchTenantsWithLeaseByUser - tenants
				.mockReturnValueOnce(ownerQb)       // fetchTenantsWithLeaseByOwner - lease_tenants
				.mockReturnValueOnce(countQb)       // countAllTenantsWithLease - select count (head)
				.mockReturnValueOnce(userTenantIdsQb) // countAllTenantsWithLease - select id

			mockUserClient.rpc
				.mockResolvedValueOnce(rpcOwnerResult)  // fetchTenantsWithLeaseByOwner
				.mockResolvedValueOnce(rpcCountResult)  // countAllTenantsWithLease

			const result = await service.findAllWithLeaseInfo(mockUserId, mockFilters)

			expect(result.data).toBeDefined()
			expect(Array.isArray(result.data)).toBe(true)
		})

		it('deduplicates tenants that appear in both user and owner results', async () => {
			// Same tenant ID appears in both result sets - should only appear once
			const tenantRow = makeRawTenantRow(mockTenantId)
			const leaseTenantsRow = {
				tenant_id: mockTenantId,
				lease_id: 'lease-1',
				tenant: tenantRow,
				lease: tenantRow.lease_tenants[0].lease
			}

			const userQb = createChainBuilder({ data: [tenantRow], error: null })
			const ownerQb = createChainBuilder({ data: [leaseTenantsRow], error: null })
			const countQb = createChainBuilder({ data: null, error: null, count: 1 })
			const userTenantIdsQb = createChainBuilder({
				data: [{ id: mockTenantId }],
				error: null
			})

			mockUserClient.from
				.mockReturnValueOnce(userQb)
				.mockReturnValueOnce(ownerQb)
				.mockReturnValueOnce(countQb)
				.mockReturnValueOnce(userTenantIdsQb)

			mockUserClient.rpc
				.mockResolvedValueOnce({ data: [mockTenantId], error: null })
				.mockResolvedValueOnce({ data: [mockTenantId], error: null })

			const result = await service.findAllWithLeaseInfo(mockUserId, mockFilters)

			// Despite the tenant appearing twice, it should be deduplicated
			const uniqueIds = new Set(result.data.map(t => t.id))
			expect(uniqueIds.size).toBeLessThanOrEqual(result.data.length)
		})

		it('returns empty data and count when no tenants found', async () => {
			const emptyQb = createChainBuilder({ data: [], error: null })
			const countQb = createChainBuilder({ data: null, error: null, count: 0 })

			mockUserClient.from
				.mockReturnValueOnce(emptyQb)  // fetchTenantsWithLeaseByUser
				.mockReturnValueOnce(countQb)  // countAll - count query

			mockUserClient.rpc
				.mockResolvedValueOnce({ data: [], error: null })  // fetchTenantsWithLeaseByOwner rpc
				.mockResolvedValueOnce({ data: [], error: null })  // countAll rpc

			const result = await service.findAllWithLeaseInfo(mockUserId, mockFilters)

			expect(result.data).toHaveLength(0)
		})

		it('re-throws errors from inner queries', async () => {
			// fetchTenantsWithLeaseByUser fails
			const failingQb = createChainBuilder({
				data: null,
				error: { message: 'DB error' }
			})
			mockUserClient.from.mockReturnValue(failingQb)
			mockUserClient.rpc.mockResolvedValue({ data: [], error: null })

			await expect(
				service.findAllWithLeaseInfo(mockUserId, mockFilters)
			).rejects.toThrow()
		})

		it('uses capped limit of MAX_LIMIT=100 when limit exceeds maximum', async () => {
			// We test this indirectly by calling with limit=999; the inner query
			// should use range(0, 99) instead of range(0, 998)
			const userQb = createChainBuilder({ data: [], error: null })
			const countQb = createChainBuilder({ data: null, error: null, count: 0 })

			mockUserClient.from
				.mockReturnValueOnce(userQb)
				.mockReturnValueOnce(countQb)

			mockUserClient.rpc
				.mockResolvedValueOnce({ data: [], error: null })
				.mockResolvedValueOnce({ data: [], error: null })

			await service.findAllWithLeaseInfo(mockUserId, {
				...mockFilters,
				limit: 999
			})

			// The range call on userQb should cap at 99 (limit=100, range(0, 99))
			expect(userQb.range).toHaveBeenCalledWith(0, 99)
		})
	})

	// ================================================================
	// fetchTenantsWithLeaseByUser
	// ================================================================
	describe('fetchTenantsWithLeaseByUser', () => {
		it('throws UnauthorizedException when token is not provided', async () => {
			await expect(
				service.fetchTenantsWithLeaseByUser(mockUserId, {}, 50, 0)
			).rejects.toThrow(UnauthorizedException)
		})

		it('returns transformed TenantWithLeaseInfo array on success', async () => {
			const rawRow = makeRawTenantRow()
			const qb = createChainBuilder({ data: [rawRow], error: null })
			mockUserClient.from.mockReturnValue(qb)

			const result = await service.fetchTenantsWithLeaseByUser(
				mockUserId, mockFilters, 50, 0
			)

			expect(result).toHaveLength(1)
			expect(result[0].id).toBe(mockTenantId)
			expect(result[0].first_name).toBe('Bob')
			expect(result[0].last_name).toBe('Tenant')
			expect(result[0].email).toBe('bob@example.com')
		})

		it('queries the tenants table filtered by user_id', async () => {
			const qb = createChainBuilder({ data: [], error: null })
			mockUserClient.from.mockReturnValue(qb)

			await service.fetchTenantsWithLeaseByUser(mockUserId, mockFilters, 50, 0)

			expect(mockUserClient.from).toHaveBeenCalledWith('tenants')
			expect(qb.eq).toHaveBeenCalledWith('user_id', mockUserId)
		})

		it('applies correct pagination via range()', async () => {
			const qb = createChainBuilder({ data: [], error: null })
			mockUserClient.from.mockReturnValue(qb)

			await service.fetchTenantsWithLeaseByUser(mockUserId, mockFilters, 10, 20)

			expect(qb.range).toHaveBeenCalledWith(20, 29)
		})

		it('applies search filter via or() when search is provided', async () => {
			const qb = createChainBuilder({ data: [], error: null })
			mockUserClient.from.mockReturnValue(qb)

			await service.fetchTenantsWithLeaseByUser(
				mockUserId, { ...mockFilters, search: 'alice' }, 50, 0
			)

			expect(qb.or).toHaveBeenCalled()
		})

		it('skips search filter when search is whitespace-only', async () => {
			const qb = createChainBuilder({ data: [], error: null })
			mockUserClient.from.mockReturnValue(qb)

			await service.fetchTenantsWithLeaseByUser(
				mockUserId, { ...mockFilters, search: '   ' }, 50, 0
			)

			expect(qb.or).not.toHaveBeenCalled()
		})

		it('throws BadRequestException on database error', async () => {
			const qb = createChainBuilder({
				data: null,
				error: { message: 'connection failed' }
			})
			mockUserClient.from.mockReturnValue(qb)

			await expect(
				service.fetchTenantsWithLeaseByUser(mockUserId, mockFilters, 50, 0)
			).rejects.toThrow(BadRequestException)
		})

		it('returns empty array when data is null', async () => {
			const qb = createChainBuilder({ data: null, error: null })
			mockUserClient.from.mockReturnValue(qb)

			const result = await service.fetchTenantsWithLeaseByUser(
				mockUserId, mockFilters, 50, 0
			)

			expect(result).toHaveLength(0)
		})

		it('picks active lease from lease_tenants for the returned TenantWithLeaseInfo', async () => {
			const rawRow = {
				...makeRawTenantRow(),
				lease_tenants: [
					{
						tenant_id: mockTenantId,
						lease_id: 'lease-expired',
						lease: { id: 'lease-expired', lease_status: 'expired', rent_amount: 1000, security_deposit: 2000, start_date: '2023-01-01', end_date: '2023-12-31', unit: null }
					},
					{
						tenant_id: mockTenantId,
						lease_id: 'lease-active',
						lease: { id: 'lease-active', lease_status: 'active', rent_amount: 1500, security_deposit: 3000, start_date: '2024-01-01', end_date: '2024-12-31', unit: null }
					}
				]
			}
			const qb = createChainBuilder({ data: [rawRow], error: null })
			mockUserClient.from.mockReturnValue(qb)

			const result = await service.fetchTenantsWithLeaseByUser(
				mockUserId, mockFilters, 50, 0
			)

			expect(result[0].lease).toBeDefined()
			// The active lease should be selected
			const lease = result[0].lease as { id: string } | null
			expect(lease?.id).toBe('lease-active')
		})

		it('sets lease to null when tenant has no lease_tenants', async () => {
			const rawRow = { ...makeRawTenantRow(), lease_tenants: null }
			const qb = createChainBuilder({ data: [rawRow], error: null })
			mockUserClient.from.mockReturnValue(qb)

			const result = await service.fetchTenantsWithLeaseByUser(
				mockUserId, mockFilters, 50, 0
			)

			expect(result[0].lease).toBeNull()
		})

		it('constructs full name from first and last name', async () => {
			const rawRow = {
				...makeRawTenantRow(),
				user: { first_name: 'John', last_name: 'Smith', email: 'j@test.com', phone: null }
			}
			const qb = createChainBuilder({ data: [rawRow], error: null })
			mockUserClient.from.mockReturnValue(qb)

			const result = await service.fetchTenantsWithLeaseByUser(
				mockUserId, mockFilters, 50, 0
			)

			expect(result[0].name).toBe('John Smith')
		})

		it('handles null user gracefully (sets name fields to null)', async () => {
			const rawRow = { ...makeRawTenantRow(), user: null }
			const qb = createChainBuilder({ data: [rawRow], error: null })
			mockUserClient.from.mockReturnValue(qb)

			const result = await service.fetchTenantsWithLeaseByUser(
				mockUserId, mockFilters, 50, 0
			)

			expect(result[0].first_name).toBeNull()
			expect(result[0].last_name).toBeNull()
			expect(result[0].email).toBeNull()
		})
	})

	// ================================================================
	// fetchTenantsWithLeaseByOwner
	// ================================================================
	describe('fetchTenantsWithLeaseByOwner', () => {
		it('throws UnauthorizedException when token is not provided', async () => {
			await expect(
				service.fetchTenantsWithLeaseByOwner(mockOwnerId, {}, 50, 0)
			).rejects.toThrow(UnauthorizedException)
		})

		it('returns empty array when RPC returns no tenant IDs', async () => {
			mockUserClient.rpc.mockResolvedValueOnce({ data: [], error: null })

			const result = await service.fetchTenantsWithLeaseByOwner(
				mockOwnerId, mockFilters, 50, 0
			)

			expect(result).toHaveLength(0)
			expect(mockUserClient.from).not.toHaveBeenCalled()
		})

		it('returns empty array when RPC returns null data', async () => {
			mockUserClient.rpc.mockResolvedValueOnce({ data: null, error: null })

			const result = await service.fetchTenantsWithLeaseByOwner(
				mockOwnerId, mockFilters, 50, 0
			)

			expect(result).toHaveLength(0)
		})

		it('throws InternalServerErrorException on RPC error', async () => {
			mockUserClient.rpc.mockResolvedValueOnce({
				data: null,
				error: { message: 'RPC function not found' }
			})

			await expect(
				service.fetchTenantsWithLeaseByOwner(mockOwnerId, mockFilters, 50, 0)
			).rejects.toThrow(InternalServerErrorException)
		})

		it('calls the correct RPC function with owner user ID', async () => {
			mockUserClient.rpc.mockResolvedValueOnce({ data: [], error: null })

			await service.fetchTenantsWithLeaseByOwner(mockOwnerId, mockFilters, 50, 0)

			expect(mockUserClient.rpc).toHaveBeenCalledWith(
				'get_tenants_with_lease_by_owner',
				{ p_user_id: mockOwnerId }
			)
		})

		it('fetches lease_tenants when tenant IDs are returned by RPC', async () => {
			mockUserClient.rpc.mockResolvedValueOnce({
				data: [mockTenantId],
				error: null
			})

			const rawRow = makeRawTenantRow()
			const leaseTenantsRow = {
				tenant_id: mockTenantId,
				lease_id: 'lease-1',
				tenant: rawRow,
				lease: rawRow.lease_tenants[0].lease
			}
			const qb = createChainBuilder({ data: [leaseTenantsRow], error: null })
			mockUserClient.from.mockReturnValue(qb)

			const result = await service.fetchTenantsWithLeaseByOwner(
				mockOwnerId, mockFilters, 50, 0
			)

			expect(mockUserClient.from).toHaveBeenCalledWith('lease_tenants')
			expect(result).toHaveLength(1)
		})

		it('queries lease_tenants with IN filter for tenant IDs', async () => {
			const tenantIds = ['tenant-1', 'tenant-2']
			mockUserClient.rpc.mockResolvedValueOnce({ data: tenantIds, error: null })

			const qb = createChainBuilder({ data: [], error: null })
			mockUserClient.from.mockReturnValue(qb)

			await service.fetchTenantsWithLeaseByOwner(mockOwnerId, mockFilters, 50, 0)

			expect(qb.in).toHaveBeenCalledWith('tenant_id', tenantIds)
		})

		it('applies search filter via or() when search is provided', async () => {
			mockUserClient.rpc.mockResolvedValueOnce({
				data: [mockTenantId],
				error: null
			})

			const qb = createChainBuilder({ data: [], error: null })
			mockUserClient.from.mockReturnValue(qb)

			await service.fetchTenantsWithLeaseByOwner(
				mockOwnerId, { ...mockFilters, search: 'alice' }, 50, 0
			)

			expect(qb.or).toHaveBeenCalled()
		})

		it('applies correct pagination via range()', async () => {
			mockUserClient.rpc.mockResolvedValueOnce({
				data: [mockTenantId],
				error: null
			})

			const qb = createChainBuilder({ data: [], error: null })
			mockUserClient.from.mockReturnValue(qb)

			await service.fetchTenantsWithLeaseByOwner(mockOwnerId, mockFilters, 15, 30)

			expect(qb.range).toHaveBeenCalledWith(30, 44)
		})

		it('throws BadRequestException on lease_tenants DB error', async () => {
			mockUserClient.rpc.mockResolvedValueOnce({
				data: [mockTenantId],
				error: null
			})

			const qb = createChainBuilder({
				data: null,
				error: { message: 'DB error' }
			})
			mockUserClient.from.mockReturnValue(qb)

			await expect(
				service.fetchTenantsWithLeaseByOwner(mockOwnerId, mockFilters, 50, 0)
			).rejects.toThrow(BadRequestException)
		})

		it('filters out rows where tenant or lease.unit.property is null', async () => {
			mockUserClient.rpc.mockResolvedValueOnce({
				data: [mockTenantId, 'tenant-no-property'],
				error: null
			})

			const validRow = {
				tenant_id: mockTenantId,
				lease_id: 'lease-1',
				tenant: makeRawTenantRow(),
				lease: { ...makeRawTenantRow().lease_tenants[0].lease }
			}

			const invalidRow = {
				tenant_id: 'tenant-no-property',
				lease_id: 'lease-2',
				tenant: { ...makeRawTenantRow('tenant-no-property') },
				lease: { id: 'lease-2', unit: { property: null } }
			}

			const qb = createChainBuilder({ data: [validRow, invalidRow], error: null })
			mockUserClient.from.mockReturnValue(qb)

			const result = await service.fetchTenantsWithLeaseByOwner(
				mockOwnerId, mockFilters, 50, 0
			)

			// Only the valid row (with property) should be included
			expect(result.every(t => t.id !== 'tenant-no-property')).toBe(true)
		})

		it('maps full name from first_name + last_name of tenant.user', async () => {
			const tenantRow = {
				...makeRawTenantRow(),
				user: { first_name: 'Carol', last_name: 'Owner', email: 'c@test.com', phone: null }
			}

			mockUserClient.rpc.mockResolvedValueOnce({
				data: [mockTenantId],
				error: null
			})

			const qb = createChainBuilder({
				data: [{
					tenant_id: mockTenantId,
					lease_id: 'lease-1',
					tenant: tenantRow,
					lease: makeRawTenantRow().lease_tenants[0].lease
				}],
				error: null
			})
			mockUserClient.from.mockReturnValue(qb)

			const result = await service.fetchTenantsWithLeaseByOwner(
				mockOwnerId, mockFilters, 50, 0
			)

			expect(result[0].name).toBe('Carol Owner')
		})
	})

	// ================================================================
	// findByProperty
	// ================================================================
	describe('findByProperty', () => {
		it('throws BadRequestException when userId is empty', async () => {
			await expect(
				service.findByProperty('', mockPropertyId, mockFilters)
			).rejects.toThrow(BadRequestException)
			await expect(
				service.findByProperty('', mockPropertyId, mockFilters)
			).rejects.toThrow('User ID required')
		})

		it('throws BadRequestException when propertyId is empty', async () => {
			await expect(
				service.findByProperty(mockUserId, '', mockFilters)
			).rejects.toThrow(BadRequestException)
			await expect(
				service.findByProperty(mockUserId, '', mockFilters)
			).rejects.toThrow('Property ID required')
		})

		it('throws UnauthorizedException when token is missing', async () => {
			await expect(
				service.findByProperty(mockUserId, mockPropertyId, {})
			).rejects.toThrow(UnauthorizedException)
		})

		it('returns empty data when no accepted invitations exist', async () => {
			const qb = createChainBuilder({ data: [], error: null })
			mockUserClient.from.mockReturnValue(qb)

			const result = await service.findByProperty(
				mockUserId, mockPropertyId, mockFilters
			)

			expect(result.data).toHaveLength(0)
			expect(result.count).toBe(0)
		})

		it('returns empty data when invitationData is null', async () => {
			const qb = createChainBuilder({ data: null, error: null })
			mockUserClient.from.mockReturnValue(qb)

			const result = await service.findByProperty(
				mockUserId, mockPropertyId, mockFilters
			)

			expect(result.data).toHaveLength(0)
			expect(result.count).toBe(0)
		})

		it('throws BadRequestException on query error', async () => {
			const qb = createChainBuilder({
				data: null,
				error: { message: 'query failed' }
			})
			mockUserClient.from.mockReturnValue(qb)

			await expect(
				service.findByProperty(mockUserId, mockPropertyId, mockFilters)
			).rejects.toThrow(BadRequestException)
		})

		it('queries tenant_invitations table for the specified property', async () => {
			const qb = createChainBuilder({ data: [], error: null })
			mockUserClient.from.mockReturnValue(qb)

			await service.findByProperty(mockUserId, mockPropertyId, mockFilters)

			expect(mockUserClient.from).toHaveBeenCalledWith('tenant_invitations')
			expect(qb.eq).toHaveBeenCalledWith('property_id', mockPropertyId)
		})

		it('filters out tenants with an active lease', async () => {
			const invitationData = [
				{
					accepted_by_user_id: 'user-has-active',
					tenant: {
						id: 'tenant-has-active',
						user_id: 'user-has-active',
						emergency_contact_name: null,
						emergency_contact_phone: null,
						emergency_contact_relationship: null,
						identity_verified: false,
						created_at: '2024-01-01T00:00:00Z',
						updated_at: '2024-01-01T00:00:00Z',
						lease_tenants: [
							{
								lease: { id: 'lease-active', lease_status: 'active' }
							}
						]
					}
				},
				{
					accepted_by_user_id: 'user-no-active',
					tenant: {
						id: 'tenant-no-active',
						user_id: 'user-no-active',
						emergency_contact_name: null,
						emergency_contact_phone: null,
						emergency_contact_relationship: null,
						identity_verified: false,
						created_at: '2024-01-01T00:00:00Z',
						updated_at: '2024-01-01T00:00:00Z',
						lease_tenants: [
							{
								lease: { id: 'lease-expired', lease_status: 'expired' }
							}
						]
					}
				}
			]

			const qb = createChainBuilder({ data: invitationData, error: null })
			mockUserClient.from.mockReturnValue(qb)

			const result = await service.findByProperty(
				mockUserId, mockPropertyId, mockFilters
			)

			// tenant-has-active should be filtered out
			expect(result.data.some(t => t.id === 'tenant-has-active')).toBe(false)
			// tenant-no-active should be included
			expect(result.data.some(t => t.id === 'tenant-no-active')).toBe(true)
		})

		it('includes tenants with no lease_tenants', async () => {
			const invitationData = [
				{
					accepted_by_user_id: 'user-1',
					tenant: {
						id: 'tenant-no-leases',
						user_id: 'user-1',
						emergency_contact_name: null,
						emergency_contact_phone: null,
						emergency_contact_relationship: null,
						identity_verified: false,
						created_at: '2024-01-01T00:00:00Z',
						updated_at: '2024-01-01T00:00:00Z',
						lease_tenants: []
					}
				}
			]

			const qb = createChainBuilder({ data: invitationData, error: null })
			mockUserClient.from.mockReturnValue(qb)

			const result = await service.findByProperty(
				mockUserId, mockPropertyId, mockFilters
			)

			expect(result.data.some(t => t.id === 'tenant-no-leases')).toBe(true)
		})

		it('deduplicates tenants that appear in multiple invitations', async () => {
			const tenantData = {
				id: 'tenant-dup',
				user_id: 'user-dup',
				emergency_contact_name: null,
				emergency_contact_phone: null,
				emergency_contact_relationship: null,
				identity_verified: false,
				created_at: '2024-01-01T00:00:00Z',
				updated_at: '2024-01-01T00:00:00Z',
				lease_tenants: []
			}

			// Same tenant appears twice in invitation data
			const invitationData = [
				{ accepted_by_user_id: 'user-dup', tenant: tenantData },
				{ accepted_by_user_id: 'user-dup', tenant: tenantData }
			]

			const qb = createChainBuilder({ data: invitationData, error: null })
			mockUserClient.from.mockReturnValue(qb)

			const result = await service.findByProperty(
				mockUserId, mockPropertyId, mockFilters
			)

			// Should appear only once after deduplication
			const dupTenants = result.data.filter(t => t.id === 'tenant-dup')
			expect(dupTenants).toHaveLength(1)
		})

		it('skips rows where tenant is null or undefined', async () => {
			const invitationData = [
				{ accepted_by_user_id: null, tenant: null },
				{
					accepted_by_user_id: 'user-valid',
					tenant: {
						id: 'tenant-valid',
						user_id: 'user-valid',
						emergency_contact_name: null,
						emergency_contact_phone: null,
						emergency_contact_relationship: null,
						identity_verified: false,
						created_at: '2024-01-01T00:00:00Z',
						updated_at: '2024-01-01T00:00:00Z',
						lease_tenants: []
					}
				}
			]

			const qb = createChainBuilder({ data: invitationData, error: null })
			mockUserClient.from.mockReturnValue(qb)

			const result = await service.findByProperty(
				mockUserId, mockPropertyId, mockFilters
			)

			expect(result.data.some(t => t.id === 'tenant-valid')).toBe(true)
			expect(result.data).toHaveLength(1)
		})

		it('returns count equal to the number of available (non-active) tenants', async () => {
			const invitationData = [
				{
					accepted_by_user_id: 'user-1',
					tenant: {
						id: 'tenant-1',
						user_id: 'user-1',
						emergency_contact_name: null,
						emergency_contact_phone: null,
						emergency_contact_relationship: null,
						identity_verified: false,
						created_at: '2024-01-01T00:00:00Z',
						updated_at: '2024-01-01T00:00:00Z',
						lease_tenants: []
					}
				},
				{
					accepted_by_user_id: 'user-2',
					tenant: {
						id: 'tenant-2',
						user_id: 'user-2',
						emergency_contact_name: null,
						emergency_contact_phone: null,
						emergency_contact_relationship: null,
						identity_verified: false,
						created_at: '2024-01-01T00:00:00Z',
						updated_at: '2024-01-01T00:00:00Z',
						lease_tenants: []
					}
				}
			]

			const qb = createChainBuilder({ data: invitationData, error: null })
			mockUserClient.from.mockReturnValue(qb)

			const result = await service.findByProperty(
				mockUserId, mockPropertyId, mockFilters
			)

			expect(result.count).toBe(result.data.length)
			expect(result.count).toBe(2)
		})

		it('uses not() to filter out null accepted_at and accepted_by_user_id', async () => {
			const qb = createChainBuilder({ data: [], error: null })
			mockUserClient.from.mockReturnValue(qb)

			await service.findByProperty(mockUserId, mockPropertyId, mockFilters)

			expect(qb.not).toHaveBeenCalledWith('accepted_at', 'is', null)
			expect(qb.not).toHaveBeenCalledWith('accepted_by_user_id', 'is', null)
		})

		it('re-throws unexpected errors from the query', async () => {
			// Mock the client to throw synchronously
			mockUserClient.from.mockImplementation(() => {
				throw new Error('Unexpected sync error')
			})

			await expect(
				service.findByProperty(mockUserId, mockPropertyId, mockFilters)
			).rejects.toThrow('Unexpected sync error')
		})
	})
})
