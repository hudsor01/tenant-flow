import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { Lease } from '@repo/shared/types/core'
import { randomUUID } from 'crypto'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import { SupabaseService } from '../../database/supabase.service'
import { CurrentUserProvider } from '../../shared/providers/current-user.provider'
import { createMockEmailService } from '../../test-utils/mocks'
import { EmailService } from '../email/email.service'
import { LeasesController } from './leases.controller'
import { LeasesService } from './leases.service'
import { LeaseQueryService } from './lease-query.service'
import { LeaseLifecycleService } from './lease-lifecycle.service'
import type { FindAllLeasesDto } from './dto/find-all-leases.dto'

describe('LeasesController', () => {
	let controller: LeasesController
	let mockLeasesService: jest.Mocked<LeasesService>
	let mockLeaseQueryService: jest.Mocked<LeaseQueryService>
	let mockLifecycleService: jest.Mocked<LeaseLifecycleService>

	const generateUUID = () => randomUUID()

	// Mock authenticated request with authorization header
	const mockRequest = {
		user: { id: 'test-user-id', email: 'test@example.com' },
		headers: { authorization: 'Bearer mock-jwt-token' }
	} as unknown as import('../../shared/types/express-request.types').AuthenticatedRequest

	const createMockLease = (overrides: Partial<Lease> = {}): Lease => ({
		id: generateUUID(),
		primary_tenant_id: generateUUID(),
		unit_id: generateUUID(),
		start_date: '2024-01-01',
		end_date: '2024-12-31',
		rent_amount: 1500.0,
		security_deposit: 3000.0,
		lease_status: 'active',
		payment_day: 1,
		rent_currency: 'USD',
		auto_pay_enabled: false,
		grace_period_days: null,
		late_fee_amount: null,
		late_fee_days: null,
		stripe_subscription_id: null,
		stripe_subscription_status: 'none',
		subscription_failure_reason: null,
		subscription_retry_count: 0,
		subscription_last_attempt_at: null,
		owner_user_id: 'owner-123',
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		// Signature tracking fields
		docuseal_submission_id: null,
		owner_signed_at: null,
		owner_signature_ip: null,
		owner_signature_method: null,
		tenant_signed_at: null,
		tenant_signature_ip: null,
		tenant_signature_method: null,
		sent_for_signature_at: null,
		...overrides
	})

	beforeEach(async () => {
		mockLeasesService = {
			create: jest.fn(),
			update: jest.fn(),
			remove: jest.fn()
		} as unknown as jest.Mocked<LeasesService>

		mockLeaseQueryService = {
			findAll: jest.fn(),
			findOne: jest.fn()
		} as unknown as jest.Mocked<LeaseQueryService>

		mockLifecycleService = {
			renew: jest.fn(),
			terminate: jest.fn()
		} as unknown as jest.Mocked<LeaseLifecycleService>

		const module: TestingModule = await Test.createTestingModule({
			controllers: [LeasesController],
			providers: [
				{
					provide: LeasesService,
					useValue: mockLeasesService
				},
				{
					provide: LeaseQueryService,
					useValue: mockLeaseQueryService
				},
				{
					provide: LeaseLifecycleService,
					useValue: mockLifecycleService
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
				},
				{
					provide: AppLogger,
					useValue: new SilentLogger()
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
			mockLeaseQueryService.findAll.mockResolvedValue({
				data: mockLeases,
				total: mockLeases.length,
				limit: 10,
				offset: 0
			})

			const result = await controller.findAll(
				mockRequest,
				{
					tenant_id: undefined,
					unit_id: undefined,
					property_id: undefined,
					status: undefined,
					limit: 10,
					offset: 0,
					sortBy: 'created_at',
					sortOrder: 'desc'
				}
			)

			// Note: Authentication is handled by @JwtToken() decorator and guards
			expect(mockLeaseQueryService.findAll).toHaveBeenCalledWith('mock-jwt-token', {
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
			mockLeaseQueryService.findAll.mockResolvedValue({
				data: mockLeases,
				total: mockLeases.length,
				limit: 20,
				offset: 10
			})

			const result = await controller.findAll(
				mockRequest,
				{
					tenant_id,
					unit_id,
					property_id,
					status: 'active',
					limit: 20,
					offset: 10,
					sortBy: 'start_date',
					sortOrder: 'asc'
				}
			)

			expect(mockLeaseQueryService.findAll).toHaveBeenCalledWith('mock-jwt-token', {
				tenant_id,
				unit_id,
				property_id,
				status: 'active',
				limit: 20,
				offset: 10,
				sortBy: 'start_date',
				sortOrder: 'asc'
			})
			expect(result.data).toEqual(mockLeases)
		})

		it('should throw BadRequestException for invalid tenant ID format', async () => {
			// Note: In practice, ZodValidationPipe would handle this validation
			// For unit tests, we mock the service to throw for invalid input
			mockLeaseQueryService.findAll.mockRejectedValueOnce(
				new BadRequestException('Invalid UUID format')
			)

			await expect(
				controller.findAll(mockRequest, {
					tenant_id: 'invalid-uuid'
				} as FindAllLeasesDto)
			).rejects.toThrow(BadRequestException)
		})

		it('should reject invalid lease status "expired"', async () => {
			// Note: In practice, ZodValidationPipe would handle this validation
			// For unit tests, we mock the service to throw for invalid input
			mockLeaseQueryService.findAll.mockRejectedValueOnce(
				new BadRequestException('Invalid lease status')
			)

			await expect(
				controller.findAll(mockRequest, {
					tenant_id: undefined,
					unit_id: undefined,
					property_id: undefined,
					status: 'expired' as unknown as Lease['lease_status'] // Invalid status - should be "ended"
				})
			).rejects.toThrow('Invalid lease status')
		})

		it('should accept valid lease status "ended"', async () => {
			const mockLeases = [createMockLease({ lease_status: 'ended' })]
			mockLeaseQueryService.findAll.mockResolvedValue({
				data: mockLeases,
				total: 1,
				limit: 10,
				offset: 0
			})

			const result = await controller.findAll(mockRequest, {
				tenant_id: undefined,
				unit_id: undefined,
				property_id: undefined,
				status: 'ended'
			})

			expect(result.data).toEqual(mockLeases)
		})
	})

	describe('findOne', () => {
		it('should return lease by ID', async () => {
			const lease_id = generateUUID()
			const mockLease = createMockLease({ id: lease_id })
			mockLeaseQueryService.findOne.mockResolvedValue(mockLease)

			const result = await controller.findOne(lease_id, mockRequest)

			expect(mockLeaseQueryService.findOne).toHaveBeenCalledWith(
				'mock-jwt-token',
				lease_id
			)
			expect(result).toEqual(mockLease)
		})

		it('should throw NotFoundException when lease not found', async () => {
			const lease_id = generateUUID()
			mockLeaseQueryService.findOne.mockResolvedValue(null)

			await expect(
				controller.findOne(lease_id, mockRequest)
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

			const result = await controller.create(createRequest, mockRequest)

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
				status: 'active' as const
			}
			const mockLease = createMockLease({ ...updateRequest })
			mockLeasesService.update.mockResolvedValue(mockLease)

			const result = await controller.update(
				lease_id,
				updateRequest,
				mockRequest
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

			await controller.remove(lease_id, mockRequest)

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
			mockLifecycleService.renew.mockResolvedValue(mockLease)

			const result = await controller.renew(
				lease_id,
				end_date,
				mockRequest
			)

			expect(mockLifecycleService.renew).toHaveBeenCalledWith(
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
			const mockLease = createMockLease({ lease_status: 'terminated' })
			mockLifecycleService.terminate.mockResolvedValue(mockLease)

			const result = await controller.terminate(
				lease_id,
				mockRequest,
				reason
			)

			expect(mockLifecycleService.terminate).toHaveBeenCalledWith(
				'mock-jwt-token',
				lease_id,
				expect.any(String),
				reason
			)
			expect(result).toEqual(mockLease)
		})
	})
})
