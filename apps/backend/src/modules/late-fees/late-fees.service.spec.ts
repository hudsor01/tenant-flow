import { BadRequestException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { randomUUID } from 'crypto'
import type Stripe from 'stripe'
import { SilentLogger } from '../../__test__/silent-logger'
import { SupabaseService } from '../../database/supabase.service'
import { StripeClientService } from '../../shared/stripe-client.service'
import { LateFeesService } from './late-fees.service'

describe('LateFeesService', () => {
	let service: LateFeesService
	let mockSupabaseService: jest.Mocked<Partial<SupabaseService>>
	let mockStripeClientService: jest.Mocked<Partial<StripeClientService>>
	let mockStripe: jest.Mocked<Partial<Stripe>>
	let mockAdminClient: any

	const generateUUID = () => randomUUID()

	beforeEach(async () => {
		// Mock Supabase admin client
		mockAdminClient = {
			from: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			insert: jest.fn().mockReturnThis(),
			update: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			in: jest.fn().mockReturnThis(),
			order: jest.fn().mockReturnThis(),
			single: jest.fn()
		}

		mockSupabaseService = {
			getAdminClient: jest.fn().mockReturnValue(mockAdminClient),
			getUserClient: jest.fn().mockReturnValue(mockAdminClient),
			getTokenFromRequest: jest.fn().mockReturnValue('mock-jwt-token')
		}

		// Mock Stripe instance
		mockStripe = {
			invoiceItems: {
				create: jest.fn()
			} as any
		}

		// Mock StripeClientService
		mockStripeClientService = {
			getClient: jest.fn().mockReturnValue(mockStripe)
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				LateFeesService,
				{
					provide: SupabaseService,
					useValue: mockSupabaseService
				},
				{
					provide: StripeClientService,
					useValue: mockStripeClientService
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<LateFeesService>(LateFeesService)

		// Spy on logger to suppress output
		jest.spyOn(service['logger'], 'log').mockImplementation(() => {})
		jest.spyOn(service['logger'], 'error').mockImplementation(() => {})
		jest.spyOn(service['logger'], 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('calculateLateFee', () => {
		it('should return zero late fee within grace period', () => {
			const result = service.calculateLateFee(1500, 3, { gracePeriodDays: 5 })

			expect(result.late_fee_amount).toBe(0)
			expect(result.shouldApplyFee).toBe(false)
			expect(result.reason).toContain('Within 5-day grace period')
		})

		it('should return flat fee when past grace period', () => {
			const result = service.calculateLateFee(800, 10)

			expect(result.late_fee_amount).toBe(50) // Default $50 flat fee
			expect(result.shouldApplyFee).toBe(true)
			expect(result.daysLate).toBe(10)
		})

		it('should use custom grace period configuration', () => {
			const result = service.calculateLateFee(1500, 8, { gracePeriodDays: 10 })

			expect(result.late_fee_amount).toBe(0)
			expect(result.shouldApplyFee).toBe(false)
			expect(result.reason).toContain('Within 10-day grace period')
		})

		it('should use custom flat fee amount', () => {
			const result = service.calculateLateFee(2000, 10, { flatFeeAmount: 75 })

			expect(result.late_fee_amount).toBe(75)
			expect(result.shouldApplyFee).toBe(true)
		})

		it('should calculate days past due correctly', () => {
			const result = service.calculateLateFee(1500, 12, { gracePeriodDays: 5 })

			expect(result.reason).toContain('7 days past due')
			expect(result.shouldApplyFee).toBe(true)
		})
	})

	describe('getLateFeeConfig', () => {
		it('should return lease late fee configuration from database', async () => {
			const lease_id = generateUUID()
			const mockLease = {
				id: lease_id,
				grace_period_days: 7,
				late_fee_amount: 75,
				lateFeePercentage: 0.06,
				tenant: {
					users: {
						id: 'user123',
						email: 'tenant@example.com',
						first_name: 'John',
						last_name: 'Doe'
					}
				}
			}

			mockAdminClient.single.mockResolvedValue({
				data: mockLease,
				error: null
			})

			const result = await service.getLateFeeConfig(lease_id, 'mock-jwt-token')

			expect(result).toEqual({
				lease_id,
				gracePeriodDays: 7,
				flatFeeAmount: 75
			})
			expect(mockAdminClient.from).toHaveBeenCalledWith('leases')
			expect(mockAdminClient.eq).toHaveBeenCalledWith('id', lease_id)
		})

		it('should return default configuration when lease not found', async () => {
			const lease_id = generateUUID()

			mockAdminClient.single.mockResolvedValue({
				data: null,
				error: { message: 'Not found' }
			})

			const result = await service.getLateFeeConfig(lease_id, 'mock-jwt-token')

			expect(result).toEqual({
				lease_id,
				gracePeriodDays: 5,
				flatFeeAmount: 50
			})
		})

		it('should use defaults for null database values', async () => {
			const lease_id = generateUUID()
			const mockLease = {
				id: lease_id,
				gracePeriodDays: null,
				late_fee_amount: null,
				lateFeePercentage: null
			}

			mockAdminClient.single.mockResolvedValue({
				data: mockLease,
				error: null
			})

			const result = await service.getLateFeeConfig(lease_id, 'mock-jwt-token')

			expect(result.gracePeriodDays).toBe(5)
			expect(result.flatFeeAmount).toBe(50)
		})
	})

	describe('applyLateFeeToInvoice', () => {
		it('should create Stripe invoice item and update payment', async () => {
			const customerId = 'cus_123'
			const lease_id = generateUUID()
			const rentPaymentId = generateUUID()
			const late_fee_amount = 50
			const reason = 'Payment 7 days overdue'

			const mockInvoiceItem = {
				id: 'ii_123',
				amount: 5000,
				customer: customerId
			}

			;(mockStripe.invoiceItems!.create as jest.Mock).mockResolvedValue(
				mockInvoiceItem
			)

			// Mock the full chain for update
			mockAdminClient.eq.mockResolvedValue({ data: {}, error: null })

			const result = await service.applyLateFeeToInvoice(
				customerId,
				lease_id,
				rentPaymentId,
				late_fee_amount,
				reason,
				'mock-jwt-token'
			)

			// Verify Stripe invoice item created
			expect(mockStripe.invoiceItems!.create).toHaveBeenCalledWith({
				customer: customerId,
				amount: 5000, // $50 in cents
				currency: 'usd',
				description: `Late Fee: ${reason}`,
				metadata: {
					type: 'late_fee',
					lease_id,
					rentPaymentId,
					reason
				}
			})

			// Verify payment updated in database
			expect(mockAdminClient.update).toHaveBeenCalledWith({
				late_fee_amount: 5000,
				updated_at: expect.any(String)
			})

			expect(result).toEqual(mockInvoiceItem)
		})

		it('should throw BadRequestException when Stripe fails', async () => {
			;(mockStripe.invoiceItems!.create as jest.Mock).mockRejectedValue(
				new Error('Stripe error')
			)

			await expect(
				service.applyLateFeeToInvoice(
					'cus_123',
					generateUUID(),
					generateUUID(),
					50,
					'test',
					'mock-jwt-token'
				)
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('getOverduePayments', () => {
		it('should return payments overdue past grace period', async () => {
			const lease_id = generateUUID()
			const now = new Date()
			const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)

			const mockPayments = [
				{
					id: generateUUID(),
					amount: 150000, // $1500 in cents
					due_date: tenDaysAgo.toISOString(),
					late_fee_amount: null,
					status: 'PENDING'
				}
			]

			mockAdminClient.single.mockResolvedValue({
				data: mockPayments,
				error: null
			})
			mockAdminClient.order.mockResolvedValue({
				data: mockPayments,
				error: null
			})

			const result = await service.getOverduePayments(
				lease_id,
				'mock-jwt-token',
				5
			)

			expect(result).toHaveLength(1)
			expect(result[0]?.amount).toBe(1500) // Converted from cents
			expect(result[0]?.daysOverdue).toBeGreaterThanOrEqual(9)
			expect(result[0]?.lateFeeApplied).toBe(false)
		})

		it('should filter out payments within grace period', async () => {
			const lease_id = generateUUID()
			const now = new Date()
			const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

			const mockPayments = [
				{
					id: generateUUID(),
					amount: 150000,
					dueDate: threeDaysAgo.toISOString(),
					lateFeeApplied: false,
					status: 'pending'
				}
			]

			mockAdminClient.order.mockResolvedValue({
				data: mockPayments,
				error: null
			})

			const result = await service.getOverduePayments(
				lease_id,
				'mock-jwt-token',
				5
			)

			expect(result).toHaveLength(0)
		})

		it('should filter out payments with late fee already applied', async () => {
			const lease_id = generateUUID()
			const now = new Date()
			const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)

			const mockPayments = [
				{
					id: generateUUID(),
					amount: 150000,
					dueDate: tenDaysAgo.toISOString(),
					lateFeeApplied: true,
					status: 'pending'
				}
			]

			mockAdminClient.order.mockResolvedValue({
				data: mockPayments,
				error: null
			})

			const result = await service.getOverduePayments(
				lease_id,
				'mock-jwt-token',
				5
			)

			expect(result).toHaveLength(0)
		})

		it('should throw BadRequestException on database error', async () => {
			mockAdminClient.order.mockResolvedValue({
				data: null,
				error: { message: 'Database error' }
			})

			await expect(
				service.getOverduePayments(generateUUID(), 'mock-jwt-token')
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('processLateFees', () => {
		it('should process late fees for all overdue payments', async () => {
			const lease_id = generateUUID()
			const owner_id = generateUUID()
			const paymentId1 = generateUUID()
			const paymentId2 = generateUUID()

			// Mock late fee config
			const mockConfig = {
				lease_id,
				gracePeriodDays: 5,
				flatFeeAmount: 50
			}

			jest.spyOn(service, 'getLateFeeConfig').mockResolvedValue(mockConfig)

			// Mock overdue payments
			const mockOverduePayments = [
				{
					id: paymentId1,
					amount: 1500,
					dueDate: new Date().toISOString(),
					daysOverdue: 10,
					lateFeeApplied: false
				},
				{
					id: paymentId2,
					amount: 800,
					dueDate: new Date().toISOString(),
					daysOverdue: 7,
					lateFeeApplied: false
				}
			]

			jest
				.spyOn(service, 'getOverduePayments')
				.mockResolvedValue(mockOverduePayments)

			// Mock owner Stripe customer
			mockAdminClient.single.mockResolvedValue({
				data: { stripe_customer_id: 'cus_123' },
				error: null
			})

			// Mock Stripe invoice item creation
			const applyLateFeeToInvoiceSpy = jest
				.spyOn(service, 'applyLateFeeToInvoice')
				.mockResolvedValue({
					id: 'ii_123'
				} as any)

			const result = await service.processLateFees(
				lease_id,
				'mock-jwt-token',
				owner_id
			)

			expect(result.processed).toBe(2)
			expect(result.totalLateFees).toBeGreaterThan(0)
			expect(result.details).toHaveLength(2)
			expect(applyLateFeeToInvoiceSpy).toHaveBeenCalledTimes(2)
		})

		it('should return zero processed when no overdue payments', async () => {
			const lease_id = generateUUID()
			const owner_id = generateUUID()

			jest.spyOn(service, 'getLateFeeConfig').mockResolvedValue({
				lease_id,
				gracePeriodDays: 5,
				flatFeeAmount: 50
			})

			jest.spyOn(service, 'getOverduePayments').mockResolvedValue([])

			const result = await service.processLateFees(
				lease_id,
				'mock-jwt-token',
				owner_id
			)

			expect(result.processed).toBe(0)
			expect(result.totalLateFees).toBe(0)
			expect(result.details).toHaveLength(0)
		})

		it('should throw BadRequestException when owner not found', async () => {
			const lease_id = generateUUID()
			const owner_id = generateUUID()

			jest.spyOn(service, 'getLateFeeConfig').mockResolvedValue({
				lease_id,
				gracePeriodDays: 5,
				flatFeeAmount: 50
			})

			jest.spyOn(service, 'getOverduePayments').mockResolvedValue([
				{
					id: generateUUID(),
					amount: 1500,
					dueDate: new Date().toISOString(),
					daysOverdue: 10,
					lateFeeApplied: false
				}
			])

			mockAdminClient.single.mockResolvedValue({
				data: null,
				error: { message: 'Not found' }
			})

			await expect(
				service.processLateFees(lease_id, 'mock-jwt-token', owner_id)
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('updateLateFeeConfig', () => {
		it('should update lease late fee configuration', async () => {
			const lease_id = generateUUID()
			const user_id = generateUUID()
			const config = {
				gracePeriodDays: 7,
				flatFeeAmount: 75
			}

			// Mock the full chain for update
			mockAdminClient.select.mockImplementationOnce(() =>
				Promise.resolve({
					data: [{ id: lease_id }],
					error: null
				})
			)

			await service.updateLateFeeConfig(lease_id, user_id, config)

			expect(mockAdminClient.update).toHaveBeenCalledWith({
				grace_period_days: 7,
				late_fee_amount: 75,
				updated_at: expect.any(String)
			})
			expect(mockAdminClient.eq).toHaveBeenCalledWith('id', lease_id)
		})

		it('should throw BadRequestException on database error', async () => {
			mockAdminClient.select.mockImplementationOnce(() =>
				Promise.resolve({
					data: null,
					error: { message: 'Database error' }
				})
			)

			await expect(
				service.updateLateFeeConfig(generateUUID(), generateUUID(), {})
			).rejects.toThrow(BadRequestException)
		})
	})
})
