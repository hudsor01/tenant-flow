import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { TenantQueryService } from './tenant-query.service'
import { TenantDetailService } from './tenant-detail.service'
import { TenantListService } from './tenant-list.service'
import { TenantStatsService } from './tenant-stats.service'
import { TenantRelationService } from './tenant-relation.service'
import { TenantInvitationQueryService } from './tenant-invitation-query.service'
import { SilentLogger } from '../../__test__/silent-logger'

/**
 * TenantQueryService is now a facade/coordinator that delegates to specialized services.
 * These tests verify the delegation behavior without testing the actual implementations.
 * The implementations are tested in their respective service test files.
 */
describe('TenantQueryService', () => {
	let service: TenantQueryService
	let mockDetailService: jest.Mocked<TenantDetailService>
	let mockListService: jest.Mocked<TenantListService>
	let mockStatsService: jest.Mocked<TenantStatsService>
	let mockRelationService: jest.Mocked<TenantRelationService>
	let mockInvitationService: jest.Mocked<TenantInvitationQueryService>

	const mockUserId = 'user-123'
	const mockTenantId = 'tenant-456'

	const mockTenant = {
		id: mockTenantId,
		user_id: mockUserId,
		emergency_contact_name: 'John Doe',
		emergency_contact_phone: '555-1234',
		emergency_contact_relationship: 'Parent',
		identity_verified: true,
		created_at: '2024-01-01T00:00:00Z',
		updated_at: '2024-01-01T00:00:00Z'
	}

	beforeEach(async () => {
		mockDetailService = {
			findOne: jest.fn(),
			findOneWithLease: jest.fn(),
			getTenantByAuthUserId: jest.fn()
		} as any

		mockListService = {
			findAll: jest.fn(),
			findAllWithLeaseInfo: jest.fn()
		} as any

		mockStatsService = {
			getStats: jest.fn(),
			getSummary: jest.fn(),
			fetchPaymentStatuses: jest.fn()
		} as any

		mockRelationService = {
			getOwnerPropertyIds: jest.fn(),
			getTenantIdsForOwner: jest.fn(),
			getTenantPaymentHistory: jest.fn(),
			batchFetchPaymentStatuses: jest.fn()
		} as any

		mockInvitationService = {
			getInvitations: jest.fn(),
			computeInvitationStatus: jest.fn()
		} as any

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TenantQueryService,
				{ provide: TenantDetailService, useValue: mockDetailService },
				{ provide: TenantListService, useValue: mockListService },
				{ provide: TenantStatsService, useValue: mockStatsService },
				{ provide: TenantRelationService, useValue: mockRelationService },
				{ provide: TenantInvitationQueryService, useValue: mockInvitationService }
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<TenantQueryService>(TenantQueryService)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('List queries delegation', () => {
		it('findAll delegates to TenantListService', async () => {
			const mockTenants = [mockTenant]
			mockListService.findAll.mockResolvedValue(mockTenants as any)

			const result = await service.findAll(mockUserId)

			expect(mockListService.findAll).toHaveBeenCalledWith(mockUserId, {})
			expect(result).toEqual(mockTenants)
		})

		it('findAll passes filters to TenantListService', async () => {
			mockListService.findAll.mockResolvedValue([])

			const filters = { search: 'test', limit: 10, offset: 5 }
			await service.findAll(mockUserId, filters)

			expect(mockListService.findAll).toHaveBeenCalledWith(mockUserId, filters)
		})

		it('findAllWithLeaseInfo delegates to TenantListService', async () => {
			const mockTenantsWithLease = [{ ...mockTenant, lease: null }]
			mockListService.findAllWithLeaseInfo.mockResolvedValue(
				mockTenantsWithLease as any
			)

			const result = await service.findAllWithLeaseInfo(mockUserId)

			expect(mockListService.findAllWithLeaseInfo).toHaveBeenCalledWith(
				mockUserId,
				{}
			)
			expect(result).toEqual(mockTenantsWithLease)
		})
	})

	describe('Detail queries delegation', () => {
		it('findOne delegates to TenantDetailService', async () => {
			mockDetailService.findOne.mockResolvedValue(mockTenant as any)

			const result = await service.findOne(mockTenantId)

			expect(mockDetailService.findOne).toHaveBeenCalledWith(mockTenantId)
			expect(result).toEqual(mockTenant)
		})

		it('findOneWithLease delegates to TenantDetailService', async () => {
			const mockTenantWithLease = { ...mockTenant, lease: null }
			mockDetailService.findOneWithLease.mockResolvedValue(
				mockTenantWithLease as any
			)

			const result = await service.findOneWithLease(mockTenantId)

			expect(mockDetailService.findOneWithLease).toHaveBeenCalledWith(
				mockTenantId
			)
			expect(result).toEqual(mockTenantWithLease)
		})

		it('getTenantByAuthUserId delegates to TenantDetailService', async () => {
			mockDetailService.getTenantByAuthUserId.mockResolvedValue(
				mockTenant as any
			)

			const result = await service.getTenantByAuthUserId(mockUserId)

			expect(mockDetailService.getTenantByAuthUserId).toHaveBeenCalledWith(
				mockUserId
			)
			expect(result).toEqual(mockTenant)
		})
	})

	describe('Stats queries delegation', () => {
		it('getStats delegates to TenantStatsService', async () => {
			const mockStats = {
				total: 5,
				active: 5,
				inactive: 0,
				totalTenants: 5,
				activeTenants: 5
			}
			mockStatsService.getStats.mockResolvedValue(mockStats as any)

			const result = await service.getStats(mockUserId)

			expect(mockStatsService.getStats).toHaveBeenCalledWith(mockUserId)
			expect(result).toEqual(mockStats)
		})

		it('getSummary delegates to TenantStatsService', async () => {
			const mockSummary = {
				total: 3,
				active: 3,
				invited: 0,
				overdueBalanceCents: 0,
				upcomingDueCents: 0,
				timestamp: '2024-01-01T00:00:00Z'
			}
			mockStatsService.getSummary.mockResolvedValue(mockSummary as any)

			const result = await service.getSummary(mockUserId)

			expect(mockStatsService.getSummary).toHaveBeenCalledWith(mockUserId)
			expect(result).toEqual(mockSummary)
		})

		it('fetchPaymentStatuses delegates to TenantStatsService', async () => {
			const mockPayments = [{ id: 'payment-1', tenant_id: mockTenantId }]
			mockStatsService.fetchPaymentStatuses.mockResolvedValue(
				mockPayments as any
			)

			const tenantIds = [mockTenantId]
			const result = await service.fetchPaymentStatuses(tenantIds)

			expect(mockStatsService.fetchPaymentStatuses).toHaveBeenCalledWith(
				tenantIds
			)
			expect(result).toEqual(mockPayments)
		})
	})

	describe('Relation queries delegation', () => {
		it('getOwnerPropertyIds delegates to TenantRelationService', async () => {
			const mockPropertyIds = ['prop-1', 'prop-2']
			mockRelationService.getOwnerPropertyIds.mockResolvedValue(mockPropertyIds)

			const result = await service.getOwnerPropertyIds(mockUserId)

			expect(mockRelationService.getOwnerPropertyIds).toHaveBeenCalledWith(
				mockUserId
			)
			expect(result).toEqual(mockPropertyIds)
		})

		it('getTenantIdsForOwner delegates to TenantRelationService', async () => {
			const mockTenantIds = ['tenant-1', 'tenant-2']
			mockRelationService.getTenantIdsForOwner.mockResolvedValue(mockTenantIds)

			const result = await service.getTenantIdsForOwner(mockUserId)

			expect(mockRelationService.getTenantIdsForOwner).toHaveBeenCalledWith(
				mockUserId
			)
			expect(result).toEqual(mockTenantIds)
		})

		it('getTenantPaymentHistory delegates to TenantRelationService', async () => {
			const mockPayments = [{ id: 'payment-1', tenant_id: mockTenantId }]
			mockRelationService.getTenantPaymentHistory.mockResolvedValue(
				mockPayments as any
			)

			const result = await service.getTenantPaymentHistory(mockTenantId)

			expect(mockRelationService.getTenantPaymentHistory).toHaveBeenCalledWith(
				mockTenantId,
				undefined
			)
			expect(result).toEqual(mockPayments)
		})

		it('getTenantPaymentHistory passes limit to TenantRelationService', async () => {
			mockRelationService.getTenantPaymentHistory.mockResolvedValue([])

			await service.getTenantPaymentHistory(mockTenantId, 10)

			expect(mockRelationService.getTenantPaymentHistory).toHaveBeenCalledWith(
				mockTenantId,
				10
			)
		})

		it('getTenantPaymentHistoryForTenant is an alias for getTenantPaymentHistory', async () => {
			const mockPayments = [{ id: 'payment-1' }]
			mockRelationService.getTenantPaymentHistory.mockResolvedValue(
				mockPayments as any
			)

			const result = await service.getTenantPaymentHistoryForTenant(
				mockTenantId,
				5
			)

			expect(mockRelationService.getTenantPaymentHistory).toHaveBeenCalledWith(
				mockTenantId,
				5
			)
			expect(result).toEqual(mockPayments)
		})

		it('batchFetchPaymentStatuses delegates to TenantRelationService', async () => {
			const mockStatusMap = new Map([
				['tenant-1', { id: 'payment-1' } as any]
			])
			mockRelationService.batchFetchPaymentStatuses.mockResolvedValue(
				mockStatusMap
			)

			const tenantIds = ['tenant-1', 'tenant-2']
			const result = await service.batchFetchPaymentStatuses(tenantIds)

			expect(
				mockRelationService.batchFetchPaymentStatuses
			).toHaveBeenCalledWith(tenantIds)
			expect(result).toEqual(mockStatusMap)
		})
	})

	describe('Invitation queries delegation', () => {
		it('getInvitations delegates to TenantInvitationQueryService', async () => {
			const mockInvitations = {
				data: [{ id: 'inv-1', email: 'test@example.com' }],
				total: 1
			}
			mockInvitationService.getInvitations.mockResolvedValue(
				mockInvitations as any
			)

			const result = await service.getInvitations(mockUserId)

			expect(mockInvitationService.getInvitations).toHaveBeenCalledWith(
				mockUserId,
				undefined
			)
			expect(result).toEqual(mockInvitations)
		})

		it('getInvitations passes filters to TenantInvitationQueryService', async () => {
			mockInvitationService.getInvitations.mockResolvedValue({
				data: [],
				total: 0
			})

			const filters = { status: 'sent' as const, page: 2, limit: 10 }
			await service.getInvitations(mockUserId, filters)

			expect(mockInvitationService.getInvitations).toHaveBeenCalledWith(
				mockUserId,
				filters
			)
		})
	})
})
