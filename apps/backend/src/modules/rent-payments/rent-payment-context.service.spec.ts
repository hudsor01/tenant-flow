/**
 * RentPaymentContextService Tests
 * Tests tenant/lease context loading and authorization
 */

import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { SupabaseService } from '../../database/supabase.service'
import { RentPaymentContextService } from './rent-payment-context.service'

describe('RentPaymentContextService', () => {
	let service: RentPaymentContextService
	let mockAdminClient: any

	// Test data
	const mockTenantId = 'tenant-123'
	const mockLeaseId = 'lease-456'
	const mockUserId = 'user-789'
	const mockOwnerId = 'owner-abc'

	const mockUser = {
		id: mockUserId,
		email: 'tenant@example.com',
		first_name: 'Test',
		last_name: 'Tenant',
		full_name: 'Test Tenant',
		phone: '555-1234'
	}

	const mockOwnerUser = {
		id: mockOwnerId,
		email: 'owner@example.com',
		first_name: 'Property',
		last_name: 'Owner',
		full_name: 'Property Owner'
	}

	const mockTenant = {
		id: mockTenantId,
		user_id: mockUserId,
		created_at: '2025-01-01T00:00:00Z'
	}

	// Nested join result structure matching LeaseWithOwnerData
	const mockLeaseWithOwnerData = {
		id: mockLeaseId,
		primary_tenant_id: mockTenantId,
		unit_id: 'unit-001',
		rent_amount: 150000,
		stripe_subscription_id: 'sub_test123',
		unit: {
			id: 'unit-001',
			property_id: 'prop-001',
			property: {
				property_owner_id: mockOwnerId,
				owner: {
					user_id: mockOwnerId,
					stripe_account_id: 'acct_456',
					user: mockOwnerUser
				}
			}
		}
	}

	// Helper to create query builder mock for single results
	const createSingleQueryMock = (data: any, shouldError = false) => ({
		select: jest.fn().mockReturnThis(),
		eq: jest.fn().mockReturnThis(),
		single: jest.fn().mockResolvedValue({
			data: shouldError ? null : data,
			error: shouldError ? { message: 'Not found' } : null
		})
	})

	beforeEach(async () => {
		mockAdminClient = {
			from: jest.fn()
		}

		const mockSupabaseService = {
			getAdminClient: jest.fn().mockReturnValue(mockAdminClient)
		}

		const module = await Test.createTestingModule({
			providers: [
				RentPaymentContextService,
				{ provide: SupabaseService, useValue: mockSupabaseService }
			]
		}).compile()

		service = module.get<RentPaymentContextService>(RentPaymentContextService)
	})

	describe('getTenantContext', () => {
		it('should return tenant context with user details', async () => {
			const tenantWithUser = { ...mockTenant, users: mockUser }
			mockAdminClient.from.mockReturnValue(
				createSingleQueryMock(tenantWithUser)
			)

			const result = await service.getTenantContext(mockTenantId)

			expect(result.tenant).toMatchObject(mockTenant)
			expect(result.tenantUser).toMatchObject(mockUser)
			expect(mockAdminClient.from).toHaveBeenCalledWith('tenants')
		})

		it('should throw NotFoundException when tenant not found', async () => {
			mockAdminClient.from.mockReturnValue(createSingleQueryMock(null, true))

			await expect(service.getTenantContext('nonexistent')).rejects.toThrow(
				NotFoundException
			)
		})
	})

	describe('getLeaseContext', () => {
		it('should return lease context with owner details using nested joins', async () => {
			// First call: lease with nested joins
			// Second call: getTenantContext (for authorization)
			const tenantWithUser = { ...mockTenant, users: mockUser }
			mockAdminClient.from
				.mockReturnValueOnce(createSingleQueryMock(mockLeaseWithOwnerData))
				.mockReturnValueOnce(createSingleQueryMock(tenantWithUser))

			const result = await service.getLeaseContext(
				mockLeaseId,
				mockTenantId,
				mockUserId // Tenant is requesting
			)

			expect(result.lease.id).toBe(mockLeaseId)
			expect(result.ownerUser).toMatchObject(mockOwnerUser)
			expect(result.stripeAccountId).toBe('acct_456')
		})

		it('should allow owner to access lease', async () => {
			const tenantWithUser = { ...mockTenant, users: mockUser }
			mockAdminClient.from
				.mockReturnValueOnce(createSingleQueryMock(mockLeaseWithOwnerData))
				.mockReturnValueOnce(createSingleQueryMock(tenantWithUser))

			const result = await service.getLeaseContext(
				mockLeaseId,
				mockTenantId,
				mockOwnerId // Owner is requesting
			)

			expect(result.lease.id).toBe(mockLeaseId)
		})

		it('should throw ForbiddenException when lease does not belong to tenant', async () => {
			const wrongTenantLease = {
				...mockLeaseWithOwnerData,
				primary_tenant_id: 'other-tenant'
			}
			mockAdminClient.from.mockReturnValue(
				createSingleQueryMock(wrongTenantLease)
			)

			await expect(
				service.getLeaseContext(mockLeaseId, mockTenantId, mockUserId)
			).rejects.toThrow(ForbiddenException)
		})

		it('should throw NotFoundException when lease not found', async () => {
			mockAdminClient.from.mockReturnValue(createSingleQueryMock(null, true))

			await expect(
				service.getLeaseContext('nonexistent', mockTenantId, mockUserId)
			).rejects.toThrow(NotFoundException)
		})

		it('should throw NotFoundException when nested owner data is missing', async () => {
			const leaseWithoutOwner = {
				...mockLeaseWithOwnerData,
				unit: {
					...mockLeaseWithOwnerData.unit,
					property: {
						...mockLeaseWithOwnerData.unit.property,
						owner: null
					}
				}
			}
			mockAdminClient.from.mockReturnValue(
				createSingleQueryMock(leaseWithoutOwner)
			)

			await expect(
				service.getLeaseContext(mockLeaseId, mockTenantId, mockUserId)
			).rejects.toThrow(NotFoundException)
		})

		it('should throw ForbiddenException when user is neither owner nor tenant', async () => {
			const tenantWithUser = { ...mockTenant, users: mockUser }
			mockAdminClient.from
				.mockReturnValueOnce(createSingleQueryMock(mockLeaseWithOwnerData))
				.mockReturnValueOnce(createSingleQueryMock(tenantWithUser))

			await expect(
				service.getLeaseContext(
					mockLeaseId,
					mockTenantId,
					'unauthorized-user-id'
				)
			).rejects.toThrow(ForbiddenException)
		})
	})

	describe('verifyTenantAccess', () => {
		it('should allow tenant user to access their own tenant', async () => {
			const tenantWithUser = { ...mockTenant, users: mockUser }
			mockAdminClient.from.mockReturnValue(
				createSingleQueryMock(tenantWithUser)
			)

			await expect(
				service.verifyTenantAccess(mockUserId, mockTenantId)
			).resolves.not.toThrow()
		})

		it('should allow property owner to access tenant', async () => {
			const tenantWithUser = { ...mockTenant, users: mockUser }
			const propertyOwner = { user_id: 'other-user-id' }

			mockAdminClient.from
				.mockReturnValueOnce(createSingleQueryMock(tenantWithUser))
				.mockReturnValueOnce(createSingleQueryMock(propertyOwner))

			await expect(
				service.verifyTenantAccess('other-user-id', mockTenantId)
			).resolves.not.toThrow()
		})

		it('should throw ForbiddenException when user is not authorized', async () => {
			const tenantWithUser = { ...mockTenant, users: mockUser }
			mockAdminClient.from
				.mockReturnValueOnce(createSingleQueryMock(tenantWithUser))
				.mockReturnValueOnce(createSingleQueryMock(null, true))

			await expect(
				service.verifyTenantAccess('unauthorized-user', mockTenantId)
			).rejects.toThrow(ForbiddenException)
		})
	})
})
