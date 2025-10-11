import { BadRequestException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { randomUUID } from 'crypto'
import type { Request } from 'express'
import { SilentLogger } from '../../__test__/silent-logger'
import type { SupabaseService } from '../../database/supabase.service'
import { LateFeesController } from './late-fees.controller'
import type { LateFeesService } from './late-fees.service'

describe('LateFeesController', () => {
	let controller: LateFeesController
	let mockLateFeesService: jest.Mocked<Partial<LateFeesService>>
	let mockSupabaseService: jest.Mocked<Partial<SupabaseService>>
	let mockAdminClient: any

	const generateUUID = () => randomUUID()

	const createMockRequest = (userId?: string): Request => {
		return {
			user: userId ? { id: userId } : undefined
		} as Request
	}

	beforeEach(async () => {
		mockAdminClient = {
			from: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			single: jest.fn()
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
			getAdminClient: jest.fn().mockReturnValue(mockAdminClient)
		}

		const module: TestingModule = await Test.createTestingModule({
			controllers: [LateFeesController],
			providers: [
				{
					provide: 'LateFeesService',
					useValue: mockLateFeesService
				},
				{
					provide: 'SupabaseService',
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
			const leaseId = generateUUID()
			const userId = generateUUID()
			const mockConfig = {
				leaseId,
				gracePeriodDays: 5,
				flatFeeAmount: 50
			}

			;(mockSupabaseService.getUser as jest.Mock).mockResolvedValue({
				id: userId
			})
			;(mockLateFeesService.getLateFeeConfig as jest.Mock).mockResolvedValue(
				mockConfig
			)

			const result = await controller.getConfig(
				leaseId,
				createMockRequest(userId)
			)

			expect(result.success).toBe(true)
			expect(result.data).toEqual(mockConfig)
			expect(mockLateFeesService.getLateFeeConfig).toHaveBeenCalledWith(leaseId)
		})

		it('should throw BadRequestException when service not available', async () => {
			;(controller as any).lateFeesService = undefined

			await expect(
				controller.getConfig(generateUUID(), createMockRequest())
			).rejects.toThrow(BadRequestException)
		})

		it('should throw BadRequestException when user not authenticated', async () => {
			;(mockSupabaseService.getUser as jest.Mock).mockResolvedValue(null)

			await expect(
				controller.getConfig(generateUUID(), createMockRequest())
			).rejects.toThrow('User not authenticated')
		})
	})

	describe('updateConfig', () => {
		it('should update late fee configuration', async () => {
			const leaseId = generateUUID()
			const userId = generateUUID()

			;(mockSupabaseService.getUser as jest.Mock).mockResolvedValue({
				id: userId
			})
			;(mockLateFeesService.updateLateFeeConfig as jest.Mock).mockResolvedValue(
				undefined
			)

			const result = await controller.updateConfig(
				leaseId,
				createMockRequest(userId),
				7,
				75
			)

			expect(result.success).toBe(true)
			expect(result.message).toContain('updated successfully')
			expect(mockLateFeesService.updateLateFeeConfig).toHaveBeenCalledWith(
				leaseId,
				userId,
				{
					leaseId,
					gracePeriodDays: 7,
					flatFeeAmount: 75
				}
			)
		})

		it('should reject invalid grace period (negative)', async () => {
			const userId = generateUUID()
			;(mockSupabaseService.getUser as jest.Mock).mockResolvedValue({
				id: userId
			})

			await expect(
				controller.updateConfig(
					generateUUID(),
					createMockRequest(userId),
					-1,
					undefined
				)
			).rejects.toThrow('Grace period must be between 0 and 30 days')
		})

		it('should reject invalid grace period (too large)', async () => {
			const userId = generateUUID()
			;(mockSupabaseService.getUser as jest.Mock).mockResolvedValue({
				id: userId
			})

			await expect(
				controller.updateConfig(
					generateUUID(),
					createMockRequest(userId),
					31,
					undefined
				)
			).rejects.toThrow('Grace period must be between 0 and 30 days')
		})

		it('should reject invalid flat fee (negative)', async () => {
			const userId = generateUUID()
			;(mockSupabaseService.getUser as jest.Mock).mockResolvedValue({
				id: userId
			})

			await expect(
				controller.updateConfig(
					generateUUID(),
					createMockRequest(userId),
					undefined,
					-10
				)
			).rejects.toThrow('Flat fee amount must be between $0 and $500')
		})

		it('should reject invalid flat fee (too large)', async () => {
			const userId = generateUUID()
			;(mockSupabaseService.getUser as jest.Mock).mockResolvedValue({
				id: userId
			})

			await expect(
				controller.updateConfig(
					generateUUID(),
					createMockRequest(userId),
					undefined,
					501
				)
			).rejects.toThrow('Flat fee amount must be between $0 and $500')
		})
	})

	describe('calculateLateFee', () => {
		it('should calculate late fee for given parameters', async () => {
			const userId = generateUUID()
			const mockCalculation = {
				rentAmount: 1500,
				daysLate: 10,
				gracePeriod: 5,
				lateFeeAmount: 50,
				shouldApplyFee: true,
				reason: '5 days past due'
			}

			;(mockSupabaseService.getUser as jest.Mock).mockResolvedValue({
				id: userId
			})
			;(mockLateFeesService.calculateLateFee as jest.Mock).mockReturnValue(
				mockCalculation
			)

			const result = await controller.calculateLateFee(
				1500,
				10,
				createMockRequest(userId),
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

		it('should calculate late fee with lease config when leaseId provided', async () => {
			const userId = generateUUID()
			const leaseId = generateUUID()
			const mockConfig = {
				gracePeriodDays: 7,
				flatFeeAmount: 75
			}

			;(mockSupabaseService.getUser as jest.Mock).mockResolvedValue({
				id: userId
			})
			;(mockLateFeesService.getLateFeeConfig as jest.Mock).mockResolvedValue(
				mockConfig
			)
			;(mockLateFeesService.calculateLateFee as jest.Mock).mockReturnValue({
				lateFeeAmount: 75
			})

			await controller.calculateLateFee(
				1500,
				10,
				createMockRequest(userId),
				leaseId
			)

			expect(mockLateFeesService.getLateFeeConfig).toHaveBeenCalledWith(leaseId)
			expect(mockLateFeesService.calculateLateFee).toHaveBeenCalledWith(
				1500,
				10,
				mockConfig
			)
		})

		it('should reject invalid rent amount (zero)', async () => {
			const userId = generateUUID()
			;(mockSupabaseService.getUser as jest.Mock).mockResolvedValue({
				id: userId
			})

			await expect(
				controller.calculateLateFee(0, 10, createMockRequest(userId), undefined)
			).rejects.toThrow('Rent amount must be positive')
		})

		it('should reject invalid rent amount (negative)', async () => {
			const userId = generateUUID()
			;(mockSupabaseService.getUser as jest.Mock).mockResolvedValue({
				id: userId
			})

			await expect(
				controller.calculateLateFee(
					-100,
					10,
					createMockRequest(userId),
					undefined
				)
			).rejects.toThrow('Rent amount must be positive')
		})

		it('should reject invalid days late (negative)', async () => {
			const userId = generateUUID()
			;(mockSupabaseService.getUser as jest.Mock).mockResolvedValue({
				id: userId
			})

			await expect(
				controller.calculateLateFee(
					1500,
					-1,
					createMockRequest(userId),
					undefined
				)
			).rejects.toThrow('Days late must be non-negative')
		})
	})

	describe('getOverduePayments', () => {
		it('should return overdue payments for a lease', async () => {
			const leaseId = generateUUID()
			const userId = generateUUID()
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

			;(mockSupabaseService.getUser as jest.Mock).mockResolvedValue({
				id: userId
			})
			;(mockLateFeesService.getLateFeeConfig as jest.Mock).mockResolvedValue(
				mockConfig
			)
			;(mockLateFeesService.getOverduePayments as jest.Mock).mockResolvedValue(
				mockPayments
			)

			const result = await controller.getOverduePayments(
				leaseId,
				createMockRequest(userId)
			)

			expect(result.success).toBe(true)
			expect(result.data.payments).toEqual(mockPayments)
			expect(result.data.gracePeriod).toBe(5)
		})
	})

	describe('processLateFees', () => {
		it('should process late fees for all overdue payments', async () => {
			const leaseId = generateUUID()
			const userId = generateUUID()
			const mockResult = {
				processed: 2,
				totalLateFees: 100,
				details: [
					{ paymentId: generateUUID(), lateFeeAmount: 50, daysOverdue: 10 },
					{ paymentId: generateUUID(), lateFeeAmount: 50, daysOverdue: 12 }
				]
			}

			;(mockSupabaseService.getUser as jest.Mock).mockResolvedValue({
				id: userId
			})
			;(mockLateFeesService.processLateFees as jest.Mock).mockResolvedValue(
				mockResult
			)

			const result = await controller.processLateFees(
				leaseId,
				createMockRequest(userId)
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
			const leaseId = generateUUID()
			const userId = generateUUID()
			const mockPayment = {
				id: paymentId,
				leaseId,
				stripePaymentIntentId: 'pi_123'
			}
			const mockUser = {
				stripeCustomerId: 'cus_123'
			}
			const mockInvoiceItem = {
				id: 'ii_123',
				amount: 5000
			}

			;(mockSupabaseService.getUser as jest.Mock).mockResolvedValue({
				id: userId
			})

			// Mock payment lookup
			mockAdminClient.single
				.mockResolvedValueOnce({ data: mockPayment, error: null })
				// Mock user lookup
				.mockResolvedValueOnce({ data: mockUser, error: null })
			;(
				mockLateFeesService.applyLateFeeToInvoice as jest.Mock
			).mockResolvedValue(mockInvoiceItem)

			const result = await controller.applyLateFee(
				paymentId,
				50,
				'Payment overdue',
				createMockRequest(userId)
			)

			expect(result.success).toBe(true)
			expect(result.data.invoiceItemId).toBe('ii_123')
			expect(result.data.amount).toBe(50)
			expect(mockLateFeesService.applyLateFeeToInvoice).toHaveBeenCalledWith(
				'cus_123',
				leaseId,
				paymentId,
				50,
				'Payment overdue'
			)
		})

		it('should reject invalid late fee amount (zero)', async () => {
			const userId = generateUUID()
			;(mockSupabaseService.getUser as jest.Mock).mockResolvedValue({
				id: userId
			})

			await expect(
				controller.applyLateFee(
					generateUUID(),
					0,
					'test',
					createMockRequest(userId)
				)
			).rejects.toThrow('Late fee amount must be positive')
		})

		it('should reject invalid late fee amount (negative)', async () => {
			const userId = generateUUID()
			;(mockSupabaseService.getUser as jest.Mock).mockResolvedValue({
				id: userId
			})

			await expect(
				controller.applyLateFee(
					generateUUID(),
					-10,
					'test',
					createMockRequest(userId)
				)
			).rejects.toThrow('Late fee amount must be positive')
		})

		it('should reject empty reason', async () => {
			const userId = generateUUID()
			;(mockSupabaseService.getUser as jest.Mock).mockResolvedValue({
				id: userId
			})

			await expect(
				controller.applyLateFee(
					generateUUID(),
					50,
					'',
					createMockRequest(userId)
				)
			).rejects.toThrow('Reason is required')
		})

		it('should reject whitespace-only reason', async () => {
			const userId = generateUUID()
			;(mockSupabaseService.getUser as jest.Mock).mockResolvedValue({
				id: userId
			})

			await expect(
				controller.applyLateFee(
					generateUUID(),
					50,
					'   ',
					createMockRequest(userId)
				)
			).rejects.toThrow('Reason is required')
		})

		it('should throw BadRequestException when payment not found', async () => {
			const userId = generateUUID()
			;(mockSupabaseService.getUser as jest.Mock).mockResolvedValue({
				id: userId
			})

			mockAdminClient.single.mockResolvedValueOnce({
				data: null,
				error: { message: 'Not found' }
			})

			await expect(
				controller.applyLateFee(
					generateUUID(),
					50,
					'test',
					createMockRequest(userId)
				)
			).rejects.toThrow('Payment not found')
		})

		it('should throw BadRequestException when user Stripe customer not found', async () => {
			const userId = generateUUID()
			const mockPayment = {
				id: generateUUID(),
				leaseId: generateUUID()
			}

			;(mockSupabaseService.getUser as jest.Mock).mockResolvedValue({
				id: userId
			})

			mockAdminClient.single
				.mockResolvedValueOnce({ data: mockPayment, error: null })
				.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } })

			await expect(
				controller.applyLateFee(
					generateUUID(),
					50,
					'test',
					createMockRequest(userId)
				)
			).rejects.toThrow('User Stripe customer not found')
		})
	})
})
