import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { Lease } from '@repo/shared/types/core'
import { randomUUID } from 'crypto'
import { SilentLogger } from '../../__test__/silent-logger'
import { SupabaseService } from '../../database/supabase.service'
import { CurrentUserProvider } from '../../shared/providers/current-user.provider'
import { createMockEmailService } from '../../test-utils/mocks'
import { EmailService } from '../email/email.service'
import { LeasesController } from './leases.controller'
import { LeasesService } from './leases.service'

describe('LeasesController', () => {
	let controller: LeasesController
	let mockLeasesService: jest.Mocked<LeasesService>

	const generateUUID = () => randomUUID()

	const createMockLease = (overrides: Partial<Lease> = {}): Lease => ({
		id: generateUUID(),
		primary_tenant_id: generateUUID(),
		unit_id: generateUUID(),
		start_date: '2024-01-01',
		end_date: '2024-12-31',
		rent_amount: 1500.0,
		security_deposit: 3000.0,
		lease_status: 'ACTIVE',
		payment_day: 1,
		rent_currency: 'USD',
		auto_pay_enabled: false,
		grace_period_days: null,
		late_fee_amount: null,
		late_fee_days: null,
		stripe_subscription_id: null,
		property_owner_id: 'owner-123',
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		...overrides
	})

	beforeEach(async () => {
		mockLeasesService = {
			findAll: jest.fn(),
			getStats: jest.fn(),
			getExpiring: jest.fn(),
			findOne: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			remove: jest.fn(),
			renew: jest.fn(),
			terminate: jest.fn(),
			getAnalytics: jest.fn()
		} as unknown as jest.Mocked<LeasesService>

		const module: TestingModule = await Test.createTestingModule({
			controllers: [LeasesController],
			providers: [
				{
					provide: LeasesService,
					useValue: mockLeasesService
				},
				{
					provide: SupabaseService,
					useValue: {
						getUser: jest
							.fn()
							.mockImplementation(req => Promise.resolve(req.user))
					}
				},
				{
					provide: CurrentUserProvider,
					useValue: {
						getuser_id: jest.fn().mockResolvedValue('user-123'),
						getUser: jest
							.fn()
							.mockResolvedValue({ id: 'user-123', email: 'test@example.com' }),
						getUserEmail: jest.fn().mockResolvedValue('test@example.com'),
						isAuthenticated: jest.fn().mockResolvedValue(true),
						getUserOrNull: jest
							.fn()
							.mockResolvedValue({ id: 'user-123', email: 'test@example.com' })
					}
				},
				{
					provide: EmailService,
					useValue: createMockEmailService()
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		controller = module.get<LeasesController>(LeasesController)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('findAll', () => {
		it('should return all leases with default pagination', async () => {
			const mockLeases = [createMockLease(), createMockLease()]
			mockLeasesService.findAll.mockResolvedValue({
				data: mockLeases,
				total: mockLeases.length,
				limit: 10,
				offset: 0
			})

			const result = await controller.findAll(
				'mock-jwt-token', // JWT token
				undefined,
				undefined,
				undefined,
				undefined,
				10,
				0,
				'created_at',
				'desc'
			)

			// Note: Authentication is handled by @JwtToken() decorator and guards
			expect(mockLeasesService.findAll).toHaveBeenCalledWith('mock-jwt-token', {
				tenant_id: undefined,
				unit_id: undefined,
				property_id: undefined,
				status: undefined,
				limit: 10,
				offset: 0,
				sortBy: 'created_at',
				sortOrder: 'desc'
			})
			expect(result.data).toEqual(mockLeases)
		})

		it('should return filtered leases with custom parameters', async () => {
			const tenant_id = generateUUID()
			const unit_id = generateUUID()
			const property_id = generateUUID()
			const mockLeases = [createMockLease()]
			mockLeasesService.findAll.mockResolvedValue({
				data: mockLeases,
				total: mockLeases.length,
				limit: 20,
				offset: 10
			})

			const result = await controller.findAll(
				'mock-jwt-token', // JWT token
				tenant_id,
				unit_id,
				property_id,
				'ACTIVE',
				20,
				10,
				'start_date',
				'asc'
			)

			expect(mockLeasesService.findAll).toHaveBeenCalledWith('mock-jwt-token', {
				tenant_id,
				unit_id,
				property_id,
				status: 'ACTIVE',
				limit: 20,
				offset: 10,
				sortBy: 'start_date',
				sortOrder: 'asc'
			})
			expect(result.data).toEqual(mockLeases)
		})

		it('should throw BadRequestException for invalid tenant ID format', async () => {
			await expect(
				controller.findAll('mock-jwt-token', 'invalid-uuid')
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('getStats', () => {
		it('should return lease statistics', async () => {
			const mockStats = {
				totalLeases: 25,
				activeLeases: 20,
				expiredLeases: 3,
				terminatedLeases: 2,
				totalMonthlyRent: 55000,
				averageRent: 2750,
				totalsecurity_deposits: 12000,
				expiringLeases: 5
			}
			mockLeasesService.getStats.mockResolvedValue(mockStats)

			const result = await controller.getStats('mock-jwt-token')

			expect(mockLeasesService.getStats).toHaveBeenCalledWith('mock-jwt-token')
			expect(result).toEqual(mockStats)
		})
	})

	describe('getExpiring', () => {
		it('should return expiring leases with default days', async () => {
			const mockExpiring = [createMockLease()]
			mockLeasesService.getExpiring.mockResolvedValue(mockExpiring)

			const result = await controller.getExpiring('mock-jwt-token', 30)

			expect(mockLeasesService.getExpiring).toHaveBeenCalledWith(
				'mock-jwt-token',
				30
			)
			expect(result).toEqual(mockExpiring)
		})
	})

	describe('findOne', () => {
		it('should return lease by ID', async () => {
			const lease_id = generateUUID()
			const mockLease = createMockLease({ id: lease_id })
			mockLeasesService.findOne.mockResolvedValue(mockLease)

			const result = await controller.findOne(lease_id, 'mock-jwt-token')

			expect(mockLeasesService.findOne).toHaveBeenCalledWith(
				'mock-jwt-token',
				lease_id
			)
			expect(result).toEqual(mockLease)
		})

		it('should throw NotFoundException when lease not found', async () => {
			const lease_id = generateUUID()
			mockLeasesService.findOne.mockResolvedValue(null)

			await expect(
				controller.findOne(lease_id, 'mock-jwt-token')
			).rejects.toThrow(NotFoundException)
		})
	})

	describe('create', () => {
		it('should create new lease', async () => {
			const createRequest = {
				primary_tenant_id: generateUUID(),
				unit_id: generateUUID(),
				tenant_ids: [generateUUID()],
				start_date: '2024-01-01',
				end_date: '2024-12-31',
				rent_amount: 1500.0,
				security_deposit: 3000.0,
				rent_currency: 'USD',
				payment_day: 1,
				lease_status: 'draft' as const,
				auto_pay_enabled: false
			}
			const mockLease = createMockLease()
			mockLeasesService.create.mockResolvedValue(mockLease)

			const result = await controller.create(createRequest, 'mock-jwt-token')

			expect(mockLeasesService.create).toHaveBeenCalledWith(
				'mock-jwt-token',
				createRequest
			)
			expect(result).toEqual(mockLease)
		})
	})

	describe('update', () => {
		it('should update existing lease', async () => {
			const lease_id = generateUUID()
			const updateRequest = {
				rent_amount: 1600.0,
				security_deposit: 3200.0,
				status: 'ACTIVE' as const
			}
			const mockLease = createMockLease({ ...updateRequest })
			mockLeasesService.update.mockResolvedValue(mockLease)

			const result = await controller.update(
				lease_id,
				updateRequest,
				'mock-jwt-token'
			)

			expect(mockLeasesService.update).toHaveBeenCalledWith(
				'mock-jwt-token',
				lease_id,
				updateRequest
			)
			expect(result).toEqual(mockLease)
		})
	})

	describe('remove', () => {
		it('should delete lease', async () => {
			const lease_id = generateUUID()
			mockLeasesService.remove.mockResolvedValue(undefined)

			await controller.remove(lease_id, 'mock-jwt-token')

			expect(mockLeasesService.remove).toHaveBeenCalledWith(
				'mock-jwt-token',
				lease_id
			)
		})
	})

	describe('renew', () => {
		it('should renew lease with valid end date', async () => {
			const lease_id = generateUUID()
			const end_date = '2025-12-31'
			const mockLease = createMockLease({ end_date: end_date })
			mockLeasesService.renew.mockResolvedValue(mockLease)

			const result = await controller.renew(lease_id, end_date, 'mock-jwt-token')

			expect(mockLeasesService.renew).toHaveBeenCalledWith(
				'mock-jwt-token',
				lease_id,
				end_date
			)
			expect(result).toEqual(mockLease)
		})
	})

	describe('terminate', () => {
		it('should terminate lease with reason', async () => {
			const lease_id = generateUUID()
			const reason = 'Tenant violation'
			const mockLease = createMockLease({ lease_status: 'TERMINATED' })
			mockLeasesService.terminate.mockResolvedValue(mockLease)

			const result = await controller.terminate(
				lease_id,
				'mock-jwt-token',
				reason
			)

			expect(mockLeasesService.terminate).toHaveBeenCalledWith(
				'mock-jwt-token',
				lease_id,
				expect.any(String),
				reason
			)
			expect(result).toEqual(mockLease)
		})
	})
})
