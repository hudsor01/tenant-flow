/**
 * RentPaymentContextService Tests
 * Tests tenant/lease context loading and authorization
 */

import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { Database } from '@repo/shared/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseService } from '../../database/supabase.service'
import { RentPaymentContextService } from './rent-payment-context.service'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

type UserRow = Database['public']['Tables']['users']['Row']
type TenantRow = Database['public']['Tables']['tenants']['Row']
type LeaseRow = Database['public']['Tables']['leases']['Row']
type UnitRow = Database['public']['Tables']['units']['Row']
type PropertyRow = Database['public']['Tables']['properties']['Row']
type StripeAccountRow =
	Database['public']['Tables']['stripe_connected_accounts']['Row']

describe('RentPaymentContextService', () => {
	let service: RentPaymentContextService
	let mockAdminClient: SupabaseClient<Database>

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
	} as UserRow

	const mockOwnerUser = {
		id: mockOwnerId,
		email: 'owner@example.com',
		first_name: 'Property',
		last_name: 'Owner',
		full_name: 'Property Owner'
	} as UserRow

	const mockTenant = {
		id: mockTenantId,
		user_id: mockUserId,
		created_at: '2025-01-01T00:00:00Z'
	} as TenantRow

	// Nested join result structure matching LeaseWithOwnerData
	// Now includes tenant for authorization check
	const mockLeaseWithOwnerData: LeaseRow & {
		tenant: Pick<TenantRow, 'user_id'>
		unit: UnitRow & {
			property: PropertyRow & {
				stripe_connected_account: StripeAccountRow | null
				owner: UserRow
			}
		}
	} = {
		id: mockLeaseId,
		primary_tenant_id: mockTenantId,
		unit_id: 'unit-001',
		rent_amount: 150000,
		stripe_subscription_id: 'sub_test123',
		tenant: {
			user_id: mockUserId
		},
		unit: {
			id: 'unit-001',
			property_id: 'prop-001',
			property: {
				owner_user_id: mockOwnerId,
				stripe_connected_account: {
					stripe_account_id: 'acct_456'
				},
				owner: mockOwnerUser
			}
		}
	}

	// Helper to create query builder mock for single results
	const createSingleQueryMock = <T>(data: T, shouldError = false) => ({
		select: jest.fn().mockReturnThis(),
		eq: jest.fn().mockReturnThis(),
		single: jest.fn().mockResolvedValue({
			data: shouldError ? null : data,
			error: shouldError ? { message: 'Not found' } : null
		})
	})

	// Helper for verifyTenantAccess nested join query with .limit().maybeSingle()
	const createMaybeSingleQueryMock = <T>(data: T, shouldError = false) => ({
		select: jest.fn().mockReturnThis(),
		eq: jest.fn().mockReturnThis(),
		limit: jest.fn().mockReturnThis(),
		maybeSingle: jest.fn().mockResolvedValue({
			data: shouldError ? null : data,
			error: shouldError ? { message: 'Not found' } : null
		})
	})

	beforeEach(async () => {
		mockAdminClient = {
			from: jest.fn()
		} as unknown as SupabaseClient<Database>

		const mockSupabaseService = {
			getAdminClient: jest.fn().mockReturnValue(mockAdminClient)
		}

		const module = await Test.createTestingModule({
			providers: [
				RentPaymentContextService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
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
			// Single query with nested joins - includes tenant for authorization
			mockAdminClient.from.mockReturnValue(
				createSingleQueryMock(mockLeaseWithOwnerData)
			)

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
			// Single query with nested joins - includes tenant for authorization
			mockAdminClient.from.mockReturnValue(
				createSingleQueryMock(mockLeaseWithOwnerData)
			)

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
			// Single query with nested joins - includes tenant for authorization
			mockAdminClient.from.mockReturnValue(
				createSingleQueryMock(mockLeaseWithOwnerData)
			)

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

		it('should allow property owner to access tenant via lease relationship', async () => {
			const tenantWithUser = { ...mockTenant, users: mockUser }
			// Nested join result for verifyTenantAccess - verifies ownership through relationship chain
			const leaseWithOwner = {
				id: mockLeaseId,
				unit: {
					property: {
						owner_user_id: 'other-user-id'
					}
				}
			}

			mockAdminClient.from
				.mockReturnValueOnce(createSingleQueryMock(tenantWithUser))
				.mockReturnValueOnce(createMaybeSingleQueryMock(leaseWithOwner))

			await expect(
				service.verifyTenantAccess('other-user-id', mockTenantId)
			).resolves.not.toThrow()
		})

		it('should throw ForbiddenException when user is not authorized', async () => {
			const tenantWithUser = { ...mockTenant, users: mockUser }
			// No lease found or owner doesn't match
			mockAdminClient.from
				.mockReturnValueOnce(createSingleQueryMock(tenantWithUser))
				.mockReturnValueOnce(createMaybeSingleQueryMock(null, true))

			await expect(
				service.verifyTenantAccess('unauthorized-user', mockTenantId)
			).rejects.toThrow(ForbiddenException)
		})

		it('should throw ForbiddenException when lease exists but owner does not match', async () => {
			const tenantWithUser = { ...mockTenant, users: mockUser }
			// Lease exists but requesting user is not the owner
			const leaseWithDifferentOwner = {
				id: mockLeaseId,
				unit: {
					property: {
						owner_user_id: 'actual-owner-id'
					}
				}
			}

			mockAdminClient.from
				.mockReturnValueOnce(createSingleQueryMock(tenantWithUser))
				.mockReturnValueOnce(
					createMaybeSingleQueryMock(leaseWithDifferentOwner)
				)

			await expect(
				service.verifyTenantAccess('wrong-user-id', mockTenantId)
			).rejects.toThrow(ForbiddenException)
		})
	})
})
