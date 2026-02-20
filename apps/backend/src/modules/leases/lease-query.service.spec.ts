import {
	BadRequestException,
	NotFoundException
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { Lease, Property, Unit, User, Tenant } from '@repo/shared/types/core'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import { SupabaseService } from '../../database/supabase.service'
import { LeaseQueryService } from './lease-query.service'

describe('LeaseQueryService', () => {
	let service: LeaseQueryService
	let mockSupabaseService: { getUserClient: jest.Mock }
	let mockUserClient: { from: jest.Mock }

	const mockToken = 'mock-jwt-token'
	const mockLeaseId = 'lease-abc-123'
	const mockUserId = 'user-owner-123'

	const mockLease: Partial<Lease> = {
		id: mockLeaseId,
		unit_id: 'unit-1',
		owner_user_id: mockUserId,
		primary_tenant_id: 'tenant-1',
		start_date: '2024-01-01',
		end_date: '2024-12-31',
		rent_amount: 1500,
		lease_status: 'active',
		created_at: '2024-01-01T00:00:00Z',
		updated_at: '2024-01-01T00:00:00Z'
	}

	const mockProperty: Partial<Property> = {
		id: 'prop-1',
		name: 'Oak Apartments',
		address_line1: '123 Main St',
		city: 'Springfield',
		state: 'IL',
		postal_code: '62701',
		owner_user_id: mockUserId
	}

	const mockUnit: Partial<Unit> = {
		id: 'unit-1',
		unit_number: '101',
		property_id: 'prop-1'
	}

	const mockLandlord: Partial<User> = {
		id: mockUserId,
		email: 'landlord@example.com',
		full_name: 'Jane Landlord',
		first_name: 'Jane',
		last_name: 'Landlord',
		phone: '555-9000'
	}

	const mockTenantUser: Partial<User> = {
		id: 'user-tenant-1',
		email: 'tenant@example.com',
		full_name: 'Bob Tenant',
		first_name: 'Bob',
		last_name: 'Tenant',
		phone: '555-1111'
	}

	const mockTenantRecord: Partial<Tenant> = {
		id: 'tenant-1',
		user_id: 'user-tenant-1',
		emergency_contact_name: 'Alice Contact',
		emergency_contact_phone: '555-2222',
		created_at: '2024-01-01T00:00:00Z',
		updated_at: '2024-01-01T00:00:00Z'
	}

	/**
	 * Creates a chainable Supabase query builder.
	 * All intermediate methods return `this` for chaining.
	 * The builder is also thenable so `await queryBuilder` resolves (used by findAll).
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
		// Make thenable for `await queryBuilder` (findAll pattern)
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
		mockUserClient = { from: jest.fn() }
		mockSupabaseService = {
			getUserClient: jest.fn().mockReturnValue(mockUserClient)
		}

		const module = await Test.createTestingModule({
			providers: [
				LeaseQueryService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: AppLogger, useValue: new SilentLogger() }
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<LeaseQueryService>(LeaseQueryService)
	})

	afterEach(() => {
		jest.resetAllMocks()
	})

	// ================================================================
	// findAll
	// ================================================================
	describe('findAll', () => {
		it('returns leases with total, limit, and offset on success', async () => {
			const qb = createChainBuilder({ data: [mockLease], error: null, count: 1 })
			mockUserClient.from.mockReturnValue(qb)

			const result = await service.findAll(mockToken, {})

			expect(result.data).toHaveLength(1)
			expect(result.total).toBe(1)
			expect(result.limit).toBe(50)
			expect(result.offset).toBe(0)
			expect(mockUserClient.from).toHaveBeenCalledWith('leases')
		})

		it('throws BadRequestException when token is an empty string', async () => {
			await expect(service.findAll('', {})).rejects.toThrow(BadRequestException)
		})

		it('uses default limit=50 and offset=0 when not specified', async () => {
			const qb = createChainBuilder({ data: [], error: null, count: 0 })
			mockUserClient.from.mockReturnValue(qb)

			await service.findAll(mockToken, {})

			expect(qb.range).toHaveBeenCalledWith(0, 49)
		})

		it('applies custom limit and offset and reflects them in returned metadata', async () => {
			const qb = createChainBuilder({ data: [], error: null, count: 0 })
			mockUserClient.from.mockReturnValue(qb)

			const result = await service.findAll(mockToken, { limit: 10, offset: 20 })

			expect(qb.range).toHaveBeenCalledWith(20, 29)
			expect(result.limit).toBe(10)
			expect(result.offset).toBe(20)
		})

		it('applies tenant_id filter mapped to primary_tenant_id column', async () => {
			const qb = createChainBuilder({ data: [], error: null, count: 0 })
			mockUserClient.from.mockReturnValue(qb)

			await service.findAll(mockToken, { tenant_id: 'tenant-999' })

			expect(qb.eq).toHaveBeenCalledWith('primary_tenant_id', 'tenant-999')
		})

		it('applies property_id filter', async () => {
			const qb = createChainBuilder({ data: [], error: null, count: 0 })
			mockUserClient.from.mockReturnValue(qb)

			await service.findAll(mockToken, { property_id: 'prop-abc' })

			expect(qb.eq).toHaveBeenCalledWith('property_id', 'prop-abc')
		})

		it('applies status filter mapped to lease_status column', async () => {
			const qb = createChainBuilder({ data: [], error: null, count: 0 })
			mockUserClient.from.mockReturnValue(qb)

			await service.findAll(mockToken, { status: 'active' })

			expect(qb.eq).toHaveBeenCalledWith('lease_status', 'active')
		})

		it('applies start_date as gte constraint after ISO conversion', async () => {
			const qb = createChainBuilder({ data: [], error: null, count: 0 })
			mockUserClient.from.mockReturnValue(qb)

			await service.findAll(mockToken, { start_date: '2024-01-01' })

			expect(qb.gte).toHaveBeenCalledWith(
				'start_date',
				new Date('2024-01-01').toISOString()
			)
		})

		it('applies end_date as lte constraint after ISO conversion', async () => {
			const qb = createChainBuilder({ data: [], error: null, count: 0 })
			mockUserClient.from.mockReturnValue(qb)

			await service.findAll(mockToken, { end_date: '2024-12-31' })

			expect(qb.lte).toHaveBeenCalledWith(
				'end_date',
				new Date('2024-12-31').toISOString()
			)
		})

		it('applies both start_date and end_date filters simultaneously', async () => {
			const qb = createChainBuilder({ data: [], error: null, count: 0 })
			mockUserClient.from.mockReturnValue(qb)

			await service.findAll(mockToken, {
				start_date: '2024-01-01',
				end_date: '2024-12-31'
			})

			expect(qb.gte).toHaveBeenCalledWith('start_date', expect.any(String))
			expect(qb.lte).toHaveBeenCalledWith('end_date', expect.any(String))
		})

		it('applies search filter via or() for multi-column ilike search', async () => {
			const qb = createChainBuilder({ data: [], error: null, count: 0 })
			mockUserClient.from.mockReturnValue(qb)

			await service.findAll(mockToken, { search: 'john doe' })

			expect(qb.or).toHaveBeenCalled()
		})

		it('skips search filter when search is whitespace-only (sanitized to null)', async () => {
			const qb = createChainBuilder({ data: [], error: null, count: 0 })
			mockUserClient.from.mockReturnValue(qb)

			await service.findAll(mockToken, { search: '   ' })

			expect(qb.or).not.toHaveBeenCalled()
		})

		it('applies default sort by created_at descending', async () => {
			const qb = createChainBuilder({ data: [], error: null, count: 0 })
			mockUserClient.from.mockReturnValue(qb)

			await service.findAll(mockToken, {})

			expect(qb.order).toHaveBeenCalledWith('created_at', { ascending: false })
		})

		it('applies custom sort column ascending', async () => {
			const qb = createChainBuilder({ data: [], error: null, count: 0 })
			mockUserClient.from.mockReturnValue(qb)

			await service.findAll(mockToken, { sortBy: 'rent_amount', sortOrder: 'asc' })

			expect(qb.order).toHaveBeenCalledWith('rent_amount', { ascending: true })
		})

		it('applies custom sort column descending', async () => {
			const qb = createChainBuilder({ data: [], error: null, count: 0 })
			mockUserClient.from.mockReturnValue(qb)

			await service.findAll(mockToken, { sortBy: 'start_date', sortOrder: 'desc' })

			expect(qb.order).toHaveBeenCalledWith('start_date', { ascending: false })
		})

		it('throws BadRequestException on database error', async () => {
			const qb = createChainBuilder({
				data: null,
				error: { message: 'connection timeout' },
				count: null
			})
			mockUserClient.from.mockReturnValue(qb)

			await expect(service.findAll(mockToken, {})).rejects.toThrow(
				BadRequestException
			)
		})

		it('returns total=0 when database returns null count', async () => {
			const qb = createChainBuilder({ data: [], error: null, count: null })
			mockUserClient.from.mockReturnValue(qb)

			const result = await service.findAll(mockToken, {})

			expect(result.total).toBe(0)
		})

		it('does not call eq/gte/lte/or when all optional filters are undefined', async () => {
			const qb = createChainBuilder({ data: [], error: null, count: 0 })
			mockUserClient.from.mockReturnValue(qb)

			await service.findAll(mockToken, {
				tenant_id: undefined,
				unit_id: undefined,
				property_id: undefined,
				status: undefined,
				start_date: undefined,
				end_date: undefined,
				search: undefined
			})

			expect(qb.eq).not.toHaveBeenCalled()
			expect(qb.gte).not.toHaveBeenCalled()
			expect(qb.lte).not.toHaveBeenCalled()
			expect(qb.or).not.toHaveBeenCalled()
		})

		it('applies all filters simultaneously in a single query', async () => {
			const qb = createChainBuilder({ data: [], error: null, count: 0 })
			mockUserClient.from.mockReturnValue(qb)

			const result = await service.findAll(mockToken, {
				tenant_id: 'tenant-1',
				property_id: 'prop-1',
				status: 'active',
				start_date: '2024-01-01',
				end_date: '2024-12-31',
				search: 'test',
				limit: 25,
				offset: 50,
				sortBy: 'created_at',
				sortOrder: 'asc'
			})

			expect(qb.eq).toHaveBeenCalledWith('primary_tenant_id', 'tenant-1')
			expect(qb.eq).toHaveBeenCalledWith('property_id', 'prop-1')
			expect(qb.eq).toHaveBeenCalledWith('lease_status', 'active')
			expect(qb.gte).toHaveBeenCalled()
			expect(qb.lte).toHaveBeenCalled()
			expect(qb.or).toHaveBeenCalled()
			expect(qb.range).toHaveBeenCalledWith(50, 74)
			expect(qb.order).toHaveBeenCalledWith('created_at', { ascending: true })
			expect(result.limit).toBe(25)
			expect(result.offset).toBe(50)
		})

		it('uses the getUserClient with the provided token', async () => {
			const qb = createChainBuilder({ data: [], error: null, count: 0 })
			mockUserClient.from.mockReturnValue(qb)

			await service.findAll(mockToken, {})

			expect(mockSupabaseService.getUserClient).toHaveBeenCalledWith(mockToken)
		})
	})

	// ================================================================
	// findOne
	// ================================================================
	describe('findOne', () => {
		it('returns the lease when found', async () => {
			const qb = createChainBuilder({ data: mockLease, error: null })
			mockUserClient.from.mockReturnValue(qb)

			const result = await service.findOne(mockToken, mockLeaseId)

			expect(result).toEqual(mockLease)
			expect(mockUserClient.from).toHaveBeenCalledWith('leases')
			expect(qb.eq).toHaveBeenCalledWith('id', mockLeaseId)
			expect(qb.single).toHaveBeenCalled()
		})

		it('throws BadRequestException when token is empty', async () => {
			await expect(service.findOne('', mockLeaseId)).rejects.toThrow(
				BadRequestException
			)
			await expect(service.findOne('', mockLeaseId)).rejects.toThrow(
				'Authentication token and lease ID are required'
			)
		})

		it('throws BadRequestException when lease_id is empty', async () => {
			await expect(service.findOne(mockToken, '')).rejects.toThrow(
				BadRequestException
			)
		})

		it('throws BadRequestException when both token and lease_id are empty', async () => {
			await expect(service.findOne('', '')).rejects.toThrow(
				BadRequestException
			)
		})

		it('throws BadRequestException on database error', async () => {
			const qb = createChainBuilder({
				data: null,
				error: { message: 'row not found' }
			})
			mockUserClient.from.mockReturnValue(qb)

			await expect(service.findOne(mockToken, mockLeaseId)).rejects.toThrow(
				BadRequestException
			)
		})

		it('throws NotFoundException when data is null with no error (lease does not exist)', async () => {
			const qb = createChainBuilder({ data: null, error: null })
			mockUserClient.from.mockReturnValue(qb)

			await expect(service.findOne(mockToken, mockLeaseId)).rejects.toThrow(
				NotFoundException
			)
		})

		it('throws NotFoundException with a message containing the lease ID', async () => {
			const qb = createChainBuilder({ data: null, error: null })
			mockUserClient.from.mockReturnValue(qb)

			await expect(service.findOne(mockToken, mockLeaseId)).rejects.toThrow(
				`Lease with ID ${mockLeaseId} not found`
			)
		})

		it('uses the getUserClient with the provided token', async () => {
			const qb = createChainBuilder({ data: mockLease, error: null })
			mockUserClient.from.mockReturnValue(qb)

			await service.findOne(mockToken, mockLeaseId)

			expect(mockSupabaseService.getUserClient).toHaveBeenCalledWith(mockToken)
		})
	})

	// ================================================================
	// getLeaseDataForPdf
	// ================================================================
	describe('getLeaseDataForPdf', () => {
		/**
		 * Builds a mock lease with nested unit->property and tenant->user relations
		 * as returned by Supabase's nested select syntax.
		 */
		const buildMockLeaseWithRelations = (overrides?: {
			unit?: unknown
			tenant?: unknown
		}) => ({
			...mockLease,
			owner_user_id: mockUserId,
			unit: overrides?.unit !== undefined
				? overrides.unit
				: { ...mockUnit, property: { ...mockProperty } },
			tenant: overrides?.tenant !== undefined
				? overrides.tenant
				: { ...mockTenantRecord, user: { ...mockTenantUser } }
		})

		it('returns the full lease PDF payload on success', async () => {
			const leaseWithRelations = buildMockLeaseWithRelations()
			const leaseQb = createChainBuilder({ data: leaseWithRelations, error: null })
			const landlordQb = createChainBuilder({ data: mockLandlord, error: null })

			mockUserClient.from
				.mockReturnValueOnce(leaseQb)
				.mockReturnValueOnce(landlordQb)

			const result = await service.getLeaseDataForPdf(mockToken, mockLeaseId)

			expect(result.lease).toBeDefined()
			expect(result.property).toEqual(mockProperty)
			expect(result.unit).toBeDefined()
			expect(result.landlord).toEqual(mockLandlord)
			expect(result.tenant).toEqual(mockTenantUser)
			expect(result.tenantRecord).toBeDefined()
		})

		it('throws NotFoundException when lease query returns data=null and no error', async () => {
			const leaseQb = createChainBuilder({ data: null, error: null })
			mockUserClient.from.mockReturnValueOnce(leaseQb)

			await expect(
				service.getLeaseDataForPdf(mockToken, mockLeaseId)
			).rejects.toThrow(NotFoundException)
		})

		it('throws NotFoundException when lease query returns an error', async () => {
			const leaseQb = createChainBuilder({
				data: null,
				error: { message: 'permission denied' }
			})
			mockUserClient.from.mockReturnValueOnce(leaseQb)

			await expect(
				service.getLeaseDataForPdf(mockToken, mockLeaseId)
			).rejects.toThrow(NotFoundException)
		})

		it('throws NotFoundException with Lease not found message', async () => {
			const leaseQb = createChainBuilder({ data: null, error: null })
			mockUserClient.from.mockReturnValueOnce(leaseQb)

			await expect(
				service.getLeaseDataForPdf(mockToken, mockLeaseId)
			).rejects.toThrow('Lease not found')
		})

		it('throws NotFoundException when landlord data is null', async () => {
			const leaseWithRelations = buildMockLeaseWithRelations()
			const leaseQb = createChainBuilder({ data: leaseWithRelations, error: null })
			const landlordQb = createChainBuilder({ data: null, error: null })

			mockUserClient.from
				.mockReturnValueOnce(leaseQb)
				.mockReturnValueOnce(landlordQb)

			await expect(
				service.getLeaseDataForPdf(mockToken, mockLeaseId)
			).rejects.toThrow(NotFoundException)
		})

		it('throws NotFoundException with Landlord not found when landlord query errors', async () => {
			const leaseWithRelations = buildMockLeaseWithRelations()
			const leaseQb = createChainBuilder({ data: leaseWithRelations, error: null })
			const landlordQb = createChainBuilder({
				data: null,
				error: { message: 'no rows returned' }
			})

			mockUserClient.from
				.mockReturnValueOnce(leaseQb)
				.mockReturnValueOnce(landlordQb)

			await expect(
				service.getLeaseDataForPdf(mockToken, mockLeaseId)
			).rejects.toThrow('Landlord not found')
		})

		it('throws NotFoundException with Property not found when unit.property is null', async () => {
			const leaseWithRelations = buildMockLeaseWithRelations({
				unit: { ...mockUnit, property: null }
			})
			const leaseQb = createChainBuilder({ data: leaseWithRelations, error: null })
			const landlordQb = createChainBuilder({ data: mockLandlord, error: null })

			mockUserClient.from
				.mockReturnValueOnce(leaseQb)
				.mockReturnValueOnce(landlordQb)

			await expect(
				service.getLeaseDataForPdf(mockToken, mockLeaseId)
			).rejects.toThrow('Property not found for lease')
		})

		it('throws NotFoundException when unit relation itself is null', async () => {
			const leaseWithRelations = buildMockLeaseWithRelations({ unit: null })
			const leaseQb = createChainBuilder({ data: leaseWithRelations, error: null })
			const landlordQb = createChainBuilder({ data: mockLandlord, error: null })

			mockUserClient.from
				.mockReturnValueOnce(leaseQb)
				.mockReturnValueOnce(landlordQb)

			await expect(
				service.getLeaseDataForPdf(mockToken, mockLeaseId)
			).rejects.toThrow(NotFoundException)
		})

		it('throws NotFoundException with Tenant user not found when tenant.user is null', async () => {
			const leaseWithRelations = buildMockLeaseWithRelations({
				tenant: { ...mockTenantRecord, user: null }
			})
			const leaseQb = createChainBuilder({ data: leaseWithRelations, error: null })
			const landlordQb = createChainBuilder({ data: mockLandlord, error: null })

			mockUserClient.from
				.mockReturnValueOnce(leaseQb)
				.mockReturnValueOnce(landlordQb)

			await expect(
				service.getLeaseDataForPdf(mockToken, mockLeaseId)
			).rejects.toThrow('Tenant user not found')
		})

		it('throws NotFoundException when tenant relation itself is null', async () => {
			const leaseWithRelations = buildMockLeaseWithRelations({ tenant: null })
			const leaseQb = createChainBuilder({ data: leaseWithRelations, error: null })
			const landlordQb = createChainBuilder({ data: mockLandlord, error: null })

			mockUserClient.from
				.mockReturnValueOnce(leaseQb)
				.mockReturnValueOnce(landlordQb)

			await expect(
				service.getLeaseDataForPdf(mockToken, mockLeaseId)
			).rejects.toThrow(NotFoundException)
		})

		it('queries leases table first, then users table for landlord', async () => {
			const leaseWithRelations = buildMockLeaseWithRelations()
			const leaseQb = createChainBuilder({ data: leaseWithRelations, error: null })
			const landlordQb = createChainBuilder({ data: mockLandlord, error: null })

			mockUserClient.from
				.mockReturnValueOnce(leaseQb)
				.mockReturnValueOnce(landlordQb)

			await service.getLeaseDataForPdf(mockToken, mockLeaseId)

			const fromCalls = mockUserClient.from.mock.calls
			expect(fromCalls[0][0]).toBe('leases')
			expect(fromCalls[1][0]).toBe('users')
		})

		it('queries landlord by owner_user_id from the lease', async () => {
			const leaseWithRelations = buildMockLeaseWithRelations()
			const leaseQb = createChainBuilder({ data: leaseWithRelations, error: null })
			const landlordQb = createChainBuilder({ data: mockLandlord, error: null })

			mockUserClient.from
				.mockReturnValueOnce(leaseQb)
				.mockReturnValueOnce(landlordQb)

			await service.getLeaseDataForPdf(mockToken, mockLeaseId)

			expect(landlordQb.eq).toHaveBeenCalledWith('id', mockUserId)
		})

		it('filters lease query by the provided lease ID', async () => {
			const leaseWithRelations = buildMockLeaseWithRelations()
			const leaseQb = createChainBuilder({ data: leaseWithRelations, error: null })
			const landlordQb = createChainBuilder({ data: mockLandlord, error: null })

			mockUserClient.from
				.mockReturnValueOnce(leaseQb)
				.mockReturnValueOnce(landlordQb)

			await service.getLeaseDataForPdf(mockToken, mockLeaseId)

			expect(leaseQb.eq).toHaveBeenCalledWith('id', mockLeaseId)
		})

		it('extracts property from unit.property nested relation', async () => {
			const specificProperty = { ...mockProperty, name: 'Riverfront Tower' }
			const leaseWithRelations = buildMockLeaseWithRelations({
				unit: { ...mockUnit, property: specificProperty }
			})
			const leaseQb = createChainBuilder({ data: leaseWithRelations, error: null })
			const landlordQb = createChainBuilder({ data: mockLandlord, error: null })

			mockUserClient.from
				.mockReturnValueOnce(leaseQb)
				.mockReturnValueOnce(landlordQb)

			const result = await service.getLeaseDataForPdf(mockToken, mockLeaseId)

			expect(result.property.name).toBe('Riverfront Tower')
		})

		it('extracts tenant user from tenant.user nested relation', async () => {
			const specificTenantUser = { ...mockTenantUser, email: 'specific@test.com' }
			const leaseWithRelations = buildMockLeaseWithRelations({
				tenant: { ...mockTenantRecord, user: specificTenantUser }
			})
			const leaseQb = createChainBuilder({ data: leaseWithRelations, error: null })
			const landlordQb = createChainBuilder({ data: mockLandlord, error: null })

			mockUserClient.from
				.mockReturnValueOnce(leaseQb)
				.mockReturnValueOnce(landlordQb)

			const result = await service.getLeaseDataForPdf(mockToken, mockLeaseId)

			expect(result.tenant.email).toBe('specific@test.com')
		})

		it('uses the user-scoped Supabase client with the provided token', async () => {
			const leaseWithRelations = buildMockLeaseWithRelations()
			const leaseQb = createChainBuilder({ data: leaseWithRelations, error: null })
			const landlordQb = createChainBuilder({ data: mockLandlord, error: null })

			mockUserClient.from
				.mockReturnValueOnce(leaseQb)
				.mockReturnValueOnce(landlordQb)

			await service.getLeaseDataForPdf(mockToken, mockLeaseId)

			expect(mockSupabaseService.getUserClient).toHaveBeenCalledWith(mockToken)
		})
	})
})
