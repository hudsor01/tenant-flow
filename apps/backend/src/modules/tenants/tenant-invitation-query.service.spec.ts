import { BadRequestException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import { SupabaseService } from '../../database/supabase.service'
import { TenantInvitationQueryService } from './tenant-invitation-query.service'

describe('TenantInvitationQueryService', () => {
	let service: TenantInvitationQueryService
	let mockSupabaseService: jest.Mocked<SupabaseService>

	const mockUserId = 'user-123'
	const mockOwnerId = 'owner-456'

	const mockRawInvitation = {
		id: 'inv-1',
		email: 'tenant@example.com',
		first_name: 'John',
		last_name: 'Doe',
		unit_id: 'unit-1',
		owner_user_id: mockOwnerId,
		created_at: '2024-01-01T00:00:00Z',
		expires_at: '2099-01-01T00:00:00Z', // Far future to be "sent"
		accepted_at: null,
		status: null,
		unit: {
			unit_number: '101',
			property: {
				name: 'Test Property'
			}
		}
	}

	beforeEach(async () => {
		const mockAdminClient = {
			from: jest.fn()
		}

		mockSupabaseService = {
			getAdminClient: jest.fn().mockReturnValue(mockAdminClient)
		} as unknown as jest.Mocked<SupabaseService>

		const module = await Test.createTestingModule({
			providers: [
				TenantInvitationQueryService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<TenantInvitationQueryService>(
			TenantInvitationQueryService
		)
	})

	describe('getInvitations', () => {
		it('returns paginated invitations for an owner', async () => {
			const mockClient = mockSupabaseService.getAdminClient()

			// owner_user_id schema: query invitations directly
			const ownerBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({
					data: { id: mockOwnerId },
					error: null
				})
			}

			// Mock invitations query
			const invitationsBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				is: jest.fn().mockReturnThis(),
				lt: jest.fn().mockReturnThis(),
				gte: jest.fn().mockReturnThis(),
				not: jest.fn().mockReturnThis(),
				range: jest.fn().mockResolvedValue({
					data: [mockRawInvitation],
					count: 1,
					error: null
				})
			}

			;(mockClient.from as jest.Mock)
					.mockReturnValueOnce(invitationsBuilder)

			const result = await service.getInvitations(mockUserId)

			expect(result.data).toHaveLength(1)
			expect(result.total).toBe(1)
			expect(result.data[0]?.email).toBe('tenant@example.com')
			expect(result.data[0]?.unit_number).toBe('101')
			expect(result.data[0]?.property_name).toBe('Test Property')
			expect(result.data[0]?.status).toBe('sent')
		})

		it('returns empty result when user is not an owner', async () => {
		const mockClient = mockSupabaseService.getAdminClient()

		// Mock invitations query returning empty results (user has no invitations)
		const invitationsBuilder = {
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			order: jest.fn().mockReturnThis(),
			range: jest.fn().mockResolvedValue({
				data: [],
				count: 0,
				error: null
			})
		}

		;(mockClient.from as jest.Mock).mockReturnValueOnce(invitationsBuilder)

		const result = await service.getInvitations(mockUserId)

		expect(result.data).toEqual([])
		expect(result.total).toBe(0)
	})

		it('throws BadRequestException when user ID is missing', async () => {
			await expect(service.getInvitations('')).rejects.toThrow(
				BadRequestException
			)
		})

		it('filters by status correctly', async () => {
			const mockClient = mockSupabaseService.getAdminClient()

			const ownerBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({
					data: { id: mockOwnerId },
					error: null
				})
			}

			const invitationsBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				is: jest.fn().mockReturnThis(),
				lt: jest.fn().mockReturnThis(),
				gte: jest.fn().mockReturnThis(),
				not: jest.fn().mockReturnThis(),
				range: jest.fn().mockResolvedValue({
					data: [],
					count: 0,
					error: null
				})
			}

			;(mockClient.from as jest.Mock)
					.mockReturnValueOnce(invitationsBuilder)

			await service.getInvitations(mockUserId, { status: 'expired' })

			// Should filter for expired invitations
			expect(invitationsBuilder.is).toHaveBeenCalledWith('accepted_at', null)
			expect(invitationsBuilder.lt).toHaveBeenCalled()
		})

		it('applies pagination correctly', async () => {
			const mockClient = mockSupabaseService.getAdminClient()

			const ownerBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({
					data: { id: mockOwnerId },
					error: null
				})
			}

			const invitationsBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				is: jest.fn().mockReturnThis(),
				lt: jest.fn().mockReturnThis(),
				gte: jest.fn().mockReturnThis(),
				not: jest.fn().mockReturnThis(),
				range: jest.fn().mockResolvedValue({
					data: [],
					count: 0,
					error: null
				})
			}

			;(mockClient.from as jest.Mock)
					.mockReturnValueOnce(invitationsBuilder)

			await service.getInvitations(mockUserId, { page: 2, limit: 10 })

			// Page 2 with limit 10 = offset 10, range 10-19
			expect(invitationsBuilder.range).toHaveBeenCalledWith(10, 19)
		})

		it('throws BadRequestException on query error', async () => {
			const mockClient = mockSupabaseService.getAdminClient()

			const ownerBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({
					data: { id: mockOwnerId },
					error: null
				})
			}

			const invitationsBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				is: jest.fn().mockReturnThis(),
				lt: jest.fn().mockReturnThis(),
				gte: jest.fn().mockReturnThis(),
				not: jest.fn().mockReturnThis(),
				range: jest.fn().mockResolvedValue({
					data: null,
					count: null,
					error: { message: 'Database error' }
				})
			}

			;(mockClient.from as jest.Mock)
					.mockReturnValueOnce(invitationsBuilder)

			await expect(service.getInvitations(mockUserId)).rejects.toThrow(
				BadRequestException
			)
		})
	})

	describe('computeInvitationStatus', () => {
		it('returns "accepted" when invitation has accepted_at', () => {
			const result = service.computeInvitationStatus({
				accepted_at: '2024-01-01T00:00:00Z',
				expires_at: '2025-01-01T00:00:00Z'
			})
			expect(result).toBe('accepted')
		})

		it('returns "expired" when invitation is past expiry date', () => {
			const result = service.computeInvitationStatus({
				accepted_at: null,
				expires_at: '2020-01-01T00:00:00Z' // Past date
			})
			expect(result).toBe('expired')
		})

		it('returns "sent" when invitation is not accepted and not expired', () => {
			const result = service.computeInvitationStatus({
				accepted_at: null,
				expires_at: '2099-01-01T00:00:00Z' // Future date
			})
			expect(result).toBe('sent')
		})
	})
})
