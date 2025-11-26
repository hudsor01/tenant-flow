import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { BadRequestException, NotFoundException, Logger } from '@nestjs/common'
import { TenantQueryService } from './tenant-query.service'
import { SupabaseService } from '../../database/supabase.service'

describe('TenantQueryService', () => {
	let service: TenantQueryService
	let mockSupabaseService: any
	let mockLogger: any

	// Helper to create a flexible Supabase query chain
	const createMockChain = (resolveData: any = [], resolveError: any = null) => {
		const chain: any = {}
		const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'is', 'in', 'or', 'gte', 'lte', 'order', 'not']

		methods.forEach(method => {
			chain[method] = jest.fn(() => chain)
		})

		chain.range = jest.fn(() => Promise.resolve({ data: resolveData, error: resolveError, count: Array.isArray(resolveData) ? resolveData.length : 0 }))
		chain.limit = jest.fn(() => Promise.resolve({ data: resolveData, error: resolveError }))
		chain.single = jest.fn(() => Promise.resolve({
			data: Array.isArray(resolveData) && resolveData.length > 0 ? resolveData[0] : resolveData,
			error: resolveError
		}))
		chain.maybeSingle = jest.fn(() => Promise.resolve({
			data: Array.isArray(resolveData) && resolveData.length > 0 ? resolveData[0] : resolveData,
			error: resolveError
		}))
		chain.then = jest.fn((resolve) => Promise.resolve({ data: resolveData, error: resolveError }).then(resolve))

		return chain
	}

	beforeEach(async () => {
		mockLogger = {
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn()
		}

		mockSupabaseService = {
			getAdminClient: jest.fn(() => ({
				from: jest.fn(() => createMockChain()),
				rpc: jest.fn(() => Promise.resolve({ data: null, error: null }))
			}))
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TenantQueryService,
				{ provide: Logger, useValue: mockLogger },
				{ provide: SupabaseService, useValue: mockSupabaseService }
			]
		}).compile()

		service = module.get<TenantQueryService>(TenantQueryService)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('findAll', () => {
		it('should return all tenants for a user', async () => {
			const mockTenants = [
				{ id: 'tenant-1', user_id: 'user-1' },
				{ id: 'tenant-2', user_id: 'user-1' }
			]

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn(() => createMockChain(mockTenants, null))
			}))

			const result = await service.findAll('user-1')

			expect(result).toEqual(mockTenants)
			expect(mockSupabaseService.getAdminClient).toHaveBeenCalled()
		})

		it('should apply search filter when provided', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn(() => createMockChain([], null))
			}))

			const result = await service.findAll('user-1', { search: 'john' })

			expect(result).toEqual([])
			expect(mockSupabaseService.getAdminClient).toHaveBeenCalled()
		})

		it('should throw BadRequestException when user_id is missing', async () => {
			await expect(service.findAll('')).rejects.toThrow(BadRequestException)
		})

		it('should handle database errors gracefully', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn(() => createMockChain(null, { message: 'DB error' }))
			}))

			await expect(service.findAll('user-1')).rejects.toThrow(BadRequestException)
		})
	})

	describe('findAllWithLeaseInfo', () => {
		it('should return tenants with lease information', async () => {
			const mockTenants = [{ id: 'tenant-1', user_id: 'user-1' }]
			const mockLeases = [{ tenant_id: 'tenant-1', lease: { id: 'lease-1' } }]

			let callCount = 0
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn((table: string) => {
					callCount++
					if (callCount === 1 || table === 'tenants') {
						return createMockChain(mockTenants, null)
					}
					return createMockChain(mockLeases, null)
				})
			}))

			const result = await service.findAllWithLeaseInfo('user-1')

			expect(result).toBeDefined()
			expect(Array.isArray(result)).toBe(true)
		})
	})

	describe('findOne', () => {
		it('should return a single tenant by ID', async () => {
			const mockTenant = { id: 'tenant-1', user_id: 'user-1' }

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn(() => createMockChain(mockTenant, null))
			}))

			const result = await service.findOne('tenant-1')

			expect(result).toEqual(mockTenant)
		})

		it('should throw NotFoundException when tenant not found', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn(() => createMockChain(null, { code: 'PGRST116' }))
			}))

			await expect(service.findOne('missing-tenant')).rejects.toThrow(NotFoundException)
		})
	})

	describe('findOneWithLease', () => {
		it('should return tenant with lease information', async () => {
			const mockTenant = { id: 'tenant-1', user_id: 'user-1', leases: [{ id: 'lease-1' }] }

			let callCount = 0
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn(() => {
					callCount++
					return createMockChain(callCount === 1 ? mockTenant : [], null)
				})
			}))

			const result = await service.findOneWithLease('tenant-1')

			expect(result).toBeDefined()
			expect(result.id).toBe('tenant-1')
		})
	})

	describe('getTenantByAuthUserId', () => {
		it('should return tenant by auth user ID', async () => {
			const mockTenant = { id: 'tenant-1', user_id: 'auth-user-1' }

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn(() => createMockChain(mockTenant, null))
			}))

			const result = await service.getTenantByAuthUserId('auth-user-1')

			expect(result).toEqual(mockTenant)
		})

		it('should throw NotFoundException when tenant not found', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn(() => createMockChain(null, { code: 'PGRST116' }))
			}))

			await expect(service.getTenantByAuthUserId('missing-user')).rejects.toThrow(NotFoundException)
		})
	})

	describe('getStats', () => {
		it('should return tenant statistics', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn(() => createMockChain([], null))
			}))

			const result = await service.getStats('user-1')

			expect(result).toBeDefined()
			expect(result.total).toBeDefined()
			expect(result.active).toBeDefined()
			expect(result.inactive).toBeDefined()
			expect(result.totalTenants).toBeDefined()
			expect(result.activeTenants).toBeDefined()
		})
	})

	describe('getSummary', () => {
		it('should return tenant summary with payment info', async () => {
			const mockTenants = [{ id: 'tenant-1' }, { id: 'tenant-2' }]

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn(() => createMockChain(mockTenants, null))
			}))

			const result = await service.getSummary('user-1')

			expect(result).toBeDefined()
			expect(result.total).toBeDefined()
			expect(result.active).toBeDefined()
		})
	})

	describe('getOwnerPropertyIds', () => {
		it('should return property IDs for an owner', async () => {
			let callCount = 0
			const responses = [
				{ id: 'owner-uuid-1' },  // property_owners lookup (maybeSingle returns object, not array)
				[{ id: 'property-1' }, { id: 'property-2' }]  // properties
			]

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn(() => {
					const response = responses[callCount]
					callCount++
					return createMockChain(Array.isArray(response) ? response : [response], null)
				})
			}))

			const result = await service.getOwnerPropertyIds('owner-1')

			expect(result).toEqual(['property-1', 'property-2'])
		})
	})

	describe('getTenantIdsForOwner', () => {
		it('should return tenant IDs for an owner', async () => {
			let callCount = 0
			const responses = [
				{ id: 'owner-uuid-1' },  // property_owners lookup (maybeSingle returns object)
				[{ id: 'property-1' }],  // properties
				[{ id: 'unit-1' }],       // units
				[{ primary_tenant_id: 'tenant-1' }, { primary_tenant_id: 'tenant-2' }]  // leases
			]

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn(() => {
					const response = responses[callCount]
					callCount++
					return createMockChain(Array.isArray(response) ? response : [response], null)
				})
			}))

			const result = await service.getTenantIdsForOwner('owner-1')

			expect(result).toBeDefined()
			expect(Array.isArray(result)).toBe(true)
		})
	})

	describe('getTenantPaymentHistory', () => {
		it('should return payment history for a tenant', async () => {
			const mockPayments = [
				{ id: 'payment-1', amount_cents: 100000, status: 'succeeded' },
				{ id: 'payment-2', amount_cents: 100000, status: 'succeeded' }
			]

			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn(() => createMockChain(mockPayments, null))
			}))

			const result = await service.getTenantPaymentHistory('tenant-1', 10)

			expect(result).toEqual(mockPayments)
		})
	})

	describe('batchFetchPaymentStatuses', () => {
		it('should fetch payment statuses for multiple tenants', async () => {
			const mockLeases = [
				{ primary_tenant_id: 'tenant-1', rent_amount: 1000 },
				{ primary_tenant_id: 'tenant-2', rent_amount: 1200 }
			]
			const mockPayments = [
				{ tenant_id: 'tenant-1', amount_cents: 100000, status: 'succeeded' }
			]

			let callCount = 0
			mockSupabaseService.getAdminClient = jest.fn(() => ({
				from: jest.fn(() => {
					callCount++
					return createMockChain(callCount === 1 ? mockLeases : mockPayments, null)
				})
			}))

			const result = await service.batchFetchPaymentStatuses(['tenant-1', 'tenant-2'])

			expect(result).toBeDefined()
			expect(result instanceof Map).toBe(true)
		})
	})
})
