import { NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import { SupabaseService } from '../../database/supabase.service'
import { TenantDetailService } from './tenant-detail.service'

describe('TenantDetailService', () => {
	let service: TenantDetailService
	let mockSupabaseService: jest.Mocked<SupabaseService>

	const mockTenantId = 'tenant-123'
	const mockAuthUserId = 'user-456'

	const mockTenant = {
		id: mockTenantId,
		user_id: mockAuthUserId,
		emergency_contact_name: 'John Doe',
		emergency_contact_phone: '555-1234',
		emergency_contact_relationship: 'Parent',
		identity_verified: true,
		created_at: '2024-01-01T00:00:00Z',
		updated_at: '2024-01-01T00:00:00Z'
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

	describe('findOne', () => {
		it('returns tenant by ID', async () => {
			const mockClient = mockSupabaseService.getAdminClient()
			const mockBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({ data: mockTenant, error: null })
			}
			;(mockClient.from as jest.Mock).mockReturnValue(mockBuilder)

			const result = await service.findOne(mockTenantId)

			expect(result).toEqual(mockTenant)
			expect(mockClient.from).toHaveBeenCalledWith('tenants')
		})

		it('throws NotFoundException when tenant not found', async () => {
			const mockClient = mockSupabaseService.getAdminClient()
			const mockBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } })
			}
			;(mockClient.from as jest.Mock).mockReturnValue(mockBuilder)

			await expect(service.findOne(mockTenantId)).rejects.toThrow(NotFoundException)
		})

		it('throws error when tenant ID is missing', async () => {
			await expect(service.findOne('')).rejects.toThrow('Tenant ID required')
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

			const mockClient = mockSupabaseService.getAdminClient()

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
				limit: jest.fn().mockResolvedValue({ data: [{ lease: mockLease }], error: null })
			}

			;(mockClient.from as jest.Mock)
				.mockReturnValueOnce(tenantBuilder)
				.mockReturnValueOnce(leaseBuilder)

			const result = await service.findOneWithLease(mockTenantId)

			expect(result).toMatchObject({
				...mockTenant,
				lease: mockLease
			})
		})

		it('returns tenant with null lease when no lease found', async () => {
			const mockClient = mockSupabaseService.getAdminClient()

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

			;(mockClient.from as jest.Mock)
				.mockReturnValueOnce(tenantBuilder)
				.mockReturnValueOnce(leaseBuilder)

			const result = await service.findOneWithLease(mockTenantId)

			expect((result as any).lease).toBeNull()
		})
	})

	describe('getTenantByAuthUserId', () => {
		it('returns tenant by auth user ID', async () => {
			const mockClient = mockSupabaseService.getAdminClient()
			const mockBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({ data: mockTenant, error: null })
			}
			;(mockClient.from as jest.Mock).mockReturnValue(mockBuilder)

			const result = await service.getTenantByAuthUserId(mockAuthUserId)

			expect(result).toEqual(mockTenant)
			expect(mockBuilder.eq).toHaveBeenCalledWith('user_id', mockAuthUserId)
		})

		it('throws NotFoundException when tenant not found for auth user', async () => {
			const mockClient = mockSupabaseService.getAdminClient()
			const mockBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } })
			}
			;(mockClient.from as jest.Mock).mockReturnValue(mockBuilder)

			await expect(service.getTenantByAuthUserId(mockAuthUserId)).rejects.toThrow(NotFoundException)
		})

		it('throws error when auth user ID is missing', async () => {
			await expect(service.getTenantByAuthUserId('')).rejects.toThrow('Auth user ID required')
		})
	})
})
