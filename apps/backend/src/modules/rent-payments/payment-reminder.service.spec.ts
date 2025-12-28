/**
 * Payment Reminder Service Tests
 */

import { Test, TestingModule } from '@nestjs/testing'
import { getQueueToken } from '@nestjs/bullmq'
import { PaymentReminderService } from './payment-reminder.service'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import { AppConfigService } from '../../config/app-config.service'
import { SilentLogger } from '../../__test__/silent-logger'

describe('PaymentReminderService', () => {
	let service: PaymentReminderService

	const mockEmailQueue = {
		add: jest.fn().mockResolvedValue({ id: 'job-1' })
	}

	const createMockQueryBuilder = (
		data: unknown = [],
		error: unknown = null
	) => {
		const builder = {
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			not: jest.fn().mockReturnThis(),
			gte: jest.fn().mockReturnThis(),
			lte: jest.fn().mockReturnThis(),
			limit: jest.fn().mockReturnThis(),
			single: jest.fn().mockResolvedValue({ data, error }),
			insert: jest.fn().mockResolvedValue({ data: null, error: null }),
			then: jest.fn().mockImplementation(resolve => resolve({ data, error }))
		}
		return builder
	}

	const mockAdminClient = {
		from: jest.fn()
	}

	const mockConfigService = {
		getNextPublicAppUrl: jest.fn().mockReturnValue('https://app.tenantflow.com')
	}

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PaymentReminderService,
				{
					provide: SupabaseService,
					useValue: {
						getAdminClient: jest.fn().mockReturnValue(mockAdminClient)
					}
				},
				{
					provide: AppLogger,
					useClass: SilentLogger
				},
				{
					provide: AppConfigService,
					useValue: mockConfigService
				},
				{
					provide: getQueueToken('emails'),
					useValue: mockEmailQueue
				}
			]
		}).compile()

		service = module.get<PaymentReminderService>(PaymentReminderService)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('sendPaymentReminders', () => {
		it('should handle no active leases gracefully', async () => {
			const queryBuilder = createMockQueryBuilder([])
			mockAdminClient.from.mockReturnValue(queryBuilder)

			await service.sendPaymentReminders()

			expect(mockEmailQueue.add).not.toHaveBeenCalled()
		})

		it('should skip leases without tenant email', async () => {
			const mockLeases = [
				{
					id: 'lease-1',
					rent_amount: 150000,
					primary_tenant_id: 'tenant-1',
					unit_id: 'unit-1',
					tenant: {
						id: 'tenant-1',
						user_id: 'user-1',
						autopay_enabled: false,
						users: null
					},
					unit: {
						id: 'unit-1',
						unit_number: '101',
						property_id: 'prop-1',
						property: { id: 'prop-1', name: 'Test Property' }
					}
				}
			]

			const queryBuilder = createMockQueryBuilder(mockLeases)
			mockAdminClient.from.mockReturnValue(queryBuilder)

			await service.sendPaymentReminders()

			expect(mockEmailQueue.add).not.toHaveBeenCalled()
		})

		it('should handle database errors gracefully', async () => {
			const queryBuilder = createMockQueryBuilder(null, {
				message: 'Database connection error',
				code: 'ECONNREFUSED'
			})
			mockAdminClient.from.mockReturnValue(queryBuilder)

			// Should not throw
			await expect(service.sendPaymentReminders()).resolves.not.toThrow()
		})
	})

	describe('calculateNextDueDate', () => {
		it('should calculate next due date on 1st of month', () => {
			// Access private method via any cast for testing
			const serviceAny = service as unknown as {
				calculateNextDueDate: (from: Date) => Date
			}

			// If today is before the 1st, due date should be this month's 1st
			const jan15 = new Date(2024, 0, 15) // Jan 15, 2024
			const dueDate = serviceAny.calculateNextDueDate(jan15)

			expect(dueDate.getDate()).toBe(1)
			expect(dueDate.getMonth()).toBe(1) // February (0-indexed)
		})

		it('should handle end of year correctly', () => {
			const serviceAny = service as unknown as {
				calculateNextDueDate: (from: Date) => Date
			}

			const dec15 = new Date(2024, 11, 15) // Dec 15, 2024
			const dueDate = serviceAny.calculateNextDueDate(dec15)

			expect(dueDate.getDate()).toBe(1)
			expect(dueDate.getMonth()).toBe(0) // January
			expect(dueDate.getFullYear()).toBe(2025)
		})
	})

	describe('calculateDaysUntilDue', () => {
		it('should calculate days correctly', () => {
			const serviceAny = service as unknown as {
				calculateDaysUntilDue: (from: Date, due: Date) => number
			}

			const from = new Date(2024, 0, 1) // Jan 1
			const due = new Date(2024, 0, 8) // Jan 8

			const days = serviceAny.calculateDaysUntilDue(from, due)
			expect(days).toBe(7)
		})

		it('should return 0 for same day', () => {
			const serviceAny = service as unknown as {
				calculateDaysUntilDue: (from: Date, due: Date) => number
			}

			const sameDay = new Date(2024, 0, 1)
			const days = serviceAny.calculateDaysUntilDue(sameDay, sameDay)
			expect(days).toBe(0)
		})
	})

	describe('formatTenantName', () => {
		it('should format full name correctly', () => {
			const serviceAny = service as unknown as {
				formatTenantName: (user: {
					first_name: string | null
					last_name: string | null
					email: string
				}) => string
			}

			const name = serviceAny.formatTenantName({
				first_name: 'John',
				last_name: 'Doe',
				email: 'john@test.com'
			})
			expect(name).toBe('John Doe')
		})

		it('should use first name only if no last name', () => {
			const serviceAny = service as unknown as {
				formatTenantName: (user: {
					first_name: string | null
					last_name: string | null
					email: string
				}) => string
			}

			const name = serviceAny.formatTenantName({
				first_name: 'John',
				last_name: null,
				email: 'john@test.com'
			})
			expect(name).toBe('John')
		})

		it('should fallback to Tenant if no name', () => {
			const serviceAny = service as unknown as {
				formatTenantName: (user: {
					first_name: string | null
					last_name: string | null
					email: string
				}) => string
			}

			const name = serviceAny.formatTenantName({
				first_name: null,
				last_name: null,
				email: 'john@test.com'
			})
			expect(name).toBe('Tenant')
		})
	})
})
