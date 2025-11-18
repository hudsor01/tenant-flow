import { BadRequestException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { randomUUID } from 'crypto'
import { SilentLogger } from '../../__test__/silent-logger'
import { SupabaseService } from '../../database/supabase.service'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { LateFeesController } from './late-fees.controller'
import { LateFeesService } from './late-fees.service'

describe('LateFeesController', () => {
	let controller: LateFeesController
	let mockLateFeesService: jest.Mocked<Partial<LateFeesService>>
	let mockSupabaseService: jest.Mocked<Partial<SupabaseService>>
	let mockAdminClient: any
	let singleResponses: Array<{ data: any; error: any }>

	const generateUUID = () => randomUUID()

	const createMockRequest = (user_id?: string): AuthenticatedRequest => {
		if (user_id === undefined) {
			const req = {} as Partial<AuthenticatedRequest>
			return req as AuthenticatedRequest
		}

		return {
			user: { id: user_id }
		} as unknown as AuthenticatedRequest
	}

	const createUnauthenticatedRequest = (): AuthenticatedRequest =>
		({}) as AuthenticatedRequest

	const enqueueSingleResponses = (
		...responses: Array<{ data: any; error: any }>
	) => {
		singleResponses.push(...responses)

		// return a helper so tests can chain and attach mockResolvedValue
		return (targetMock: jest.Mock) => targetMock
	}

	const mockLeaseOwnershipSuccess = (lease_id?: string) => {
		const unit_id = generateUUID()
		const property_id = lease_id ?? generateUUID()

		const inner = (targetMock?: jest.Mock) => {
			enqueueSingleResponses(
				{ data: { unit_id }, error: null },
				{ data: { property_id }, error: null },
				{ data: { id: property_id }, error: null }
			)

			// If a mock is provided, return it so callers can chain mockResolvedValue
			// otherwise return a no-op jest.fn() to keep chaining safe
			return targetMock ?? (jest.fn() as jest.Mock)
		}

		// enqueue immediately for tests that call mockLeaseOwnershipSuccess() directly
		inner()

		return inner
	}

	beforeEach(async () => {
		singleResponses = []

		mockAdminClient = {
			from: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			single: jest.fn(
				async () => singleResponses.shift() ?? { data: null, error: null }
			)
		}

		mockLateFeesService = {
			getLateFeeConfig: jest.fn(),
			updateLateFeeConfig: jest.fn(),
			calculateLateFee: jest.fn(),
			getOverduePayments: jest.fn(),
			processLateFees: jest.fn(),
			applyLateFeeToInvoice: jest.fn()
		}

		mockSupabaseService = {
			getUser: jest.fn(),
			getAdminClient: jest.fn().mockReturnValue(mockAdminClient),
			getUserClient: jest.fn().mockReturnValue(mockAdminClient),
			getTokenFromRequest: jest.fn().mockReturnValue('mock-jwt-token')
		}

		const module: TestingModule = await Test.createTestingModule({
			controllers: [LateFeesController],
			providers: [
				{
					provide: LateFeesService,
					useValue: mockLateFeesService
				},
				{
					provide: SupabaseService,
					useValue: mockSupabaseService
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		controller = module.get<LateFeesController>(LateFeesController)

		// Replace injected services with mocks
		;(controller as any).lateFeesService = mockLateFeesService
		;(controller as any).supabaseService = mockSupabaseService

		// Spy on logger
		jest.spyOn(controller['logger'], 'log').mockImplementation(() => {})
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('getConfig', () => {
		it('should return late fee configuration for a lease', async () => {
			const lease_id = generateUUID()
			const user_id = generateUUID()
			const mockConfig = {
				lease_id,
				gracePeriodDays: 5,
				flatFeeAmount: 50
			}

			mockLeaseOwnershipSuccess()(
				mockLateFeesService.getLateFeeConfig as jest.Mock
			).mockResolvedValue(mockConfig)

			const result = await controller.getConfig(
				createMockRequest(user_id),
				lease_id
			)

			expect(result.success).toBe(true)
			expect(result.data).toEqual(mockConfig)
			expect(mockLateFeesService.getLateFeeConfig).toHaveBeenCalledWith(lease_id, 'mock-jwt-token')
		})

		it('should throw BadRequestException when service not available', async () => {
			;(controller as any).lateFeesService = undefined

			await expect(
				controller.getConfig(createMockRequest(), generateUUID())
			).rejects.toThrow(BadRequestException)
		})

		it('should throw BadRequestException when user not authenticated', async () => {
			await expect(
				controller.getConfig(createUnauthenticatedRequest(), generateUUID())
			).rejects.toThrow('Authentication required')
		})
	})

	describe('updateConfig', () => {
		it('should update late fee configuration', async () => {
			const lease_id = generateUUID()
			const user_id = generateUUID()

			mockLeaseOwnershipSuccess()(
				mockLateFeesService.updateLateFeeConfig as jest.Mock
			).mockResolvedValue(undefined)

			const result = await controller.updateConfig(
				createMockRequest(user_id),
				lease_id,
				7,
				75
			)

			expect(result.success).toBe(true)
			expect(result.message).toContain('updated successfully')
			expect(mockLateFeesService.updateLateFeeConfig).toHaveBeenCalledWith(
				lease_id,
				'mock-jwt-token',
				{
					lease_id,
					gracePeriodDays: 7,
					flatFeeAmount: 75
				}
			)
		})

		it('should reject invalid grace period (negative)', async () => {
			const user_id = generateUUID()
			const lease_id = generateUUID()
			mockLeaseOwnershipSuccess(lease_id)

			await expect(
				controller.updateConfig(
					createMockRequest(user_id),
					lease_id,
					-1,
					undefined
				)
			).rejects.toThrow('Grace period must be between 0 and 30 days')
		})

		it('should reject invalid grace period (too large)', async () => {
			const user_id = generateUUID()
			const lease_id = generateUUID()
			mockLeaseOwnershipSuccess(lease_id)

			await expect(
				controller.updateConfig(
					createMockRequest(user_id),
					lease_id,
					31,
					undefined
				)
			).rejects.toThrow('Grace period must be between 0 and 30 days')
		})

		it('should reject invalid flat fee (negative)', async () => {
			const user_id = generateUUID()
			const lease_id = generateUUID()
			mockLeaseOwnershipSuccess(lease_id)

			await expect(
				controller.updateConfig(
					createMockRequest(user_id),
					lease_id,
					undefined,
					-10
				)
			).rejects.toThrow('Flat fee amount must be between $0 and $500')
		})

		it('should reject invalid flat fee (too large)', async () => {
			const user_id = generateUUID()
			const lease_id = generateUUID()
			mockLeaseOwnershipSuccess(lease_id)

			await expect(
				controller.updateConfig(
					createMockRequest(user_id),
					lease_id,
					undefined,
					501
				)
			).rejects.toThrow('Flat fee amount must be between $0 and $500')
		})
	})

	describe('calculateLateFee', () => {
		it('should calculate late fee for given parameters', async () => {
			const user_id = generateUUID()
			const mockCalculation = {
				rent_amount: 1500,
				daysLate: 10,
				gracePeriod: 5,
				late_fee_amount: 50,
				shouldApplyFee: true,
				reason: '5 days past due'
			}

			;(mockLateFeesService.calculateLateFee as jest.Mock).mockReturnValue(
				mockCalculation
			)

			const result = await controller.calculateLateFee(
				createMockRequest(user_id),
				1500,
				10,
				undefined
			)

			expect(result.success).toBe(true)
			expect(result.data).toEqual(mockCalculation)
			expect(mockLateFeesService.calculateLateFee).toHaveBeenCalledWith(
				1500,
				10,
				undefined
			)
		})

		it('should calculate late fee with lease config when lease_id provided', async () => {
			const user_id = generateUUID()
			const lease_id = generateUUID()
			const mockConfig = {
				gracePeriodDays: 7,
				flatFeeAmount: 75
			}

			mockLeaseOwnershipSuccess(lease_id)(
				mockLateFeesService.getLateFeeConfig as jest.Mock
			).mockResolvedValue(mockConfig)
			;(mockLateFeesService.calculateLateFee as jest.Mock).mockReturnValue({
				late_fee_amount: 75
			})

			await controller.calculateLateFee(
				createMockRequest(user_id),
				1500,
				10,
				lease_id
			)

			expect(mockLateFeesService.getLateFeeConfig).toHaveBeenCalledWith(lease_id, 'mock-jwt-token')
			expect(mockLateFeesService.calculateLateFee).toHaveBeenCalledWith(
				1500,
				10,
				mockConfig
			)
		})

		it('should reject invalid rent amount (zero)', async () => {
			const user_id = generateUUID()

			await expect(
				controller.calculateLateFee(createMockRequest(user_id), 0, 10, undefined)
			).rejects.toThrow('Rent amount must be positive')
		})

		it('should reject invalid rent amount (negative)', async () => {
			const user_id = generateUUID()

			await expect(
				controller.calculateLateFee(
					createMockRequest(user_id),
					-100,
					10,
					undefined
				)
			).rejects.toThrow('Rent amount must be positive')
		})

		it('should reject invalid days late (negative)', async () => {
			const user_id = generateUUID()

			await expect(
				controller.calculateLateFee(
					createMockRequest(user_id),
					1500,
					-1,
					undefined
				)
			).rejects.toThrow('Days late must be non-negative')
		})
	})

	describe('getOverduePayments', () => {
		it('should return overdue payments for a lease', async () => {
			const lease_id = generateUUID()
			const user_id = generateUUID()
			const mockConfig = { gracePeriodDays: 5 }
			const mockPayments = [
				{
					id: generateUUID(),
					amount: 1500,
					dueDate: new Date().toISOString(),
					daysOverdue: 10,
					lateFeeApplied: false
				}
			]

			;(mockLateFeesService.getLateFeeConfig as jest.Mock).mockResolvedValue(
				mockConfig
			)
			mockLeaseOwnershipSuccess(lease_id)(
				mockLateFeesService.getOverduePayments as jest.Mock
			).mockResolvedValue(mockPayments)

			const result = await controller.getOverduePayments(
				createMockRequest(user_id),
				lease_id
			)

			expect(result.success).toBe(true)
			expect(result.data.payments).toEqual(mockPayments)
			expect(result.data.gracePeriod).toBe(5)
		})
	})

	describe('processLateFees', () => {
		it('should process late fees for all overdue payments', async () => {
			const lease_id = generateUUID()
			const user_id = generateUUID()
			const mockResult = {
				processed: 2,
				totalLateFees: 100,
				details: [
					{ paymentId: generateUUID(), late_fee_amount: 50, daysOverdue: 10 },
					{ paymentId: generateUUID(), late_fee_amount: 50, daysOverdue: 12 }
				]
			}

			mockLeaseOwnershipSuccess(lease_id)(
				mockLateFeesService.processLateFees as jest.Mock
			).mockResolvedValue(mockResult)

			const result = await controller.processLateFees(
				createMockRequest(user_id),
				lease_id
			)

			expect(result.success).toBe(true)
			expect(result.data).toEqual(mockResult)
			expect(result.message).toContain('Processed 2 late fee')
			expect(result.message).toContain('$100.00')
		})
	})

	describe('applyLateFee', () => {
		it('should apply late fee to specific payment', async () => {
			const paymentId = generateUUID()
			const lease_id = generateUUID()
			const user_id = generateUUID()
			const mockPayment = {
				id: paymentId,
				lease_id,
				stripePaymentIntentId: 'pi_123'
			}
			const mockUser = {
				stripe_customer_id: 'cus_123'
			}
			const mockInvoiceItem = {
				id: 'ii_123',
				amount: 5000
			}

			enqueueSingleResponses(
				{ data: mockPayment, error: null },
				{ data: mockUser, error: null }
			)(
				mockLateFeesService.applyLateFeeToInvoice as jest.Mock
			).mockResolvedValue(mockInvoiceItem)

			const result = await controller.applyLateFee(
				createMockRequest(user_id),
				paymentId,
				50,
				'Payment overdue'
			)

			expect(result.success).toBe(true)
			expect(result.data.invoiceItemId).toBe('ii_123')
			expect(result.data.amount).toBe(50)
			expect(mockLateFeesService.applyLateFeeToInvoice).toHaveBeenCalledWith(
				'cus_123',
				lease_id,
				paymentId,
				50,
				'Payment overdue',
				'mock-jwt-token'
			)
		})

		it('should reject invalid late fee amount (zero)', async () => {
			const user_id = generateUUID()

			await expect(
				controller.applyLateFee(
					createMockRequest(user_id),
					generateUUID(),
					0,
					'test'
				)
			).rejects.toThrow('Late fee amount must be positive')
		})

		it('should reject invalid late fee amount (negative)', async () => {
			const user_id = generateUUID()

			await expect(
				controller.applyLateFee(
					createMockRequest(user_id),
					generateUUID(),
					-10,
					'test'
				)
			).rejects.toThrow('Late fee amount must be positive')
		})

		it('should reject empty reason', async () => {
			const user_id = generateUUID()

			await expect(
				controller.applyLateFee(
					createMockRequest(user_id),
					generateUUID(),
					50,
					''
				)
			).rejects.toThrow('Reason is required')
		})

		it('should reject whitespace-only reason', async () => {
			const user_id = generateUUID()

			await expect(
				controller.applyLateFee(
					createMockRequest(user_id),
					generateUUID(),
					50,
					'   '
				)
			).rejects.toThrow('Reason is required')
		})

		it('should throw BadRequestException when payment not found', async () => {
			const user_id = generateUUID()

			enqueueSingleResponses({
				data: null,
				error: { message: 'Not found' }
			})

			await expect(
				controller.applyLateFee(
					createMockRequest(user_id),
					generateUUID(),
					50,
					'test'
				)
			).rejects.toThrow('Payment not found')
		})

		it('should throw BadRequestException when user Stripe customer not found', async () => {
			const user_id = generateUUID()
			const mockPayment = {
				id: generateUUID(),
				lease_id: generateUUID()
			}

			enqueueSingleResponses(
				{ data: mockPayment, error: null },
				{ data: null, error: { message: 'Not found' } }
			)

			await expect(
				controller.applyLateFee(
					createMockRequest(user_id),
					generateUUID(),
					50,
					'test'
				)
			).rejects.toThrow('User Stripe customer not found')
		})
	})
})
